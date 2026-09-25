// The deck's pose model (deck spec §7): pure functions from scroll progress, pointer tilt, hover,
// the clock and the intro to seven card poses and the stage's energy. No DOM, no Three. The stage
// (Plan 2) converts px to world units and drives the meshes; tests pin every curve here.
//
// A card's tilt, idle float and landed energy don't snap on at a binary "landed" threshold: they
// blend in continuously as `pull` crosses `settleStart`, via `landedFactor`. The `landed` boolean
// (pull > `landedAt`) still exists, but only decides `phase` and the caller's text print-in.
import type { RankLabel } from "../../data/career";
import type { DeckLayout, Point } from "./deck-layout";
import { DECK_PARAMS, type DeckParams } from "./deck-params";

export const clamp01 = (v: number): number =>
  Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;

export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

export const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

/** Ease-out that passes 1 and settles back; `overshoot` is the back-ease's c1 constant. */
export function backOut(t: number, overshoot: number): number {
  const c1 = overshoot;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

/** How far `pull` has crossed into `[threshold, 1]`, for blending tilt, float and landed energy. */
function landedFactor(pull: number, threshold: number): number {
  return clamp01((pull - threshold) / (1 - threshold));
}

export interface Pulls {
  active: number;
  within: number;
  /** Handoff progress, 0 outside the window. */
  k: number;
  /** Per card: 0 racked, 1 presented. */
  pull: number[];
}

/** Which card is out, and how far the next one is on its way (spec §7). */
export function pullsFor(
  p: number,
  count: number,
  handoffStart: number = DECK_PARAMS.pull.handoffStart,
): Pulls {
  const f = clamp01(p) * count;
  const active = Math.min(count - 1, Math.floor(f));
  const within = f - active;
  const k =
    active < count - 1 && within > handoffStart
      ? clamp01((within - handoffStart) / (1 - handoffStart))
      : 0;
  const pull = new Array<number>(count).fill(0);
  pull[active] = 1 - easeInOutCubic(k);
  if (active + 1 < count) pull[active + 1] = easeInOutCubic(k);
  return { active, within, k, pull };
}

export type CardPhase = "racked" | "pulling" | "landing" | "presented" | "leaving";

export interface Energy {
  energy: number;
  kind: "S" | "S+" | null;
  /** The card the energy belongs to (the light and the smoke follow it). */
  index: number | null;
}

/**
 * The stage's energy: S breathes, S+ grows with its rank; during a handoff the larger pull wins.
 * Energy scales with the pull below `landedThreshold`, then blends toward the landed value over
 * pull ∈ [landedThreshold, 1] (`landedFactor`), so it never snaps.
 */
export function energyFor(
  pulls: Pulls,
  labels: readonly RankLabel[],
  landedThreshold: number = DECK_PARAMS.pull.settleStart,
  params: DeckParams = DECK_PARAMS,
): Energy {
  const E = params.energy;
  let best = -1;
  const out: Energy = { energy: 0, kind: null, index: null };
  labels.forEach((label, i) => {
    if (label !== "S" && label !== "S+") return;
    const pull = pulls.pull[i] ?? 0;
    if (pull <= 0 || pull <= best) return;
    best = pull;
    const pulling = E.pulling * pull;
    // Only the rank that's actually active ramps its own S+ energy with `within`; a card still
    // arriving during the previous rank's handoff hasn't started its own stretch yet, so it must
    // not race ahead to the ramp's end just because `within` (the *previous* rank's within) is
    // high.
    const within = i === pulls.active ? pulls.within : 0;
    const landedValue =
      label === "S" ? E.s : E.sPlusBase + E.sPlusRamp * Math.min(1, within / E.sPlusWindow);
    const lf = landedFactor(pull, landedThreshold);
    out.energy = pulling + (landedValue - pulling) * lf;
    out.kind = label;
    out.index = i;
  });
  return out;
}

export interface CardPose {
  x: number;
  y: number;
  z: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  scale: number;
  opacity: number;
  pull: number;
  landed: boolean;
  phase: CardPhase;
}

export interface IntroState {
  /**
   * Ms of intro clock time. The caller accumulates `elapsed += dt * speed` each frame (dt the
   * real ms since the last frame); raising `speed` only changes the rate going forward, so the
   * clock is always continuous, even fast-forwarded — never `(time - startedAt) * speed`, which
   * rescales time already elapsed and teleports every card.
   */
  elapsed: number;
}

export interface IntroPose {
  done: boolean;
  /** How much of the floor line has drawn in, 0–1. */
  floor: number;
  /** How far the rail chips have faded in, 0–1. */
  rail: number;
}

export interface PoseInput {
  p: number;
  labels: readonly RankLabel[];
  layout: DeckLayout;
  /** Degrees, already smoothed by the caller. */
  tilt: { x: number; y: number };
  /** 0–1 per card, already smoothed by the caller. Desktop only. */
  hover: readonly number[];
  /** A monotonic clock in ms. */
  time: number;
  /** When each card last landed (ms): set on the first landed frame, kept until the card's pull
   * returns to 0 (the caller nulls it when the card is racked again). */
  landedAt: readonly (number | null)[];
  intro: IntroState | null;
}

export interface StagePose {
  cards: CardPose[];
  active: number;
  within: number;
  energy: number;
  kind: "S" | "S+" | null;
  energyIndex: number | null;
  intro: IntroPose | null;
}

interface RestPose {
  x: number;
  y: number;
  rotY: number;
  opacity: number;
}

/**
 * Where card `i` sits when it is not presented. Desktop: its rack slot. Phone: the active card and
 * the played ones belong at `exit` (half transparent, off the stage's left edge); the cards to
 * come wait at `next`, stacked, where only the visible next one is opaque. During a handoff
 * (`k > 0`) the incoming card `active + 1` arrives from `next` and `active + 2` becomes the
 * visible next, so the stack never pops.
 */
function restPose(
  i: number,
  active: number,
  k: number,
  layout: DeckLayout,
  params: DeckParams,
): RestPose {
  if (layout.mode === "desktop") {
    const slot = layout.slots[i] ?? layout.slots[layout.slots.length - 1]!;
    return { x: slot.x, y: slot.y, rotY: params.pull.rackRotY, opacity: 1 };
  }
  if (i <= active) {
    return { ...layout.exit!, rotY: params.layout.phoneExitRotY, opacity: 0.5 };
  }
  const visibleNext = k > 0 ? active + 2 : active + 1;
  return {
    ...layout.next!,
    rotY: params.layout.phoneNextRotY,
    opacity: i === active + 1 || i === visibleNext ? 1 : 0,
  };
}

const TAU = Math.PI * 2;

/**
 * Moves a card from its rest pose to the presented anchor by `pull` (spec §7). Rotation waits
 * until `rotDelay` of the pull is done, so the card slides and lifts before it turns — otherwise
 * rotation leads translation and the card sweeps through its rack neighbours. `lift` is false only
 * for the card that's leaving mid-handoff: it takes a low path (no sine peak in z, no scale bump)
 * so it doesn't share depth with the incoming card and pass through it.
 */
function interpolate(
  rest: RestPose,
  pull: number,
  layout: DeckLayout,
  params: DeckParams,
  lift: boolean,
): CardPose {
  const P = params.pull;
  const target = layout.presented;
  if (pull <= 0) {
    return {
      x: rest.x,
      y: rest.y,
      z: 0,
      rotX: 0,
      rotY: rest.rotY,
      rotZ: 0,
      scale: 1,
      opacity: rest.opacity,
      pull: 0,
      landed: false,
      phase: "racked",
    };
  }
  const e = easeInOutCubic(pull);
  const r = clamp01((pull - P.rotDelay) / (1 - P.rotDelay));
  const b = backOut(r, P.overshoot);
  const z = lift
    ? P.liftZ * P.liftPeak * Math.sin(Math.PI * pull) + P.liftZ * pull
    : P.liftZ * pull;
  const scale = lift ? 1 + P.scalePeak * Math.sin(Math.PI * pull) : 1;
  return {
    x: rest.x + (target.x - rest.x) * e,
    y: rest.y + (target.y - rest.y) * e,
    z,
    rotX: 0,
    rotY: rest.rotY * (1 - b),
    rotZ: 0,
    scale,
    opacity: rest.opacity + (1 - rest.opacity) * e,
    pull,
    landed: pull > P.landedAt,
    phase: "pulling",
  };
}

/** The idle float's offsets for a landed card at `time`, fading in after `landedAt`. */
function float(time: number, landedAt: number, params: DeckParams) {
  const F = params.float;
  const a = clamp01((time - landedAt) / F.fadeInMs);
  const wave = (spec: { amp: number; periodMs: number }) =>
    a * spec.amp * Math.sin((TAU * time) / spec.periodMs);
  return { y: wave(F.y), rotZ: wave(F.rotZ), rotY: wave(F.rotY), rotX: wave(F.rotX) };
}

/**
 * The landed decoration for a card with some pull: tilt and idle float blend in continuously over
 * pull ∈ [settleStart, 1] (`landedFactor`), on top of float's own 1.5 s fade-in. Also decides the
 * phase once the card isn't racked. Shared by the scroll model and the intro's pulling card, so
 * the handover between them has no seam and a landed card never reports "pulling".
 */
function decorateLanded(
  pose: CardPose,
  tilt: { x: number; y: number },
  time: number,
  landedAt: number | null,
  leaving: boolean,
  params: DeckParams,
): void {
  const lf = landedFactor(pose.pull, params.pull.settleStart);
  pose.rotX += tilt.x * lf;
  pose.rotY += tilt.y * lf;
  if (landedAt != null) {
    const f = float(time, landedAt, params);
    pose.y += f.y * lf;
    pose.rotZ += f.rotZ * lf;
    pose.rotY += f.rotY * lf;
    pose.rotX += f.rotX * lf;
  }
  if (pose.landed) {
    // `landedAt == null` is the first landed frame: the caller hasn't recorded it yet (that's how
    // it knows to), so it must report "landing", not skip straight to "presented".
    pose.phase =
      landedAt == null || time - landedAt < params.print.landingMs ? "landing" : "presented";
  } else {
    pose.phase = leaving ? "leaving" : "pulling";
  }
}

/** Everything the stage needs for one frame (spec §7). */
export function deckPose(input: PoseInput, params: DeckParams = DECK_PARAMS): StagePose {
  if (input.intro) {
    const intro = introPose(input, params);
    // introPose always populates `intro`; the field is nullable only in StagePose's general shape.
    if (!intro.intro!.done) return intro;
  }
  const count = input.labels.length;
  const pulls = pullsFor(input.p, count, params.pull.handoffStart);
  const cards = input.labels.map((_, i) => {
    const leaving = i === pulls.active && pulls.k > 0;
    const rest = restPose(i, pulls.active, pulls.k, input.layout, params);
    const pose = interpolate(rest, pulls.pull[i] ?? 0, input.layout, params, !leaving);
    if (input.layout.mode === "desktop") {
      // The hover lift fades out over the pull instead of cutting off the instant a hovered card
      // starts moving, so picking it up never pops.
      const h = clamp01(input.hover[i] ?? 0);
      pose.z += params.hover.z * h * (1 - pose.pull);
      pose.y -= params.hover.y * h * (1 - pose.pull);
    }
    if (pose.pull <= 0) return pose;
    decorateLanded(pose, input.tilt, input.time, input.landedAt[i] ?? null, leaving, params);
    return pose;
  });
  const energy = energyFor(pulls, input.labels, params.pull.settleStart, params);
  return {
    cards,
    active: pulls.active,
    within: pulls.within,
    energy: energy.energy,
    kind: energy.kind,
    energyIndex: energy.index,
    intro: null,
  };
}

/** The intro's total length at speed 1: the deal-in, the hold, then E's pull. */
export function introDurationMs(count: number, params: DeckParams = DECK_PARAMS): number {
  const I = params.intro;
  return I.dealMs + (count - 1) * I.staggerMs + I.holdMs + I.pullMs;
}

/**
 * The entrance (spec §7): the rack deals in, holds, then E pulls itself out. On phones only E and
 * the waiting card take part. `input.intro.elapsed` is the caller's own intro clock (see
 * `IntroState`), so fast-forwarding never rescales time already elapsed. Returns `intro.done` once
 * the scroll model should take over; the end state equals `deckPose` at p = 0 (same tilt, float
 * and phase, via the shared `decorateLanded`), so the handover has no jump.
 */
function introPose(input: PoseInput, params: DeckParams): StagePose {
  const I = params.intro;
  const count = input.labels.length;
  const t = input.intro!.elapsed;
  const dealEnd = I.dealMs + (count - 1) * I.staggerMs;
  const pullStart = dealEnd + I.holdMs;
  const end = pullStart + I.pullMs;
  const phone = input.layout.mode === "phone";
  const direction = phone ? 1 : -1;
  const offset = direction * I.entryOffset * input.layout.cardW;

  const cards = input.labels.map((_, i) => {
    // Before the pull, E rests in its slot; on a phone it arrives at `next` like every other
    // card (never at the exit), and card 1 waits behind it as the visible next.
    const rest =
      phone && i === 0
        ? { ...input.layout.next!, rotY: params.layout.phoneNextRotY, opacity: 1 }
        : restPose(i, 0, 0, input.layout, params);
    if (phone && i > 1) return interpolate({ ...rest, opacity: 0 }, 0, input.layout, params, true);
    if (i === 0 && t >= pullStart) {
      const pull = easeInOutCubic(clamp01((t - pullStart) / I.pullMs));
      const pose = interpolate(rest, pull, input.layout, params, true);
      if (pull > 0)
        decorateLanded(pose, input.tilt, input.time, input.landedAt[0] ?? null, false, params);
      return pose;
    }
    const local = clamp01((t - i * I.staggerMs) / I.dealMs);
    const e = easeOutCubic(local);
    const pose = interpolate(rest, 0, input.layout, params, true);
    pose.x = rest.x + offset * (1 - e);
    return pose;
  });

  return {
    cards,
    active: 0,
    within: 0,
    energy: 0,
    kind: null,
    energyIndex: null,
    intro: {
      done: t >= end,
      floor: clamp01(t / I.floorMs),
      rail: clamp01(t / dealEnd),
    },
  };
}

export type { DeckLayout, Point };
