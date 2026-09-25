// Fails the build if asset budgets are exceeded (see CLAUDE.md "Budgets").
// - Initial JS on the home page: every module script and modulepreload referenced by index.html.
// - Self-hosted fonts: every woff2 Astro emitted. woff2 is already compressed, so raw bytes count.
//   There is a floor too: no fonts at all means the Fonts API entry broke and the site would ship
//   in the fallback face with every other gate green.
// - No Three.js: the aura was removed in the Axiom redesign; a three/hero-aura chunk is a regression.
// - Journey scene: dist/client/journey/scene.svg gzipped within its budget (vector journey spec §7).
// - Journey clips: every file in dist/client/journey is one of the four encodes of a stage's clip
//   and within that encode's limit (scripts/clip-variants.mjs, spec §7.5).
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { CLIP_VARIANTS } from "./clip-variants.mjs";

const KB = 1024;
const BUDGETS = { initialHome: 100 * KB, fonts: 120 * KB, scene: 300 * KB };
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

const scenePath = "dist/client/journey/scene.svg";
if (existsSync(scenePath)) rows.push(["Journey scene (gz)", gz(scenePath), BUDGETS.scene, 0]);
let failed = false;
for (const [name, bytes, budget, floor] of rows) {
  const ok = bytes <= budget && bytes >= floor;
  failed ||= !ok;
  const range = floor ? `${floor / KB}–${budget / KB} KB` : `budget ${budget / KB} KB`;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}: ${(bytes / KB).toFixed(1)} KB (${range})`);
}

const clipDir = "dist/client/journey";
if (existsSync(clipDir)) {
  const clips = readdirSync(clipDir).filter((f) => f !== "scene.svg");
  let over = 0;
  for (const name of clips) {
    const [, width, ext] = name.match(/-(\d+)\.(webm|mp4)$/) ?? [];
    const variant = CLIP_VARIANTS.find((v) => v.width === Number(width) && v.ext === ext);
    const bytes = statSync(`${clipDir}/${name}`).size;
    if (!variant || bytes > variant.maxBytes) {
      over++;
      const limit = variant ? `limit ${variant.maxBytes / KB} KB` : "not one of the four encodes";
      console.log(`FAIL ${name}: ${(bytes / KB).toFixed(1)} KB (${limit})`);
    }
  }
  failed ||= over > 0;
  if (!over) console.log(`ok   Journey clips: ${clips.length} files within their limits`);
}

const stray = readdirSync("dist/client/_astro").filter((f) => /three|hero-aura/.test(f));
if (stray.length) {
  console.log(`FAIL Three.js chunk present: ${stray.join(", ")}`);
  failed = true;
}
process.exit(failed ? 1 : 0);
