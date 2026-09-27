// Reproduces (and, after the fix, disproves) the one-frame tear Marcus sees on the presented
// card's portrait during a rank's text print-in (task 5's report): a real, headed Chromium (the
// tear is a real-GPU race) screencasts a transition and its print-in via CDP, then looks for a
// one-frame excursion in the portrait window. The default mode jumps E → S in one transition;
// --scroll drives synthetic trackpad wheel ticks E → S+ instead (six arrivals and print-ins under
// scroll load, matching Marcus's own recording: real Chrome, a trackpad, not a click).
// Usage: pnpm build && pnpm tear:deck [--scroll] [--headless]
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const PORT = 4394;
const BASE = `http://127.0.0.1:${PORT}`;
const HEADER_PX = 64; // tokens.css --header-h
const RANK_COUNT = 7;
const RANK_E = 0;
const RANK_S = 5;
const RUNS = 3;
const CAPTURE_MS = 2500;
const SCROLL_CAPTURE_MS = 7000; // six arrivals and print-ins, plus S+'s own settle
const SCROLL_DRIVE_MS = 5000; // about how long a trackpad scroll from E to S+ takes
const WHEEL_DELTA = 40;
const WHEEL_INTERVAL_MS = 16;
const OUT_DIR = "/tmp/deck-tear"; // torn frames save here
const TEAR_MIN = 12; // a one-frame excursion vs. both neighbours, which agree within NEIGHBOUR_MAX
const NEIGHBOUR_MAX = 4;
const headless = process.argv.includes("--headless");
const scrollMode = process.argv.includes("--scroll");
const mode = scrollMode ? "scroll" : "jump";
if (headless) console.warn("--headless: a software-rendered run may not show the real-GPU race.");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** The scroll position of rank `index`'s centre (of RANK_COUNT), in page px. */
async function rankCentre(page, index) {
  return page.$eval(
    "[data-deck]",
    (el, { index, header, count }) => {
      const top = el.getBoundingClientRect().top + scrollY - header;
      const span = el.offsetHeight - (innerHeight - header);
      return top + span * ((index + 0.5) / count);
    },
    { index, header: HEADER_PX, count: RANK_COUNT },
  );
}

/** Scrolls the page so the journey sits at rank `index`'s centre, instantly. */
async function scrollToRank(page, index) {
  const top = await rankCentre(page, index);
  await page.evaluate((top) => scrollTo({ top, behavior: "instant" }), top);
}

/** Drives the deck with synthetic trackpad wheel ticks (CDP `Input.dispatchMouseEvent`,
 * "mouseWheel") until `rank` lands, for at most SCROLL_DRIVE_MS — through every intervening rank.
 * Stops on the deck's own rank, not a computed scroll position: wheel input scrolls with the
 * browser's own momentum, so a raw pixel target can overshoot into the page's overscroll. */
async function wheelDriveToRank(page, rank) {
  const client = await page.context().newCDPSession(page);
  const stage = await page.$eval(".journey__stage", (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  const start = Date.now();
  for (let tick = 0; Date.now() - start < SCROLL_DRIVE_MS; tick++) {
    await client.send("Input.dispatchMouseEvent", {
      type: "mouseWheel",
      x: stage.x,
      y: stage.y,
      deltaX: 0,
      deltaY: WHEEL_DELTA,
    });
    if (tick % 5 === 4) {
      if ((await page.$eval("[data-deck]", (el) => el.dataset.deckRank)) === rank) break;
    }
    await sleep(WHEEL_INTERVAL_MS);
  }
  await client.detach().catch(() => {});
}

/** Waits for the stage to have mounted (left "loading") and landed on `rank`. */
async function waitForRank(page, rank) {
  await page.waitForFunction(
    (rank) => {
      const el = document.querySelector("[data-deck]");
      return el !== null && el.dataset.deckState !== "loading" && el.dataset.deckRank === rank;
    },
    rank,
    { timeout: 20_000 },
  );
}

/** Stubs the high-tier readings deck-tier.ts's detectTier wants, so the harness is deterministic
 * wherever it runs: a fine pointer, no reduced motion, enough memory and cores. */
async function forceHighTier(page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
    Object.defineProperty(navigator, "deviceMemory", { get: () => 8 });
    const real = window.matchMedia.bind(window);
    window.matchMedia = (query) =>
      query.includes("prefers-reduced-motion") || query.includes("pointer: coarse")
        ? { matches: false, media: query, addEventListener() {}, removeEventListener() {} }
        : real(query);
  });
}

function meanAbsDiff(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length;
}

