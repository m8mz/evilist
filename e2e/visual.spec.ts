import { test, expect } from "@playwright/test";
import { HEADER_PX } from "./constants";

// Visual regression baselines. Tagged @visual: run locally with `pnpm test:visual`
// (baselines are macOS renders; CI on Linux renders fonts differently, so CI skips these).
// After an intentional design change: `pnpm test:visual --update-snapshots`, review, commit.

const pages = [
  { name: "home", path: "/", fullPage: false },
  { name: "now", path: "/now", fullPage: true },
  { name: "resume", path: "/resume", fullPage: true },
  { name: "contact", path: "/contact", fullPage: false },
  { name: "notes", path: "/notes", fullPage: false },
  { name: "note", path: "/notes/ten-years-t1-to-architect", fullPage: false },
  { name: "not-found", path: "/definitely-missing", fullPage: false },
];

test.describe("visual regression @visual", () => {
  test.beforeEach(async ({ page }, info) => {
    test.skip(!["desktop", "iphone-15"].includes(info.project.name), "two baselines per page");
    // The htop drift and the network's idle pulses run on setInterval: stubbing it freezes both
    // at their static render.
    await page.addInitScript(() => {
      window.setInterval = (() => 0) as unknown as typeof window.setInterval;
      // Clips would never match a baseline; refusing play() keeps each rank on its still.
      HTMLMediaElement.prototype.play = () =>
        Promise.reject(new DOMException("frozen", "NotAllowedError"));
    });
  });

  for (const { name, path, fullPage } of pages) {
    test(name, async ({ page }) => {
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      // LogBars stream in on scroll; show every row settled, then return to the top.
      for (const bars of await page.locator("[data-log-bars]:visible").all()) {
        await bars.scrollIntoViewIfNeeded();
        await expect(bars.locator(".log-bars__bar:not(.is-live)")).toHaveCount(0);
      }
      await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
      await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
      await expect(page).toHaveScreenshot(`${name}.png`, {
        fullPage,
        animations: "disabled",
        maxDiffPixelRatio: 0.01,
        threshold: 0.02, // per-pixel color tolerance: catch token-level color shifts
      });
    });
  }

  test("hero copy (catches headline re-wraps)", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator(".hero__copy")).toHaveScreenshot("hero-copy.png", {
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
      threshold: 0.02,
    });
  });

  test("rack band (catches the crop and the scrim)", async ({ page }) => {
    await page.goto("/");
    const band = page.locator(".parallax");
    // Centred in the viewport, the band sits at progress ½: the image is at rest.
    await band.evaluate((el: HTMLElement) =>
      scrollTo({
        top: el.getBoundingClientRect().top + scrollY - (innerHeight - el.offsetHeight) / 2,
        behavior: "instant",
      }),
    );
    await expect
      .poll(() =>
        band.locator("img").evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0),
      )
      .toBe(true);
    await expect(band).toHaveScreenshot("rack-band.png", {
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
      threshold: 0.02,
    });
  });

  for (const [rank, index] of [
    ["e", 0],
    ["s", 5],
    ["s-plus", 6],
  ] as const) {
    test(`journey rank ${rank.toUpperCase()}`, async ({ page }) => {
      await page.goto("/?deck-freeze=2026-09-25");
      await page.evaluate(
        ({ i, header }) => {
          const el = document.querySelector<HTMLElement>("[data-deck]")!;
          const top = el.getBoundingClientRect().top + scrollY - header;
          scrollTo({
            top: top + (el.offsetHeight - innerHeight + header) * ((i + 0.5) / 7),
            behavior: "instant",
          });
        },
        { i: index, header: HEADER_PX },
      );
      await expect(page.locator("[data-deck]")).toHaveAttribute("data-deck-ready", "", {
        timeout: 20_000,
      });
      await expect(page.locator("[data-deck]")).toHaveAttribute(
        "data-deck-rank",
        rank === "s-plus" ? "S+" : rank.toUpperCase(),
      );
      await expect(page).toHaveScreenshot(`journey-rank-${rank}.png`, {
        animations: "disabled",
        maxDiffPixelRatio: 0.01,
        threshold: 0.02,
      });
    });
  }
});
