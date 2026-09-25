import { test, expect, type Page } from "@playwright/test";
import { HEADER_PX } from "./constants";

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
  await page.evaluate(
    ({ stage, header }) => {
      const el = document.querySelector<HTMLElement>("[data-journey]")!;
      const top = el.getBoundingClientRect().top + scrollY - header;
      const span = el.offsetHeight - (innerHeight - header);
      scrollTo(0, top + span * ((stage + 0.5) / 7));
    },
    { stage: i, header: HEADER_PX },
  );
}

const STAGE_IDS = [
  "t1-support",
  "web-concierge",
  "professional-services",
  "t3-support",
  "sysadmin",
  "linux-engineer",
  "systems-architect",
];

/** Records whether the scene (/journey/scene.svg) and which stills (/_astro/<id>.…) the page requests. */
function trackArt(page: Page) {
  const stills = new Set<string>();
  const art = { scene: false, stills };
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("/journey/scene.svg")) art.scene = true;
    for (const id of STAGE_IDS) if (url.includes(`/_astro/${id}.`)) stills.add(id);
  });
  return art;
}

/** The visibility attribute of an id inside the stage's scene. */
const visibility = (page: Page, id: string) =>
  page.locator(`[data-scene] #${id}`).getAttribute("visibility");

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

  test("keeps the active card inside the viewport at every stage", async ({ page }, info) => {
    test.skip(
      !["iphone-15", "pixel-7", "ipad"].includes(info.project.name),
      "phone and tablet heights",
    );
    await page.goto("/");
    const viewport = page.viewportSize()!.height;
    const stageTop = () =>
      page.evaluate(() => document.querySelector(".journey__stage")!.getBoundingClientRect().top);
    for (const [i, [activity]] of ORDER.entries()) {
      await scrollToStage(page, i);
      await expect(page.locator("[data-journey]")).toHaveAttribute("data-activity", activity);
      // Stage 0's activity is already set on load, so also wait for the smooth scroll to pin
      // the stage under the header before measuring.
      await expect.poll(stageTop).toBeLessThanOrEqual(HEADER_PX);
      const box = (await page.locator(".journey__card.is-active").boundingBox())!;
      expect(box.y + box.height, `stage ${i}`).toBeLessThanOrEqual(viewport);
    }
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

  test("keeps card summaries at body size on tablets", async ({ page }, info) => {
    test.skip(info.project.name !== "ipad", "tablet only");
    await page.goto("/");
    await expect(page.locator(".journey__card.is-active p:not(.journey__meta)").first()).toHaveCSS(
      "font-size",
      "15px",
    );
  });

  test("keeps the timeline's stills unrendered behind the stage", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".journey-fallback .timeline__still").first()).toHaveCSS(
      "display",
      "none",
    );
  });

  test("from 60rem, the scene fills the full-width stage and the card sits on the left", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "desktop layout");
    await page.goto("/");
    await scrollToStage(page, 3);
    await expect(page.locator("[data-journey]")).toHaveAttribute("data-activity", "escalation");
    const width = page.viewportSize()!.width;
    const stage = (await page.locator(".journey__stage").boundingBox())!;
    const media = (await page.locator(".journey__media").boundingBox())!;
    const card = (await page.locator(".journey__card.is-active").boundingBox())!;
    expect(stage.x).toBe(0);
    expect(stage.width).toBeGreaterThanOrEqual(width - 1);
    expect(media).toEqual(stage);
    expect(card.x).toBeLessThan(width / 4);
    expect(card.width).toBeLessThanOrEqual(480);
    await expect(page.locator(".journey__card.is-active")).toHaveCSS(
      "background-color",
      "rgb(25, 25, 25)",
    );
  });

  test("below 60rem, the rail, the scene and the card stack without overlapping", async ({
    page,
  }, info) => {
    test.skip(!["iphone-15", "pixel-7", "ipad"].includes(info.project.name), "stacked layout");
    await page.goto("/");
    await scrollToStage(page, 2);
    await expect(page.locator("[data-journey]")).toHaveAttribute("data-activity", "migration");
    const rail = (await page.locator(".journey__rail").boundingBox())!;
    const media = (await page.locator(".journey__media").boundingBox())!;
    const card = (await page.locator(".journey__card.is-active").boundingBox())!;
    expect(rail.y + rail.height).toBeLessThanOrEqual(media.y);
    expect(media.y + media.height).toBeLessThanOrEqual(card.y);
    expect(media.height).toBeGreaterThan(120);
  });

  test("shows up to three highlights from 60rem, and one below", async ({ page }) => {
    await page.goto("/");
    await scrollToStage(page, 6);
    await expect(page.locator("[data-journey]")).toHaveAttribute("data-activity", "datacenter");
    const wide = page.viewportSize()!.width >= 960;
    await expect(
      page.locator(".journey__card.is-active .journey__highlights li:visible"),
    ).toHaveCount(wide ? 3 : 1);
  });

  test("keeps the active card inside the pinned stage on short desktop screens", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "desktop widths");
    for (const size of [
      { width: 1280, height: 600 },
      { width: 960, height: 600 },
    ]) {
      await page.setViewportSize(size);
      await page.goto("/");
      for (const [i, [activity]] of ORDER.entries()) {
        await scrollToStage(page, i);
        await expect(page.locator("[data-journey]")).toHaveAttribute("data-activity", activity);
        await expect
          .poll(() =>
            page.evaluate(
              () => document.querySelector(".journey__stage")!.getBoundingClientRect().top,
            ),
          )
          .toBeLessThanOrEqual(HEADER_PX);
        const stage = (await page.locator(".journey__stage").boundingBox())!;
        const card = (await page.locator(".journey__card.is-active").boundingBox())!;
        expect(card.y + card.height, `${size.width}×${size.height} stage ${i}`).toBeLessThanOrEqual(
          stage.y + stage.height,
        );
      }
    }
  });
});

