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

/**
 * Scrolls to the very end of the deck's own pinned scroll span (progress 1), the point where the
 * energy of S+ tops out. Scrolling on past that, to the document's absolute bottom, carries the
 * deck's track element out of the viewport entirely — the stage then stops rendering (it only
 * loops while its `IntersectionObserver` calls it visible) and the pose freezes mid-transition.
 */
async function scrollToEnd(page: Page) {
  await page.evaluate(
    ({ header }) => {
      const el = document.querySelector<HTMLElement>("[data-deck]")!;
      const top = el.getBoundingClientRect().top + scrollY - header;
      const span = el.offsetHeight - (innerHeight - header);
      scrollTo({ top: top + span, behavior: "instant" });
    },
    { header: HEADER_PX },
  );
}

const track = (page: Page) => page.locator("[data-deck]");
const ready = (page: Page) =>
  expect(track(page)).toHaveAttribute("data-deck-ready", "", { timeout: 20_000 });

/** Forces `detectTier`'s reading of the device by stubbing the two Navigator properties it checks,
 *  before any of the page's own scripts run. */
const forceTier = (page: Page, tier: "mid" | "high") =>
  page.addInitScript((t) => {
    const cores = t === "high" ? 8 : 4;
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => cores });
    Object.defineProperty(navigator, "deviceMemory", { get: () => 8 });
  }, tier);

/**
 * Polls `data-deck-vram` until two reads 500ms apart agree, or throws after 10s. `data-deck-ready`
 * flips on the stage's first rendered frame, while the bloom chunk and the seven glow masks can
 * still be arriving, so a single early read is not safe to compare across a dispose/re-mount pair.
 */
async function settledVram(page: Page): Promise<string> {
  const deadline = Date.now() + 10_000;
  let previous = await track(page).getAttribute("data-deck-vram");
  for (;;) {
    if (Date.now() > deadline) {
      throw new Error(`data-deck-vram did not settle within 10s (last read: ${previous})`);
    }
    await page.waitForTimeout(500);
    const current = await track(page).getAttribute("data-deck-vram");
    if (current !== null && current === previous) return current;
    previous = current;
  }
}

/** A one-finger drag through CDP, so the page sees real touch pointer events (pointerType
 *  "touch"). Chromium only: WebKit has no `newCDPSession`, so this is used on `pixel-7` alone. */
async function touchDrag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  steps = 8,
) {
  const cdp = await page.context().newCDPSession(page);
  const point = (x: number, y: number) => ({ x, y, radiusX: 2, radiusY: 2, force: 1, id: 1 });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [point(from.x, from.y)],
  });
  for (let i = 1; i <= steps; i++) {
    const x = from.x + ((to.x - from.x) * i) / steps;
    const y = from.y + ((to.y - from.y) * i) / steps;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point(x, y)] });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
}

/** Drives the page script's swipe logic with synthetic touch pointer events (WebKit has no CDP),
 *  so the swipe test can run on every touch project. */
async function pointerSwipe(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  await page.evaluate(
    ({ from, to }) => {
      const c = document.querySelector<HTMLCanvasElement>("[data-deck-gl]");
      if (!c) throw new Error("no canvas");
      const ev = (type: string, x: number, y: number) =>
        new PointerEvent(type, {
          pointerType: "touch",
          pointerId: 7,
          isPrimary: true,
          clientX: x,
          clientY: y,
          bubbles: true,
          cancelable: true,
        });
      c.dispatchEvent(ev("pointerdown", from.x, from.y));
      c.dispatchEvent(ev("pointermove", (from.x + to.x) / 2, (from.y + to.y) / 2));
      c.dispatchEvent(ev("pointerup", to.x, to.y));
    },
    { from, to },
  );
}

/** The canvas's on-screen box, in client px. */
async function phoneAnchors(page: Page) {
  return page.evaluate(() => {
    const c = document.querySelector<HTMLCanvasElement>("[data-deck-gl]");
    if (!c) throw new Error("no canvas");
    const r = c.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  });
}

