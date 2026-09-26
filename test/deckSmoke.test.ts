import { describe, expect, it } from "vitest";
import {
  SMOKE,
  SmokePool,
  type SmokeEmitter,
  type SmokeOpacity,
} from "../src/scripts/deck/deck-smoke";
import { mulberry32 } from "../src/scripts/deck/deck-util";

const emitter: SmokeEmitter = { x: 1, y: -0.5, z: 0.6, halfW: 1.3, halfH: 1.82, k: 1 };
const O: SmokeOpacity = { opacityMin: 0.1, opacityMax: 0.22 };
const pool = (seed = 7, capacity = 20) => new SmokePool(capacity, mulberry32(seed));

describe("SmokePool", () => {
  it("spawns from the top edge half the time and each side a quarter, never past capacity", () => {
    const p = new SmokePool(4000, mulberry32(3));
    expect(p.spawn(emitter, 5000, 1, O)).toBe(4000);
    expect(p.alive).toBe(4000);
    const top = p.puffs.filter((q) => q.y === emitter.y + emitter.halfH).length;
    const left = p.puffs.filter((q) => q.x === emitter.x - emitter.halfW).length;
    const right = p.puffs.filter((q) => q.x === emitter.x + emitter.halfW).length;
    expect(top + left + right).toBe(4000);
    expect(top / 4000).toBeCloseTo(0.5, 1);
    expect(left / 4000).toBeCloseTo(0.25, 1);
    expect(right / 4000).toBeCloseTo(0.25, 1);
    for (const q of p.puffs) {
      expect(q.z).toBeGreaterThanOrEqual(emitter.z + SMOKE.zMin);
      expect(q.z).toBeLessThanOrEqual(emitter.z + SMOKE.zMax);
      expect(q.life).toBeGreaterThanOrEqual(SMOKE.lifeMin);
      expect(q.life).toBeLessThanOrEqual(SMOKE.lifeMax);
      expect(q.peak).toBeGreaterThanOrEqual(0.1);
      expect(q.peak).toBeLessThanOrEqual(0.22);
    }
    expect(p.puffs.filter((q) => q.tint === 1).length / 4000).toBeCloseTo(0.25, 1);
  });

  it("reads the opacity range at every spawn, so a slider moved mid-run acts on the next puff", () => {
    const p = pool(4, 2);
    const range = { ...O };
    p.spawn(emitter, 1, 1, range);
    range.opacityMin = range.opacityMax = 0.5;
    p.spawn(emitter, 1, 1, range);
    expect(p.puffs[0]?.peak).toBeLessThanOrEqual(O.opacityMax);
    expect(p.puffs[1]?.peak).toBeCloseTo(0.5, 9);
  });

  it("pushes side puffs outward, faster with sideSpeed, and lets top puffs drift either way", () => {
    const slow = pool(1, 400);
    slow.spawn(emitter, 400, 1, O);
    const fast = pool(1, 400);
    fast.spawn(emitter, 400, 2.5, O);
    const leftSlow = slow.puffs.find((q) => q.x === emitter.x - emitter.halfW);
    const leftFast = fast.puffs.find((q) => q.x === emitter.x - emitter.halfW);
    if (!leftSlow || !leftFast) throw new Error("expected a left-edge puff");
    expect(leftSlow.vx).toBeLessThan(0);
    expect(leftFast.vx).toBeCloseTo(leftSlow.vx * 2.5, 9);
    expect(slow.puffs.every((q) => q.vy > 0)).toBe(true);
  });

  it("accumulates a fractional rate: 0.35 per frame spawns 35 over 100 frames", () => {
    const p = pool(2, 200);
    let spawned = 0;
    for (let i = 0; i < 100; i++) spawned += p.emit(emitter, 0.35, 1, 1, O);
    expect(spawned).toBe(35);
    expect(pool(2, 200).emit(emitter, 0, 1, 100, O)).toBe(0);
  });

  it("ages, moves and recycles puffs, with sin(πt) opacity and a growing scale", () => {
    const p = pool(5, 2);
    p.spawn(emitter, 1, 1, O);
    const q = p.puffs[0];
    if (!q) throw new Error("expected a puff");
    const { x, y, life } = q;
    p.step(10);
    expect(q.age).toBe(10);
    expect(q.y).toBeGreaterThan(y);
    expect(q.x).not.toBe(x);
    expect(SmokePool.opacity(q, 1)).toBeCloseTo(Math.sin((Math.PI * 10) / life) * q.peak, 9);
    expect(SmokePool.opacity(q, 0.5)).toBeCloseTo(SmokePool.opacity(q, 1) / 2, 9);
    expect(SmokePool.scale(q)).toBeGreaterThan(q.scale0);
    expect(SmokePool.scale(q)).toBeLessThan(q.scale1);
    p.step(life);
    expect(q.alive).toBe(false);
    expect(p.alive).toBe(0);
    expect(p.spawn(emitter, 1, 1, O)).toBe(1);
  });

  it("is deterministic: the same seed and steps give the same puffs", () => {
    const run = () => {
      const p = pool(11, 60);
      for (let i = 0; i < 240; i++) {
        p.emit(emitter, 0.8, 1.6, 1, O);
        p.step(1);
      }
      return JSON.stringify(p.puffs);
    };
    expect(run()).toBe(run());
  });
});
