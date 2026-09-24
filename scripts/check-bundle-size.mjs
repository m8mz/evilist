// Fails the build if JavaScript budgets are exceeded (see CLAUDE.md "Budgets").
// - Initial JS on the home page: every module script and modulepreload referenced by index.html.
// - The lazy Three.js aura chunk.
import { readFileSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";

const KB = 1024;
const BUDGETS = { initialHome: 100 * KB, auraChunk: 170 * KB };
const gz = (path) => gzipSync(readFileSync(path)).length;

const html = readFileSync("dist/client/index.html", "utf8");
const initial = [
  ...html.matchAll(/<script[^>]+src="(\/_astro\/[^"]+\.js)"/g),
  ...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="(\/_astro\/[^"]+\.js)"/g),
].map((m) => m[1]);
const initialBytes = [...new Set(initial)].reduce((sum, src) => sum + gz(`dist/client${src}`), 0);

const aura = readdirSync("dist/client/_astro").find(
  (f) => f.startsWith("hero-aura-scene") && f.endsWith(".js"),
);
const auraBytes = aura ? gz(`dist/client/_astro/${aura}`) : 0;

const rows = [
  ["Initial JS on /", initialBytes, BUDGETS.initialHome],
  ["Three.js aura chunk (lazy)", auraBytes, BUDGETS.auraChunk],
];
let failed = false;
for (const [name, bytes, budget] of rows) {
  const ok = bytes <= budget;
  failed ||= !ok;
  console.log(
    `${ok ? "ok  " : "FAIL"} ${name}: ${(bytes / KB).toFixed(1)} KB gz (budget ${budget / KB} KB)`,
  );
}
if (html.includes("hero-aura-scene")) {
  console.log("FAIL the aura chunk is referenced from index.html; it must stay a lazy import");
  failed = true;
}
process.exit(failed ? 1 : 0);
