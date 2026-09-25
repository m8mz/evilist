// Imports a Higgsfield portrait for the journey deck (deck spec §10): the 1600 px WebP source
// astro:assets serves the card and the timeline from, and a 400 px greyscale glow mask made by
// keying the portrait's violet (the eyes from rank B up, the coat's energy at S+). The mask's
// coverage must sit inside the rank's band from src/data/deck-glow-bands.json, or the render is
// wrong and gets re-rolled.
// Usage: node scripts/import-portrait.mjs <render> <stage-id> [--out src/images/deck]
import { existsSync, mkdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

export const GLOW = {
  hueMin: 250,
  hueMax: 285,
  satMin: 0.35,
  valMin: 0.25,
  blur: 3,
  maskWidth: 400,
  sourceWidth: 1600,
  quality: 82,
};

/** Is this pixel the deck's violet? HSV hue 250–285°, saturation over 0.35, value over 0.25. */
export function isViolet(r, g, b, glow = GLOW) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const value = max / 255;
  if (value < glow.valMin || max === 0) return false;
  const sat = (max - min) / max;
  if (sat < glow.satMin) return false;
  const delta = max - min;
  let hue;
  if (delta === 0) hue = 0;
  else if (max === r) hue = 60 * (((g - b) / delta) % 6);
  else if (max === g) hue = 60 * ((b - r) / delta + 2);
  else hue = 60 * ((r - g) / delta + 4);
  if (hue < 0) hue += 360;
  return hue >= glow.hueMin && hue <= glow.hueMax;
}

/** The violet mask at `maskWidth`, one byte per pixel, and its coverage in percent. */
export async function glowMask(input, glow = GLOW) {
  const { data, info } = await sharp(input)
    .resize({ width: glow.maskWidth, withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const mask = Buffer.alloc(width * height, 0);
  let hits = 0;
  for (let i = 0; i < width * height; i++) {
    if (isViolet(data[i * 3], data[i * 3 + 1], data[i * 3 + 2], glow)) {
      mask[i] = 255;
      hits++;
    }
  }
  return { mask, width, height, coverage: (hits / (width * height)) * 100 };
}

/**
 * @param {string | Buffer} input
 * @param {string} id
 * @param {{ outDir?: string, band?: [number, number], glow?: typeof GLOW }} [options]
 */
export async function importPortrait(
  input,
  id,
  { outDir = "src/images/deck", band, glow = GLOW } = {},
) {
  mkdirSync(outDir, { recursive: true });
  const source = join(outDir, `${id}.webp`);
  const glowFile = join(outDir, `${id}-glow.webp`);
  const meta = await sharp(input)
    .resize({ width: glow.sourceWidth, withoutEnlargement: true })
    .webp({ quality: glow.quality })
    .toFile(source);
  const { mask, width, height, coverage } = await glowMask(input, glow);
  await sharp(mask, { raw: { width, height, channels: 1 } })
    .blur(glow.blur)
    .webp({ quality: 90 })
    .toFile(glowFile);
  if (band && (coverage < band[0] || coverage > band[1])) {
    throw new Error(
      `glow coverage ${coverage.toFixed(2)}% is outside the band [${band[0]}, ${band[1]}] for ${id}`,
    );
  }
  return { width: meta.width, height: meta.height, coverage, files: [source, glowFile] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const outIndex = args.indexOf("--out");
  const outDir = outIndex >= 0 ? args[outIndex + 1] : "src/images/deck";
  const [input, id] = args.filter((_, i) => i !== outIndex && i !== outIndex + 1);
  if (!input || !id) {
    console.error("usage: node scripts/import-portrait.mjs <render> <stage-id> [--out <dir>]");
    process.exit(1);
  }
  const bandsPath = join(
    dirname(realpathSync(process.argv[1])),
    "..",
    "src/data/deck-glow-bands.json",
  );
  const bands = existsSync(bandsPath) ? JSON.parse(readFileSync(bandsPath, "utf8")) : {};
  const band = bands[id];
  if (!band) {
    console.error(`no glow band for ${id} in src/data/deck-glow-bands.json`);
    process.exit(1);
  }
  try {
    const { width, height, coverage } = await importPortrait(input, id, { outDir, band });
    console.log(
      `${id}: ${width}×${height}, glow ${coverage.toFixed(2)}% (band ${band[0]}–${band[1]}%)`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
