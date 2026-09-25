// Traces flat art to layered SVG paths (vector journey spec §4.5): every pixel mapped to the
// nearest colour of a fixed palette (near-white is background), a 3×3 majority pass to snap
// anti-aliasing rings and speckles to their neighbours, then potrace on a solid silhouette (the
// base, which hides hairline seams) and on one mask per colour; optionally every layer is cut by
// the rig's part polygons first. Output paths are absolute, rounded to one decimal, with fills as
// attributes (no style=, for the CSP).
// Usage: node scripts/trace-vector.mjs <image> <out.svg> [width height]
import { realpathSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const potrace = createRequire(import.meta.url)("potrace");

/** The art's palette (sampled from the base render, 2026-09-25): the name is the layer id, the value the fill. */
export const PALETTE = {
  ink: "#0c0c10",
  coat: "#141418",
  shadow: "#26262e",
  cloth: "#383840",
  mid: "#6e6e78",
  skin: "#e0c0ac",
  skinshade: "#b49684",
  eye: "#96a0aa",
  ember: "#da5c2c",
  violet: "#7040d2",
};

/** The index of a background pixel. */
export const BACKGROUND = 255;

/**
 * Tracing defaults, tuned on the spike figure at 1000 px tall (36 KB gz for ten layers). Blur is
 * off by default: flat art has no noise to soften, and blurring it only manufactures edge bands.
 */
export const TRACE = { blur: 0, turdSize: 10, alphaMax: 1, optTolerance: 0.6, decimals: 1 };

export const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** Near-white and near-grey: the plain background every render is asked for. */
export const isBackground = (r, g, b) =>
  Math.min(r, g, b) > 205 && Math.max(r, g, b) - Math.min(r, g, b) < 24;

/** Maps raw RGB pixels (3 bytes each) to palette indices; BACKGROUND for the background. */
export function quantise(rgb, count, palette = PALETTE) {
  const colours = Object.values(palette).map(hexToRgb);
  const out = new Uint8Array(count);
  for (let p = 0; p < count; p++) {
    const r = rgb[p * 3];
    const g = rgb[p * 3 + 1];
    const b = rgb[p * 3 + 2];
    if (isBackground(r, g, b)) {
      out[p] = BACKGROUND;
      continue;
    }
    let best = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < colours.length; i++) {
      const [cr, cg, cb] = colours[i];
      const distance = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    }
    out[p] = best;
  }
  return out;
}

/**
 * A 3×3 majority pass over the indices: a pixel takes the value most of its neighbourhood has
 * (the background counts too), so one-pixel anti-aliasing rings and speckles snap to what they
 * sit on. Ties keep the pixel. Edges of the image keep their values.
 * @param {Uint8Array} indices
 * @param {number} width
 * @param {number} height
 * @returns {Uint8Array}
 */
export function denoise(indices, width, height) {
  const out = new Uint8Array(indices);
  const counts = new Map();
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      counts.clear();
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const v = indices[(y + dy) * width + (x + dx)];
          counts.set(v, (counts.get(v) ?? 0) + 1);
        }
      }
      const p = y * width + x;
      let best = indices[p];
      let bestCount = counts.get(best) ?? 0;
      for (const [v, n] of counts) {
        if (n > bestCount) {
          best = v;
          bestCount = n;
        }
      }
      out[p] = best;
    }
  }
  return out;
}

/**
 * Reads an image (any format sharp reads), optionally resampled, into palette indices.
 * @param {string | Buffer} input
 * @param {{ width?: number, height?: number, palette?: Record<string, string>, blur?: number, denoise?: boolean }} [options]
 */
export async function loadIndices(
  input,
  { width, height, palette = PALETTE, blur = TRACE.blur, denoise: clean = true } = {},
) {
  let image = sharp(input).flatten({ background: "#ffffff" });
  if (width && height) image = image.resize(width, height, { fit: "fill" });
  if (blur) image = image.blur(blur);
  const { data, info } = await image.removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const count = info.width * info.height;
  let indices = quantise(data, count, palette);
  if (clean) indices = denoise(indices, info.width, info.height);
  return { indices, width: info.width, height: info.height };
}

/** Rasterises a polygon (canvas coordinates) to a mask: 1 inside, 0 outside. */
export async function polygonMask(polygon, width, height) {
  const points = polygon.map(([x, y]) => `${x},${y}`).join(" ");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#fff"/><polygon points="${points}" fill="#000"/></svg>`;
  const data = await sharp(Buffer.from(svg)).greyscale().raw().toBuffer();
  const mask = new Uint8Array(width * height);
  for (let p = 0; p < mask.length; p++) mask[p] = data[p] < 128 ? 1 : 0;
  return mask;
}