const phoneOnly = (info: { project: { name: string } }) =>
  test.skip(!["iphone-15", "pixel-7", "ipad"].includes(info.project.name), "touch projects only");

/** Stubs `DeviceOrientationEvent` and, when `permission` is given, its iOS-style
 *  `requestPermission` gate, before the page's own scripts run. Playwright's WebKit (`iphone-15`,
 *  `ipad`) has a `DeviceOrientationEvent` class, but real WebKit refuses to construct it
 *  ("Illegal constructor") — the tests dispatch synthetic readings, so it's replaced with a
 *  constructible polyfill whenever `new DeviceOrientationEvent(...)` doesn't actually work. */
const stubOrientation = (page: Page, permission: "granted" | "denied" | null) =>
  page.addInitScript((perm) => {
    const w = window as unknown as { DeviceOrientationEvent?: unknown; __asked: number };
    w.__asked = 0;
    const ctor = w.DeviceOrientationEvent as
      (new (type: string, init?: unknown) => Event) | undefined;
    let constructible = typeof ctor === "function";
    if (constructible) {
      try {
        new ctor!("deviceorientation");
      } catch {
        constructible = false;
      }
    }
    if (!constructible) {
      w.DeviceOrientationEvent = class extends Event {
        beta: number | null;
        gamma: number | null;
        constructor(type: string, init?: { beta?: number; gamma?: number }) {
          super(type);
          this.beta = init?.beta ?? null;
          this.gamma = init?.gamma ?? null;
        }
      };
    }
    if (perm) {
      Object.defineProperty(w.DeviceOrientationEvent, "requestPermission", {
        value: () => {
          w.__asked += 1;
          return Promise.resolve(perm);
        },
        configurable: true,
      });
    } else {
      // Playwright's mobile Chromium emulation (pixel-7) exposes its own requestPermission that
      // resolves "prompt" (never "granted"), unlike real Android Chrome, which has none. Strip it
      // so the no-permission-gate ("direct listen") path is what actually runs here.
      delete (w.DeviceOrientationEvent as { requestPermission?: unknown }).requestPermission;
    }
  }, permission);

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

/** Scrolls to an arbitrary fraction of the deck's own pinned span (0–1), not necessarily a rank's
 * centre — the drive's hysteresis and boundary tests need exact fractional positions
 * `scrollToRank`'s rank-centred math can't reach. */
async function scrollToProgress(page: Page, progress: number) {
  await page.evaluate(
    ({ progress, header }) => {
      const el = document.querySelector<HTMLElement>("[data-deck]")!;
      const top = el.getBoundingClientRect().top + scrollY - header;
      const span = el.offsetHeight - (innerHeight - header);
      scrollTo({ top: top + span * progress, behavior: "instant" });
    },
    { progress, header: HEADER_PX },
  );
}

/** Lands on a settled, presented rank E with no drive transition in flight — the fixed starting
 * point every drive test scrolls onward from. Rank 0's own centre is the one scroll position that
 * falls inside the intro's trigger window (`targetP < 0.5 / count`), so `ready` (the stage's first
 * rendered frame, which can still be mid-deal-in) isn't enough here: wait for `data-deck-state` to
 * settle on "scroll" too, the same signal the intro test itself polls for. */
async function atRankE(page: Page): Promise<void> {
  await scrollToRank(page, 0);
  await ready(page);
  await expect(track(page)).toHaveAttribute("data-deck-state", "scroll", { timeout: 10_000 });
}

type RanksWindow = Window & typeof globalThis & { __ranks: string[] };

/**
 * Installs a MutationObserver on the journey's own `data-deck-rank`, from this point forward, that
 * records only genuine value changes into `window.__ranks`. The stage re-touches the attribute on
 * every frame its pose is still animating (energy, phase and vram all move independently of rank),
 * even while the rank itself hasn't moved, and `setAttribute` to an unchanged value still queues a
 * new mutation record — so a raw record count would over-report. De-duping against the last
 * *recorded* value reconstructs the rank's true sequence and proves a jump or a queued transition
 * changes it exactly once, at its own midpoint, with nothing landing on a rank in between.
 */
