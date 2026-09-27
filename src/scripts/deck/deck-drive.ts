// The deck's rank drive (deck spec §7 as amended by Plan 5): the scroll chooses a rank, and every
// change of rank plays as one transition of a fixed duration that nothing can park half-way. A
// jump (rail, click, swipe) is a transition straight from the current card to the target. Pure, so
// the tests pin the queue and the pulls without a clock or a DOM.
import { DECK_PARAMS, type DeckParams } from "./deck-params";
import { clamp01, easeInOutCubic } from "./deck-util";

export interface Transition {
  from: number;
  to: number;
  startMs: number;
}

export interface DriveState {
  /** The settled rank (the presented card once no transition runs). */
  current: number;
  /** What the scroll, or the last jump, asks for. */
  wanted: number;
  transition: Transition | null;
}

/** The pulls the pose model consumes: one per card, plus who is moving. */
export interface Pulls {
  active: number;
  /** 0–1 through the active rank's scroll stretch; 0 while a card is still arriving. */
  within: number;
  pull: number[];
  from: number | null;
  to: number | null;
  /** Eased transition fraction, 0 when settled. */
  k: number;
}

/**
 * The rank whose stretch the scroll is in. Leaving `current` needs the scroll to pass the boundary
 * by `hysteresis` of a stretch, so a finger resting on a boundary never flickers the deck.
 */
export function rankFromScroll(
  p: number,
  current: number,
  count: number,
  hysteresis: number,
): number {
  const f = clamp01(p) * count; // 0..count; rank r spans [r, r + 1)
  const lo = current - hysteresis;
  const hi = current + 1 + hysteresis;
  if (f >= lo && f < hi) return current;
  return Math.min(count - 1, Math.max(0, Math.floor(f)));
}

export function initialDrive(
  p: number,
  count: number,
  params: DeckParams = DECK_PARAMS,
): DriveState {
  const rank = rankFromScroll(p, 0, count, params.drive.hysteresis);
  return { current: rank, wanted: rank, transition: null };
}

export function transitionK(
  t: Transition | null,
  timeMs: number,
  params: DeckParams = DECK_PARAMS,
): number {
  if (!t) return 0;
  return clamp01((timeMs - t.startMs) / params.drive.durationMs);
}

/** One frame of the queue: settle a finished transition, read the wanted rank, start the next. */
export function stepDrive(
  state: DriveState,
  p: number,
  jump: number | null,
  timeMs: number,
  count: number,
  params: DeckParams = DECK_PARAMS,
): DriveState {
  let { current, transition } = state;
  if (transition && transitionK(transition, timeMs, params) >= 1) {
    current = transition.to;
    transition = null;
  }
  const wanted =
    jump !== null
      ? Math.min(count - 1, Math.max(0, Math.round(jump)))
      : rankFromScroll(p, state.wanted, count, params.drive.hysteresis);
  if (!transition && wanted !== current)
    transition = { from: current, to: wanted, startMs: timeMs };
  if (current === state.current && wanted === state.wanted && transition === state.transition)
    return state;
  return { current, wanted, transition };
}

export function pullsForDrive(
  state: DriveState,
  p: number,
  timeMs: number,
  count: number,
  params: DeckParams = DECK_PARAMS,
): Pulls {
  const pull = new Array<number>(count).fill(0);
  const t = state.transition;
  if (!t) {
    pull[state.current] = 1;
    const within = clamp01(clamp01(p) * count - state.current);
    return { active: state.current, within, pull, from: null, to: null, k: 0 };
  }
  const k = easeInOutCubic(transitionK(t, timeMs, params));
  pull[t.from] = 1 - k;
  pull[t.to] = k;
  const active = k < 0.5 ? t.from : t.to;
  return { active, within: 0, pull, from: t.from, to: t.to, k };
}
