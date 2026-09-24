import { test, expect } from "@playwright/test";

test.describe("hero", () => {
  test("introduces Marcus with a prompt, facts and two actions", async ({ page }) => {
    await page.goto("/");
    const hero = page.locator(".hero");
    await expect(hero.locator(".prompt__path")).toHaveText("marcus");
    await expect(hero.locator(".prompt__cursor")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Marcus Hancock-Gaillard");
    await expect(hero.locator(".hero__role")).toHaveText("Sr. Systems Architect · Mesa, Arizona");
    await expect(hero.locator(".kv__key")).toHaveText([
      "years:",
      "datacenters:",
      "uptime:",
      "compliance:",
    ]);
    await expect(hero.locator(".kv__value").first()).toHaveText(/^\d+$/);
    await expect(page.getByRole("link", { name: "See the journey" })).toHaveAttribute(
      "href",
      "#journey",
    );
    await expect(page.getByRole("link", { name: "Read the resume" })).toHaveAttribute(
      "href",
      "/resume",
    );
  });

  test("frames the portrait as a terminal window with the S-rank chip", async ({ page }) => {
    await page.goto("/");
    const frame = page.locator(".hero .term");
    await expect(frame.locator(".term__title")).toHaveText("marcus@evilist:~");
    await expect(frame.getByRole("img", { name: "S-rank: Sr. Systems Architect" })).toHaveCount(1);
    await expect(page.locator(".hero .seal")).toHaveCount(0);
  });

  test("keeps the portrait's LCP hints and intrinsic size", async ({ page }) => {
    await page.goto("/");
    const img = page.locator(".hero img");
    await expect(img).toHaveAttribute("loading", "eager");
    await expect(img).toHaveAttribute("fetchpriority", "high");
    await expect(img).toHaveAttribute("width", /^\d+$/);
    await expect(img).toHaveAttribute("height", /^\d+$/);
  });
});
