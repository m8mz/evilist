// Fails the build if asset budgets are exceeded (see CLAUDE.md "Budgets").
// - Initial JS on the home page: every module script and modulepreload referenced by index.html.
// - Self-hosted fonts: every woff2 Astro emitted. woff2 is already compressed, so raw bytes count.
//   There is a floor too: no fonts at all means the Fonts API entry broke and the site would ship
//   in the fallback face with every other gate green.
// - The journey deck: Three.js and the stage live in lazy chunks (the JS no page references
//   directly), under their own budget, and never in the home page's initial graph (deck spec §11).
// - The high-tier bloom composer (deck-bloom.<hash>.js) is its own lazy chunk with its own budget,
//   excluded from the deck row above it.
// - Journey scene: only scene.svg may live in dist/client/journey, gzipped within its budget
//   (until Phase 6 retires it).
// - Served portrait renditions: the largest 1x/2x rendition and glow mask the home page's rail
//   buttons reference (data-portrait-1x/2x/glow), raw bytes (already-compressed webp). A home page
//   that references none fails.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { gzipSync } from "node:zlib";

const KB = 1024;
const BUDGETS = {
  initialHome: 100 * KB,
  fonts: 120 * KB,
  scene: 300 * KB,
  deck: 170 * KB,
  bloom: 40 * KB,
  portrait1x: 40 * KB,
  portrait2x: 120 * KB,
  glow: 10 * KB,
};
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

// A chunk's static imports (`from"./x.js"`, `import"./x.js"`, `export*from"./x.js"`), never a
// dynamic `import("./x.js")`: the quote sits right after "from"/"import" only in the static form.
const STATIC_IMPORT = /\b(?:from|import)["']([^"']+\.js)["']/g;

/** The set of scripts reachable from `entrySrcs` by following every static import, transitively. */
function staticClosure(entrySrcs) {
  const closure = new Set();
  const queue = [...entrySrcs];
  while (queue.length) {
    const src = queue.shift();
    if (closure.has(src)) continue;
    closure.add(src);
    const filePath = `dist/client${src}`;
    if (!existsSync(filePath)) continue;
    const code = readFileSync(filePath, "utf8");
    const dir = dirname(src);
    for (const m of code.matchAll(STATIC_IMPORT)) {
      const spec = m[1];
      queue.push(spec.startsWith(".") ? join(dir, spec) : spec);
    }
  }
  return closure;
}

const home = readFileSync("dist/client/index.html", "utf8");
const initial = [...staticClosure(scriptsIn(home))];
const initialBytes = initial.reduce(
  (sum, src) => sum + (existsSync(`dist/client${src}`) ? gz(`dist/client${src}`) : 0),
  0,
);

const fontDir = "dist/client/_astro/fonts";
const fontBytes = existsSync(fontDir)
  ? readdirSync(fontDir)
      .filter((f) => f.endsWith(".woff2"))
      .reduce((sum, f) => sum + statSync(`${fontDir}/${f}`).size, 0)
  : 0;

const referenced = new Set(
  htmlFiles("dist/client").flatMap((file) => [
    ...staticClosure(scriptsIn(readFileSync(file, "utf8"))),
  ]),
);
const lazy = readdirSync("dist/client/_astro")
  .filter((f) => f.endsWith(".js"))
  .map((f) => `/_astro/${f}`)
  .filter((f) => !referenced.has(f));
const bloomChunks = lazy.filter((f) => /deck-bloom/.test(f));
const deckChunks = lazy.filter((f) => !/deck-bloom/.test(f));
const deckBytes = deckChunks.reduce((sum, f) => sum + gz(`dist/client${f}`), 0);
const bloomBytes = bloomChunks.reduce((sum, f) => sum + gz(`dist/client${f}`), 0);

const rows = [
  ["Initial JS on / (gz)", initialBytes, BUDGETS.initialHome, 0],
  ["Fonts (woff2)", fontBytes, BUDGETS.fonts, FONT_FLOOR],
  ["Deck lazy JS (gz)", deckBytes, BUDGETS.deck, 0],
];

let failed = false;
if (bloomChunks.length) {
  rows.push(["Bloom chunk (gz)", bloomBytes, BUDGETS.bloom, 0]);
} else {
  console.log("FAIL deck-bloom chunk missing: the composer was inlined into the stage");
  failed = true;
}

const scenePath = "dist/client/journey/scene.svg";
if (existsSync(scenePath)) {
  rows.push(["Journey scene (gz)", gz(scenePath), BUDGETS.scene, 0]);
} else {
  console.log("FAIL Journey scene (gz): missing");
  failed = true;
}

const PORTRAIT_CLASSES = [
  ["Portraits 1x (largest)", /data-portrait-1x="([^"]+)"/g, BUDGETS.portrait1x],
  ["Portraits 2x (largest)", /data-portrait-2x="([^"]+)"/g, BUDGETS.portrait2x],
  ["Glow masks (largest)", /data-glow="([^"]+)"/g, BUDGETS.glow],
];
let anyPortraits = false;
for (const [name, re, budget] of PORTRAIT_CLASSES) {
  const paths = [...home.matchAll(re)].map((m) => m[1]);
  if (!paths.length) continue;
  anyPortraits = true;
  let largest = 0;
  for (const p of paths) {
    const filePath = `dist/client${p}`;
    if (!existsSync(filePath)) {
      console.log(`FAIL portrait file missing: ${p}`);
      failed = true;
      continue;
    }
    largest = Math.max(largest, statSync(filePath).size);
  }
  rows.push([name, largest, budget, 0]);
}
// The rail must name seven renditions: none at all means the data-portrait-* attributes were
// dropped, and every row above would otherwise stay green.
if (!anyPortraits) {
  console.log("FAIL Portraits: none referenced");
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
