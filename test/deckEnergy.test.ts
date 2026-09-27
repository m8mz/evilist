import { describe, expect, it } from "vitest";
import {
  auraOpacity,
  burstCount,
  coverFit,
  flare,
  fogFor,
  GLOW_LEAVE_MS,
  glowOpacity,
  seamOpacity,
  smokeActive,
  smokeRate,
  smokeSideSpeed,
} from "../src/scripts/deck/deck-energy";
import type { RankLabel } from "../src/data/career";
import { initialDrive, pullsForDrive, stepDrive, type Pulls } from "../src/scripts/deck/deck-drive";
import { CARD_H, CARD_W, WINDOW } from "../src/scripts/deck/deck-paint";
import { defaultDeckParams } from "../src/scripts/deck/deck-params";
import { energyFor } from "../src/scripts/deck/deck-pose";

const P = defaultDeckParams();
const LABELS: RankLabel[] = ["E", "D", "C", "B", "A", "S", "S+"];

describe("flare", () => {
  it("is nothing for no kind or before landing", () => {
    expect(flare(null, 100, P)).toEqual({ fog: 0, glow: 1 });
    expect(flare("S+", null, P)).toEqual({ fog: 0, glow: 1 });
  });
  it("starts S+ at +0.5 fog and ×1.4 glow, and settles by flareMs", () => {
    const start = flare("S+", 0, P);
    expect(start.fog).toBeCloseTo(P.fog.kick, 6);
    expect(start.glow).toBeCloseTo(P.glow.flareScale, 6);
    const half = flare("S+", P.light.flareMs / 2, P);
    expect(half.glow).toBeGreaterThan(1);
    expect(half.glow).toBeLessThan(start.glow);
    const done = flare("S+", P.light.flareMs, P);
    expect(done.glow).toBeCloseTo(1, 6);
    expect(flare("S+", P.fog.kickMs, P).fog).toBeCloseTo(0, 6);
  });
  it("gives S no fog kick or glow scale", () => {
    expect(flare("S", 0, P)).toEqual({ fog: 0, glow: 1 });
  });
});

describe("glowOpacity", () => {
  it("is 0 while racked or pulling in, whatever the landing clock says", () => {
    expect(glowOpacity("racked", 1000, null, P)).toBe(0);
    expect(glowOpacity("pulling", 1000, null, P)).toBe(0);
  });
  it("fades in over eyesMs from landing", () => {
    expect(glowOpacity("landing", 0, null, P)).toBe(0);
    expect(glowOpacity("landing", P.print.eyesMs / 2, null, P)).toBeCloseTo(0.5, 6);
    expect(glowOpacity("presented", P.print.eyesMs * 3, null, P)).toBe(1);
  });
  it("fades out over 200 ms from leaving", () => {
    expect(glowOpacity("leaving", 5000, 0, P)).toBe(1);
    expect(glowOpacity("leaving", 5000, GLOW_LEAVE_MS / 2, P)).toBeCloseTo(0.5, 6);
    expect(glowOpacity("leaving", 5000, GLOW_LEAVE_MS, P)).toBe(0);
    expect(glowOpacity("leaving", 5000, null, P)).toBe(0);
  });
  it("fades out the same way when a landed card is pulled back out (a reverse scroll)", () => {
    expect(glowOpacity("pulling", 5000, GLOW_LEAVE_MS / 2, P)).toBeCloseTo(0.5, 6);
    expect(glowOpacity("pulling", 5000, GLOW_LEAVE_MS, P)).toBe(0);
  });
});

describe("seamOpacity", () => {
  it("keeps S inside its range and S+ inside its own, half a period apart", () => {
    const T = P.seam.periodMs;
    for (const t of [0, T / 4, T / 2, (3 * T) / 4, T * 1.37]) {
      const s = seamOpacity("S", t, P);
      const sp = seamOpacity("S+", t, P);
      expect(s).toBeGreaterThanOrEqual(P.seam.sMin - 1e-9);
      expect(s).toBeLessThanOrEqual(P.seam.sMax + 1e-9);
      expect(sp).toBeGreaterThanOrEqual(P.seam.sPlusMin - 1e-9);
      expect(sp).toBeLessThanOrEqual(P.seam.sPlusMax + 1e-9);
    }
    expect(seamOpacity("S", T / 4, P)).toBeCloseTo(P.seam.sMax, 6);
    expect(seamOpacity("S+", T / 4, P)).toBeCloseTo(P.seam.sPlusMin, 6);
  });
});