async function recordRanks(page: Page): Promise<void> {
  await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>(".journey[data-deck]");
    if (!el) throw new Error("no journey element");
    const store: string[] = [];
    (window as unknown as RanksWindow).__ranks = store;
    let last = el.getAttribute("data-deck-rank");
    new MutationObserver((records) => {
      for (const record of records) {
        if (record.type !== "attributes" || record.attributeName !== "data-deck-rank") continue;
        const value = (record.target as Element).getAttribute("data-deck-rank");
        if (value !== null && value !== last) {
          last = value;
          store.push(value);
        }
      }
    }).observe(el, { attributes: true, attributeFilter: ["data-deck-rank"] });
  });
}

async function ranksRecorded(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as RanksWindow).__ranks);
}

/**
 * Polls `data-deck-phase`/`data-deck-rank` with in-page timers (not a Node-side round trip, which
 * would skew the sampling) every 100 ms until `targetRank` settles into "landing" or "presented", or
 * `budgetMs` runs out. Returns the longest unbroken run of "pulling" seen along the way, in ms, so a
 * caller can prove a threshold crossing plays its transition through rather than parking mid-pull.
 */
async function measureCrossing(
  page: Page,
  targetRank: string,
  budgetMs = 2_500,
): Promise<{ rank: string | null; phase: string | null; settled: boolean; maxPullingMs: number }> {
  return page.evaluate(
    ({ targetRank, budgetMs }) => {
      return new Promise<{
        rank: string | null;
        phase: string | null;
        settled: boolean;
        maxPullingMs: number;
      }>((resolve) => {
        const el = document.querySelector<HTMLElement>("[data-deck]")!;
        const deadline = Date.now() + budgetMs;
        let pullingSince: number | null = null;
        let maxPullingMs = 0;
        const tick = () => {
          const phase = el.getAttribute("data-deck-phase");
          const rank = el.getAttribute("data-deck-rank");
          const now = Date.now();
          if (phase === "pulling") {
            if (pullingSince === null) pullingSince = now;
            maxPullingMs = Math.max(maxPullingMs, now - pullingSince);
          } else {
            pullingSince = null;
          }
          const settled = rank === targetRank && (phase === "landing" || phase === "presented");
          if (settled || now > deadline) {
            resolve({ rank, phase, settled, maxPullingMs });
            return;
          }
          setTimeout(tick, 100);
        };
        tick();
      });
    },
    { targetRank, budgetMs },
  );
}

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
    await recordRanks(page);
    await page.mouse.click(stage.x + x!, stage.y + y!);
    await expect(track(page)).toHaveAttribute("data-deck-rank", "B", { timeout: 10_000 });
    // A racked-card click is direct too: nothing else is recorded on the way to it.
    expect(await ranksRecorded(page)).toEqual(["B"]);
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
    // Every rank has carried a portrait since Plan 0 (src/images/deck/): rank E's rail button
    // names its renditions, and the stage must fetch one of them once the deck mounts.
    await page.goto("/");
    const button = page.locator('button[data-deck-rank][data-index="0"]');
    const renditions = [
      await button.getAttribute("data-portrait-1x"),
      await button.getAttribute("data-portrait-2x"),
    ].filter((v): v is string => Boolean(v));
    if (renditions.length === 0) {
      throw new Error("expected rank E's rail button to carry data-portrait-1x and -2x");
    }
    const paths = new Set(renditions.map((r) => new URL(r, "http://127.0.0.1").pathname));
    const portraitRequest = page.waitForRequest((request) =>
      paths.has(new URL(request.url()).pathname),
    );

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

  test("the hint has no swipe wording on a precise pointer", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "one project is enough");
    await page.goto("/");
    await expect(page.locator("[data-deck-hint]")).toHaveText("↓ scroll or pick a rank");
  });

  test("a mouse click on the presented card never asks for orientation permission", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "orientation tilt is a phone behaviour");
    await stubOrientation(page, "granted");
    await page.goto(FROZEN);
    await scrollToRank(page, 2);
    await ready(page);
    const box = (await page.locator("[data-deck-gl]").boundingBox())!;
    // The presented card sits to the right of the rack in the desktop layout; a click here would
    // enable tilt on a phone (spec §7), so it proves the mouse path is guarded by pointerType.
    await page.mouse.click(box.x + box.width * 0.85, box.y + box.height * 0.5);
    await expect(track(page)).toHaveAttribute("data-deck-tilt", "off");
    expect(await page.evaluate(() => (window as unknown as { __asked: number }).__asked)).toBe(0);
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
    await expect(track(page)).not.toHaveAttribute("data-deck-tilt");
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

