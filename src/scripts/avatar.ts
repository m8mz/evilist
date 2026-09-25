// Maps scroll progress through the journey to the scene's state (vector journey spec §5): the
// settled rank, the arriving rank and how far the blend between them has run, and from those
// every live outfit's opacity, every live prop set's fill and outline, the interpolated pose and
// the energy. Pure, so it is unit-tested; src/scripts/scene.ts writes it to the SVG.
import type { Pose } from "../data/avatarRig";

/** The last 30% of each rank's stretch blends into the next rank (spec §3.2). */
export const BLEND = 0.3;

export interface OutfitState {
  rank: number;
  opacity: number;
}

export interface PropsState {
  rank: number;
  /** The fills' opacity. */
  fill: number;
  /** The outline's opacity. */
  outline: number;
  /** The outline's stroke-dashoffset: 1 is undrawn, 0 fully drawn. */
  draw: number;
}

export interface SceneState {
  rank: number;
  next: number;
  /** 0 until the last 30% of a rank's stretch, then 0 → 1. */
  t: number;
  outfits: OutfitState[];
  props: PropsState[];
  pose: Pose;
  energy: { opacity: number; scale: number };
}

export function stageForProgress(progress: number, stages: number): number {
  if (!Number.isFinite(progress) || progress <= 0) return 0;
  return Math.min(stages - 1, Math.floor(progress * stages));
}

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);
const smooth = (t: number): number => t * t * (3 - 2 * t);

const lerpPose = (a: Pose, b: Pose, t: number): Pose =>
  Object.fromEntries(
    (Object.keys(a) as (keyof Pose)[]).map((k) => [k, a[k] + (b[k] - a[k]) * t]),
  ) as Pose;

export function sceneState(progress: number, poses: readonly Pose[]): SceneState {
  const stages = poses.length;
  const p = Number.isFinite(progress) ? clamp01(progress) : 0;
  const rank = stageForProgress(p, stages);
  const local = Math.min(1, p * stages - rank);
  const blending = rank < stages - 1 && local > 1 - BLEND;
  const t = blending ? (local - (1 - BLEND)) / BLEND : 0;
  const next = blending ? rank + 1 : rank;
  const s = smooth(t);
  const outfits: OutfitState[] = blending
    ? [
        { rank, opacity: 1 - s },
        { rank: next, opacity: s },
      ]
    : [{ rank, opacity: 1 }];
  // The old props fade over the first half; the new outline draws over 60%, the fills come in
  // over the second half, and the outline leaves over the last fifth.
  const props: PropsState[] = blending
    ? [
        { rank, fill: 1 - clamp01(t / 0.5), outline: 0, draw: 0 },
        {
          rank: next,
          fill: clamp01((t - 0.5) / 0.5),
          outline: t < 0.8 ? 1 : 1 - (t - 0.8) / 0.2,
          draw: 1 - clamp01(t / 0.6),
        },
      ]
    : [{ rank, fill: 1, outline: 0, draw: 0 }];
  const pose = blending ? lerpPose(poses[rank]!, poses[next]!, s) : { ...poses[rank]! };
  return { rank, next, t, outfits, props, pose, energy: { opacity: p * p, scale: 0.5 + 0.5 * p } };
}
