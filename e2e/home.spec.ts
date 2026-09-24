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

  test("keeps the arrow texture out from behind the copy", async ({ page }) => {
    await page.goto("/");
    const arrows = (await page.locator(".hero__arrows").boundingBox())!;
    const copy = (await page.locator(".hero__copy").boundingBox())!;
    const overlaps =
      arrows.x < copy.x + copy.width &&
      copy.x < arrows.x + arrows.width &&
      arrows.y < copy.y + copy.height &&
      copy.y < arrows.y + arrows.height;
    expect(overlaps).toBe(false);
  });

  test("keeps the surname on one line", async ({ page }) => {
    await page.goto("/");
    const lines = await page.locator(".hero__surname").evaluate((el) => el.getClientRects().length);
    expect(lines).toBe(1);
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

test.describe("infrastructure diagram", () => {
  test("describes the topology to assistive tech", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("img", { name: "Two datacenters with BGP failover behind HAProxy" }),
    ).toBeVisible();
  });

  test("keeps the topology labels readable on every screen", async ({ page }) => {
    await page.goto("/");
    const px = await page
      .locator(".topo__label")
      .first()
      .evaluate((el) => {
        const svg = (el as SVGTextElement).ownerSVGElement!;
        const scale = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
        return parseFloat(getComputedStyle(el).fontSize) * scale;
      });
    expect(px).toBeGreaterThanOrEqual(11);
  });

  test("moves the pulse only when motion is allowed", async ({ page }, info) => {
    await page.goto("/");
    const name = await page
      .locator(".topo__pulse")
      .evaluate((el) => getComputedStyle(el).animationName);
    if (info.project.name === "reduced-motion") expect(name).toBe("none");
    else expect(name).not.toBe("none");
  });
});

test.describe("off the clock", () => {
  test("shows the rig, what's playing and what's on, with a link to /now", async ({ page }) => {
    await page.goto("/");
    const block = page.locator("#off-the-clock");
    await expect(block.locator(".prompt__path")).toHaveText("off-the-clock");
    await expect(block.getByRole("heading", { level: 3 })).toHaveText([
      "rig",
      "playing",
      "watching",
    ]);
    await expect(block).toContainText("MacBook Pro (M2 Max)");
    await expect(block).toContainText("Old School RuneScape");
    await expect(block).toContainText("Solo Leveling");
    await expect(block.getByRole("img", { name: "Illustrative training rhythm" })).toBeVisible();
    await expect(block.getByRole("link", { name: "more on /now" })).toHaveAttribute("href", "/now");
  });
});
