import { describe, expect, it } from "vitest";
import {
  breath,
  burstCount,
  coverFit,
  flare,
  fogFor,
  GLOW_LEAVE_MS,
  glowOpacity,
  glowSpriteScale,
  pointLightIntensity,
  seamOpacity,
  shadowFor,
  smokeRate,
  smokeSideSpeed,
} from "../src/scripts/deck/deck-energy";
import { CARD_H, CARD_W, WINDOW } from "../src/scripts/deck/deck-paint";
import { defaultDeckParams } from "../src/scripts/deck/deck-params";

const P = defaultDeckParams();

describe("breath", () => {
  it("is 1 at time 0 and ±breath at the quarter periods", () => {
    expect(breath(0, P)).toBeCloseTo(1, 6);
    expect(breath(P.light.breathMs / 4, P)).toBeCloseTo(1 + P.light.breath, 6);
    expect(breath((3 * P.light.breathMs) / 4, P)).toBeCloseTo(1 - P.light.breath, 6);
  });
});

describe("flare", () => {
  it("is nothing for no kind or before landing", () => {
    expect(flare(null, 100, P)).toEqual({ light: 1, fog: 0, glow: 1 });
    expect(flare("S+", null, P)).toEqual({ light: 1, fog: 0, glow: 1 });
  });
  it("starts S+ at 3× light, +0.5 fog and ×1.4 glow, and settles by flareMs", () => {
    const start = flare("S+", 0, P);
    expect(start.light).toBeCloseTo(P.light.flareSPlus, 6);
    expect(start.fog).toBeCloseTo(P.fog.kick, 6);
    expect(start.glow).toBeCloseTo(P.glow.flareScale, 6);
    const half = flare("S+", P.light.flareMs / 2, P);
    expect(half.light).toBeGreaterThan(1);
    expect(half.light).toBeLessThan(start.light);
    const done = flare("S+", P.light.flareMs, P);
    expect(done.light).toBeCloseTo(1, 6);
    expect(done.glow).toBeCloseTo(1, 6);
    expect(flare("S+", P.fog.kickMs, P).fog).toBeCloseTo(0, 6);
  });
  it("gives S the smaller light flare and no fog kick or glow scale", () => {
    expect(flare("S", 0, P)).toEqual({ light: P.light.flareS, fog: 0, glow: 1 });
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

describe("glowSpriteScale and the light", () => {
  it("scales with the card, 4.2k at S and 7k to 16k at S+", () => {
    expect(glowSpriteScale("S", 1, 260, P)).toBeCloseTo(P.glow.scaleS, 6);
    expect(glowSpriteScale("S+", 0, 520, P)).toBeCloseTo(P.glow.scaleSPlusBase * 2, 6);
    expect(glowSpriteScale("S+", 1, 260, P)).toBeCloseTo(
      P.glow.scaleSPlusBase + P.glow.scaleSPlusRamp,
      6,
    );
  });
  it("lights S at energy × 16 and S+ at energy × 55, times breath and flare, and E–A at 0", () => {
    expect(pointLightIntensity(null, 1, 1.15, 3, P)).toBe(0);
    expect(pointLightIntensity("S", 0.3, 1, 1, P)).toBeCloseTo(0.3 * P.light.pointS, 6);
    expect(pointLightIntensity("S+", 1, 1.15, 3, P)).toBeCloseTo(P.light.pointSPlus * 1.15 * 3, 6);
  });
});

describe("fogFor and shadowFor", () => {
  it("has no fog without a kind, a fixed fog at S that ramps in with its energy and a growing one at S+", () => {
    expect(fogFor(null, 1, 0, P)).toEqual({ radius: 0, strength: 0 });
    expect(fogFor("S", 0.3, 0, P)).toEqual({ radius: P.fog.radiusS, strength: P.fog.strengthS });
    expect(fogFor("S", P.energy.s / 2, 0, P).strength).toBeCloseTo(P.fog.strengthS / 2, 9);
    const full = fogFor("S+", 1, 0.2, P);
    expect(full.radius).toBeCloseTo(P.fog.radiusSPlusBase + P.fog.radiusSPlusRamp, 6);
    expect(full.strength).toBeCloseTo(P.fog.strengthSPlus + 0.2, 6);
  });
  it("shadows the presented card at 0.55 on the floor and half that at the top of the lift", () => {
    const zMax = P.pull.liftZ * (1 + P.pull.liftPeak);
    const grounded = shadowFor(1, 0, 260, P);
    expect(grounded.w).toBeCloseTo(P.shadow.widthFactor * 2.6, 6);
    expect(grounded.h).toBeCloseTo(P.shadow.heightFactor * 2.6, 6);
    expect(grounded.opacity).toBeCloseTo(P.shadow.opacity, 6);
    expect(shadowFor(1, zMax, 260, P).opacity).toBeCloseTo(
      P.shadow.opacity * (1 - P.shadow.liftFade),
      6,
    );
    expect(shadowFor(0, 0, 260, P).opacity).toBe(0);
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
