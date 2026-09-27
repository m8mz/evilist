// Regenerates a stage's aura mask from its already-imported portrait (deck spec §8 as amended by
// Plan 5), without re-encoding the portrait or the glow mask themselves. Reads
// src/images/deck/<id>.webp and writes only src/images/deck/<id>-aura.webp.
// Usage: node scripts/aura-mask.mjs <stage-id>|--all
import { readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { auraMask } from "./import-portrait.mjs";

const DECK_DIR = "src/images/deck";
const BANDS_PATH = "src/data/deck-glow-bands.json";

/** Reads `<dir>/<id>.webp` and (re)writes `<dir>/<id>-aura.webp` from its silhouette. */
export async function writeAuraMask(id, dir = DECK_DIR) {
  const input = join(dir, `${id}.webp`);
  const { mask, width, height } = await auraMask(input);
  const output = join(dir, `${id}-aura.webp`);
  await sharp(mask, { raw: { width, height, channels: 1 } })
    .toColourspace("b-w")
    .webp({ quality: 90 })
    .toFile(output);
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const arg = process.argv[2];
  if (!arg) {
    console.error("usage: node scripts/aura-mask.mjs <stage-id>|--all");
    process.exit(1);
  }
  const ids = arg === "--all" ? Object.keys(JSON.parse(readFileSync(BANDS_PATH, "utf8"))) : [arg];
  for (const id of ids) {
    const output = await writeAuraMask(id);
    console.log(output);
  }
}