/** A PNG that is black where `test(index, pixel)` holds and white elsewhere, or null if nowhere. */
export async function maskPng(indices, width, height, test) {
  const raw = Buffer.alloc(width * height, 255);
  let count = 0;
  for (let p = 0; p < raw.length; p++) {
    if (test(indices[p], p)) {
      raw[p] = 0;
      count++;
    }
  }
  if (count === 0) return null;
  return sharp(raw, { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer();
}

/** Rounds every coordinate (dropping trailing zeros) and folds the whitespace potrace emits. */
export const roundPath = (d, decimals = TRACE.decimals) =>
  d
    .replace(/-?\d+\.\d+/g, (n) => String(Number(Number(n).toFixed(decimals))))
    .replace(/\s+/g, " ")
    .trim();

/**
 * Traces a black-on-white PNG with potrace to one path's `d` (absolute coordinates).
 * @param {Buffer} png
 * @param {{ turdSize?: number, alphaMax?: number, optTolerance?: number, decimals?: number }} [opts]
 */
export function tracePath(png, opts = {}) {
  return new Promise((resolve, reject) => {
    const tracer = new potrace.Potrace({
      turdSize: opts.turdSize ?? TRACE.turdSize,
      alphaMax: opts.alphaMax ?? TRACE.alphaMax,
      optCurve: true,
      optTolerance: opts.optTolerance ?? TRACE.optTolerance,
      threshold: 128,
      blackOnWhite: true,
    });
    tracer.loadImage(png, (err) => {
      if (err) return reject(err);
      const d = tracer.getPathTag().match(/ d="([^"]*)"/)?.[1] ?? "";
      resolve(roundPath(d, opts.decimals));
    });
  });
}

/**
 * Traces an image into layers: a silhouette base (filled with the `base` colour) and one layer
 * per palette colour present, in palette order; with `parts`, every layer is cut by each part's
 * polygon in turn and tagged with the part id. Layers that trace to nothing are left out.
 * @param {string | Buffer} input
 * @param {{ width?: number, height?: number, palette?: Record<string, string>, parts?: { id: string, polygon: readonly (readonly number[])[] }[], base?: string, trace?: { turdSize?: number, alphaMax?: number, optTolerance?: number, decimals?: number } }} [options]
 * @returns {Promise<{ part?: string, name: string, fill: string, d: string }[]>}
 */
export async function traceLayers(
  input,
  { width, height, palette = PALETTE, parts, base = "ink", trace = {} } = {},
) {
  const { indices, width: w, height: h } = await loadIndices(input, { width, height, palette });
  const names = Object.keys(palette);
  const used = [...new Set(indices.filter((i) => i !== BACKGROUND))].sort((a, b) => a - b);
  const regions = parts
    ? await Promise.all(
        parts.map(async (p) => ({ part: p.id, mask: await polygonMask(p.polygon, w, h) })),
      )
    : [{ part: undefined, mask: null }];
  const layers = [];
  for (const { part, mask } of regions) {
    const inside = (p) => !mask || mask[p] === 1;
    const push = async (name, test) => {
      const png = await maskPng(indices, w, h, test);
      if (!png) return;
      const d = await tracePath(png, trace);
      if (d)
        layers.push({
          ...(part ? { part } : {}),
          name,
          fill: palette[name === "base" ? base : name],
          d,
        });
    };
    await push("base", (i, p) => i !== BACKGROUND && inside(p));
    for (const i of used) {
      const name = names[i];
      if (name === base) continue;
      await push(name, (j, p) => j === i && inside(p));
    }
  }
  return layers;
}

/** One layer as a filled group. Fills are attributes, never style. */
export const layerGroup = (layer, extra = "") =>
  `<g${extra} fill="${layer.fill}" fill-rule="evenodd"><path d="${layer.d}"/></g>`;

export function svgFromLayers(layers, width, height) {
  const groups = layers.map((l) => layerGroup(l, ` data-layer="${l.name}"`)).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">${groups}</svg>`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const [input, output, width, height] = process.argv.slice(2);
  if (!input || !output) {
    console.error("usage: node scripts/trace-vector.mjs <image> <out.svg> [width height]");
    process.exit(1);
  }
  const size = width && height ? { width: Number(width), height: Number(height) } : {};
  const layers = await traceLayers(input, size);
  const meta = await sharp(input).metadata();
  const svg = svgFromLayers(layers, size.width ?? meta.width, size.height ?? meta.height);
  writeFileSync(output, svg);
  console.log(`${output}: ${layers.length} layers, ${(svg.length / 1024).toFixed(0)} KB`);
}
