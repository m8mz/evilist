import { readdirSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import { HEADER_PX } from "./constants";

const RANKS = ["E", "D", "C", "B", "A", "S", "S+"] as const;
const TITLES = [
  "T1 Tech Support",
  "Web Concierge (WP Live)",
  "Professional Services Engineer",
  "T3 Tech Support",
  "Systems Administrator",
  "Linux Engineer",
  "Sr. Systems Architect",
] as const;
const FROZEN = "/?deck-freeze=2026-09-25";

/** Scrolls so the journey is at the middle of rank `i` (of 7). */
async function scrollToRank(page: Page, i: number) {
  await page.evaluate(
    ({ rank, header }) => {
      const el = document.querySelector<HTMLElement>("[data-deck]")!;
      const top = el.getBoundingClientRect().top + scrollY - header;
      const span = el.offsetHeight - (innerHeight - header);
      scrollTo({ top: top + span * ((rank + 0.5) / 7), behavior: "instant" });
    },
    { rank: i, header: HEADER_PX },
  );
}

const track = (page: Page) => page.locator("[data-deck]");
const ready = (page: Page) =>
  expect(track(page)).toHaveAttribute("data-deck-ready", "", { timeout: 20_000 });

/** Records the deck chunk and the portrait requests. */
function trackRequests(page: Page) {
  const seen = { deck: false, hosts: new Set<string>() };
  page.on("request", (request) => {
    const url = new URL(request.url());
    seen.hosts.add(url.host);
    if (/\/_astro\/(deck-stage|three)/.test(url.pathname)) seen.deck = true;
  });
  return seen;
}

interface DeckRecording {
  rank: string[];
  state: string[];
}

/**
 * Installs a MutationObserver on `.journey[data-deck]` before any of the page's own scripts run,
 * so it catches every value `data-deck-rank` and `data-deck-state` take from the very first paint
 * (a late or deep-scrolled mount's first rendered frame included), not just the settled end state.
 */
async function recordDeck(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const store: DeckRecordingWindow["__deck"] = { rank: [], state: [] };
    (window as unknown as DeckRecordingWindow).__deck = store;
    const attrKey: Record<string, keyof typeof store> = {
      "data-deck-rank": "rank",
      "data-deck-state": "state",
    };
    const push = (el: Element, attribute: string) => {
      const key = attrKey[attribute];
      const value = key ? el.getAttribute(attribute) : null;
      if (key && value !== null) store[key].push(value);
    };
    new MutationObserver((records) => {
      for (const record of records) {
        if (record.type !== "attributes" || !record.attributeName) continue;
        if (!(record.target instanceof Element) || !record.target.matches(".journey[data-deck]")) {
          continue;
        }
        push(record.target, record.attributeName);
      }
    }).observe(document, {
      // `document`, not `document.documentElement`: an init script runs before the document has
      // parsed even the `<html>` tag, so `documentElement` is still null and `observe()` throws.
      // `document` itself is a valid `Node` target from the very first instant.
      subtree: true,
      attributes: true,
      attributeFilter: ["data-deck-rank", "data-deck-state"],
    });
  });
}

async function deckRecorded(page: Page): Promise<DeckRecording> {
  return page.evaluate(() => (window as unknown as DeckRecordingWindow).__deck);
}

type DeckRecordingWindow = Window & typeof globalThis & { __deck: DeckRecording };

