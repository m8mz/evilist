// Renders /og-card from the production build into public/og-default.png (1200×630), the social
// card every page links. Usage: pnpm build:og (builds first). Re-run after changing the name,
// role or the card's design, and commit the PNG.
import { spawn } from "node:child_process";
import { copyFileSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { OG_FINGERPRINT_PATH, OG_PATH, ogFingerprint } from "./og-source.mjs";

const PORT = 4398;
const base = `http://127.0.0.1:${PORT}`;

const server = spawn("node", ["./dist/server/entry.mjs"], {
  env: { ...process.env, HOST: "127.0.0.1", PORT: String(PORT), SENDGRID_API_KEY: "unused" },
  stdio: "ignore",
});

try {
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(`${base}/healthz`)).ok) break;
    } catch {}
    if (i > 50) throw new Error("preview server did not start");
    await new Promise((r) => setTimeout(r, 200));
  }

  const browser = await chromium.launch();
  // Reduced motion freezes the prompt cursor in its visible state.
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  await page.goto(`${base}/og-card`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: OG_PATH, type: "png" });
  await browser.close();

  // The build already copied public/; copy the fresh card into the output too.
  copyFileSync(OG_PATH, "dist/client/og-default.png");
  writeFileSync(OG_FINGERPRINT_PATH, `${ogFingerprint()}\n`);
  console.log(`Wrote ${OG_PATH}`);
} finally {
  server.kill("SIGTERM");
}
