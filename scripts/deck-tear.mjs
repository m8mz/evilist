// A regression harness for the print-in's texture-upload path (deck spec §9, ADR 0004):
// screencasts a headed Chromium through a rank change and print-in via CDP, then judges every
// 8 × 8 block of the presented card's portrait for a one-frame tear. Marcus's recording predates
// this drive build and didn't reproduce on it (CLAUDE.md); the fix is judged against this harness
// regardless. Default mode jumps E → S; --scroll drives wheel ticks toward S+, reporting the
// ranks that actually reach "presented".
// Usage: pnpm build && pnpm tear:deck [--scroll] [--headless]  (exit 1 torn, 2 harness failure)
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
const SCROLL_DRIVE_MS = 14000; // ceiling: covers E to S+'s six 900 ms + 700 ms landing cycles
const SCROLL_CAPTURE_MS = 16000; // the drive's ceiling plus S+'s own settle
const WHEEL_DELTA = 10;
const WHEEL_INTERVAL_MS = 20; // ~500 px/s, so a rank's stretch outlasts the 900 ms drive (spec)
const GRID = 8; // the 64 × 64 grey splits into an 8 × 8 grid of 8 × 8-sample blocks
const BLOCK_PX = 64 / GRID;
const OUT_DIR = "/tmp/deck-tear"; // torn frames save here
const TEAR_MIN = 12; // a block's one-frame excursion vs. both neighbours, which must agree within
const NEIGHBOUR_MAX = 4; // ...this much (never raised to chase a clean run; the controller's call)
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
/** `[data-deck-gl]`'s own rect, in client px. */
async function glRect(page) {
  return page.$eval("[data-deck-gl]", (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
}
/** Drives the deck with wheel ticks (CDP `Input.dispatchMouseEvent`, "mouseWheel") until the page
 * scrolls past `targetY`; asserts `[data-deck-gl]`'s rect still matches `startRect` at the stop. */
async function wheelDriveToStop(page, targetY, startRect) {
  const client = await page.context().newCDPSession(page);
  const stage = await page.$eval(".journey__stage", (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  const start = Date.now();
  while (Date.now() - start < SCROLL_DRIVE_MS) {
    await client.send("Input.dispatchMouseEvent", {
      type: "mouseWheel",
      x: stage.x,
      y: stage.y,
      deltaX: 0,
      deltaY: WHEEL_DELTA,
    });
    if ((await page.evaluate(() => scrollY)) >= targetY) break;
    await sleep(WHEEL_INTERVAL_MS);
  }
  await client.detach().catch(() => {});
  const endRect = await glRect(page);
  const moved = ["x", "y", "width", "height"].some((k) => Math.abs(endRect[k] - startRect[k]) > 1);
  if (moved) throw new Error("[data-deck-gl] rect moved mid-scroll: the crop box is now wrong");
}
/** Waits for the deck to have landed on `rank` and finished printing it in. */
async function waitForPresented(page, rank) {
  await page.waitForFunction(
    (rank) => {
      const el = document.querySelector("[data-deck]");
      return el?.dataset.deckRank === rank && el?.dataset.deckPhase === "presented";
    },
    rank,
    { timeout: 20_000 },
  );
}
/** Resets (or installs) a MutationObserver that records every rank reaching "presented". */
async function resetArrivals(page) {
  await page.evaluate(() => {
    window.__arrivals = [];
    if (window.__arrivalsObserver) return;
    const el = document.querySelector("[data-deck]");
    const opts = { attributes: true, attributeFilter: ["data-deck-phase"] };
    window.__arrivalsObserver = new MutationObserver(() => {
      if (el.dataset.deckPhase === "presented") window.__arrivals.push(el.dataset.deckRank);
    });
    window.__arrivalsObserver.observe(el, opts);
  });
}
/** Stubs the high-tier readings deck-tier.ts's detectTier wants (a fine pointer, no reduced
 * motion, enough memory and cores), and counts real animation frames the page draws, so `frames
 * captured` can be read against how many frames existed to catch (the screencast is ack-gated). */
async function preparePage(page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
    Object.defineProperty(navigator, "deviceMemory", { get: () => 8 });
    const real = window.matchMedia.bind(window);
    window.matchMedia = (query) =>
      query.includes("prefers-reduced-motion") || query.includes("pointer: coarse")
        ? { matches: false, media: query, addEventListener() {}, removeEventListener() {} }
        : real(query);
    window.__raf = 0;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => raf((t) => (window.__raf++, cb(t)));
  });
}
function blockMAD(a, b, bx, by) {
  let sum = 0;
  for (let y = 0; y < BLOCK_PX; y++) {
    for (let x = 0; x < BLOCK_PX; x++) {
      const idx = (by * BLOCK_PX + y) * 64 + (bx * BLOCK_PX + x);
      sum += Math.abs(a[idx] - b[idx]);
    }
  }
  return sum / (BLOCK_PX * BLOCK_PX);
}
/** The plan's detector: an 8 × 8 block excursion past both neighbours while they agree — tile
 * local, so a face-sized tear trips it where the whole-frame mean wouldn't. Also tracks the
 * largest excursion on an agreeing block, torn or not, so a clean run can't hide how close it got. */
function findTears(entries) {
  const torn = [];
  let maxExcursion = 0;
  for (let k = 1; k < entries.length - 1; k++) {
    const a = entries[k - 1].grey;
    const b = entries[k].grey;
    const c = entries[k + 1].grey;
    let hit = null;
    for (let by = 0; by < GRID && !hit; by++) {
      for (let bx = 0; bx < GRID && !hit; bx++) {
        const prev = blockMAD(b, a, bx, by);
        const next = blockMAD(b, c, bx, by);
        const neighbours = blockMAD(a, c, bx, by);
        if (neighbours < NEIGHBOUR_MAX) maxExcursion = Math.max(maxExcursion, Math.min(prev, next));
        if (prev > TEAR_MIN && next > TEAR_MIN && neighbours < NEIGHBOUR_MAX) hit = [bx, by];
      }
    }
    if (hit) torn.push({ i: entries[k].i, block: hit });
  }
  return { torn, maxExcursion };
}
/** Downsamples a frame's crop box to 64 × 64 grey, or null: a frame sized differently from
 * `expect` (the first frame) crops the wrong area, and a start/stop-edge frame can fail outright. */
async function greyOrNull(png, box, expect) {
  try {
    const meta = await sharp(png).metadata();
    if (expect && (meta.width !== expect.width || meta.height !== expect.height)) return null;
    const cropped = sharp(png).extract(box).resize(64, 64, { fit: "fill" });
    return await cropped.greyscale().raw().toBuffer();
  } catch {
    return null;
  }
}
/** Records a CDP screencast for about `totalMs`, topping the wait up after `action` returns so a
 * slow action can't shorten it. Stops and detaches even if `action` throws. */
async function screencastDuring(page, totalMs, action) {
  const client = await page.context().newCDPSession(page);
  const frames = [];
  client.on("Page.screencastFrame", (frame) => {
    frames.push(Buffer.from(frame.data, "base64"));
    client.send("Page.screencastFrameAck", { sessionId: frame.sessionId }).catch(() => {});
  });
  await client.send("Page.startScreencast", { format: "png", everyNthFrame: 1, maxWidth: 1440 });
  const started = Date.now();
  try {
    await action();
    await sleep(Math.max(0, totalMs - (Date.now() - started)));
  } finally {
    await client.send("Page.stopScreencast").catch(() => {});
    await client.detach().catch(() => {});
  }
  return frames;
}
async function runOnce(page, run) {
  await scrollToRank(page, RANK_E);
  await waitForPresented(page, "E");
  await resetArrivals(page);
  const rect = await glRect(page);
  const rafBefore = await page.evaluate(() => window.__raf);
  const frames = scrollMode
    ? await screencastDuring(page, SCROLL_CAPTURE_MS, async () => {
        const target = await rankCentre(page, 6);
        await wheelDriveToStop(page, target, rect);
      })
    : await screencastDuring(page, CAPTURE_MS, () => scrollToRank(page, RANK_S));
  const raf = (await page.evaluate(() => window.__raf)) - rafBefore;
  const expect = frames.length ? await sharp(frames[0]).metadata() : null;
  // A headed real Chromium's frame can come out a different px size than the CSS viewport: scale.
  const sx = expect ? expect.width / 1440 : 1;
  const sy = expect ? expect.height / 900 : 1;
  const box = {
    left: Math.round((rect.x + rect.width * 0.6) * sx),
    top: Math.round(rect.y * sy),
    width: Math.round(rect.width * 0.4 * sx),
    height: Math.round(rect.height * 0.55 * sy),
  };
  const decoded = await Promise.all(frames.map((png) => greyOrNull(png, box, expect)));
  const entries = decoded.map((grey, i) => ({ i, grey })).filter((e) => e.grey !== null);
  const dropped = frames.length - entries.length;
  const judged = Math.max(0, entries.length - 2);
  const { torn, maxExcursion } = findTears(entries);
  console.log(
    `${mode} run ${run}: frames=${frames.length} raf=${raf} dropped=${dropped} judged=${judged} ` +
      `torn=${torn.length} indices=[${torn.map((t) => t.i).join(",")}] ` +
      `blocks=[${torn.map((t) => t.block.join("x")).join(",")}] maxExcursion=${maxExcursion.toFixed(2)}`,
  );
  if (scrollMode) {
    const arrivals = await page.evaluate(() => window.__arrivals);
    console.log(`  arrivals=[${arrivals.join(",")}]`);
  }
  if (torn.length > 0) {
    mkdirSync(OUT_DIR, { recursive: true });
    for (const t of torn) writeFileSync(`${OUT_DIR}/${mode}-r${run}-f${t.i}.png`, frames[t.i]);
    console.log(`  saved torn frames to ${OUT_DIR}/`);
  }
  return torn.length;
}
/** Fails fast if the spawned server dies (e.g. `EADDRINUSE`) instead of passing a health check
 * against whatever else already holds the port, and re-checks right after that check passes. */
async function waitForServer(server) {
  for (let i = 0; ; i++) {
    if (server.exitCode !== null) throw new Error(`server exited (code ${server.exitCode})`);
    try {
      if ((await fetch(`${BASE}/healthz`)).ok) break;
    } catch {}
    if (i > 50) throw new Error("preview server did not start");
    await sleep(200);
  }
  if (server.exitCode !== null) throw new Error("server exited right after answering healthz");
}
async function main() {
  const server = spawn("node", ["./dist/server/entry.mjs"], {
    env: { ...process.env, HOST: "127.0.0.1", PORT: String(PORT), SENDGRID_API_KEY: "unused" },
    stdio: "ignore",
  });
  let browser;
  try {
    await waitForServer(server);
    browser = await chromium.launch({ headless });
    // deviceScaleFactor 2 matches a real MacBook's Retina screen (Marcus's own).
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    page.on("crash", () => console.error("page crashed"));
    page.on("pageerror", (e) => console.error("page error:", e.message));
    page.on("console", (m) => m.type() === "error" && console.error("console error:", m.text()));
    await preparePage(page);
    await page.goto(`${BASE}/`);
    let tornTotal = 0;
    for (let run = 1; run <= RUNS; run++) tornTotal += await runOnce(page, run);
    process.exitCode = tornTotal > 0 ? 1 : 0;
  } catch (err) {
    console.error(`${mode}: harness failure:`, err?.message ?? err);
    process.exitCode = 2;
  } finally {
    await browser?.close().catch(() => {}); // the server still needs killing regardless
    server.kill("SIGTERM");
  }
}

await main();
