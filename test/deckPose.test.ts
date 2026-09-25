import { describe, expect, it } from "vitest";
import type { RankLabel } from "../src/data/career";
import {
  backOut,
  clamp01,
  easeInOutCubic,
  energyFor,
  pullsFor,
} from "../src/scripts/deck/deck-pose";

const LABELS: RankLabel[] = ["E", "D", "C", "B", "A", "S", "S+"];
/** Progress at fraction `local` of rank `i`'s stretch, for seven ranks. */
const at = (i: number, local: number) => (i + local) / 7;

describe("clamp01 and the eases", () => {
  it("clamps and turns NaN into 0", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(1.4)).toBe(1);
    expect(clamp01(Number.NaN)).toBe(0);
    expect(clamp01(0.25)).toBe(0.25);
  });

  it("eases start at 0 and end at 1; the back-ease overshoots on the way in", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 6);
    expect(backOut(0, 1.3)).toBeCloseTo(0, 6);
    expect(backOut(1, 1.3)).toBeCloseTo(1, 6);
    expect(backOut(0.8, 1.3)).toBeGreaterThan(1);
  });
});

describe("pullsFor", () => {
  it("presents the active rank alone outside the handoff window", () => {
    const r = pullsFor(at(3, 0.5), 7);
    expect(r.active).toBe(3);
    expect(r.within).toBeCloseTo(0.5, 6);
    expect(r.k).toBe(0);
    expect(r.pull).toEqual([0, 0, 0, 1, 0, 0, 0]);
  });

  it("hands off during the last 30% of a rank, cubic in-out", () => {
    const start = pullsFor(at(0, 0.7), 7);
    expect(start.k).toBeCloseTo(0, 6);
    const half = pullsFor(at(0, 0.85), 7);
    expect(half.k).toBeCloseTo(0.5, 6);
    expect(half.pull[0]).toBeCloseTo(0.5, 6);
    expect(half.pull[1]).toBeCloseTo(0.5, 6);
    const quarter = pullsFor(at(0, 0.775), 7);
    expect(quarter.pull[1]).toBeCloseTo(easeInOutCubic(0.25), 6);
    expect(quarter.pull[0]).toBeCloseTo(1 - easeInOutCubic(0.25), 6);
  });

  it("is continuous across the rank boundary", () => {
    const before = pullsFor(at(1, 0) - 1e-9, 7);
    const after = pullsFor(at(1, 0), 7);
    expect(before.pull[1]).toBeCloseTo(1, 4);
    expect(after.pull[1]).toBe(1);
    expect(before.pull[0]).toBeCloseTo(0, 4);
  });

  it("keeps E presented at the top and S+ presented at the end", () => {
    expect(pullsFor(0, 7).pull[0]).toBe(1);
    expect(pullsFor(-0.5, 7).pull[0]).toBe(1);
    expect(pullsFor(at(6, 0.9), 7).pull[6]).toBe(1);
    expect(pullsFor(1, 7).pull[6]).toBe(1);
    expect(pullsFor(1.3, 7).pull[6]).toBe(1);
    expect(pullsFor(Number.NaN, 7).pull[0]).toBe(1);
  });
});

describe("energyFor", () => {
  it("is zero through rank A", () => {
    for (const i of [0, 1, 2, 3, 4]) {
      expect(energyFor(pullsFor(at(i, 0.5), 7), LABELS)).toEqual({
        energy: 0,
        kind: null,
        index: null,
      });
    }
  });

  it("breathes at 0.3 while S is presented and grows through S+", () => {
    expect(energyFor(pullsFor(at(5, 0.5), 7), LABELS)).toEqual({
      energy: 0.3,
      kind: "S",
      index: 5,
    });
    const early = energyFor(pullsFor(at(6, 0), 7), LABELS);
    expect(early.kind).toBe("S+");
    expect(early.energy).toBeCloseTo(0.25, 6);
    const mid = energyFor(pullsFor(at(6, 0.35), 7), LABELS);
    expect(mid.energy).toBeCloseTo(0.25 + 0.75 * 0.5, 6);
    const late = energyFor(pullsFor(at(6, 0.9), 7), LABELS);
    expect(late.energy).toBeCloseTo(1, 6);
  });

  it("scales with the pull while S is arriving, and follows the larger pull in the S → S+ handoff", () => {
    const arriving = energyFor(pullsFor(at(4, 0.85), 7), LABELS); // S at pull 0.5
    expect(arriving.kind).toBe("S");
    expect(arriving.energy).toBeCloseTo(0.15 * 0.5, 6);
    const leavingS = energyFor(pullsFor(at(5, 0.775), 7), LABELS); // S 0.84, S+ 0.16
    expect(leavingS.kind).toBe("S");
    expect(leavingS.index).toBe(5);
    const arrivingSPlus = energyFor(pullsFor(at(5, 0.925), 7), LABELS); // S 0.16, S+ 0.84
    expect(arrivingSPlus.kind).toBe("S+");
    expect(arrivingSPlus.index).toBe(6);
    expect(arrivingSPlus.energy).toBeCloseTo(0.15 * easeInOutCubic(0.75), 6);
  });
});
