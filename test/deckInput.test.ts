import { describe, expect, it } from "vitest";
import { StageInput, type InputTargetsArgs } from "../src/scripts/deck/deck-input";
import { DECK_PARAMS } from "../src/scripts/deck/deck-params";

const P = DECK_PARAMS;
const args = (over: Partial<InputTargetsArgs> = {}): InputTargetsArgs => ({
  presentedX: 700,
  presentedY: 400,
  cardW: 300,
  cardH: 420,
  stageW: 1400,
  stageH: 800,
  rect: { left: 0, top: 0 },
  mode: "desktop",
  parallax: true,
  presented: 3,
  racked: (i) => i !== 3,
  hitAt: () => null,
  ...over,
});

describe("StageInput targets", () => {
  it("tilts the presented card toward the pointer, clamped to the card's half extents", () => {
    const input = new StageInput(7, P);
    input.pointer(700 + 150, 400 - 210); // bottom-right corner of the card → nx 1, ny −1
    input.updateTargets(args());
    input.step(10_000);
    expect(input.tilt.y).toBeCloseTo(P.tilt.maxY, 3);
    expect(input.tilt.x).toBeCloseTo(-P.tilt.maxX, 3);
    input.pointer(700 + 900, 400); // far outside: still clamped
    input.updateTargets(args());
    input.step(10_000);
    expect(input.tilt.y).toBeCloseTo(P.tilt.maxY, 3);
    input.pointer(700 + 150 + 100, 400 - 210 + 50); // same corner, shifted by the canvas offset
    input.updateTargets(args({ rect: { left: 100, top: 50 } }));
    input.step(10_000);
    expect(input.tilt.y).toBeCloseTo(P.tilt.maxY, 3);
    expect(input.tilt.x).toBeCloseTo(-P.tilt.maxX, 3);
    input.updateTargets(args({ presented: -1 })); // nothing landed: releases even at the corner
    input.step(10_000);
    expect(input.tilt).toEqual({ x: 0, y: 0 });
  });
  it("parallaxes the camera with the pointer on desktop when allowed, never on phones", () => {
    const desk = new StageInput(7, P);
    desk.pointer(1400, 0); // right edge, top
    desk.updateTargets(args());
    desk.step(P.camera.parallaxTau); // one time constant, not tilt.tau: 1 − e^−1 of the way
    expect(desk.cam.x).toBeCloseTo(P.camera.parallax * (1 - Math.exp(-1)), 3);
    desk.step(10_000);
    expect(desk.cam.x).toBeCloseTo(P.camera.parallax, 3);
    expect(desk.cam.y).toBeCloseTo(P.camera.parallax, 3);
    const mid = new StageInput(7, P);
    mid.pointer(1400, 0);
    mid.updateTargets(args({ parallax: false }));
    mid.step(10_000);
    expect(mid.cam).toEqual({ x: 0, y: 0 });
    const phone = new StageInput(7, P);
    phone.pointer(1400, 0);
    phone.updateTargets(args({ mode: "phone", parallax: true }));
    phone.step(10_000);
    expect(phone.cam).toEqual({ x: 0, y: 0 });
  });
  it("lifts only a racked card under the pointer, only on desktop, and reports it for the cursor", () => {
    const input = new StageInput(7, P);
    input.pointer(300, 400);
    expect(input.updateTargets(args({ hitAt: () => 1 }))).toBe(true);
    input.step(P.hover.inMs); // one time constant, not outMs: 1 − e^−1 of the way up
    expect(input.hover[1]).toBeCloseTo(1 - Math.exp(-1), 3);
    input.step(10_000);
    expect(input.hover[1]).toBeCloseTo(1, 3);
    expect(input.hover[3]).toBe(0);
    expect(input.updateTargets(args({ hitAt: () => 3 }))).toBe(false); // the presented card
    expect(input.updateTargets(args({ hitAt: () => 1, mode: "phone" }))).toBe(false);
    input.step(P.hover.outMs); // the top-of-frame reset dropped the lift; one time constant down
    expect(input.hover[1]).toBeCloseTo(Math.exp(-1), 3);
  });
  it("uses the external tilt on phones and ignores the pointer there", () => {
    const input = new StageInput(7, P);
    input.pointer(700 + 150, 400); // would tilt on desktop
    input.setTilt(-3, 6);
    input.updateTargets(args({ mode: "phone", parallax: false }));
    input.step(10_000);
    expect(input.tilt.x).toBeCloseTo(-3, 3);
    expect(input.tilt.y).toBeCloseTo(6, 3);
    input.setTilt(null, null); // released
    input.updateTargets(args({ mode: "phone", parallax: false }));
    input.step(10_000);
    expect(input.tilt).toEqual({ x: 0, y: 0 });
  });
  it("releases everything when the pointer leaves, and smooths with the params' time constants", () => {
    const input = new StageInput(7, P);
    input.pointer(700 + 150, 400);
    input.updateTargets(args());
    input.step(P.tilt.tau); // one time constant: 1 − e^−1 of the way
    expect(input.tilt.y).toBeCloseTo(P.tilt.maxY * (1 - Math.exp(-1)), 3);
    input.pointer(null, null);
    input.updateTargets(args());
    input.step(10_000);
    expect(input.tilt).toEqual({ x: 0, y: 0 });
    expect(input.cam).toEqual({ x: 0, y: 0 });
    expect(input.hover.every((h) => h === 0)).toBe(true);
  });
  it("resets to zero at once", () => {
    const input = new StageInput(7, P);
    input.pointer(1400, 0);
    input.updateTargets(args());
    input.step(10_000);
    input.reset();
    expect(input.tilt).toEqual({ x: 0, y: 0 });
    expect(input.cam).toEqual({ x: 0, y: 0 });
  });
});
