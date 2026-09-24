import { test, expect } from "@playwright/test";

// Visual regression baselines. Tagged @visual: run locally with `pnpm test:visual`
// (baselines are macOS renders; CI on Linux renders fonts differently, so CI skips these).
// After an intentional design change: `pnpm test:visual --update-snapshots`, review, commit.

const pages = [
  { name: "home", path: "/", fullPage: false },
  { name: "now", path: "/now", fullPage: true },
  { name: "resume", path: "/resume", fullPage: true },
  { name: "contact", path: "/contact", fullPage: false },
  { name: "notes", path: "/notes", fullPage: false },
  { name: "note", path: "/notes/ten-years-t1-to-architect/", fullPage: false },
  { name: "not-found", path: "/definitely-missing", fullPage: false },
];

test.describe("visual regression @visual", () => {
  test.beforeEach(async ({ page }, info) => {
    test.skip(!["desktop", "iphone-15"].includes(info.project.name), "two baselines per page");
    // The htop band drifts at random (its only setInterval); freeze it at the static snapshot.
    await page.addInitScript(() => {
      window.setInterval = (() => 0) as unknown as typeof window.setInterval;
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

  test("journey mid-way (rank C)", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>("[data-journey]")!;
      const top = el.getBoundingClientRect().top + scrollY - 64;
      scrollTo(0, top + (el.offsetHeight - innerHeight + 64) * (3.5 / 7));
    });
    await expect(page.locator("[data-journey]")).toHaveAttribute("data-activity", "escalation");
    await expect(page).toHaveScreenshot("journey-rank-c.png", {
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
      threshold: 0.02,
    });
  });

  test("journey start (rank E, headset)", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>("[data-journey]")!;
      const top = el.getBoundingClientRect().top + scrollY - 56;
      scrollTo(0, top + (el.offsetHeight - innerHeight + 56) * (0.5 / 7));
    });
    await expect(page.locator("[data-journey]")).toHaveAttribute("data-activity", "headset");
    await expect(page).toHaveScreenshot("journey-rank-e.png", {
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
      threshold: 0.02,
    });
  });
});
