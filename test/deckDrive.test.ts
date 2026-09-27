import { describe, expect, it } from "vitest";
import {
  initialDrive,
  pullsForDrive,
  rankFromScroll,
  stepDrive,
  transitionK,
} from "../src/scripts/deck/deck-drive";
import { DECK_PARAMS } from "../src/scripts/deck/deck-params";
import { easeInOutCubic } from "../src/scripts/deck/deck-util";

const N = 7;
const D = DECK_PARAMS.drive.durationMs;
const H = DECK_PARAMS.drive.hysteresis;
const centre = (rank: number) => (rank + 0.5) / N;

describe("rankFromScroll", () => {
  it("picks the rank whose stretch the scroll is in, with hysteresis around the boundaries", () => {
    expect(rankFromScroll(centre(0), 0, N, H)).toBe(0);
    expect(rankFromScroll(centre(3), 0, N, H)).toBe(3);
    // Just past the 0|1 boundary: still 0 within the hysteresis band, 1 beyond it.
    expect(rankFromScroll((1 + H * 0.5) / N, 0, N, H)).toBe(0);
    expect(rankFromScroll((1 + H * 1.5) / N, 0, N, H)).toBe(1);
    // Coming back from 1, the same band holds 1.
    expect(rankFromScroll((1 - H * 0.5) / N, 1, N, H)).toBe(1);
    expect(rankFromScroll((1 - H * 1.5) / N, 1, N, H)).toBe(0);
  });
  it("clamps to the ends", () => {
    expect(rankFromScroll(-1, 3, N, H)).toBe(0);
    expect(rankFromScroll(2, 3, N, H)).toBe(N - 1);
  });
});

describe("stepDrive", () => {
  it("starts settled at the scroll's rank", () => {
    const s = initialDrive(centre(4), N);
    expect(s).toEqual({ current: 4, wanted: 4, transition: null });
  });
  it("anchors the hysteresis on the scroll's own rank, not always 0 (Minor 7)", () => {
    // f = 1.05 sits inside rank 0's old hysteresis band ([1, 1.15)) if anchored at 0, but the
    // scroll has actually crossed into rank 1's stretch.
    expect(initialDrive(1.05 / N, N).current).toBe(1);
  });
  it("starts one transition when the wanted rank changes, and does not restart it while it runs", () => {
    let s = initialDrive(centre(0), N);
    s = stepDrive(s, centre(1), null, 1000, N);
    // fromWithin is rank 0's own within at the moment of the jump to centre(1): clamp01(1.5) = 1.
    expect(s.transition).toEqual({ from: 0, to: 1, startMs: 1000, fromWithin: 1 });
    s = stepDrive(s, centre(3), null, 1400, N); // the scroll ran ahead
    expect(s.transition).toEqual({ from: 0, to: 1, startMs: 1000, fromWithin: 1 });
    expect(s.wanted).toBe(3);
  });
  it("settles at the end of the duration, then queues the next transition directly to the wanted rank", () => {
    let s = initialDrive(centre(0), N);
    s = stepDrive(s, centre(3), null, 1000, N);
    s = stepDrive(s, centre(3), null, 1000 + D - 1, N);
    expect(s.current).toBe(0);
    s = stepDrive(s, centre(3), null, 1000 + D, N);
    expect(s.current).toBe(3);
    expect(s.transition).toBeNull();
    s = stepDrive(s, centre(5), null, 1000 + D, N);
    // fromWithin is rank 3's own within at centre(5): clamp01(5.5 − 3) = 1.
    expect(s.transition).toEqual({ from: 3, to: 5, startMs: 1000 + D, fromWithin: 1 });
  });
  it("takes a jump as the wanted rank at once, whatever the scroll says", () => {
    let s = initialDrive(centre(0), N);
    s = stepDrive(s, centre(0), 6, 500, N);
    // fromWithin is rank 0's own within at centre(0): clamp01(0.5) = 0.5.
    expect(s.transition).toEqual({ from: 0, to: 6, startMs: 500, fromWithin: 0.5 });
  });
  it("does nothing when wanted equals current", () => {
    const s = initialDrive(centre(2), N);
    expect(stepDrive(s, centre(2), null, 99, N)).toEqual(s);
  });
});

describe("transitionK and pullsForDrive", () => {
  it("is the linear time fraction, clamped", () => {
    const t = { from: 0, to: 1, startMs: 100, fromWithin: 0 };
    expect(transitionK(t, 100)).toBe(0);
    expect(transitionK(t, 100 + D / 2)).toBeCloseTo(0.5, 6);
    expect(transitionK(t, 100 + 2 * D)).toBe(1);
    expect(transitionK(null, 5)).toBe(0);
  });
  it("gives a settled deck one full pull at the current rank and within from the scroll", () => {
    const s = initialDrive(centre(6), N);
    const p = pullsForDrive(s, (6 + 0.9) / N, 0, N);
    expect(p.pull[6]).toBe(1);
    expect(p.pull.filter((x) => x > 0)).toHaveLength(1);
    expect(p.active).toBe(6);
    expect(p.within).toBeCloseTo(0.9, 6);
    expect(p.fromWithin).toBe(0);
    expect(p.from).toBeNull();
    expect(p.k).toBe(0);
  });
  it("eases the leaving and arriving cards against each other and leaves the rest racked, even across several ranks", () => {
    const s = {
      current: 1,
      wanted: 5,
      transition: { from: 1, to: 5, startMs: 0, fromWithin: 0.8 },
    };
    const half = pullsForDrive(s, centre(5), D / 2, N);
    expect(half.pull[1]).toBeCloseTo(0.5, 6);
    expect(half.pull[5]).toBeCloseTo(0.5, 6);
    expect(half.pull.filter((x) => x > 0)).toHaveLength(2);
    const early = pullsForDrive(s, centre(5), D * 0.1, N);
    expect(early.pull[1]).toBeGreaterThan(0.9); // cubic in-out: slow start
    expect(early.active).toBe(1);
    const late = pullsForDrive(s, centre(5), D * 0.9, N);
    expect(late.active).toBe(5);
    // The arriving rank's within ramps in with k (Important 2), toward the scroll's own position in
    // rank 5's stretch (centre(5) → 0.5), not 0 — only a settled read gives the raw value outright.
    const kLate = easeInOutCubic(transitionK(s.transition, D * 0.9, DECK_PARAMS));
    expect(late.within).toBeCloseTo(kLate * 0.5, 6);
  });
  it("ramps the arriving rank's within in with k and the leaving rank's out", () => {
    const s = {
      current: 5,
      wanted: 6,
      transition: { from: 5, to: 6, startMs: 0, fromWithin: 0.9 },
    };
    // k = easeInOutCubic(0.5) = 0.5 exactly, so both numbers are clean.
    const half = pullsForDrive(s, (6 + 0.8) / N, D / 2, N);
    expect(half.within).toBeCloseTo(0.4, 6); // 0.5 × 0.8, the scroll's own position past rank 6
    expect(half.fromWithin).toBeCloseTo(0.45, 6); // (1 − 0.5) × 0.9, the captured value ramping out
    // Continuity: at k → 1 the arriving within equals the scroll's own within; at k = 0 the leaving
    // one still equals what it was when the transition started.
    expect(pullsForDrive(s, (6 + 0.8) / N, D, N).within).toBeCloseTo(0.8, 6);
    expect(pullsForDrive(s, (6 + 0.8) / N, 0, N).fromWithin).toBeCloseTo(0.9, 6);
  });
});
