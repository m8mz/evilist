// The deck's pose model (deck spec §7): pure functions from scroll progress, pointer tilt, hover,
// the clock and the intro to seven card poses and the stage's energy. No DOM, no Three. The stage
// (Plan 2) converts px to world units and drives the meshes; tests pin every curve here.
import type { RankLabel } from "../../data/career";
import type { DeckLayout, Point } from "./deck-layout";
import { DECK_PARAMS, type DeckParams } from "./deck-params";

export const clamp01 = (v: number): number =>
  Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;

export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

export const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

/** Ease-out that passes 1 and settles back; `overshoot` is the back-ease's c1 constant. */
export function backOut(t: number, overshoot: number): number {
  const c1 = overshoot;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

export interface Pulls {
  active: number;
  within: number;
  /** Handoff progress, 0 outside the window. */
  k: number;
  /** Per card: 0 racked, 1 presented. */
  pull: number[];
}

/** Which card is out, and how far the next one is on its way (spec §7). */
export function pullsFor(
  p: number,
  count: number,
  handoffStart: number = DECK_PARAMS.pull.handoffStart,
): Pulls {
  const f = clamp01(p) * count;
  const active = Math.min(count - 1, Math.floor(f));
  const within = f - active;
  const k =
    active < count - 1 && within > handoffStart
      ? clamp01((within - handoffStart) / (1 - handoffStart))
      : 0;
  const pull = new Array<number>(count).fill(0);
  pull[active] = 1 - easeInOutCubic(k);
  if (active + 1 < count) pull[active + 1] = easeInOutCubic(k);
  return { active, within, k, pull };
}

export type CardPhase = "racked" | "pulling" | "landing" | "presented" | "leaving";

export interface Energy {
  energy: number;
  kind: "S" | "S+" | null;
  /** The card the energy belongs to (the light and the smoke follow it). */
  index: number | null;
}

/** The stage's energy: S breathes, S+ grows with its rank; during a handoff the larger pull wins. */
export function energyFor(
  pulls: Pulls,
  labels: readonly RankLabel[],
  landedAt: number = DECK_PARAMS.pull.landedAt,
  params: DeckParams = DECK_PARAMS,
): Energy {
  const E = params.energy;
  let best = -1;
  const out: Energy = { energy: 0, kind: null, index: null };
  labels.forEach((label, i) => {
    if (label !== "S" && label !== "S+") return;
    const pull = pulls.pull[i] ?? 0;
    if (pull <= 0 || pull <= best) return;
    best = pull;
    const landed = pull > landedAt;
    let energy: number;
    if (!landed) energy = E.pulling * pull;
    else if (label === "S") energy = E.s;
    else energy = E.sPlusBase + E.sPlusRamp * Math.min(1, pulls.within / E.sPlusWindow);
    out.energy = energy;
    out.kind = label;
    out.index = i;
  });
  return out;
}

// Part 2 (poses, tilt, hover, float) and part 3 (the intro) follow in the next tasks.
export type { DeckLayout, Point };