test.describe("the card deck", () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name === "reduced-motion", "covered below");
  });

  test("loads no deck chunk with the page, then prefetches it after the first scroll", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "one project is enough");
    const seen = trackRequests(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(seen.deck).toBe(false);
    const chunk = page.waitForRequest(/\/_astro\/deck-stage/, { timeout: 10_000 });
    await page.evaluate(() => scrollBy({ top: 120, behavior: "instant" }));
    await chunk;
    expect(seen.deck).toBe(true);
  });

  test("mounts when the journey is on screen, plays the intro, and settles in the scroll state", async ({
    page,
  }) => {
    await recordDeck(page);
    await page.goto("/");
    await scrollToRank(page, 0);
    await ready(page);
    await expect(track(page)).toHaveAttribute("data-deck-tier", /^(mid|high)$/);
    await expect(track(page)).toHaveAttribute("data-deck-state", "scroll", { timeout: 10_000 });
    await expect(track(page)).toHaveAttribute("data-deck-rank", "E");
    await expect(track(page)).toHaveAttribute("data-deck-phase", /^(landing|presented)$/);
    const recorded = await deckRecorded(page);
    expect(recorded.state).toContain("intro");
    expect(recorded.state.at(-1)).toBe("scroll");
  });

  test("advances through all seven ranks in order as you scroll, and the rail follows", async ({
    page,
  }) => {
    await page.goto(FROZEN);
    await scrollToRank(page, 0);
    await ready(page);
    for (const [i, rank] of RANKS.entries()) {
      await scrollToRank(page, i);
      await expect(track(page)).toHaveAttribute("data-deck-rank", rank);
      await expect(
        page.getByRole("button", { name: `Rank ${rank}, ${TITLES[i]}` }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("[data-deck-rank][aria-pressed='true']")).toHaveCount(1);
      await expect(page.locator("[data-deck-counter]")).toHaveText(`0${i + 1} / 07`);
      await expect(page.locator("[data-deck-live]")).toContainText(`Rank ${rank}, `);
    }
  });

  test("scrolling back up rewinds the deck", async ({ page }) => {
    await page.goto(FROZEN);
    await scrollToRank(page, 6);
    await ready(page);
    await expect(track(page)).toHaveAttribute("data-deck-rank", "S+");
    await scrollToRank(page, 1);
    await expect(track(page)).toHaveAttribute("data-deck-rank", "D");
  });

  test("the rail jumps to a rank on click and moves focus with the arrows", async ({ page }) => {
    await page.goto(FROZEN);
    await scrollToRank(page, 0);
    await ready(page);
    await page.getByRole("button", { name: "Rank S+, Sr. Systems Architect" }).click();
    await expect(track(page)).toHaveAttribute("data-deck-rank", "S+", { timeout: 10_000 });
    const first = page.getByRole("button", { name: "Rank E, T1 Tech Support" });
    await first.focus();
    await page.keyboard.press("ArrowRight");
    await expect(
      page.getByRole("button", { name: "Rank D, Web Concierge (WP Live)" }),
    ).toBeFocused();
    await page.keyboard.press("End");
    await expect(
      page.getByRole("button", { name: "Rank S+, Sr. Systems Architect" }),
    ).toBeFocused();
  });

  test("clicking a racked card jumps to it, and hovering one shows a pointer", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "the rack is a desktop layout");
    await page.goto(FROZEN);
    await scrollToRank(page, 0);
    await ready(page);
    const slots = (await track(page).getAttribute("data-deck-slots"))!
      .split(";")
      .map((s) => s.split(",").map(Number));
    expect(slots).toHaveLength(7);
    const stage = (await page.locator(".journey__stage").boundingBox())!;
    const [x, y] = slots[3]!;
    await page.mouse.move(stage.x + x!, stage.y + y!);
    await expect(page.locator("[data-deck-gl]")).toHaveClass(/is-pointer/);
    await page.mouse.click(stage.x + x!, stage.y + y!);
    await expect(track(page)).toHaveAttribute("data-deck-rank", "B", { timeout: 10_000 });
  });

  test("a stage that arrives late paints only the rank the visitor is on, with no intro", async ({
    page,
  }) => {
    // Not the frozen URL: frozen mode always snaps `p` and always skips the intro, so this test
    // would pass whether or not the late-mount snap fix is in place. A real (unfrozen) mount is
    // the only way to prove the fix, since it's the only path where `p` used to start at 0 and
    // smooth up to the target over several frames.
    await recordDeck(page);
    await page.route(/\/_astro\/deck-stage/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.continue();
    });
    await page.goto("/");
    await scrollToRank(page, 4); // rank A
    await ready(page);
    const recorded = await deckRecorded(page);
    expect(new Set(recorded.rank)).toEqual(new Set(["A"]));
    expect(recorded.state).not.toContain("intro");
  });

  test("fetches a rank's portrait once the rail carries one, and still reaches ready", async ({
    page,
  }) => {
    // No stage yet has a real portrait (src/images/deck/ is still empty), so there is nothing to
    // exercise this path against. Rewrite rank E's rail button to point at a still the build
    // already serves (the author picture), so a real request happens.
    const stillFile = readdirSync("dist/client/_astro").find(
      (f) => f.startsWith("author-pic") && f.endsWith(".webp"),
    );
    if (!stillFile) throw new Error("expected a built author-pic still under dist/client/_astro");
    const portraitPath = `/_astro/${stillFile}`;

    await page.route(
      (url) => url.pathname === "/",
      async (route) => {
        const response = await route.fetch();
        const html = await response.text();
        const patched = html.replace(
          /<button([^>]*data-index="0"[^>]*)>/,
          (_match, attrs: string) =>
            `<button${attrs} data-portrait-1x="${portraitPath}" data-portrait-2x="${portraitPath}">`,
        );
        await route.fulfill({ response, body: patched });
      },
    );
    const portraitRequest = page.waitForRequest(
      (request) => new URL(request.url()).pathname === portraitPath,
    );

    await page.goto("/");
    await scrollToRank(page, 0);
    await portraitRequest;
    await ready(page);
  });

  test("keeps the canvas the size of the stage through a resize", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "desktop windows");
    await page.goto(FROZEN);
    await scrollToRank(page, 2);
    await ready(page);
    await page.setViewportSize({ width: 1024, height: 700 });
    await scrollToRank(page, 2);
    await expect(track(page)).toHaveAttribute("data-deck-rank", "C");
    // The stage's ResizeObserver fires asynchronously after the viewport change; poll instead of
    // reading the canvas once, or this races the callback under load.
    const dpr = await page.evaluate(() => devicePixelRatio);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const canvas = document.querySelector<HTMLCanvasElement>("[data-deck-gl]")!;
          const stage = document.querySelector<HTMLElement>(".journey__stage")!;
          return Math.abs(canvas.width / devicePixelRatio - stage.clientWidth);
        }),
      )
      .toBeLessThanOrEqual(2 * dpr);
  });

  test("is hidden from assistive tech while the timeline stays readable", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-deck-gl]")).toHaveAttribute("aria-hidden", "true");
    await expect(page.getByRole("heading", { level: 3, name: "T1 Tech Support" })).toHaveCount(1);
    await expect(page.getByRole("toolbar", { name: "Ranks" })).toBeVisible();
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

  test("a lost WebGL context hands the section to the timeline within two seconds", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "one project is enough");
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(FROZEN);
    await scrollToRank(page, 1);
    await ready(page);
    await page.evaluate(() => {
      const canvas = document.querySelector<HTMLCanvasElement>("[data-deck-gl]")!;
      const gl = canvas.getContext("webgl2")!;
      gl.getExtension("WEBGL_lose_context")!.loseContext();
    });
    await expect(page.locator("[data-deck-root]")).toHaveAttribute("data-deck-fallback", "", {
      timeout: 5000,
    });
    await expect(page.locator(".journey-fallback .timeline")).toBeVisible();
    await expect(track(page)).toBeHidden();
    expect(errors).toEqual([]);
  });

  test("loads nothing from third parties, keeps the textures under the ceiling and reaches the end", async ({
    page,
  }, info) => {
    const seen = trackRequests(page);
    await page.goto(FROZEN);
    await scrollToRank(page, 6);
    await ready(page);
    expect([...seen.hosts]).toEqual(["127.0.0.1:4399"]);
    const vram = Number(await track(page).getAttribute("data-deck-vram"));
    expect(vram).toBeGreaterThan(0);
    expect(vram).toBeLessThanOrEqual(info.project.name === "desktop" ? 80 : 40);
    await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
    await expect
      .poll(() =>
        page.evaluate(() =>
          Number(
            getComputedStyle(document.querySelector("[data-deck]")!).getPropertyValue("--progress"),
          ),
        ),
      )
      .toBeGreaterThanOrEqual(0.999);
    await expect(track(page)).toHaveAttribute("data-deck-rank", "S+");
  });
});

test.describe("reduced motion", () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "reduced-motion", "reduced-motion project only");
  });

  test("shows the static timeline instead of the deck, and never fetches the stage", async ({
    page,
  }) => {
    const seen = trackRequests(page);
    await page.goto("/");
    await expect(page.locator("[data-deck]")).toBeHidden();
    await expect(page.locator(".journey-fallback .timeline")).toBeVisible();
    await expect(page.locator(".journey-fallback .timeline__title")).toHaveCount(7);
    await expect(page.locator(".journey-fallback .timeline__log")).toHaveCount(7);
    await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
    await page.waitForLoadState("networkidle");
    expect(seen.deck).toBe(false);
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "desktop", "one project is enough");
  });

  test("shows the static timeline", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-deck]")).toBeHidden();
    await expect(page.locator(".journey-fallback .timeline")).toBeVisible();
  });
});