test.describe("the drive", () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "desktop", "the drive's timing is exercised on desktop only");
  });

  test("a threshold crossing plays in full without more scrolling", async ({ page }) => {
    await page.goto("/");
    await atRankE(page);
    // (1 + 0.4) / 7 is past D's boundary and its hysteresis band both: a single instant scroll,
    // with no further scrolling, must still land on D having played the whole transition.
    await scrollToProgress(page, (1 + 0.4) / 7);
    const result = await measureCrossing(page, "D");
    expect(result.settled).toBe(true);
    expect(result.rank).toBe("D");
    expect(result.phase).toMatch(/^(landing|presented)$/);
    // The transition's own duration is 900 ms; a park mid-pull would show as a much longer run.
    expect(result.maxPullingMs).toBeLessThanOrEqual(1_500);
  });

  test("a rail jump changes the rank exactly once, at the transition's midpoint", async ({
    page,
  }) => {
    await page.goto("/");
    await atRankE(page);
    await recordRanks(page);
    await page.getByRole("button", { name: "Rank S+, Sr. Systems Architect" }).click();
    await expect(track(page)).toHaveAttribute("data-deck-rank", "S+", { timeout: 2_500 });
    // Nothing between: no D, C, B, A or S ever became the recorded rank on the way there.
    expect(await ranksRecorded(page)).toEqual(["S+"]);
  });

  test("scrolling ahead during a transition queues one direct transition to the new target", async ({
    page,
  }) => {
    await page.goto("/");
    await atRankE(page);
    await recordRanks(page);
    await scrollToRank(page, 1); // D's centre
    await page.waitForTimeout(200); // still mid-transition: 900 ms hasn't elapsed
    await scrollToRank(page, 4); // A's centre
    await expect(track(page)).toHaveAttribute("data-deck-rank", "A", { timeout: 2_500 });
    // The first transition (to D) finishes, then one direct transition D → A plays: never C or B.
    expect(await ranksRecorded(page)).toEqual(["D", "A"]);
  });

  test("a parked scroll never shows a half card", async ({ page }) => {
    await page.goto("/");
    await atRankE(page);
    // Exactly the E|D boundary: still inside E's hysteresis band ([−0.15, 1.15) of a rank), so the
    // deck must hold E, fully settled, not a half-pulled card.
    await scrollToProgress(page, 1 / 7);
    await page.waitForTimeout(1_500);
    await expect(track(page)).toHaveAttribute("data-deck-rank", "E");
    await expect(track(page)).toHaveAttribute("data-deck-phase", "presented");
    // Past the boundary by more than the hysteresis: now it crosses and settles on D.
    await scrollToProgress(page, (1 + 0.3) / 7);
    await expect(track(page)).toHaveAttribute("data-deck-rank", "D", { timeout: 2_500 });
    await expect(track(page)).toHaveAttribute("data-deck-phase", /^(landing|presented)$/, {
      timeout: 2_500,
    });
  });

  test("renders a deterministic frame frozen mid-transition, within the desktop vram ceiling at 2560 × 1440 dpr 2", async ({
    browser,
  }, info) => {
    test.setTimeout(60_000);
    const context = await browser.newContext({
      viewport: { width: 2560, height: 1440 },
      deviceScaleFactor: 2,
    });
    const p = await context.newPage();
    await forceTier(p, "high");
    // deck-k backdates a one-rank transition so it lands exactly at the given linear time fraction;
    // 0.5 is its midpoint. freezeDrive only builds a transition when the settled rank is above 0, so
    // this scrolls to S+ (a transition from S), never E.
    await p.goto("/?deck-freeze=2026-09-25&deck-k=0.5");
    await scrollToRank(p, 6);
    await ready(p);
    await expect(track(p)).toHaveAttribute("data-deck-phase", /^(pulling|leaving)$/);
    // `data-deck-slots` is the rack's own seven layout anchors (Plan 2), not the two live print-in
    // text slots the brief for this test names — that pairing isn't observable from the DOM as
    // written, so this instead pins the one thing the attribute really proves here: the frozen
    // desktop layout is still fully populated mid-transition.
    const slots = (await track(p).getAttribute("data-deck-slots"))!.split(";");
    expect(slots).toHaveLength(7);
    const vram = Number(await settledVram(p));
    info.annotations.push({
      type: "vram at 2560 × 1440, dpr 2, frozen mid-transition",
      description: `${vram} MB`,
    });
    expect(vram).toBeGreaterThan(0);
    expect(vram).toBeLessThanOrEqual(80);
    await context.close();
  });
});

