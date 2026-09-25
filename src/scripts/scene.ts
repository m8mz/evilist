// Binds the fetched scene's groups by id and writes a SceneState to them as SVG attributes
// (vector journey spec §5): rotate() on the pivoted parts, visibility and opacity on the live
// outfits and prop sets, stroke-dashoffset on an arriving outline, opacity and scale on the
// energy. Attributes only, never style, for the CSP. The ids are the builder's contract
// (scripts/build-scene.mjs). A frame writes only the attributes whose value changed since the
// last frame.
import { PART_ORDER, PIVOT_OF_PART, RIG, type PartId, type Rig } from "../data/avatarRig";
import type { SceneState } from "./avatar";

/** Anything with setAttribute: an SVG element, or a fake in tests. */
export interface Attr {
  setAttribute(name: string, value: string): void;
}

export interface SceneRefs {
  parts: Partial<Record<PartId, Attr>>;
  /** By rank index, then part. A part an outfit lacks is absent. */
  outfits: Partial<Record<PartId, Attr>>[];
  props: { group: Attr; fill: Attr; outline: Attr }[];
  energy: Attr;
}

/** The figure's x in the scene, as a fraction of the canvas width (sceneBox in build-scene.mjs). */
export const FIGURE_X = 0.3;

export function bindScene(byId: (id: string) => Attr | null, rig: Rig = RIG): SceneRefs | null {
  const energy = byId("energy");
  if (!energy) return null;
  const parts: Partial<Record<PartId, Attr>> = {};
  for (const part of PART_ORDER) {
    const el = byId(`part-${part}`);
    if (el) parts[part] = el;
  }
  const outfits = rig.ranks.map((rank) => {
    const outfit: Partial<Record<PartId, Attr>> = {};
    for (const part of PART_ORDER) {
      const el = byId(`outfit-${rank}-${part}`);
      if (el) outfit[part] = el;
    }
    return outfit;
  });
  const props: SceneRefs["props"] = [];
  for (const rank of rig.ranks) {
    const group = byId(`props-${rank}`);
    const fill = byId(`props-${rank}-fill`);
    const outline = byId(`props-${rank}-outline`);
    if (!group || !fill || !outline) return null;
    props.push({ group, fill, outline });
  }
  return { parts, outfits, props, energy };
}

const f = (n: number): string => n.toFixed(3);

/** What each element was last given, so a frame only writes what changed. */
const written = new WeakMap<Attr, Record<string, string>>();

const set = (el: Attr, name: string, value: string): void => {
  let last = written.get(el);
  if (!last) written.set(el, (last = {}));
  if (last[name] === value) return;
  last[name] = value;
  el.setAttribute(name, value);
};

export function applyState(refs: SceneRefs, state: SceneState, rig: Rig = RIG): void {
  for (const part of PART_ORDER) {
    const pivot = PIVOT_OF_PART[part];
    const el = refs.parts[part];
    if (!pivot || !el) continue;
    const [x, y] = rig.pivots[pivot];
    set(el, "transform", `rotate(${f(state.pose[pivot])} ${x} ${y})`);
  }
  const outfits = new Map(state.outfits.map((o) => [o.rank, o.opacity]));
  refs.outfits.forEach((outfit, rank) => {
    const opacity = outfits.get(rank);
    for (const el of Object.values(outfit)) {
      set(el, "visibility", opacity === undefined ? "hidden" : "visible");
      set(el, "opacity", f(opacity ?? 0));
    }
  });
  const props = new Map(state.props.map((p) => [p.rank, p]));
  refs.props.forEach((el, rank) => {
    const p = props.get(rank);
    set(el.group, "visibility", p ? "visible" : "hidden");
    if (!p) return;
    set(el.fill, "opacity", f(p.fill));
    set(el.outline, "opacity", f(p.outline));
    set(el.outline, "stroke-dashoffset", f(p.draw));
  });
  const [hx, hy] = rig.pivots.hips;
  const x = hx + rig.canvas.width * FIGURE_X;
  set(refs.energy, "opacity", f(state.energy.opacity));
  set(
    refs.energy,
    "transform",
    `translate(${x} ${hy}) scale(${f(state.energy.scale)}) translate(${-x} ${-hy})`,
  );
}