test.describe("journey scene", () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name === "reduced-motion", "covered below");
  });

  // At the project and Lighthouse sizes the journey starts 31–91 px below the fold; on a 2560×1300
  // window it is on screen at load. Either way the scene waits for the first scroll.
  test("fetches nothing before the journey reaches the screen, then the scene once", async ({
    page,
  }) => {
    const art = trackArt(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(art.scene).toBe(false);
    expect([...art.stills]).toEqual([]);
    await expect(page.locator("[data-scene] svg path")).toHaveCount(1); // the silhouette
    await scrollToStage(page, 0);
    await expect(page.locator("[data-scene] #avatar")).toHaveCount(1);
    expect(art.scene).toBe(true);
    expect([...art.stills]).toEqual([]);
  });

  test("on tall desktop windows, the page still loads nothing of the journey", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "desktop windows");
    for (const size of [
      { width: 1920, height: 1080 },
      { width: 2560, height: 1300 },
    ]) {
      await page.setViewportSize(size);
      const art = trackArt(page);
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      expect(art.scene, `${size.width}×${size.height}`).toBe(false);
      expect([...art.stills], `${size.width}×${size.height}`).toEqual([]);
    }
  });

  test("shows each rank's outfit and props as you scroll, and hides the others", async ({
    page,
  }) => {
    await page.goto("/");
    for (const i of [0, 3, 6]) {
      await scrollToStage(page, i);
      await expect(page.locator("[data-journey]")).toHaveAttribute("data-activity", ORDER[i]![0]);
      const id = STAGE_IDS[i]!;
      await expect.poll(() => visibility(page, `outfit-${id}-torso`)).toBe("visible");
      await expect.poll(() => visibility(page, `props-${id}`)).toBe("visible");
      for (const other of STAGE_IDS.filter((_, j) => Math.abs(j - i) > 1)) {
        expect(await visibility(page, `outfit-${other}-torso`), other).toBe("hidden");
        expect(await visibility(page, `props-${other}`), other).toBe("hidden");
      }
      await expect(page.locator(`[data-scene] #outfit-${id}-torso`)).toHaveAttribute(
        "opacity",
        "1.000",
      );
    }
  });

  test("a failed scene fetch leaves the silhouette and the cards, with no errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      // The browser reports the 404 this test serves; anything else is ours.
      if (m.type() === "error" && !m.text().startsWith("Failed to load resource")) {
        errors.push(m.text());
      }
    });
    await page.route("**/journey/scene.svg", (route) =>
      route.fulfill({
        status: 404,
        contentType: "text/html",
        body: "<!doctype html><title>nope</title>",
      }),
    );
    await page.goto("/");
    await scrollToStage(page, 2);
    await expect(page.locator("[data-journey]")).toHaveAttribute("data-activity", "migration");
    await expect(page.locator(".journey__card.is-active h3")).toHaveText(
      "Professional Services Engineer",
    );
    await expect(page.locator("[data-scene] svg path")).toHaveCount(1);
    await expect(page.locator("[data-scene] #avatar")).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("a scene that arrives late paints the rank the visitor is on", async ({ page }) => {
    await page.route("**/journey/scene.svg", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });
    await page.goto("/");
    await scrollToStage(page, 4);
    await expect(page.locator("[data-journey]")).toHaveAttribute("data-activity", "rack");
    await expect(page.locator("[data-scene] #avatar")).toHaveCount(1, { timeout: 10_000 });
    expect(await visibility(page, "outfit-sysadmin-torso")).toBe("visible");
    expect(await visibility(page, "outfit-t1-support-torso")).toBe("hidden");
  });

  test("keeps the scene under the CSP: no inline styles, attributes only", async ({ page }) => {
    await page.goto("/");
    await scrollToStage(page, 1);
    await expect(page.locator("[data-scene] #avatar")).toHaveCount(1);
    expect(await page.locator("[data-scene] [style]").count()).toBe(0);
    await expect(page.locator("[data-scene] #part-arm-right")).toHaveAttribute(
      "transform",
      /^rotate\(/,
    );
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

  test("never requests the scene, even scrolled to the end", async ({ page }) => {
    const art = trackArt(page);
    await page.goto("/");
    await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
    await page.waitForLoadState("networkidle");
    expect(art.scene).toBe(false);
  });

  test("shows each rank's still beside its timeline entry", async ({ page }) => {
    await page.goto("/");
    const stills = page.locator(".journey-fallback .timeline__still img");
    await expect(stills).toHaveCount(7);
    await stills.last().scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        stills.last().evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0),
      )
      .toBe(true);
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "desktop", "one project is enough");
  });

  test("shows the static timeline", async ({ page }) => {
    const art = trackArt(page);
    await page.goto("/");
    await expect(page.locator("[data-journey]")).toBeHidden();
    await expect(page.locator(".journey-fallback .timeline")).toBeVisible();
    expect(art.scene).toBe(false);
  });
});
