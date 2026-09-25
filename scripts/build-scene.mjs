// Assembles the journey scene (vector journey spec §4.7) from art/journey/*.webp: every outfit
// traced and cut into the rig's parts, every prop set and the energy traced whole, all written
// as one SVG whose ids are the contract with src/scripts/scene.ts and
// scripts/render-rank-stills.mjs (see the plan's "Scene ids"). Also writes the inline
// silhouette (the base pose as one coarse path, traced at a quarter of the canvas) that holds
// the stage until the scene loads.
// Usage: node scripts/build-scene.mjs   (art/journey → public/journey/scene.svg,
//                                       src/components/journey/silhouette.svg)
import { existsSync, mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import {
  BACKGROUND,
  layerGroup,
  loadIndices,
  maskPng,
  traceLayers,
  tracePath,
} from "./trace-vector.mjs";

const require = createRequire(import.meta.url);

/** Draw order, bottom to top (mirrors src/data/avatarRig.ts). */
export const PART_ORDER = [
  "coat-left",
  "coat-right",
  "legs",
  "arm-left",
  "arm-right",
  "torso",
  "head",
];
export const PIVOT_OF_PART = {
  head: "neck",
  "arm-left": "shoulder-left",
  "arm-right": "shoulder-right",
};
export const OUTLINE = { stroke: "#6e6e78", width: 3 };
/** The silhouette is coarse on purpose: ~3 KB, inlined in every page render. */
export const SILHOUETTE_TRACE = { turdSize: 40, optTolerance: 2.5, decimals: 0 };
/** Props are backdrops: traced at half their canvas, placed at twice the size. */
export const PROPS_SCALE = 2;
/** The inline placeholder only needs a shape: traced at a quarter of the canvas. */
export const SILHOUETTE_SCALE = 4;

/** The scene around the figure canvas: 1.6× as wide, the figure 30% in, props as a square 5% in. */
export function sceneBox(rig) {
  const { width, height } = rig.canvas;
  return {
    width: width * 1.6,
    height,
    figureX: width * 0.3,
    propsX: width * 0.05,
    propsSize: height,
  };
}

const partsOf = (rig) => PART_ORDER.filter((id) => rig.parts.some((p) => p.id === id));

export function partTransform(rig, part, pose) {
  const pivot = PIVOT_OF_PART[part];
  if (!pivot || !rig.pivots[pivot]) return "";
  const [x, y] = rig.pivots[pivot];
  return ` transform="rotate(${pose?.[pivot] ?? 0} ${x} ${y})"`;
}

export function energyTransform(rig, scale) {
  const { figureX } = sceneBox(rig);
  const [hx, hy] = rig.pivots.hips;
  const x = figureX + hx;
  return `translate(${x} ${hy}) scale(${scale}) translate(${-x} ${-hy})`;
}

const round3 = (n) => String(Number(n.toFixed(3)));
/** Progress at the middle of rank `i` of `n`, and the energy that goes with it (spec §3.3). */
export const energyAt = (i, n) => {
  const p = (i + 0.5) / n;
  return { opacity: round3(p * p), scale: round3(0.5 + 0.5 * p) };
};

const groupOf = (layer) => layerGroup(layer, layer.name === "ember" ? ' class="glow"' : "");

export function sceneMarkup(art, rig, { visibleRank = 0 } = {}) {
  const box = sceneBox(rig);
  const parts = partsOf(rig);
  const ranks = rig.ranks;
  const pose = rig.poses[ranks[visibleRank]];
  const state = (i) =>
    i === visibleRank ? 'visibility="visible" opacity="1"' : 'visibility="hidden" opacity="0"';
  const energy = energyAt(visibleRank, ranks.length);

  const floor = `<rect id="floor" x="${box.width * 0.125}" y="${rig.anchors.feet + 4}" width="${box.width * 0.75}" height="4" fill="#202020"/>`;
  const energyGroup = `<g id="energy" opacity="${energy.opacity}" transform="${energyTransform(rig, Number(energy.scale))}"><g transform="translate(${box.propsX} 0) scale(${PROPS_SCALE})">${(art.energy ?? []).map(groupOf).join("")}</g></g>`;
  const props = ranks
    .map((rank, i) => {
      const layers = art.props[rank] ?? [];
      const outline = layers.find((l) => l.name === "base")?.d ?? "";
      const vis = i === visibleRank ? "visible" : "hidden";
      return `<g id="props-${rank}" visibility="${vis}"><g id="props-${rank}-fill" opacity="1">${layers.map(groupOf).join("")}</g><path id="props-${rank}-outline" d="${outline}" fill="none" stroke="${OUTLINE.stroke}" stroke-width="${OUTLINE.width}" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="0" opacity="0"/></g>`;
    })
    .join("");
  const avatar = parts
    .map((part) => {
      const outfits = ranks
        .map((rank, i) => {
          const layers = (art.outfits[rank] ?? []).filter((l) => l.part === part);
          return `<g id="outfit-${rank}-${part}" ${state(i)}>${layers.map(groupOf).join("")}</g>`;
        })
        .join("");
      return `<g id="part-${part}"${partTransform(rig, part, pose)}><g id="part-${part}-idle">${outfits}</g></g>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${box.width} ${box.height}" preserveAspectRatio="xMidYMid meet">${floor}${energyGroup}<g id="props" transform="translate(${box.propsX} 0) scale(${PROPS_SCALE})">${props}</g><g id="avatar" transform="translate(${box.figureX} 0)">${avatar}</g></svg>`;
}

export function silhouetteMarkup(d, rig) {
  const box = sceneBox(rig);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${box.width} ${box.height}" preserveAspectRatio="xMidYMid meet"><path transform="translate(${box.figureX} 0) scale(${SILHOUETTE_SCALE})" fill="#202020" d="${d}"/></svg>`;
}

/** Re-poses a built scene on rank `index`: the same edits the runtime makes, as attributes. */
export function stillMarkup(sceneSvg, rig, index) {
  const ranks = rig.ranks;
  const pose = rig.poses[ranks[index]];
  const energy = energyAt(index, ranks.length);
  let svg = sceneSvg;
  const retag = (id, attrs) => {
    svg = svg.replace(new RegExp(`<g id="${id}"[^>]*>`), `<g id="${id}"${attrs}>`);
  };
  ranks.forEach((rank, i) => {
    const state =
      i === index ? ' visibility="visible" opacity="1"' : ' visibility="hidden" opacity="0"';
    for (const part of partsOf(rig)) retag(`outfit-${rank}-${part}`, state);
    retag(`props-${rank}`, ` visibility="${i === index ? "visible" : "hidden"}"`);
  });
  for (const part of partsOf(rig)) retag(`part-${part}`, partTransform(rig, part, pose));
  retag(
    "energy",
    ` opacity="${energy.opacity}" transform="${energyTransform(rig, Number(energy.scale))}"`,
  );
  return svg;
}

async function traceOptional(path, options) {
  if (!existsSync(path)) {
    console.warn(`missing ${path}: emitting its group empty`);
    return [];
  }
  return traceLayers(path, options);
}

export async function buildScene({ artDir, outDir, silhouettePath, rig, trace = {} }) {
  const { width, height } = rig.canvas;
  const { propsSize } = sceneBox(rig);
  const tracedPropsSize = Math.round(propsSize / PROPS_SCALE);
  const basePath = join(artDir, "base.webp");
  if (!existsSync(basePath)) throw new Error(`missing ${basePath}`);
  const art = { outfits: {}, props: {}, energy: [] };
  for (const rank of rig.ranks) {
    const outfit = join(artDir, `outfit-${rank}.webp`);
    if (!existsSync(outfit)) throw new Error(`missing ${outfit}`);
    art.outfits[rank] = await traceLayers(outfit, { width, height, parts: rig.parts, trace });
    art.props[rank] = await traceOptional(join(artDir, `props-${rank}.webp`), {
      width: tracedPropsSize,
      height: tracedPropsSize,
      trace,
    });
  }
  art.energy = await traceOptional(join(artDir, "energy.webp"), {
    width: tracedPropsSize,
    height: tracedPropsSize,
    trace,
  });

  const silhouetteWidth = Math.round(width / SILHOUETTE_SCALE);
  const silhouetteHeight = Math.round(height / SILHOUETTE_SCALE);
  const base = await loadIndices(basePath, {
    width: silhouetteWidth,
    height: silhouetteHeight,
    blur: 0,
  });
  const mask = await maskPng(
    base.indices,
    silhouetteWidth,
    silhouetteHeight,
    (i) => i !== BACKGROUND,
  );
  const silhouette = silhouetteMarkup(mask ? await tracePath(mask, SILHOUETTE_TRACE) : "", rig);
  const scene = sceneMarkup(art, rig, { visibleRank: 0 });

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "scene.svg"), scene);
  writeFileSync(silhouettePath, silhouette);
  return { scene, silhouette };
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const rig = require("../src/data/avatar-rig.json");
  const { scene, silhouette } = await buildScene({
    artDir: "art/journey",
    outDir: "public/journey",
    silhouettePath: "src/components/journey/silhouette.svg",
    rig,
  });
  const kb = (s) => (s.length / 1024).toFixed(0);
  console.log(
    `public/journey/scene.svg: ${kb(scene)} KB, ${(gzipSync(scene).length / 1024).toFixed(0)} KB gz`,
  );
  console.log(`src/components/journey/silhouette.svg: ${(silhouette.length / 1024).toFixed(1)} KB`);
}
