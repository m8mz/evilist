// Touch gestures for the deck (deck spec §7): the swipe that moves one rank and the mapping from a
// phone's orientation to the presented card's tilt. Pure: no DOM, so the page script and the tests
// share one definition of "a swipe".
import { DECK_PARAMS, type DeckParams } from "./deck-params";

/** +1 moves forward (a leftward swipe drags the next card in), −1 back, 0 is not a swipe. */
export type SwipeDirection = -1 | 0 | 1;

/**
 * Judged once, at pointer up (spec §7): the horizontal travel must beat `swipeMinPx` and
 * `swipeRatio` times the vertical travel, so a diagonal flick that the browser let through as a pan
 * does not move the deck.
 */
export function judgeSwipe(
  dx: number,
  dy: number,
  params: DeckParams = DECK_PARAMS,
): SwipeDirection {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return 0;
  const G = params.gestures;
  const ax = Math.abs(dx);
  if (ax <= G.swipeMinPx || ax <= G.swipeRatio * Math.abs(dy)) return 0;
  return dx < 0 ? 1 : -1;
}

export interface Orientation {
  /** Front-to-back tilt in degrees (the device's x axis). */
  beta: number;
  /** Left-to-right tilt in degrees (the device's y axis). */
  gamma: number;
}

export type ScreenAngle = 0 | 90 | 180 | 270;

/** `screen.orientation.angle` (or the legacy `window.orientation`) snapped to a quarter turn. */
export function screenAngleOf(angle: number): ScreenAngle {
  const quarter = Math.round(angle / 90) * 90;
  return (((quarter % 360) + 360) % 360) as ScreenAngle;
}

const clamp = (v: number, limit: number): number => {
  const clamped = Math.max(-limit, Math.min(limit, v));
  return clamped || 0; // Normalize -0 to 0
};

/** Degrees into [−180, 180): beta runs −180…180, so a delta across the wrap is a small turn. */
const wrapDeg = (v: number): number => ((((v + 180) % 360) + 360) % 360) - 180;

/**
 * The card's tilt target in degrees from a device reading, relative to the reading captured when
 * the visitor turned tilt on (so the phone's resting angle is "flat"). Beta drives rotX and gamma
 * drives rotY in portrait; in landscape the device's axes turn against the screen's, so they swap.
 * Clamped to the same limits the pointer tilt uses (spec §7: rotX ±8°, rotY ±10°).
 */
export function orientationTilt(
  reading: Orientation,
  baseline: Orientation,
  angle: ScreenAngle,
  params: DeckParams = DECK_PARAMS,
): { x: number; y: number } {
  const db = wrapDeg(reading.beta - baseline.beta); // gamma (−90…90) never wraps
  const dg = reading.gamma - baseline.gamma;
  if (!Number.isFinite(db) || !Number.isFinite(dg)) return { x: 0, y: 0 };
  let frontBack = db;
  let leftRight = dg;
  if (angle === 90) {
    frontBack = dg;
    leftRight = -db;
  } else if (angle === 270) {
    frontBack = -dg;
    leftRight = db;
  } else if (angle === 180) {
    frontBack = -db;
    leftRight = -dg;
  }
  const gain = params.gestures.orientationGain;
  return {
    x: clamp(frontBack * gain, params.tilt.maxX),
    y: clamp(leftRight * gain, params.tilt.maxY),
  };
}