test.describe("the deck on a phone", () => {
  test.beforeEach(({}, info) => phoneOnly(info));

  test("the hint invites a swipe, and the canvas leaves vertical pans and pinch-zoom to the browser", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("[data-deck-hint]")).toHaveText("↓ scroll, swipe or pick a rank");
    expect(
      await page.locator("[data-deck-gl]").evaluate((el) => getComputedStyle(el).touchAction),
    ).toBe("pan-y pinch-zoom");
  });

  test("a horizontal swipe moves one rank each way", async ({ page }) => {
    await page.goto("/");
    await scrollToRank(page, 2);
    await ready(page);
    await expect(track(page)).toHaveAttribute("data-deck-rank", "C");
    const box = await phoneAnchors(page);
    const y = box.top + box.height * 0.45;
    await pointerSwipe(
      page,
      { x: box.left + box.width * 0.8, y },
      { x: box.left + box.width * 0.2, y },
    );
    await expect(track(page)).toHaveAttribute("data-deck-rank", "B");
    await pointerSwipe(
      page,
      { x: box.left + box.width * 0.2, y },
      { x: box.left + box.width * 0.8, y },
    );
    await expect(track(page)).toHaveAttribute("data-deck-rank", "C");
  });

  test("a swipe at either end changes neither the rank nor the scroll", async ({ page }) => {
    await page.goto("/");
    await scrollToRank(page, 0);
    await ready(page);
    await expect(track(page)).toHaveAttribute("data-deck-rank", "E");
    const box = await phoneAnchors(page);
    const y = box.top + box.height * 0.45;
    const before = await page.evaluate(() => scrollY);
    // Swipe right (back) at the very first rank.
    await pointerSwipe(
      page,
      { x: box.left + box.width * 0.2, y },
      { x: box.left + box.width * 0.8, y },
    );
    await expect(track(page)).toHaveAttribute("data-deck-rank", "E");
    expect(await page.evaluate(() => scrollY)).toBe(before);

    await scrollToRank(page, 6);
    await ready(page);
    await expect(track(page)).toHaveAttribute("data-deck-rank", "S+");
    const beforeEnd = await page.evaluate(() => scrollY);
    // Swipe left (forward) at the very last rank.
    await pointerSwipe(
      page,
      { x: box.left + box.width * 0.8, y },
      { x: box.left + box.width * 0.2, y },
    );
    await expect(track(page)).toHaveAttribute("data-deck-rank", "S+");
    expect(await page.evaluate(() => scrollY)).toBe(beforeEnd);
  });

  test("a vertical drag scrolls the page without swiping the deck", async ({ page }, info) => {
    test.skip(
      info.project.name !== "pixel-7",
      "proves touch-action: pan-y with a real touch pointer; CDP touch works only on Chromium",
    );
    await page.goto("/");
    await scrollToRank(page, 2);
    await ready(page);
    await expect(track(page)).toHaveAttribute("data-deck-rank", "C");
    const box = await phoneAnchors(page);
    const before = await page.evaluate(() => scrollY);
    await touchDrag(
      page,
      { x: box.left + box.width * 0.5, y: box.top + box.height * 0.7 },
      { x: box.left + box.width * 0.5, y: box.top + box.height * 0.2 },
    );
    await expect.poll(() => page.evaluate(() => scrollY)).not.toBe(before);
    // The page moved, so the deck may have moved with the scroll, but not by the swipe's rule: a
    // vertical drag never jumps a rank. Compare against the scroll-derived rank instead.
    const rank = await track(page).getAttribute("data-deck-rank");
    expect(["B", "C", "D"]).toContain(rank);
  });

  test("a tap on the peeking card moves forward; a tap on the presented card does not jump", async ({
    page,
  }) => {
    await page.goto("/");
    await scrollToRank(page, 1);
    await ready(page);
    await expect(track(page)).toHaveAttribute("data-deck-rank", "D");
    const box = await phoneAnchors(page);
    // The next card peeks in 24 px from the right edge (spec §6); the card's vertical centre sits
    // in the upper half above the rail.
    await page.touchscreen.tap(box.left + box.width - 18, box.top + box.height * 0.42);
    await expect(track(page)).toHaveAttribute("data-deck-rank", "C");
    await page.touchscreen.tap(box.left + box.width * 0.5, box.top + box.height * 0.42);
    await page.waitForTimeout(400);
    await expect(track(page)).toHaveAttribute("data-deck-rank", "C");
  });

  test("a swipe moves one rank directly, and so does a tap on the peeking card", async ({
    page,
  }, info) => {
    // A real touch drag needs CDP (`touchDrag`); only Chromium (`pixel-7`) has it.
    test.skip(info.project.name !== "pixel-7", "CDP touch drags work only on Chromium");
    await page.goto("/");
    await scrollToRank(page, 2);
    await ready(page);
    await expect(track(page)).toHaveAttribute("data-deck-rank", "C");
    const box = await phoneAnchors(page);
    const y = box.top + box.height * 0.45;

    await recordRanks(page);
    await touchDrag(
      page,
      { x: box.left + box.width * 0.8, y },
      { x: box.left + box.width * 0.2, y },
    );
    await expect(track(page)).toHaveAttribute("data-deck-rank", "B", { timeout: 2_500 });
    expect(await ranksRecorded(page)).toEqual(["B"]);

    await recordRanks(page);
    // The next card peeks in 24 px from the right edge (spec §6).
    await page.touchscreen.tap(box.left + box.width - 18, box.top + box.height * 0.42);
    await expect(track(page)).toHaveAttribute("data-deck-rank", "A", { timeout: 2_500 });
    expect(await ranksRecorded(page)).toEqual(["A"]);
  });

  test("a tap on the presented card turns orientation tilt on, and leaving the section turns it off", async ({
    page,
  }) => {
    await stubOrientation(page, null);
    await page.goto("/");
    await scrollToRank(page, 3);
    await ready(page);
    await expect(track(page)).toHaveAttribute("data-deck-tilt", "off");
    const box = await phoneAnchors(page);
    await page.touchscreen.tap(box.left + box.width * 0.5, box.top + box.height * 0.42);
    await expect(track(page)).toHaveAttribute("data-deck-tilt", "on");
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.evaluate(() => {
      for (const [beta, gamma] of [
        [40, -5],
        [48, 3],
        [30, -12],
      ]) {
        window.dispatchEvent(new DeviceOrientationEvent("deviceorientation", { beta, gamma }));
      }
    });
    await page.waitForTimeout(300);
    expect(errors).toEqual([]);
    await expect(track(page)).toHaveAttribute("data-deck-ready", "");
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await expect(track(page)).toHaveAttribute("data-deck-tilt", "off");
  });

  test("a denied orientation permission is asked once and ends silently", async ({ page }) => {
    await stubOrientation(page, "denied");
    await page.goto("/");
    await scrollToRank(page, 3);
    await ready(page);
    const box = await phoneAnchors(page);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.touchscreen.tap(box.left + box.width * 0.5, box.top + box.height * 0.42);
    await page.waitForTimeout(300);
    await page.touchscreen.tap(box.left + box.width * 0.5, box.top + box.height * 0.42);
    await page.waitForTimeout(300);
    await expect(track(page)).toHaveAttribute("data-deck-tilt", "off");
    expect(await page.evaluate(() => (window as unknown as { __asked: number }).__asked)).toBe(1);
    expect(errors).toEqual([]);
  });

  test("a granted orientation permission is asked once, across leaving and returning to the section", async ({
    page,
  }) => {
    await stubOrientation(page, "granted");
    await page.goto("/");
    await scrollToRank(page, 3);
    await ready(page);
    const box = await phoneAnchors(page);
    await page.touchscreen.tap(box.left + box.width * 0.5, box.top + box.height * 0.42);
    await expect(track(page)).toHaveAttribute("data-deck-tilt", "on");
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await expect(track(page)).toHaveAttribute("data-deck-tilt", "off");
    await scrollToRank(page, 3);
    await ready(page);
    await page.touchscreen.tap(box.left + box.width * 0.5, box.top + box.height * 0.42);
    await expect(track(page)).toHaveAttribute("data-deck-tilt", "on");
    expect(await page.evaluate(() => (window as unknown as { __asked: number }).__asked)).toBe(1);
  });

  test("runs the mid tier within the phone budget: no bloom request, under 40 MB", async ({
    page,
  }) => {
    const requests: string[] = [];
    page.on("request", (r) => requests.push(r.url()));
    await page.goto("/");
    await scrollToEnd(page);
    await ready(page);
    await expect(track(page)).toHaveAttribute("data-deck-tier", "mid");
    await expect(track(page)).toHaveAttribute("data-deck-bloom", "off");
    await page.waitForTimeout(1500);
    expect(requests.some((u) => /deck-bloom/.test(u))).toBe(false);
    const vram = Number(await settledVram(page));
    expect(vram).toBeGreaterThan(0);
    expect(vram).toBeLessThanOrEqual(40);
  });

  test("an orientation change relayouts and keeps the deck", async ({ page }, info) => {
    test.skip(info.project.name !== "pixel-7", "one phone is enough");
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await scrollToRank(page, 4);
    await ready(page);
    const size = page.viewportSize();
    if (!size) throw new Error("no viewport");
    await page.setViewportSize({ width: size.height, height: size.width });
    await page.waitForTimeout(400);
    await expect(track(page)).toHaveAttribute("data-deck-ready", "");
    await page.setViewportSize(size);
    await page.waitForTimeout(400);
    await expect(track(page)).toHaveAttribute("data-deck-ready", "");
    await scrollToRank(page, 4);
    await expect(track(page)).toHaveAttribute("data-deck-rank", "A");
    expect(errors).toEqual([]);
  });
});

