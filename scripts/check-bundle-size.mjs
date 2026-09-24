// Fails the build if asset budgets are exceeded (see CLAUDE.md "Budgets").
// - Initial JS on the home page: every module script and modulepreload referenced by index.html.
// - Self-hosted fonts: every woff2 Astro emitted. woff2 is already compressed, so raw bytes count.
//   There is a floor too: no fonts at all means the Fonts API entry broke and the site would ship
//   in the fallback face with every other gate green.
// - No Three.js: the aura was removed in the Axiom redesign; a three/hero-aura chunk is a regression.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";

const KB = 1024;
const BUDGETS = { initialHome: 100 * KB, fonts: 120 * KB };
const FONT_FLOOR = 20 * KB; // JetBrains Mono 400 + 700, latin: ~42 KB
const gz = (path) => gzipSync(readFileSync(path)).length;

const html = readFileSync("dist/client/index.html", "utf8");
const initial = [
  ...html.matchAll(/<script[^>]+src="(\/_astro\/[^"]+\.js)"/g),
  ...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="(\/_astro\/[^"]+\.js)"/g),
].map((m) => m[1]);
const initialBytes = [...new Set(initial)].reduce((sum, src) => sum + gz(`dist/client${src}`), 0);

const fontDir = "dist/client/_astro/fonts";
const fontBytes = existsSync(fontDir)
  ? readdirSync(fontDir)
      .filter((f) => f.endsWith(".woff2"))
      .reduce((sum, f) => sum + statSync(`${fontDir}/${f}`).size, 0)
  : 0;

const rows = [
  ["Initial JS on / (gz)", initialBytes, BUDGETS.initialHome, 0],
  ["Fonts (woff2)", fontBytes, BUDGETS.fonts, FONT_FLOOR],
];
let failed = false;
for (const [name, bytes, budget, floor] of rows) {
  const ok = bytes <= budget && bytes >= floor;
  failed ||= !ok;
  const range = floor ? `${floor / KB}–${budget / KB} KB` : `budget ${budget / KB} KB`;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}: ${(bytes / KB).toFixed(1)} KB (${range})`);
}

const stray = readdirSync("dist/client/_astro").filter((f) => /three|hero-aura/.test(f));
if (stray.length) {
  console.log(`FAIL Three.js chunk present: ${stray.join(", ")}`);
  failed = true;
}
process.exit(failed ? 1 : 0);
