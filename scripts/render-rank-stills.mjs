// Renders the reduced-motion timeline's pictures (vector journey spec §6): each rank's settled
// composite (its outfit, props and energy, posed) from public/journey/scene.svg, centred on a
// carbon 16:9 canvas, to src/images/journey/<stage-id>.webp at 1920×1080. astro:assets makes
// the renditions; test/journeyArt.test.ts checks the size and ratio.
// Usage: node scripts/render-rank-stills.mjs
import { readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { sceneBox, stillMarkup } from "./build-scene.mjs";

const require = createRequire(import.meta.url);

export const STILL = { width: 1920, height: 1080, quality: 82 };

/** The scene, kept whole (meet by height), on the carbon canvas. */
export function wrap16x9(sceneSvg, rig) {
  const box = sceneBox(rig);
  const inner = sceneSvg.replace(/^<svg [^>]*>/, "").replace(/<\/svg>$/, "");
  const height = STILL.height;
  const width = Math.round((box.width / box.height) * height);
  const x = Math.round((STILL.width - width) / 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${STILL.width}" height="${STILL.height}" viewBox="0 0 ${STILL.width} ${STILL.height}"><rect width="${STILL.width}" height="${STILL.height}" fill="#111111"/><svg x="${x}" y="0" width="${width}" height="${height}" viewBox="0 0 ${box.width} ${box.height}">${inner}</svg></svg>`;
}

export async function renderRankStills({ scenePath, outDir, rig }) {
  const scene = readFileSync(scenePath, "utf8");
  const written = [];
  for (const [i, rank] of rig.ranks.entries()) {
    const svg = wrap16x9(stillMarkup(scene, rig, i), rig);
    const out = join(outDir, `${rank}.webp`);
    await sharp(Buffer.from(svg), { density: 72 }).webp({ quality: STILL.quality }).toFile(out);
    written.push(out);
  }
  return written;
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const rig = require("../src/data/avatar-rig.json");
  const written = await renderRankStills({
    scenePath: "public/journey/scene.svg",
    outDir: "src/images/journey",
    rig,
  });
  for (const path of written) console.log(path);
}
