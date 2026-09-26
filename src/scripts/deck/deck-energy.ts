// The energy phase's pure per-frame arithmetic (deck spec §5 "States", §8): what the point light,
// the glow planes, the seams, the glow sprite, the fog, the contact shadow and the smoke should be
// at a given moment. No DOM, no Three; deck-effects.ts copies these numbers onto objects.
import { DECK_PARAMS, type DeckParams } from "./deck-params";
import type { CardPhase } from "./deck-pose";

export type EnergyKind = "S" | "S+";

const TAU = Math.PI * 2;

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

/** The point light's breathing: ±breath on a breathMs sine, exactly 1 at time 0. */
export function breath(time: number, params: DeckParams = DECK_PARAMS): number {
  return 1 + params.light.breath * Math.sin((TAU * time) / params.light.breathMs);
}

export interface Flare {
  light: number;
  fog: number;
  glow: number;
}

/** The landing flare as multipliers easing back to 1 (the fog kick back to 0) after landing. */
export function flare(
  kind: EnergyKind | null,
  sinceLandMs: number | null,
  params: DeckParams = DECK_PARAMS,
): Flare {
  const none: Flare = { light: 1, fog: 0, glow: 1 };
  if (!kind || sinceLandMs === null || sinceLandMs < 0) return none;
  const L = params.light;
  const settle = 1 - easeOutCubic(sinceLandMs / L.flareMs);
  const light = 1 + ((kind === "S+" ? L.flareSPlus : L.flareS) - 1) * settle;
  if (kind === "S") return { light, fog: 0, glow: 1 };
  const fog = params.fog.kick * Math.max(0, 1 - sinceLandMs / params.fog.kickMs);
  const glow = 1 + (params.glow.flareScale - 1) * settle;
  return { light, fog, glow };
}

export const GLOW_LEAVE_MS = 200;

/** The glow plane: 0 racked or pulling, in over print.eyesMs from landing, out over 200 ms leaving. */
export function glowOpacity(
  phase: CardPhase,
  sinceLandMs: number | null,
  sinceLeaveMs: number | null,
  params: DeckParams = DECK_PARAMS,
): number {
  if (phase === "leaving") {
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

export function glowSpriteScale(
  kind: EnergyKind,
  energy: number,
  cardWPx: number,
  params: DeckParams = DECK_PARAMS,
): number {
  const G = params.glow;
  const k = proportion(cardWPx);
  return (kind === "S" ? G.scaleS : G.scaleSPlusBase + G.scaleSPlusRamp * energy) * k;
}

export function pointLightIntensity(
  kind: EnergyKind | null,
  energy: number,
  breathValue: number,
  flareLight: number,
  params: DeckParams = DECK_PARAMS,
): number {
  if (!kind) return 0;
  return (
    energy *
    (kind === "S" ? params.light.pointS : params.light.pointSPlus) *
    breathValue *
    flareLight
  );
}

export interface FogLevel {
  radius: number;
  strength: number;
}

export function fogFor(
  kind: EnergyKind | null,
  energy: number,
  kick: number,
  params: DeckParams = DECK_PARAMS,
): FogLevel {
  if (!kind) return { radius: 0, strength: 0 };
  const F = params.fog;
  if (kind === "S") return { radius: F.radiusS, strength: F.strengthS + kick };
  return {
    radius: F.radiusSPlusBase + F.radiusSPlusRamp * energy,
    strength: F.strengthSPlus * energy + kick,
  };
}

export interface Shadow {
  w: number;
  h: number;
  opacity: number;
}

/** The contact shadow under a card with pull > 0, in world units; it fades as the card lifts. */
export function shadowFor(
  pull: number,
  zPx: number,
  cardWPx: number,
  params: DeckParams = DECK_PARAMS,
): Shadow {
  const S = params.shadow;
  const zMax = params.pull.liftZ * (1 + params.pull.liftPeak);
  const lift = zMax > 0 ? Math.min(1, Math.max(0, zPx / zMax)) : 0;
  const cardW = cardWPx / 100;
  return {
    w: S.widthFactor * cardW,
    h: S.heightFactor * cardW,
    opacity: S.opacity * Math.min(1, Math.max(0, pull)) * (1 - S.liftFade * lift),
  };
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
