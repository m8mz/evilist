// The deck's pose model (deck spec §7): pure functions from scroll progress, pointer tilt, hover,
// the clock and the intro to seven card poses and the stage's energy. No DOM, no Three. The stage
// (Plan 2) converts px to world units and drives the meshes; tests pin every curve here.
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

/** The stage's energy: S breathes, S+ grows with its rank; during a handoff the larger pull wins. */
export function energyFor(
  pulls: Pulls,
  labels: readonly RankLabel[],
  landedAt: number = DECK_PARAMS.pull.landedAt,
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
    const landed = pull > landedAt;
    let energy: number;
    if (!landed) energy = E.pulling * pull;
    else if (label === "S") energy = E.s;
    else energy = E.sPlusBase + E.sPlusRamp * Math.min(1, pulls.within / E.sPlusWindow);
    out.energy = energy;
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
  startedAt: number;
  /** 1 normally; the caller raises it to fast-forward when the visitor scrolls. */
  speed: number;
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
  /** When each card last landed (ms), or null while it is not presented. */
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

/** Moves a card from its rest pose to the presented anchor by `pull` (spec §7). */
function interpolate(
  rest: RestPose,
  pull: number,
  layout: DeckLayout,
  params: DeckParams,
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
  const b = backOut(pull, P.overshoot);
  return {
    x: rest.x + (target.x - rest.x) * e,
    y: rest.y + (target.y - rest.y) * e,
    z: P.liftZ * P.liftPeak * Math.sin(Math.PI * pull) + P.liftZ * pull,
    rotX: 0,
    rotY: rest.rotY * (1 - b),
    rotZ: 0,
    scale: 1 + P.scalePeak * Math.sin(Math.PI * pull),
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
    const rest = restPose(i, pulls.active, pulls.k, input.layout, params);
    const pose = interpolate(rest, pulls.pull[i] ?? 0, input.layout, params);
    if (pose.pull <= 0) {
      if (input.layout.mode === "desktop") {
        const h = clamp01(input.hover[i] ?? 0);
        pose.z += params.hover.z * h;
        pose.y -= params.hover.y * h;
      }
      return pose;
    }
    if (!pose.landed) {
      pose.phase = i === pulls.active && pulls.k > 0 ? "leaving" : "pulling";
      return pose;
    }
    pose.rotX += input.tilt.x;
    pose.rotY += input.tilt.y;
    const landedAt = input.landedAt[i];
    if (landedAt != null) {
      const f = float(input.time, landedAt, params);
      pose.y += f.y;
      pose.rotZ += f.rotZ;
      pose.rotY += f.rotY;
      pose.rotX += f.rotX;
      pose.phase = input.time - landedAt < params.print.landingMs ? "landing" : "presented";
    } else {
      // The caller has not recorded a landing (a deep link, a frozen frame): nothing to animate.
      pose.phase = "presented";
    }
    return pose;
  });
  const energy = energyFor(pulls, input.labels, params.pull.landedAt, params);
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
 * the waiting card take part. Returns `intro.done` once the scroll model should take over; the
 * end state equals `deckPose` at p = 0, so the handover has no jump.
 */
function introPose(input: PoseInput, params: DeckParams): StagePose {
  const I = params.intro;
  const count = input.labels.length;
  const t = (input.time - input.intro!.startedAt) * input.intro!.speed;
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
    if (phone && i > 1) return interpolate({ ...rest, opacity: 0 }, 0, input.layout, params);
    if (i === 0 && t >= pullStart) {
      const pull = easeInOutCubic(clamp01((t - pullStart) / I.pullMs));
      const pose = interpolate(rest, pull, input.layout, params);
      if (pull > 0 && !pose.landed) pose.phase = "pulling";
      return pose;
    }
    const local = clamp01((t - i * I.staggerMs) / I.dealMs);
    const e = easeOutCubic(local);
    const pose = interpolate(rest, 0, input.layout, params);
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
