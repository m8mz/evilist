// Imports a Higgsfield portrait for the journey deck (deck spec §10): the 1600 px WebP source
// astro:assets serves the card and the timeline from, and a 400 px greyscale glow mask made by
// keying the portrait's violet (the eyes from rank B up, the coat's energy at S+). The mask's
// coverage must sit inside the rank's band from src/data/deck-glow-bands.json, or the render is
// wrong and gets re-rolled. A render that came back on a white field is keyed to black first.
// Usage: node scripts/import-portrait.mjs <render> <stage-id> [--out src/images/deck]
import { existsSync, mkdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

export const GLOW = {
  hueMin: 250,
  hueMax: 285,
  // Low enough to key the spec's pale S+ eye colour (#e6ddff, sat ≈ 0.13) and the B rim
  // (#8a7fb8, sat ≈ 0.31), both violet at a glance but far less saturated than the deck's #7040d2.
  satMin: 0.12,
  valMin: 0.25,
  blur: 3,
  maskWidth: 400,
  sourceWidth: 1600,
  quality: 82,
};

// A render that ignored the graphite background and came back on white (about 40% of Nano Banana's
// portraits, whatever the prompt says) is keyed to the field colour here rather than re-rolled: the field is whatever
// near-white touches the image border, dilated a little to swallow the anti-aliased fringe, so the
// whites the subject encloses (eyes, teeth, a badge) stay.
export const KEY = {
  /** A pixel whose darkest channel is at least this counts as the white field. */
  threshold: 225,
  /** Key only when at least this share of the border is near-white. */
  borderShare: 0.6,
  /** Grow the keyed field by this many pixels into the fringe (at sourceWidth). */
  dilate: 2,
  /** What the keyed field becomes: the graphite the portraits are rendered on. */
  fill: [25, 25, 25],
};

/**
 * Keys a white field to black in place. `data` is packed RGB (3 channels) at `width` × `height`.
 * @param {Buffer} data
 * @param {number} width
 * @param {number} height
 * @param {typeof KEY} [key]
 * @returns {{ keyed: boolean, borderShare: number }}
 */
export function keyWhiteField(data, width, height, key = KEY) {
  const isField = (i) =>
    data[i * 3] >= key.threshold &&
    data[i * 3 + 1] >= key.threshold &&
    data[i * 3 + 2] >= key.threshold;
  const border = [];
  for (let x = 0; x < width; x++) border.push(x, (height - 1) * width + x);
  for (let y = 1; y < height - 1; y++) border.push(y * width, y * width + width - 1);
  const whiteBorder = border.filter(isField);
  const borderShare = whiteBorder.length / border.length;
  if (borderShare < key.borderShare) return { keyed: false, borderShare };

  // Flood fill from the border through near-white pixels (4-connected).
  const field = new Uint8Array(width * height);
  const stack = whiteBorder;
  for (const i of stack) field[i] = 1;
  while (stack.length) {
    const i = stack.pop();
    const x = i % width;
    const y = (i - x) / width;
    const next = [];
    if (x > 0) next.push(i - 1);
    if (x < width - 1) next.push(i + 1);
    if (y > 0) next.push(i - width);
    if (y < height - 1) next.push(i + width);
    for (const n of next) {
      if (!field[n] && isField(n)) {
        field[n] = 1;
        stack.push(n);
      }
    }
  }

  // Dilate into the fringe, then paint the field black.
  let grown = field;
  for (let step = 0; step < key.dilate; step++) {
    const out = new Uint8Array(grown);
    for (let i = 0; i < grown.length; i++) {
      if (!grown[i]) continue;
      const x = i % width;
      if (x > 0) out[i - 1] = 1;
      if (x < width - 1) out[i + 1] = 1;
      if (i >= width) out[i - width] = 1;
      if (i + width < grown.length) out[i + width] = 1;
    }
    grown = out;
  }
  for (let i = 0; i < grown.length; i++) {
    if (grown[i]) [data[i * 3], data[i * 3 + 1], data[i * 3 + 2]] = key.fill;
  }
  return { keyed: true, borderShare };
}

/**
 * The render at `sourceWidth`, flattened onto black, with a white field keyed out: the buffer the
 * glow mask and the WebP source are both made from.
 * @param {string | Buffer} input
 * @param {typeof GLOW} [glow]
 * @param {typeof KEY} [key]
 * @returns {Promise<{ png: Buffer, keyed: boolean }>}
 */
export async function prepareRender(input, glow = GLOW, key = KEY) {
  const { data, info } = await sharp(input)
    .resize({ width: glow.sourceWidth, withoutEnlargement: true })
    .flatten({ background: "#000" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { keyed } = keyWhiteField(data, info.width, info.height, key);
  const png = await sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } })
    .png()
    .toBuffer();
  return { png, keyed };
}

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
    // Flatten transparency onto black first: an unflattened transparent pixel's RGB channel is
    // whatever the source left behind (often the violet colour itself, at alpha 0), which would
    // key as 100% violet once alpha is simply dropped.
    .flatten({ background: "#000" })
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
  const { png, keyed } = await prepareRender(input, glow);
  // Measure the glow before writing anything: a render outside the band goes to `.rejected.webp`
  // files instead, so a bad render never overwrites the live ones a passing render left behind.
  const { mask, width: maskW, height: maskH, coverage } = await glowMask(png, glow);
  const inBand = !band || (coverage >= band[0] && coverage <= band[1]);
  const suffix = inBand ? "" : ".rejected";
  const source = join(outDir, `${id}${suffix}.webp`);
  const glowFile = join(outDir, `${id}-glow${suffix}.webp`);
  const meta = await sharp(png).webp({ quality: glow.quality }).toFile(source);
  await sharp(mask, { raw: { width: maskW, height: maskH, channels: 1 } })
    .blur(glow.blur)
    .webp({ quality: 90 })
    .toFile(glowFile);
  if (!inBand) {
    console.error(`rejected render kept at ${source}`);
    throw new Error(
      `glow coverage ${coverage.toFixed(2)}% is outside the band [${band[0]}, ${band[1]}] for ${id}`,
    );
  }
  return { width: meta.width, height: meta.height, coverage, keyed, files: [source, glowFile] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const outIndex = args.indexOf("--out");
  const outDir = outIndex >= 0 ? args[outIndex + 1] : "src/images/deck";
  const positional = args.filter((v, i) => v !== "--out" && args[i - 1] !== "--out");
  const [input, id] = positional;
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
    const { width, height, coverage, keyed } = await importPortrait(input, id, { outDir, band });
    console.log(
      `${id}: ${width}×${height}, glow ${coverage.toFixed(2)}% (band ${band[0]}–${band[1]}%)${keyed ? " (white field keyed)" : ""}`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