describe("fogFor", () => {
  it("has no fog without a kind, a fixed fog at S that ramps in with its energy and a growing one at S+", () => {
    expect(fogFor(null, 1, 0, 260, P)).toEqual({ radius: 0, strength: 0 });
    expect(fogFor("S", 0.3, 0, 260, P)).toEqual({
      radius: P.fog.radiusS,
      strength: P.fog.strengthS,
    });
    expect(fogFor("S", P.energy.s / 2, 0, 260, P).strength).toBeCloseTo(P.fog.strengthS / 2, 9);
    const full = fogFor("S+", 1, 0.2, 260, P);
    expect(full.radius).toBeCloseTo(P.fog.radiusSPlusBase + P.fog.radiusSPlusRamp, 6);
    expect(full.strength).toBeCloseTo(P.fog.strengthSPlus + 0.2, 6);
  });

  it("keeps the spec's numbers at the demo's 260 px card and doubles the radius at 520", () => {
    const at260 = fogFor("S+", 1, 0, 260, P);
    const at520 = fogFor("S+", 1, 0, 520, P);
    expect(at520.radius).toBeCloseTo(at260.radius * 2, 6);
    expect(at520.strength).toBeCloseTo(at260.strength, 6); // strength doesn't scale with the card
  });
});

describe("auraOpacity", () => {
  it("is 0 without a kind", () => {
    expect(auraOpacity(null, 1, 1, P)).toBe(0);
  });
  it("gives S its aura.s at S's own full energy, and 0 rather than NaN when energy.s is 0", () => {
    expect(auraOpacity("S", P.energy.s, 1, P)).toBeCloseTo(P.aura.s, 6);
    const flat = defaultDeckParams();
    flat.energy.s = 0;
    expect(auraOpacity("S", 0, 1, flat)).toBe(0);
    expect(auraOpacity("S", 0.2, 1, flat)).toBe(0);
  });
  it("rises S+ from 0 with its energy, to its base and ramp once at energy.sPlusBase", () => {
    const base = P.energy.sPlusBase;
    const full = (e: number) => P.aura.sPlusBase + P.aura.sPlusRamp * e;
    expect(auraOpacity("S+", 0, 1, P)).toBe(0);
    expect(auraOpacity("S+", base / 2, 1, P)).toBeCloseTo(full(base / 2) * 0.5, 6);
    expect(auraOpacity("S+", base, 1, P)).toBeCloseTo(full(base), 6);
    expect(auraOpacity("S+", 1, 1, P)).toBeCloseTo(full(1), 6);
  });
  it("is multiplied by the landing flare and clamped to 1", () => {
    const base = P.energy.sPlusBase;
    const full = P.aura.sPlusBase + P.aura.sPlusRamp * base;
    expect(auraOpacity("S+", 0, 1.4, P)).toBe(0);
    expect(auraOpacity("S+", base, 1.4, P)).toBeCloseTo(full * 1.4, 6);
    expect(auraOpacity("S+", 1, 10, P)).toBe(1);
  });
});

/** The aura × gain the stage would draw each 60 Hz frame, stepping the real drive, pulls, energy
 * and aura from `from`'s centre to `to`'s: by the scroll, or (`jump`) by a jump there. */
