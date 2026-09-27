// Traces a stage's aura mask — a soft violet band that hugs the figure's silhouette (deck spec §8
// as amended by Plan 5 fix round 2) — from a committed silhouette PNG, not from colour. Round 0's
// halo sprite and round 1's colour-tolerance flood are both retired: a real render's black cloth and
// the graphite field can sit at the same tone, so no colour rule can find the edge between them. The
// silhouette instead comes from Higgsfield's background remover, run once per portrait outside this
// repo; `importCutout` commits its alpha as `art/deck/<id>-silhouette.png`.
// Usage: node scripts/aura-mask.mjs <stage-id>|--all
//        node scripts/aura-mask.mjs --cutout <cutout.png> <stage-id>
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const DECK_DIR = "src/images/deck";
const ART_DIR = "art/deck";
const BANDS_PATH = "src/data/deck-glow-bands.json";

// rim 0.025 → 10 px at width 400: between the controller's two preview rows (0.035 and 0.02).
export const AURA = { width: 400, rim: 0.025, blur: 3 };

/** Dilates `src` by a disc of radius `r` (separable approximation: a square, then the blur rounds it). */
function dilate(src, width, height, r) {
  const rows = new Uint8Array(width * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      let hit = 0;
      for (let dx = -r; dx <= r && !hit; dx++) {
        const xx = x + dx;
        if (xx >= 0 && xx < width && src[y * width + xx]) hit = 255;
      }
      rows[y * width + x] = hit;
    }
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      let hit = 0;
      for (let dy = -r; dy <= r && !hit; dy++) {
        const yy = y + dy;
        if (yy >= 0 && yy < height && rows[yy * width + x]) hit = 255;
      }
      out[y * width + x] = hit;
    }
  return out;
}

/** A cutout's alpha channel as an 8-bit grey PNG at `width` wide: the committed silhouette source. */
export async function silhouetteFromCutout(input, width = 800) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .resize({ width })
    .extractChannel(3)
    .toColourspace("b-w")
    .png()
    .toBuffer({ resolveWithObject: true });
  return { png: data, width: info.width, height: info.height };
}

/**
 * The figure's outline as a soft band (deck spec §8 as amended by Plan 5 fix round 2): the
 * silhouette's alpha, resized to `opts.width` and thresholded at 128, is the figure; the band is
 * that figure dilated by `rim` of the width, minus the figure, blurred. Single channel, `width` px.
 */
export async function auraMask(silhouetteInput, opts = AURA) {
  const { data, info } = await sharp(silhouetteInput)
    .resize({ width: opts.width })
    .toColourspace("b-w")
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const figure = new Uint8Array(width * height);
  for (let n = 0; n < figure.length; n++) figure[n] = data[n] > 128 ? 255 : 0;
  const r = Math.max(1, Math.round(opts.rim * width));
  const dilated = dilate(figure, width, height, r);
  const band = Buffer.alloc(width * height);
  for (let n = 0; n < band.length; n++) band[n] = dilated[n] && !figure[n] ? 255 : 0;
  // Without forcing the colourspace back to grayscale, this sharp version promotes a blurred
  // single-channel raw buffer to three channels on its way back out — even a plain `.raw()` round
  // trip does this, not only after `.blur()`.
  const mask = await sharp(band, { raw: { width, height, channels: 1 } })
    .blur(opts.blur)
    .toColourspace("b-w")
    .raw()
    .toBuffer();
  return { mask, width, height };
}

/** Reads the committed `art/deck/<id>-silhouette.png` and writes `<dir>/<id>-aura.webp`. */
export async function writeAuraMask(id, dir = DECK_DIR, artDir = ART_DIR) {
  const { mask, width, height } = await auraMask(join(artDir, `${id}-silhouette.png`));
  const outputPath = join(dir, `${id}-aura.webp`);
  // No `.toColourspace("b-w")` here: verified it makes no difference to a webp's own encoding
  // (it comes out 3-channel sRGB either way), unlike the `.raw()` round trip above.
  await sharp(mask, { raw: { width, height, channels: 1 } })
    .webp({ quality: 90 })
    .toFile(outputPath);
  return outputPath;
}

/** Commits a background-remover cutout as `art/deck/<id>-silhouette.png`, then derives its aura. */
export async function importCutout(cutoutPath, id, { dir = DECK_DIR, artDir = ART_DIR } = {}) {
  mkdirSync(artDir, { recursive: true });
  const { png } = await silhouetteFromCutout(cutoutPath);
  const silhouettePath = join(artDir, `${id}-silhouette.png`);
  writeFileSync(silhouettePath, png);
  const auraPath = await writeAuraMask(id, dir, artDir);
  return { silhouettePath, auraPath };
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args[0] === "--cutout") {
    const [, cutoutPath, id] = args;
    if (!cutoutPath || !id) {
      console.error("usage: node scripts/aura-mask.mjs --cutout <cutout.png> <stage-id>");
      process.exit(1);
    }
    const { silhouettePath, auraPath } = await importCutout(cutoutPath, id);
    console.log(silhouettePath);
    console.log(auraPath);
  } else {
    const arg = args[0];
    if (!arg) {
      console.error("usage: node scripts/aura-mask.mjs <stage-id>|--all");
      process.exit(1);
    }
    const ids = arg === "--all" ? Object.keys(JSON.parse(readFileSync(BANDS_PATH, "utf8"))) : [arg];
    for (const id of ids) {
      console.log(await writeAuraMask(id));
    }
  }
}
