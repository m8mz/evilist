import { describe, expect, it } from "vitest";
import { DECK_PARAMS, defaultDeckParams } from "../src/scripts/deck/deck-params";

describe("deck params", () => {
  it("start at the spec's values", () => {
    expect(DECK_PARAMS.drive.durationMs).toBe(900);
    expect(DECK_PARAMS.drive.hysteresis).toBe(0.15);
    expect(DECK_PARAMS.pull.handoffStart).toBe(0.7);
    expect(DECK_PARAMS.pull.rackRotY).toBe(103);
    expect(DECK_PARAMS.pull.liftZ).toBe(60);
    expect(DECK_PARAMS.pull.settleStart).toBe(0.9);
    expect(DECK_PARAMS.pull.rotDelay).toBe(0.15);
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
    expect(DECK_PARAMS.aura.s).toBe(0.45);
    expect(DECK_PARAMS.aura.sPlusBase).toBe(0.55);
    expect(DECK_PARAMS.aura.sPlusRamp).toBe(0.45);
    expect(DECK_PARAMS.aura.fadeFrom).toBe(0.72);
    expect(DECK_PARAMS.aura.fadeTo).toBe(0.9);
    expect(DECK_PARAMS.glow.gain).toBe(1.2);
    expect(DECK_PARAMS.glow.flareScale).toBe(1.4);
    expect(DECK_PARAMS.bloom.strength).toBe(0.45);
    expect(DECK_PARAMS.gestures.swipeMinPx).toBe(40);
    expect(DECK_PARAMS.gestures.tapSlopPx).toBe(8);
    expect(DECK_PARAMS.layout.relayoutDebounceMs).toBe(150);
  });

  it("keeps the handoff inside a rank and the lift and eases positive", () => {
    const p = DECK_PARAMS;
    expect(p.pull.handoffStart).toBeGreaterThan(0);
    expect(p.pull.handoffStart).toBeLessThan(1);
    expect(p.pull.landedAt).toBeGreaterThan(p.pull.handoffStart);
    expect(p.pull.landedAt).toBeLessThan(1);
    expect(p.pull.settleStart).toBeGreaterThan(p.pull.handoffStart);
    expect(p.pull.settleStart).toBeLessThan(p.pull.landedAt);
    expect(p.pull.rotDelay).toBeGreaterThan(0);
    expect(p.pull.rotDelay).toBeLessThan(1);
    expect(p.pull.overshoot).toBeGreaterThan(0);
    expect(p.layout.cardHMin).toBeLessThan(p.layout.cardHMax);
    expect(p.layout.cardHRatio).toBeGreaterThan(0);
    expect(p.layout.cardHRatio).toBeLessThan(1);
    expect(p.layout.columnFraction).toBeGreaterThan(0.5);
    expect(p.layout.columnFraction).toBeLessThan(1);
  });

  it("hands out independent copies", () => {
    const a = defaultDeckParams();
    a.drive.durationMs = 1;
    expect(DECK_PARAMS.drive.durationMs).toBe(900);
    expect(defaultDeckParams().drive.durationMs).toBe(900);
  });
});
