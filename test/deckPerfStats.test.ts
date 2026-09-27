import { describe, expect, it } from "vitest";
import { frameStats, percentile } from "../scripts/deck-perf-stats.mjs";

describe("percentile", () => {
  it("interpolates over a sorted list", () => {
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(percentile([1, 2, 3, 4], 0.95)).toBeCloseTo(3.85, 6);
    expect(percentile([7], 0.5)).toBe(7);
    expect(percentile([], 0.5)).toBe(0);
  });
});

describe("frameStats", () => {
  it("turns rAF timestamps into frame durations and reports p50, p95, long frames and the max", () => {
    const t = [0, 16, 32, 48, 120, 136]; // one 72 ms frame
    const s = frameStats(t);
    expect(s.frames).toBe(5);
    expect(s.p50).toBe(16);
    expect(s.long).toBe(1);
    expect(s.max).toBe(72);
    expect(s.p95).toBeGreaterThan(16);
  });
  it("needs at least two timestamps", () => {
    expect(frameStats([5])).toEqual({ frames: 0, p50: 0, p95: 0, long: 0, max: 0 });
  });
});
