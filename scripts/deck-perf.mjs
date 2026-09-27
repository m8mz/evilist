// pnpm perf:deck (deck spec §11): scrolls the journey track at a fixed speed through the production
// build, twice (cold, then warm), and prints frame-time percentiles, long frames and the texture
// estimate. Local only: CI has no GPU worth measuring. Headed by default so the real GPU renders;
// --headless for a quick smoke run (indicative only). Exit 1 when p95 > 16.7 ms or any frame > 50 ms
// on the warm pass; exit 2 on a harness failure (spawn, port, selector), distinct from over budget.
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";
import { frameStats, LONG_FRAME_MS } from "./deck-perf-stats.mjs";

const PORT = 4395;
const BASE = `http://127.0.0.1:${PORT}`;
const HEADER_PX = 64; // tokens.css --header-h; this script can't import e2e/constants.ts (TypeScript)
const SPEED_PX_S = 900; // a brisk read of the journey: about 8 s end to end at 1440 × 900
const HEADLESS = process.argv.includes("--headless");
const P95_BUDGET_MS = 16.7;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Fails fast if the spawned server dies (e.g. `EADDRINUSE`) instead of passing a health check
 * against whatever else already holds the port, and re-checks right after that check passes
 * (mirrors scripts/deck-tear.mjs). */
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

/** Scrolls the track's top into view, minus the fixed header, so the deck's IntersectionObserver
 * sees it and the first scroll event arms the mount gate (src/scripts/deck/index.ts). */
async function scrollToTrack(page) {
  await page.evaluate((header) => {
    const el = document.querySelector("[data-deck]");
    const top = el.getBoundingClientRect().top + scrollY - header;
    scrollTo({ top, behavior: "instant" });
  }, HEADER_PX);
}

/** Waits for the stage to have mounted, rendered its first frame, and settled on rank E. */
async function waitForReady(page) {
  await page.waitForFunction(
    () => {
      const el = document.querySelector("[data-deck]");
      return (
        el?.dataset.deckReady !== undefined &&
        el?.dataset.deckRank === "E" &&
        el?.dataset.deckPhase === "presented"
      );
    },
    { timeout: 20000 },
  );
}

/** Scrolls the track top to bottom at SPEED_PX_S from inside the page, collecting rAF timestamps. */
async function pass(page, label) {
  const result = await page.evaluate(
    ({ speed, header }) =>
      new Promise((resolve) => {
        const el = document.querySelector("[data-deck]");
        const top = el.getBoundingClientRect().top + scrollY - header;
        const end = top + el.offsetHeight - innerHeight + header;
        scrollTo({ top, behavior: "instant" });
        const stamps = [];
        let last = performance.now();
        let y = top;
        const tick = (now) => {
          stamps.push(now);
          y += ((now - last) / 1000) * speed;
          last = now;
          scrollTo({ top: Math.min(y, end), behavior: "instant" });
          if (y < end) requestAnimationFrame(tick);
          else
            resolve({
              stamps,
              vram: el.dataset.deckVram ?? "?",
              tier: el.dataset.deckTier ?? "?",
            });
        };
        requestAnimationFrame(tick);
      }),
    { speed: SPEED_PX_S, header: HEADER_PX },
  );
  const s = frameStats(result.stamps);
  console.log(
    `${label}: ${s.frames} frames at ${SPEED_PX_S} px/s · p50 ${s.p50.toFixed(1)} ms · ` +
      `p95 ${s.p95.toFixed(1)} ms · max ${s.max.toFixed(1)} ms · ${s.long} over ${LONG_FRAME_MS} ms · ` +
      `vram ${result.vram} MB · tier ${result.tier}`,
  );
  return s;
}

async function main() {
  const server = spawn("node", ["./dist/server/entry.mjs"], {
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(PORT),
      SENDGRID_API_KEY: "unused",
      CONTACT_DRY_RUN: "true",
    },
    stdio: "ignore",
  });
  let browser;
  try {
    await waitForServer(server);
    browser = await chromium.launch({ headless: HEADLESS });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });

    // The deck only mounts once the journey has scrolled into view (index.ts), so data-deck-ready
    // never appears at the top of the page: scroll the track in first, then wait for it to settle.
    await scrollToTrack(page);
    await waitForReady(page);

    await pass(page, "cold");
    await sleep(1000);
    const warm = await pass(page, "warm");

    const over = warm.p95 > P95_BUDGET_MS || warm.long > 0;
    console.log(
      over
        ? `over budget: p95 ≤ ${P95_BUDGET_MS} ms and no long frames on the warm pass`
        : "within budget",
    );
    process.exitCode = over ? 1 : 0;
  } catch (err) {
    console.error("perf:deck: harness failure:", err?.message ?? err);
    process.exitCode = 2;
  } finally {
    try {
      await browser?.close();
    } catch {}
    server.kill("SIGTERM");
  }
}

await main();
