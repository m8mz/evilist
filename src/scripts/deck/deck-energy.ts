// The energy phase's pure per-frame arithmetic (deck spec §5 "States", §8): what the glow planes,
// the seams, the aura, the fog and the smoke should be at a given moment. No DOM, no Three;
// deck-effects.ts copies these numbers onto objects.
import { DECK_PARAMS, type DeckParams } from "./deck-params";
import type { CardPhase } from "./deck-pose";

export type EnergyKind = "S" | "S+";

const TAU = Math.PI * 2;

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

export interface Flare {
  fog: number;
  glow: number;
}

/** The landing flare as multipliers (the fog kick, the aura's flare) easing back to their rest value
 * after landing. S gives neither: only S+ flares. */
export function flare(
  kind: EnergyKind | null,
  sinceLandMs: number | null,
  params: DeckParams = DECK_PARAMS,
): Flare {
  const none: Flare = { fog: 0, glow: 1 };
  if (!kind || sinceLandMs === null || sinceLandMs < 0 || kind === "S") return none;
  const settle = 1 - easeOutCubic(sinceLandMs / params.light.flareMs);
  const fog = params.fog.kick * Math.max(0, 1 - sinceLandMs / params.fog.kickMs);
  const glow = 1 + (params.glow.flareScale - 1) * settle;
  return { fog, glow };
}

export const GLOW_LEAVE_MS = 200;

/**
 * The glow plane: 0 racked or pulling in, in over print.eyesMs from landing, out over 200 ms
 * leaving. A card pulled back out after landing (a reverse scroll) is `pulling` with a leave clock
 * the stage started, and fades out the same way.
 */
export function glowOpacity(
  phase: CardPhase,
  sinceLandMs: number | null,
  sinceLeaveMs: number | null,
  params: DeckParams = DECK_PARAMS,
): number {
  if (phase === "leaving" || (phase === "pulling" && sinceLeaveMs !== null)) {
    return sinceLeaveMs === null ? 0 : Math.max(0, 1 - sinceLeaveMs / GLOW_LEAVE_MS);
  }
  if ((phase !== "landing" && phase !== "presented") || sinceLandMs === null) return 0;
  return Math.min(1, Math.max(0, sinceLandMs / params.print.eyesMs));
}

/** The back seam's pulse; S+ runs half a period behind S. */
export function seamOpacity(
  kind: EnergyKind,
  time: number,
  params: DeckParams = DECK_PARAMS,
): number {
  const S = params.seam;
  const wave = 0.5 + 0.5 * Math.sin((TAU * time) / S.periodMs + (kind === "S+" ? Math.PI : 0));
  return kind === "S"
    ? S.sMin + (S.sMax - S.sMin) * wave
    : S.sPlusMin + (S.sPlusMax - S.sPlusMin) * wave;
}

/** k keeps the demo's proportions at any card size (spec §8, "Glow"). */
export const proportion = (cardWPx: number): number => cardWPx / 260;

export interface FogLevel {
  radius: number;
  strength: number;
}

/** The far fog's radius and strength; `cardWPx` keeps the demo's proportions at any card size,
 * the same way `proportion` scales the rest of the energy (deck spec §8, "Fog"). */
export function fogFor(
  kind: EnergyKind | null,
  energy: number,
  kick: number,
  cardWPx: number,
  params: DeckParams = DECK_PARAMS,
): FogLevel {
  if (!kind) return { radius: 0, strength: 0 };
  const F = params.fog;
  const k = proportion(cardWPx);
  if (kind === "S") {
    // S's fixed strength grows with the pull (its energy reaches energy.s once landed), not a pop.
    const s = params.energy.s;
    const ramp = s > 0 ? Math.min(1, Math.max(0, energy / s)) : 1;
    return { radius: F.radiusS * k, strength: F.strengthS * ramp + kick };
  }
  return {
    radius: (F.radiusSPlusBase + F.radiusSPlusRamp * energy) * k,
    strength: F.strengthSPlus * energy + kick,
  };
}

/**
 * The aura's opacity (deck spec §8 as amended by Plan 5): a thin violet rim that follows the
 * energetic card's silhouette. S holds at `aura.s` once it reaches its own full energy; S+ ramps
 * from `aura.sPlusBase` by `aura.sPlusRamp` × energy, scaled in by `energy / energy.sPlusBase` so it
 * rises from 0 with the pull (the S → S+ handoff and a jump into S+ start near 0, not at the base).
 * The landing flare multiplies both. Clamped to 1 so this stays a self-contained 0–1 value like
 * `glowOpacity`/`seamOpacity`; the caller applies its own gain (`params.glow.gain`) and clamp.
 */
export function auraOpacity(
  kind: EnergyKind | null,
  energy: number,
  flareGlow: number,
  params: DeckParams = DECK_PARAMS,
): number {
  const A = params.aura;
  const E = params.energy;
  if (kind === "S") return E.s > 0 ? Math.min(1, ((A.s * energy) / E.s) * flareGlow) : 0;
  if (kind !== "S+") return 0;
  const rise = E.sPlusBase > 0 ? Math.min(1, energy / E.sPlusBase) : 1;
  return Math.min(1, (A.sPlusBase + A.sPlusRamp * energy) * rise * flareGlow);
}

/** Continuous smoke only emits while a card is landing or presented; a leaving (or pulled-back)
 * card's landing burst still plays out, but no more puffs spawn behind it. */
export function smokeActive(phase: CardPhase): boolean {
  return phase === "landing" || phase === "presented";
}

export function smokeRate(
  kind: EnergyKind | null,
  energy: number,
  params: DeckParams = DECK_PARAMS,
): number {
  if (!kind) return 0;
  return kind === "S"
    ? params.smoke.rateS
    : params.smoke.rateSPlusBase + params.smoke.rateSPlusRamp * energy;
}

export function smokeSideSpeed(
  kind: EnergyKind | null,
  energy: number,
  params: DeckParams = DECK_PARAMS,
): number {
  return kind === "S+" ? 1 + params.smoke.sideSpeed * energy : 1;
}

export function burstCount(kind: EnergyKind, params: DeckParams = DECK_PARAMS): number {
  return kind === "S+" ? params.smoke.burstSPlus : params.smoke.burstS;
}

export interface CoverFit {
  repeatX: number;
  repeatY: number;
  offsetX: number;
  offsetY: number;
}

/**
 * The texture window that shows an image cover-fitted into w × winH anchored top-centre, exactly as
 * paintBody draws the portrait. Three's v axis runs bottom-up, so keeping the image's top means
 * offsetting to the top of the texture.
 */
export function coverFit(w: number, winH: number, iw: number, ih: number): CoverFit {
  const scale = Math.max(w / iw, winH / ih);
  const repeatX = w / (iw * scale);
  const repeatY = winH / (ih * scale);
  return { repeatX, repeatY, offsetX: (1 - repeatX) / 2, offsetY: 1 - repeatY };
}
