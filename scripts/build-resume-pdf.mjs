// Renders /resume from the production build to a PDF with print styles, and records the
// fingerprint of the source files it came from (checked by test/resumePdf.test.ts).
// Usage: pnpm build:pdf   (builds first, then renders)
import { spawn } from "node:child_process";
import { copyFileSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { FINGERPRINT_PATH, PDF_PATH, resumeFingerprint } from "./resume-source.mjs";

const PORT = 4397;
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
  const page = await browser.newPage();
  await page.goto(`${base}/resume`, { waitUntil: "networkidle" });
  await page.emulateMedia({ media: "print" });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({
    path: PDF_PATH,
    format: "Letter",
    printBackground: false,
    tagged: true,
    outline: true,
  });
  await browser.close();

  // The build already copied public/; copy the fresh PDF into the output too.
  copyFileSync(PDF_PATH, `dist/client/${PDF_PATH.replace(/^public\//, "")}`);
  writeFileSync(FINGERPRINT_PATH, `${resumeFingerprint()}\n`);
  console.log(`Wrote ${PDF_PATH}`);
} finally {
  server.kill("SIGTERM");
}