function auraTrace(from: number, to: number, jump: boolean) {
  const centre = (i: number) => (i + 0.5) / LABELS.length;
  const p = centre(to);
  let drive = initialDrive(centre(from), LABELS.length, P);
  let last: Pulls | null = null;
  const out: { aura: number; kind: string | null }[] = [];
  for (let f = 0; f < 90; f++) {
    const t = 1000 + (f * 1000) / 60;
    const pending = jump && f === 0 ? to : null;
    drive = stepDrive(drive, p, pending, t, LABELS.length, P, last?.within);
    last = pullsForDrive(drive, p, t, LABELS.length, P);
    const e = energyFor(last, LABELS, P.pull.settleStart, P);
    out.push({
      aura: Math.min(1, auraOpacity(e.kind, e.energy, 1, P) * P.glow.gain),
      kind: e.kind,
    });
  }
  return out;
}

describe("the aura across the S ↔ S+ handoff at 60 Hz", () => {
  it.each([
    [5, 6],
    [6, 5],
  ])("steps by under 0.1 on the frame the energy hands from %i to %i (it was 0.57)", (a, b) => {
    const trace = auraTrace(a, b, false);
    const hand = trace.findIndex((s, i) => i > 0 && s.kind !== trace[i - 1]!.kind);
    expect(hand).toBeGreaterThan(0);
    expect(Math.abs(trace[hand]!.aura - trace[hand - 1]!.aura)).toBeLessThan(0.1);
  });
  it("starts a jump A → S+ with the S+ aura below 0.1 on its first frame (it was 0.66)", () => {
    const trace = auraTrace(4, 6, true);
    const first = trace.findIndex((s) => s.kind === "S+");
    expect(first).toBeGreaterThan(0);
    expect(trace[first]!.aura).toBeLessThan(0.1);
  });
});

describe("smokeActive", () => {
  it("is active only while landing or presented", () => {
    expect(smokeActive("landing")).toBe(true);
    expect(smokeActive("presented")).toBe(true);
    expect(smokeActive("racked")).toBe(false);
    expect(smokeActive("pulling")).toBe(false);
    expect(smokeActive("leaving")).toBe(false);
  });
});

describe("smoke rates", () => {
  it("emits nothing for E–A, 0.35 per frame at S and 1.2 + 4·energy at S+", () => {
    expect(smokeRate(null, 1, P)).toBe(0);
    expect(smokeRate("S", 0.3, P)).toBe(P.smoke.rateS);
    expect(smokeRate("S+", 0.5, P)).toBeCloseTo(
      P.smoke.rateSPlusBase + P.smoke.rateSPlusRamp * 0.5,
      6,
    );
  });
  it("carries S+ puffs sideways faster with energy and bursts 30 or 12 on landing", () => {
    expect(smokeSideSpeed("S", 1, P)).toBe(1);
    expect(smokeSideSpeed("S+", 1, P)).toBeCloseTo(1 + P.smoke.sideSpeed, 6);
    expect(burstCount("S+", P)).toBe(P.smoke.burstSPlus);
    expect(burstCount("S", P)).toBe(P.smoke.burstS);
  });
});

describe("coverFit", () => {
  it("mirrors paintBody: a 3:2 mask in the 5:7 card's window is cropped left and right, anchored top", () => {
    const w = CARD_W;
    const winH = CARD_H * WINDOW;
    const fit = coverFit(w, winH, 1600, 1073);
    // paintBody: scale = max(w/iw, winH/ih); dw = iw·scale; the image is wider than the window.
    const scale = Math.max(w / 1600, winH / 1073);
    expect(fit.repeatX).toBeCloseTo(w / (1600 * scale), 9);
    expect(fit.repeatY).toBeCloseTo(winH / (1073 * scale), 9);
    expect(fit.offsetX).toBeCloseTo((1 - fit.repeatX) / 2, 9);
    expect(fit.offsetY).toBeCloseTo(1 - fit.repeatY, 9);
    expect(fit.repeatX).toBeLessThan(1);
    expect(fit.repeatY).toBeCloseTo(1, 6);
  });
  it("crops the bottom of a tall image and keeps its top", () => {
    const fit = coverFit(100, 50, 100, 200);
    expect(fit.repeatX).toBeCloseTo(1, 9);
    expect(fit.repeatY).toBeCloseTo(0.25, 9);
    expect(fit.offsetY).toBeCloseTo(0.75, 9);
  });
});