/** Downsamples a screencast PNG frame's crop box to a 64 × 64 grey raw buffer. */
async function greyWindow(png, box) {
  return sharp(png).extract(box).resize(64, 64, { fit: "fill" }).greyscale().raw().toBuffer();
}

/** The presented card's portrait window on desktop: [data-deck-gl]'s own right 40%, top 55%. */
async function portraitBox(page) {
  const rect = await page.evaluate(() => {
    const el = document.querySelector("[data-deck-gl]");
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  return {
    left: Math.round(rect.x + rect.width * 0.6),
    top: Math.round(rect.y),
    width: Math.round(rect.width * 0.4),
    height: Math.round(rect.height * 0.55),
  };
}

/** Records a CDP screencast for about `totalMs`, running `action` right after it starts and
 * topping the wait up once it returns (so a slow action can't shorten the capture). */
async function screencastDuring(page, totalMs, action) {
  const client = await page.context().newCDPSession(page);
  const frames = [];
  client.on("Page.screencastFrame", (frame) => {
    frames.push(Buffer.from(frame.data, "base64"));
    client.send("Page.screencastFrameAck", { sessionId: frame.sessionId }).catch(() => {});
  });
  await client.send("Page.startScreencast", { format: "png", everyNthFrame: 1, maxWidth: 1440 });
  const started = Date.now();
  await action();
  await sleep(Math.max(0, totalMs - (Date.now() - started)));
  await client.send("Page.stopScreencast").catch(() => {});
  await client.detach().catch(() => {});
  return frames;
}

/** The brief's detector: a one-frame excursion against both neighbours while they agree. */
function findTears(greys) {
  const torn = [];
  for (let i = 1; i < greys.length - 1; i++) {
    const prevDiff = meanAbsDiff(greys[i], greys[i - 1]);
    const nextDiff = meanAbsDiff(greys[i], greys[i + 1]);
    const neighbourDiff = meanAbsDiff(greys[i - 1], greys[i + 1]);
    if (prevDiff > TEAR_MIN && nextDiff > TEAR_MIN && neighbourDiff < NEIGHBOUR_MAX) torn.push(i);
  }
  return torn;
}

async function runOnce(page, run) {
  await scrollToRank(page, RANK_E);
  await waitForRank(page, "E");
  const box = await portraitBox(page);
  const frames = scrollMode
    ? await screencastDuring(page, SCROLL_CAPTURE_MS, () => wheelDriveToRank(page, "S+"))
    : await screencastDuring(page, CAPTURE_MS, () => scrollToRank(page, RANK_S));
  // A frame at a screencast's start/stop edge can arrive an odd size; drop it rather than crash.
  const decoded = await Promise.all(frames.map((png) => greyWindow(png, box).catch(() => null)));
  const greys = decoded.filter((g) => g !== null);
  const torn = findTears(greys);
  console.log(
    `${mode} run ${run}: frames captured=${frames.length} torn=${torn.length} indices=[${torn.join(",")}]`,
  );
  if (torn.length > 0) {
    mkdirSync(OUT_DIR, { recursive: true });
    for (const i of torn) writeFileSync(`${OUT_DIR}/${mode}-run${run}-frame${i}.png`, frames[i]);
    console.log(`  saved torn frames to ${OUT_DIR}/`);
  }
  return torn.length;
}

async function main() {
  const server = spawn("node", ["./dist/server/entry.mjs"], {
    env: { ...process.env, HOST: "127.0.0.1", PORT: String(PORT), SENDGRID_API_KEY: "unused" },
    stdio: "ignore",
  });
  let browser;
  try {
    for (let i = 0; ; i++) {
      try {
        if ((await fetch(`${BASE}/healthz`)).ok) break;
      } catch {}
      if (i > 50) throw new Error("preview server did not start");
      await sleep(200);
    }
    browser = await chromium.launch({ headless });
    // deviceScaleFactor 2 matches a real MacBook's Retina screen: it doubles the print-in
    // texture's pixel count, so a mipmap regen takes longer and is far more likely to race a read.
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    page.on("crash", () => console.error("page crashed"));
    page.on("pageerror", (e) => console.error("page error:", e.message));
    page.on("console", (m) => m.type() === "error" && console.error("console error:", m.text()));
    await forceHighTier(page);
    await page.goto(`${BASE}/`);
    let tornTotal = 0;
    for (let run = 1; run <= RUNS; run++) tornTotal += await runOnce(page, run);
    process.exitCode = tornTotal > 0 ? 1 : 0;
  } finally {
    await browser?.close();
    server.kill("SIGTERM");
  }
}

await main();
