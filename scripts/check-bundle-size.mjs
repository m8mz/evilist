// Fails the build if asset budgets are exceeded (see CLAUDE.md "Budgets").
// - Initial JS on the home page: every module script and modulepreload referenced by index.html.
// - Self-hosted fonts: every woff2 Astro emitted. woff2 is already compressed, so raw bytes count.
// - No Three.js: the aura was removed in the Axiom redesign; a three/hero-aura chunk is a regression.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";

const KB = 1024;
const BUDGETS = { initialHome: 100 * KB, fonts: 120 * KB };
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
  ["Initial JS on / (gz)", initialBytes, BUDGETS.initialHome],
  ["Fonts (woff2)", fontBytes, BUDGETS.fonts],
];
let failed = false;
for (const [name, bytes, budget] of rows) {
  const ok = bytes <= budget;
  failed ||= !ok;
  console.log(
    `${ok ? "ok  " : "FAIL"} ${name}: ${(bytes / KB).toFixed(1)} KB (budget ${budget / KB} KB)`,
  );
}

const stray = readdirSync("dist/client/_astro").filter((f) => /three|hero-aura/.test(f));
if (stray.length) {
  console.log(`FAIL Three.js chunk present: ${stray.join(", ")}`);
  failed = true;
}
process.exit(failed ? 1 : 0);
