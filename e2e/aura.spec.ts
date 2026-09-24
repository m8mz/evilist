import { test, expect } from "@playwright/test";

const isThreeChunk = (url: string) => url.includes("hero-aura-scene");

test.describe("hero aura", () => {
  test.beforeEach(({}, info) => {
    test.skip(
      !["desktop", "reduced-motion"].includes(info.project.name),
      "two projects are enough",
    );
  });

  test("never loads Three.js before the visitor interacts", async ({ page }) => {
    const requested: string[] = [];
    page.on("request", (r) => isThreeChunk(r.url()) && requested.push(r.url()));
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    expect(requested).toEqual([]);
    // The CSS glow is there regardless.
    await expect(page.locator("[data-hero-aura]")).toBeAttached();
  });

  test("never loads Three.js with reduced motion, even after interaction", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "reduced-motion", "reduced-motion project only");
    const requested: string[] = [];
    page.on("request", (r) => isThreeChunk(r.url()) && requested.push(r.url()));
    await page.goto("/");
    await page.mouse.move(200, 200);
    await page.mouse.move(600, 300);
    await page.waitForTimeout(1500);
    expect(requested).toEqual([]);
  });

  test("goes live after interaction when WebGL2 is available", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "desktop only");
    await page.goto("/");
    const webgl2 = await page.evaluate(
      () => !!document.createElement("canvas").getContext("webgl2"),
    );
    test.skip(!webgl2, "no WebGL2 in this browser build");
    await page.mouse.move(200, 200);
    await page.mouse.move(600, 300);
    await expect(page.locator("[data-hero-aura]")).toHaveClass(/is-live/, { timeout: 10_000 });
    await expect(page.locator("[data-hero-aura] canvas")).toHaveCount(1);
  });
});
