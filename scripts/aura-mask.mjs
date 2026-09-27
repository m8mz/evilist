// Traces a stage's aura mask — a soft violet band that hugs the figure's silhouette (deck spec §8
// as amended by Plan 5 fix round 1) — from an already-imported portrait, without touching the
// portrait or the glow mask. `writeAuraMask` is the one place both `import-portrait.mjs` (on the
// lossless prepared render) and this file's own CLI (on the already-served `<id>.webp`, to re-tune
// without a new render) encode the mask, so the two paths can never drift apart.
// Usage: node scripts/aura-mask.mjs <stage-id>|--all
import { readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const DECK_DIR = "src/images/deck";
const BANDS_PATH = "src/data/deck-glow-bands.json";

// tolerance 10 (not 14): a real render's field is rarely one exact value and carries grain, but the
// tone below is measured from the render itself, so a tighter band still reaches almost all of it
// while holding out cloth that happens to sit close to the field.
export const AURA = { width: 400, rim: 0.035, tolerance: 10, blur: 3 };

/** The median of the image's one-pixel border ring: the field's tone, measured per render rather
 * than assumed, since a "black" field is rarely exactly one value and carries grain. */
function borderTone(data, width, height) {
  const values = [];
  for (let x = 0; x < width; x++) {
    values.push(data[x], data[(height - 1) * width + x]);
  }
  for (let y = 1; y < height - 1; y++) {
    values.push(data[y * width], data[y * width + width - 1]);
  }
  values.sort((a, b) => a - b);
  const mid = values.length >> 1;
  return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
}

/**
 * The largest 4-connected component of `on`, by pixel count, as its own 0/255 mask. Grain blocks
 * and specks the flood fill also failed to reach, but which never touch the figure, are smaller
 * components and drop out here; an enclosed gap inside the figure is 4-connected to the body around
 * it, so it stays part of the same (largest) component.
 */
function largestComponent(on, width, height) {
  const labels = new Int32Array(width * height).fill(-1);
  const stack = [];
  let bestLabel = -1;
  let bestSize = 0;
  let label = 0;
  for (let start = 0; start < on.length; start++) {
    if (!on[start] || labels[start] !== -1) continue;
    let size = 0;
    labels[start] = label;
    stack.push(start);
    while (stack.length) {
      const n = stack.pop();
      size++;
      const x = n % width;
      const y = (n - x) / width;
      const grow = (m) => {
        if (on[m] && labels[m] === -1) {
          labels[m] = label;
          stack.push(m);
        }
      };
      if (x > 0) grow(n - 1);
      if (x < width - 1) grow(n + 1);
      if (y > 0) grow(n - width);
      if (y < height - 1) grow(n + width);
    }
    if (size > bestSize) {
      bestSize = size;
      bestLabel = label;
    }
    label++;
  }
  const kept = new Uint8Array(width * height);
  if (bestLabel >= 0) {
    for (let n = 0; n < kept.length; n++) if (labels[n] === bestLabel) kept[n] = 255;
  }
  return kept;
}

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

/**
 * The figure's outline as a soft band (deck spec §8 as amended by Plan 5 fix round 1). The field's
 * tone is the median of the border ring, not assumed; a flood fill from the borders over pixels
 * within `tolerance` of that tone is the field, and everything it never reaches is a figure
 * candidate, reduced to its largest 4-connected component so grain and detached specks drop out
 * (enclosed gaps stay, since they share a component with the body around them). The band is that
 * figure dilated by `rim` of the width, minus the figure, blurred. Single channel, `width` px.
 */
export async function auraMask(input, opts = AURA) {
  const { data, info } = await sharp(input)
    .resize({ width: opts.width, withoutEnlargement: true })
    .flatten({ background: "#000" })
    .removeAlpha()
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const tone = borderTone(data, width, height);
  const isField = (i) => Math.abs(data[i] - tone) <= opts.tolerance;
  const field = new Uint8Array(width * height);
  const stack = [];
  const push = (x, y) => {
    const n = y * width + x;
    if (field[n] || !isField(n)) return;
    field[n] = 1;
    stack.push(n);
  };
  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }
  while (stack.length) {
    const n = stack.pop();
    const x = n % width;
    const y = (n - x) / width;
    if (x > 0) push(x - 1, y);
    if (x < width - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < height - 1) push(x, y + 1);
  }
  const unreached = new Uint8Array(width * height);
  for (let n = 0; n < unreached.length; n++) if (!field[n]) unreached[n] = 1;
  const figure = largestComponent(unreached, width, height);
  let figurePx = 0;
  for (let n = 0; n < figure.length; n++) if (figure[n]) figurePx++;
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
  return { mask, width, height, figureShare: (100 * figurePx) / (width * height) };
}

/** Reads `input` (a path or a buffer) and writes its aura mask to `outputPath`. */
export async function writeAuraMask(input, outputPath, opts = AURA) {
  const { mask, width, height } = await auraMask(input, opts);
  // No `.toColourspace("b-w")` here: verified it makes no difference to a webp's own encoding
  // (it comes out 3-channel sRGB either way), unlike the `.raw()` round trip above.
  await sharp(mask, { raw: { width, height, channels: 1 } })
    .webp({ quality: 90 })
    .toFile(outputPath);
  return outputPath;
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const arg = process.argv[2];
  if (!arg) {
    console.error("usage: node scripts/aura-mask.mjs <stage-id>|--all");
    process.exit(1);
  }
  const ids = arg === "--all" ? Object.keys(JSON.parse(readFileSync(BANDS_PATH, "utf8"))) : [arg];
  for (const id of ids) {
    const output = await writeAuraMask(
      join(DECK_DIR, `${id}.webp`),
      join(DECK_DIR, `${id}-aura.webp`),
    );
    console.log(output);
  }
}
