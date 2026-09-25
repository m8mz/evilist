// The avatar rig (vector journey spec §4.6): the figure canvas, the head/feet anchors the
// registration fits to, the part masks the tracer cuts every outfit by, the pivots the runtime
// rotates about, and each rank's pose. The JSON is the source so scripts/*.mjs can read it too.
import rig from "./avatar-rig.json";

export type PartId =
  "head" | "torso" | "arm-left" | "arm-right" | "legs" | "coat-left" | "coat-right";
export type PivotId = "neck" | "shoulder-left" | "shoulder-right" | "hips";
export type Point = [number, number];
/** Degrees about each pivot, positive clockwise on screen. */
export type Pose = Record<PivotId, number>;

export interface Rig {
  ranks: readonly string[];
  canvas: { width: number; height: number };
  /** y of the top of the head and the bottom of the feet, and the figure's centre x. */
  anchors: { crown: number; feet: number; centre: number };
  parts: readonly { id: PartId; polygon: readonly Point[] }[];
  pivots: Record<PivotId, Point>;
  poses: Readonly<Record<string, Pose>>;
}

export const RIG: Rig = rig as unknown as Rig;

/** Draw order, bottom to top: the torso covers the arm seams, the head covers the collar. */
export const PART_ORDER: readonly PartId[] = [
  "coat-left",
  "coat-right",
  "legs",
  "arm-left",
  "arm-right",
  "torso",
  "head",
];

/** The parts the runtime rotates, and about which pivot. */
export const PIVOT_OF_PART: Partial<Record<PartId, PivotId>> = {
  head: "neck",
  "arm-left": "shoulder-left",
  "arm-right": "shoulder-right",
};
