import { test, expect, type Page } from "@playwright/test";

const ORDER = [
  ["headset", "T1 Tech Support"],
  ["wordpress", "Web Concierge (WP Live)"],
  ["migration", "Professional Services Engineer"],
  ["escalation", "T3 Tech Support"],
  ["rack", "Systems Administrator"],
  ["pipeline", "Linux Engineer"],
  ["datacenter", "Sr. Systems Architect"],
] as const;

/** Scrolls so the journey is at the middle of stage `i` (of 7). */
async function scrollToStage(page: Page, i: number) {
  await page.evaluate((stage) => {
    const el = document.querySelector<HTMLElement>("[data-journey]")!;
    const header = 64;
    const top = el.getBoundingClientRect().top + scrollY - header;
    const span = el.offsetHeight - (innerHeight - header);
    scrollTo(0, top + span * ((stage + 0.5) / 7));
  }, i);
}

test.describe("animated journey", () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name === "reduced-motion", "covered below");
  });

  test("advances through all seven ranks in order as you scroll", async ({ page }) => {
    await page.goto("/");
    const journey = page.locator("[data-journey]");
    await expect(journey).toBeVisible();

    for (const [i, [activity, title]] of ORDER.entries()) {
      await scrollToStage(page, i);
      await expect(journey).toHaveAttribute("data-activity", activity);
      await expect(page.locator(".journey__card.is-active h3")).toHaveText(title);
      await expect(page.locator("[data-node].is-current")).toHaveCount(1);
      await expect(page.locator("[data-node].is-reached")).toHaveCount(i + 1);
    }
  });

  test("scrolling back up rewinds the journey", async ({ page }) => {
    await page.goto("/");
    await scrollToStage(page, 6);
    await expect(page.locator("[data-journey]")).toHaveAttribute("data-activity", "datacenter");
    await scrollToStage(page, 1);
    await expect(page.locator("[data-journey]")).toHaveAttribute("data-activity", "wordpress");
  });

  test("is hidden from assistive tech while the timeline stays readable", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-journey]")).toHaveAttribute("aria-hidden", "true");
    // Visually hidden, but in the accessibility tree.
    await expect(page.getByRole("heading", { level: 3, name: "T1 Tech Support" })).toHaveCount(1);
  });

  test("offers a way to skip past it, visible only on focus", async ({ page }) => {
    await page.goto("/");
    const skip = page.getByRole("link", { name: "Skip the career journey" });
    await expect(skip).toHaveAttribute("href", "#skills");
    const box = await skip.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(1);
    await skip.focus();
    expect((await skip.boundingBox())!.width).toBeGreaterThan(40);
  });
});

test.describe("reduced motion", () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "reduced-motion", "reduced-motion project only");
  });

  test("shows the static timeline instead of the animation", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-journey]")).toBeHidden();
    await expect(page.locator(".journey-fallback .timeline")).toBeVisible();
    await expect(page.locator(".journey-fallback .timeline__title")).toHaveCount(7);
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "desktop", "one project is enough");
  });

  test("shows the static timeline", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-journey]")).toBeHidden();
    await expect(page.locator(".journey-fallback .timeline")).toBeVisible();
  });
});
