import { describe, expect, it } from "vitest";
import type { Pose } from "../src/data/avatarRig";
import { BLEND, sceneState, stageForProgress } from "../src/scripts/avatar";

const rest: Pose = { neck: 0, "shoulder-left": 0, "shoulder-right": 0, hips: 0 };
const raised: Pose = { neck: -4, "shoulder-left": 0, "shoulder-right": -40, hips: 0 };
const poses: Pose[] = [rest, raised, rest, rest, rest, rest, rest];

/** Progress at fraction `local` of rank `i`'s stretch, for seven ranks. */
const at = (i: number, local: number) => (i + local) / 7;

const finite = (value: unknown): void => {
  if (typeof value === "number") expect(Number.isFinite(value)).toBe(true);
  else if (Array.isArray(value)) value.forEach(finite);
  else if (value && typeof value === "object") Object.values(value).forEach(finite);
};

describe("stageForProgress", () => {
  it("splits progress evenly and clamps bad input", () => {
    expect(stageForProgress(0, 7)).toBe(0);
    expect(stageForProgress(0.15, 7)).toBe(1);
    expect(stageForProgress(1, 7)).toBe(6);
    expect(stageForProgress(-1, 7)).toBe(0);
    expect(stageForProgress(Number.NaN, 7)).toBe(0);
  });
});

describe("sceneState", () => {
  it("is settled on a rank outside the blend: one outfit, its props filled, its pose", () => {
    const s = sceneState(at(3, 0.5), poses);
    expect([s.rank, s.next, s.t]).toEqual([3, 3, 0]);
    expect(s.outfits).toEqual([{ rank: 3, opacity: 1 }]);
    expect(s.props).toEqual([{ rank: 3, fill: 1, outline: 0, draw: 0 }]);
    expect(s.pose).toEqual(rest);
  });

  it("starts blending at the last 30% of a rank's stretch", () => {
    expect(sceneState(at(0, 1 - BLEND - 0.001), poses).t).toBe(0);
    expect(sceneState(at(0, 1 - BLEND + 0.03), poses).t).toBeCloseTo(0.1, 5);
  });

  it("cross-fades the outfits and interpolates the pose halfway through the blend", () => {
    const s = sceneState(at(0, 0.85), poses);
    expect([s.rank, s.next]).toEqual([0, 1]);
    expect(s.t).toBeCloseTo(0.5, 5);
    expect(s.outfits.map((o) => o.rank)).toEqual([0, 1]);
    expect(s.outfits[0]!.opacity).toBeCloseTo(0.5, 5);
    expect(s.outfits[1]!.opacity).toBeCloseTo(0.5, 5);
    expect(s.pose["shoulder-right"]).toBeCloseTo(-20, 5);
    expect(s.pose.neck).toBeCloseTo(-2, 5);
  });

  it("fades the old props out first, draws the new outline in, then fills and drops the outline", () => {
    const half = sceneState(at(0, 0.85), poses).props; // t = 0.5
    expect(half[0]).toEqual({ rank: 0, fill: 0, outline: 0, draw: 0 });
    expect(half[1]!.rank).toBe(1);
    expect(half[1]!.fill).toBeCloseTo(0, 5);
    expect(half[1]!.outline).toBe(1);
    expect(half[1]!.draw).toBeCloseTo(1 - 0.5 / 0.6, 5);

    const late = sceneState(at(0, 0.97), poses).props; // t = 0.9
    expect(late[0]!.fill).toBe(0);
    expect(late[1]!.fill).toBeCloseTo(0.8, 5);
    expect(late[1]!.outline).toBeCloseTo(0.5, 5);
    expect(late[1]!.draw).toBe(0);

    const early = sceneState(at(0, 0.73), poses).props; // t = 0.1
    expect(early[0]!.fill).toBeCloseTo(0.8, 5);
    expect(early[1]!.draw).toBeCloseTo(1 - 0.1 / 0.6, 5);
  });

  it("lands exactly on the next rank when the blend ends", () => {
    const s = sceneState(at(1, 0), poses);
    expect([s.rank, s.next, s.t]).toEqual([1, 1, 0]);
    expect(s.outfits).toEqual([{ rank: 1, opacity: 1 }]);
    expect(s.pose).toEqual(raised);
  });

  it("never blends past the last rank, and clamps progress outside 0–1 or NaN", () => {
    for (const p of [at(6, 0.9), 1, 1.4, 7]) {
      const s = sceneState(p, poses);
      expect([s.rank, s.next, s.t], String(p)).toEqual([6, 6, 0]);
      expect(s.outfits).toEqual([{ rank: 6, opacity: 1 }]);
      finite(s);
    }
    // Anything not finite, and anything below zero, reads as the start.
    for (const p of [-0.2, Number.NaN, Number.POSITIVE_INFINITY]) {
      const s = sceneState(p, poses);
      expect(s.rank, String(p)).toBe(0);
      finite(s);
    }
  });

  it("grows the energy with overall progress", () => {
    expect(sceneState(0, poses).energy).toEqual({ opacity: 0, scale: 0.5 });
    expect(sceneState(0.5, poses).energy).toEqual({ opacity: 0.25, scale: 0.75 });
    expect(sceneState(1, poses).energy).toEqual({ opacity: 1, scale: 1 });
  });
});
