import { describe, expect, it } from "vitest";
import {
  mulberry32,
  nowFrom,
  once,
  parseFreeze,
  pickRendition,
  smooth,
} from "../src/scripts/deck/deck-util";

describe("smooth", () => {
  it("approaches the target exponentially with the time constant", () => {
    expect(smooth(0, 1, 90, 90)).toBeCloseTo(1 - Math.exp(-1), 6);
    expect(smooth(0, 1, 0, 90)).toBe(0);
    expect(smooth(1, 1, 16, 90)).toBe(1);
  });

  it("snaps to the target once within half a thousandth", () => {
    expect(smooth(0.9996, 1, 16, 90)).toBe(1);
    expect(smooth(0.4, 0.4003, 16, 90)).toBe(0.4003);
  });

  it("never moves backwards or overshoots, and survives huge frames", () => {
    expect(smooth(0, 1, 5000, 90)).toBe(1);
    expect(smooth(0, 1, Number.NaN, 90)).toBe(0);
  });
});

describe("parseFreeze", () => {
  it("reads an ISO date into a fixed clock, and ignores anything else", () => {
    expect(parseFreeze("?deck-freeze=2026-09-25")).toEqual({
      time: new Date(2026, 8, 25).getTime(),
    });
    expect(parseFreeze("?tune&deck-freeze=2026-01-02")).toEqual({
      time: new Date(2026, 0, 2).getTime(),
    });
    expect(parseFreeze("")).toBeNull();
    expect(parseFreeze("?deck-freeze=yesterday")).toBeNull();
    expect(parseFreeze("?deck-freeze=")).toBeNull();
  });
});

describe("pickRendition", () => {
  it("takes the 2× file from 1.5× up, the 1× below, and copes with missing files", () => {
    expect(pickRendition(1, "a1", "a2")).toBe("a1");
    expect(pickRendition(1.5, "a1", "a2")).toBe("a2");
    expect(pickRendition(3, "a1", "a2")).toBe("a2");
    expect(pickRendition(2, "a1", null)).toBe("a1");
    expect(pickRendition(1, null, "a2")).toBe("a2");
    expect(pickRendition(1, null, null)).toBeNull();
  });
});

describe("mulberry32", () => {
  it("is deterministic per seed and stays inside [0, 1)", () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    const seq = Array.from({ length: 5 }, () => a());
    expect(Array.from({ length: 5 }, () => b())).toEqual(seq);
    for (const v of seq) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    expect(mulberry32(8)()).not.toBe(seq[0]);
  });
});

describe("once and nowFrom", () => {
  it("runs a function a single time", () => {
    let calls = 0;
    const f = once(() => {
      calls++;
    });
    f();
    f();
    expect(calls).toBe(1);
  });

  it("turns the build date into local midnight, and falls back to today when it is missing", () => {
    expect(nowFrom("2026-09-25").getTime()).toBe(new Date(2026, 8, 25).getTime());
    const today = new Date();
    const fallback = nowFrom(undefined);
    expect(fallback.getFullYear()).toBe(today.getFullYear());
    expect(nowFrom("garbage").getFullYear()).toBe(today.getFullYear());
  });
});