test.describe("the card deck's energy", () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name === "reduced-motion", "covered above");
  });

  test("blooms on the high tier through its own lazy chunk, and not on the mid tier", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "coarse pointers keep phones on the mid tier");
    await forceTier(page, "high");
    const bloomRequest = page.waitForRequest((r) => /deck-bloom/.test(r.url()));
    await page.goto("/");
    await scrollToRank(page, 5);
    await ready(page);
    await bloomRequest;
    await expect(track(page)).toHaveAttribute("data-deck-bloom", "on");

    const mid = await page.context().newPage();
    await forceTier(mid, "mid");
    const requests: string[] = [];
    mid.on("request", (r) => requests.push(r.url()));
    await mid.goto("/");
    await scrollToRank(mid, 5);
    await ready(mid);
    await mid.waitForTimeout(1500);
    expect(requests.some((u) => /deck-bloom/.test(u))).toBe(false);
    await expect(mid.locator("[data-deck]")).toHaveAttribute("data-deck-bloom", "off");
    await mid.close();
  });

  test("keeps the energy at zero through E–A and reaches full energy at the end of S+", async ({
    page,
  }, info) => {
    await page.goto("/");
    for (const [i, rank] of [
      [0, "E"],
      [2, "C"],
      [4, "A"],
    ] as const) {
      await scrollToRank(page, i);
      await ready(page);
      // The rank lands first, so the energy read below belongs to it and not to the rank before.
      await expect(track(page)).toHaveAttribute("data-deck-rank", rank);
      await expect(track(page)).toHaveAttribute("data-deck-energy", "0.00");
    }
    // Energy still ramps inside S+, not just at its very end: (6 + 0.2) / 7 sits well inside S+'s
    // own stretch (past the hysteresis band, which still holds S at (6 + 0.1) / 7), settled and
    // presented, with the ramp roughly a third of the way through S+'s own energy window.
    await scrollToProgress(page, (6 + 0.2) / 7);
    await expect(track(page)).toHaveAttribute("data-deck-rank", "S+", { timeout: 2_500 });
    await expect(track(page)).toHaveAttribute("data-deck-phase", "presented", { timeout: 2_500 });
    const midEnergy = Number(await track(page).getAttribute("data-deck-energy"));
    expect(midEnergy).toBeLessThanOrEqual(0.5);
    await scrollToEnd(page);
    await expect
      .poll(async () => Number(await track(page).getAttribute("data-deck-energy")))
      .toBeGreaterThanOrEqual(0.95);
    const vram = Number(await track(page).getAttribute("data-deck-vram"));
    expect(vram).toBeGreaterThan(0);
    expect(vram).toBeLessThanOrEqual(info.project.name === "desktop" ? 80 : 40);
  });

  test("keeps the canvas transparent where energy is silent, and shows only a partial halo where it isn't", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "coarse pointers keep phones on the mid tier");
    for (const tier of ["high", "mid"] as const) {
      const p = await page.context().newPage();
      await forceTier(p, tier);
      await p.goto("/?deck-freeze=2026-09-25");
      await scrollToRank(p, 0);
      await ready(p);
      await expect(track(p)).toHaveAttribute("data-deck-bloom", tier === "high" ? "on" : "off");
      // Rank E carries no energy: the frozen frame's own corner read (Task 8, step 12) should come
      // back fully transparent regardless of tier, proving the bloom overlay adds nothing where its
      // texture is black.
      await expect(track(p)).toHaveAttribute("data-deck-corner-alpha", "0");
      if (tier === "high") {
        // S+ carries full energy: on the high tier its glow can spill as far as the stage's
        // corner, so a halo (a low, non-zero alpha) is expected there — never an opaque composite,
        // which would read 255.
        await scrollToRank(p, 6);
        await ready(p);
        // `ready` is already set from rank E: wait for the S+ frame, which emits the rank and its
        // corner read together, or the read below sees E's "0".
        await expect(track(p)).toHaveAttribute("data-deck-rank", "S+");
        const cornerAlpha = Number(await track(p).getAttribute("data-deck-corner-alpha"));
        expect(cornerAlpha).toBeLessThan(128);
      }
      await p.close();
    }
  });

  test("a dispose and re-mount leaves the texture estimate where it was", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "coarse pointers keep phones on the mid tier");
    test.setTimeout(60_000);
    await forceTier(page, "high");
    await page.goto("/");
    await scrollToRank(page, 6);
    await ready(page);
    await expect(track(page)).toHaveAttribute("data-deck-bloom", "on");
    const before = await settledVram(page);
    await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
    // deck-params.ts's tiers.disposeAfterMs (30s) plus a one-second margin for the timer to fire.
    await page.waitForTimeout(31_000);
    await expect(track(page)).not.toHaveAttribute("data-deck-ready", "");
    await scrollToRank(page, 6);
    await ready(page);
    await expect(track(page)).toHaveAttribute("data-deck-bloom", "on");
    const after = await settledVram(page);
    expect(after).toBe(before);
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
    await expect(page.locator("[data-deck]")).not.toHaveAttribute("data-deck-tilt");
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
