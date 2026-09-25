// Registers an outfit render onto the base pose (vector journey spec §4.4): scales it so the
// crown of the head and the bottom of the feet land on the base's, centres the crown, and
// rejects it when the parts every outfit shares (the feet and the crown) still miss by more
// than 2% of the figure's height. Writes art/journey/outfit-<rank>.webp on the base canvas.
// Usage: node scripts/register-outfit.mjs <render> <rank-id> [art/journey/base.webp]
import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { BACKGROUND, loadIndices } from "./trace-vector.mjs";

/** Misalignment of the shared parts, as a fraction of the figure's height. */
export const RESIDUAL_MAX = 0.02;

/** Per-row art extents, the crown and feet rows, the crown's centre x, and the figure's span. */
export async function measure(input, width, height) {
  const { indices } = await loadIndices(input, { width, height, blur: 0 });
  const rows = new Array(height).fill(null);
  let crown = -1;
  let feet = -1;
  for (let y = 0; y < height; y++) {
    let left = -1;
    let right = -1;
    for (let x = 0; x < width; x++) {
      if (indices[y * width + x] === BACKGROUND) continue;
      if (left < 0) left = x;
      right = x;
    }
    if (left < 0) continue;
    rows[y] = [left, right];
    if (crown < 0) crown = y;
    feet = y;
  }
  const span = feet - crown;
  const top = rows.slice(crown, crown + Math.max(1, Math.round(span * 0.03))).filter(Boolean);
  const centre = top.reduce((sum, [l, r]) => sum + (l + r) / 2, 0) / top.length;
  return { rows, crown, feet, centre, span };
}

/** Places `buffer` on a white canvas at (left, top), clipping whatever falls outside. */
async function place(buffer, width, height, left, top) {
  const meta = await sharp(buffer).metadata();
  const x0 = Math.max(0, -left);
  const y0 = Math.max(0, -top);
  const w = Math.min(meta.width - x0, width - Math.max(0, left));
  const h = Math.min(meta.height - y0, height - Math.max(0, top));
  const cropped = await sharp(buffer)
    .extract({ left: x0, top: y0, width: w, height: h })
    .toBuffer();
  return sharp({ create: { width, height, channels: 3, background: "#ffffff" } })
    .composite([{ input: cropped, left: Math.max(0, left), top: Math.max(0, top) }])
    .webp({ lossless: true })
    .toBuffer();
}

/** Mean edge miss over the feet rows (the bottom 8% of the figure) and the crown centre miss. */
function residualOf(base, fitted) {
  const from = base.feet - Math.round(base.span * 0.08);
  let sum = 0;
  let n = 0;
  for (let y = from; y <= base.feet; y++) {
    const a = base.rows[y];
    const b = fitted.rows[y];
    if (!a || !b) continue;
    sum += (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1])) / 2;
    n++;
  }
  const feetMiss = n ? sum / n : Infinity;
  const crownMiss = Math.abs(base.centre - fitted.centre);
  return Math.max(feetMiss, crownMiss) / base.span;
}

export async function registerOutfit(
  basePath,
  outfitPath,
  outPath,
  { threshold = RESIDUAL_MAX } = {},
) {
  const meta = await sharp(basePath).metadata();
  const { width, height } = meta;
  const base = await measure(basePath, width, height);
  const outfitMeta = await sharp(outfitPath).metadata();
  const raw = await measure(outfitPath, outfitMeta.width, outfitMeta.height);
  // A blank or failed render has no figure to fit: reject it instead of crashing in sharp.
  if (base.span <= 0 || raw.span <= 0) {
    return { scale: 0, left: 0, top: 0, residual: Infinity, accepted: false };
  }
  const scale = base.span / raw.span;
  const resized = await sharp(outfitPath)
    .flatten({ background: "#ffffff" })
    .resize(Math.round(outfitMeta.width * scale), Math.round(outfitMeta.height * scale), {
      fit: "fill",
    })
    .toBuffer();
  const left = Math.round(base.centre - raw.centre * scale);
  const top = Math.round(base.crown - raw.crown * scale);
  const registered = await place(resized, width, height, left, top);
  const fitted = await measure(registered, width, height);
  const residual = residualOf(base, fitted);
  const accepted = residual <= threshold;
  if (accepted) await sharp(registered).toFile(outPath);
  return { scale, left, top, residual, accepted };
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const [render, rank, base = "art/journey/base.webp"] = process.argv.slice(2);
  if (!render || !rank) {
    console.error("usage: node scripts/register-outfit.mjs <render> <rank-id> [base.webp]");
    process.exit(1);
  }
  const out = `art/journey/outfit-${rank}.webp`;
  const r = await registerOutfit(base, render, out);
  const pct = (r.residual * 100).toFixed(1);
  if (!r.accepted) {
    console.error(
      `rejected: residual ${pct}% > ${RESIDUAL_MAX * 100}% (scale ${r.scale.toFixed(3)}); re-roll it`,
    );
    process.exit(1);
  }
  console.log(`${out}: scale ${r.scale.toFixed(3)}, offset ${r.left},${r.top}, residual ${pct}%`);
}
