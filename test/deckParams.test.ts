import { describe, expect, it } from "vitest";
import { DECK_PARAMS, defaultDeckParams } from "../src/scripts/deck/deck-params";

describe("deck params", () => {
  it("start at the spec's values", () => {
    expect(DECK_PARAMS.scroll.tau).toBe(90);
    expect(DECK_PARAMS.pull.handoffStart).toBe(0.7);
    expect(DECK_PARAMS.pull.rackRotY).toBe(103);
    expect(DECK_PARAMS.pull.liftZ).toBe(60);
    expect(DECK_PARAMS.layout.cardHMin).toBe(320);
    expect(DECK_PARAMS.layout.cardHMax).toBe(560);
    expect(DECK_PARAMS.layout.columnMax).toBe(1200);
    expect(DECK_PARAMS.tilt.maxX).toBe(8);
    expect(DECK_PARAMS.tilt.maxY).toBe(10);
    expect(DECK_PARAMS.intro.dealMs).toBe(420);
    expect(DECK_PARAMS.print.stepMs).toBe(90);
    expect(DECK_PARAMS.camera.fov).toBe(26);
    expect(DECK_PARAMS.energy.sPlusRamp).toBe(0.75);
    expect(DECK_PARAMS.smoke.pool).toBe(140);
    expect(DECK_PARAMS.bloom.strength).toBe(0.9);
  });

  it("keeps the handoff inside a rank and the lift and eases positive", () => {
    const p = DECK_PARAMS;
    expect(p.pull.handoffStart).toBeGreaterThan(0);
    expect(p.pull.handoffStart).toBeLessThan(1);
    expect(p.pull.landedAt).toBeGreaterThan(p.pull.handoffStart);
    expect(p.pull.landedAt).toBeLessThan(1);
    expect(p.pull.overshoot).toBeGreaterThan(0);
    expect(p.layout.cardHMin).toBeLessThan(p.layout.cardHMax);
    expect(p.layout.cardHRatio).toBeGreaterThan(0);
    expect(p.layout.cardHRatio).toBeLessThan(1);
    expect(p.layout.columnFraction).toBeGreaterThan(0.5);
    expect(p.layout.columnFraction).toBeLessThan(1);
  });

  it("hands out independent copies", () => {
    const a = defaultDeckParams();
    a.scroll.tau = 1;
    expect(DECK_PARAMS.scroll.tau).toBe(90);
    expect(defaultDeckParams().scroll.tau).toBe(90);
  });
});
