import { describe, expect, it } from "vitest";
import {
  judgeSwipe,
  orientationTilt,
  screenAngleOf,
  type ScreenAngle,
} from "../src/scripts/deck/deck-gestures";
import { DECK_PARAMS } from "../src/scripts/deck/deck-params";

describe("judgeSwipe", () => {
  it("needs more than swipeMinPx of horizontal travel", () => {
    expect(judgeSwipe(-40, 0)).toBe(0);
    expect(judgeSwipe(-41, 0)).toBe(1);
    expect(judgeSwipe(41, 0)).toBe(-1);
  });
  it("needs the horizontal travel to beat swipeRatio times the vertical", () => {
    expect(judgeSwipe(-60, 30)).toBe(0); // 60 is not > 2 × 30
    expect(judgeSwipe(-61, 30)).toBe(1);
    expect(judgeSwipe(-61, -30)).toBe(1); // the sign of dy does not matter
  });
  it("reads a leftward swipe as forward and a rightward one as back", () => {
    expect(judgeSwipe(-120, 5)).toBe(1);
    expect(judgeSwipe(120, 5)).toBe(-1);
  });
  it("ignores non-finite input", () => {
    expect(judgeSwipe(Number.NaN, 0)).toBe(0);
    expect(judgeSwipe(-100, Number.POSITIVE_INFINITY)).toBe(0);
  });
  it("takes its thresholds from the params", () => {
    const P = {
      ...DECK_PARAMS,
      gestures: { ...DECK_PARAMS.gestures, swipeMinPx: 10, swipeRatio: 1 },
    };
    expect(judgeSwipe(-11, 10, P)).toBe(1);
    expect(judgeSwipe(-11, 12, P)).toBe(0);
  });
});

describe("screenAngleOf", () => {
  it("snaps any angle to the four screen orientations", () => {
    expect(screenAngleOf(0)).toBe(0);
    expect(screenAngleOf(90)).toBe(90);
    expect(screenAngleOf(-90)).toBe(270);
    expect(screenAngleOf(179)).toBe(180);
    expect(screenAngleOf(361)).toBe(0);
  });
});

describe("orientationTilt", () => {
  const base = { beta: 40, gamma: -5 };
  it("is zero at the baseline captured when tilt was enabled", () => {
    expect(orientationTilt(base, base, 0)).toEqual({ x: 0, y: 0 });
  });
  it("maps beta to rotX and gamma to rotY through the gain in portrait", () => {
    const t = orientationTilt({ beta: 50, gamma: 5 }, base, 0);
    expect(t.x).toBeCloseTo(10 * DECK_PARAMS.gestures.orientationGain, 6);
    expect(t.y).toBeCloseTo(10 * DECK_PARAMS.gestures.orientationGain, 6);
  });
  it("clamps to the tilt limits", () => {
    const t = orientationTilt({ beta: 140, gamma: 85 }, base, 0);
    expect(t.x).toBe(DECK_PARAMS.tilt.maxX);
    expect(t.y).toBe(DECK_PARAMS.tilt.maxY);
    const n = orientationTilt({ beta: -60, gamma: -95 }, base, 0);
    expect(n.x).toBe(-DECK_PARAMS.tilt.maxX);
    expect(n.y).toBe(-DECK_PARAMS.tilt.maxY);
  });
  it("swaps the axes in landscape so the card still follows the screen", () => {
    const portrait = orientationTilt({ beta: 50, gamma: -5 }, base, 0); // beta only
    const left = orientationTilt({ beta: 50, gamma: -5 }, base, 90);
    const right = orientationTilt({ beta: 50, gamma: -5 }, base, 270);
    expect(portrait.y).toBe(0);
    expect(left.x).toBe(0);
    expect(left.y).toBeCloseTo(-portrait.x, 6);
    expect(right.x).toBe(0);
    expect(right.y).toBeCloseTo(portrait.x, 6);
    const upside = orientationTilt({ beta: 50, gamma: 5 }, base, 180);
    expect(upside.x).toBeCloseTo(-5, 6);
    expect(upside.y).toBeCloseTo(-5, 6);
  });
  it("wraps a beta delta that crosses ±180 instead of reading it as a near-full turn", () => {
    const gain = DECK_PARAMS.gestures.orientationGain;
    const t = orientationTilt({ beta: -178, gamma: 0 }, { beta: 175, gamma: 0 }, 0);
    expect(t.x).toBeCloseTo(7 * gain, 6); // a 7° tilt forward, not −353°
    expect(t.x).toBeGreaterThan(0);
    expect(t.y).toBe(0);
    const back = orientationTilt({ beta: 175, gamma: 0 }, { beta: -178, gamma: 0 }, 0);
    expect(back.x).toBeCloseTo(-7 * gain, 6);
  });
  it("returns zero for a reading without numbers (desktop browsers fire nulls)", () => {
    const bad = { beta: Number.NaN, gamma: 3 };
    expect(orientationTilt(bad, base, 0 as ScreenAngle)).toEqual({ x: 0, y: 0 });
  });
});
