// Fails the build if asset budgets are exceeded (see CLAUDE.md "Budgets").
// - Initial JS on the home page: every module script and modulepreload referenced by index.html.
// - Self-hosted fonts: every woff2 Astro emitted. woff2 is already compressed, so raw bytes count.
//   There is a floor too: no fonts at all means the Fonts API entry broke and the site would ship
//   in the fallback face with every other gate green.
// - The journey deck: Three.js and the stage live in lazy chunks (the JS no page references
//   directly), under their own budget, and never in the home page's initial graph (deck spec §11).
// - Journey scene: only scene.svg may live in dist/client/journey, gzipped within its budget
//   (until Phase 6 retires it).
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const KB = 1024;
const BUDGETS = { initialHome: 100 * KB, fonts: 120 * KB, scene: 300 * KB, deck: 170 * KB };
const FONT_FLOOR = 20 * KB; // JetBrains Mono 400 + 700 + italic 400, latin: ~65 KB
const gz = (path) => gzipSync(readFileSync(path)).length;

/** Every module script and modulepreload a page's HTML references. */
const scriptsIn = (html) => [
  ...new Set(
    [
      ...html.matchAll(/<script[^>]+src="(\/_astro\/[^"]+\.js)"/g),
      ...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="(\/_astro\/[^"]+\.js)"/g),
    ].map((m) => m[1]),
  ),
];

function htmlFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) htmlFiles(p, out);
    else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}

const home = readFileSync("dist/client/index.html", "utf8");
const initial = scriptsIn(home);
const initialBytes = initial.reduce((sum, src) => sum + gz(`dist/client${src}`), 0);

const fontDir = "dist/client/_astro/fonts";
const fontBytes = existsSync(fontDir)
  ? readdirSync(fontDir)
      .filter((f) => f.endsWith(".woff2"))
      .reduce((sum, f) => sum + statSync(`${fontDir}/${f}`).size, 0)
  : 0;

const referenced = new Set(
  htmlFiles("dist/client").flatMap((file) => scriptsIn(readFileSync(file, "utf8"))),
);
const lazy = readdirSync("dist/client/_astro")
  .filter((f) => f.endsWith(".js"))
  .map((f) => `/_astro/${f}`)
  .filter((f) => !referenced.has(f));
const lazyBytes = lazy.reduce((sum, f) => sum + gz(`dist/client${f}`), 0);

const rows = [
  ["Initial JS on / (gz)", initialBytes, BUDGETS.initialHome, 0],
  ["Fonts (woff2)", fontBytes, BUDGETS.fonts, FONT_FLOOR],
  ["Deck lazy JS (gz)", lazyBytes, BUDGETS.deck, 0],
];

let failed = false;
const scenePath = "dist/client/journey/scene.svg";
if (existsSync(scenePath)) {
  rows.push(["Journey scene (gz)", gz(scenePath), BUDGETS.scene, 0]);
} else {
  console.log("FAIL Journey scene (gz): missing");
  failed = true;
}
for (const [name, bytes, budget, floor] of rows) {
  const ok = bytes <= budget && bytes >= floor;
  failed ||= !ok;
  const range = floor ? `${floor / KB}–${budget / KB} KB` : `budget ${budget / KB} KB`;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}: ${(bytes / KB).toFixed(1)} KB (${range})`);
}

if (!lazy.some((f) => /deck-stage/.test(f))) {
  console.log("FAIL deck-stage chunk missing: the stage was inlined into a page's graph");
  failed = true;
}
const leaked = initial.filter((f) => /deck-stage|deck-bloom|three/.test(f));
if (leaked.length) {
  console.log(`FAIL deck chunk in the initial graph: ${leaked.join(", ")}`);
  failed = true;
}

const journeyDir = "dist/client/journey";
if (existsSync(journeyDir)) {
  for (const name of readdirSync(journeyDir).filter((f) => f !== "scene.svg")) {
    console.log(`FAIL stray journey file: ${name}`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
