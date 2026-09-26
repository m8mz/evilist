# Journey Card Deck, Plan 4: The Phone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the deck on phones: a horizontal swipe moves one rank, a tap on the peeking card moves forward, a tap on the presented card turns on orientation tilt (asking iOS once), the camera never parallaxes on phones, relayout is debounced and follows the CSS breakpoint and the orientation, and the phone tier's behaviour and budget are asserted end to end.

**Architecture:** Plans 1–3 already give phones the "deck behind" layout (`deck-layout.ts` phone branch, `deck-pose.ts` rest poses and intro), the mid tier through the coarse-pointer reading (no bloom, pool 70, pixel ratio 1.5, fog on), and a tap that already resolves through `hit()` and `jump()`. Plan 4 adds a pure gesture module (`deck-gestures.ts`: the swipe judgement and the orientation-to-tilt mapping, both unit-tested), moves the stage's pointer/tilt/camera/hover targets into a small unit-testable class (`deck-input.ts`) so the stage stays under its 600-line cap and gains a `tilt()` method for the phone, wires the touch gestures and the permission flow in the page script (`index.ts`) with `touch-action: pan-y` on the canvas, and adds phone-project e2e tests. Nothing in the frozen frames changes, so the visual baselines stay.

**Tech Stack:** Astro 7, TypeScript 6 strict, Three.js 0.186.1, Motion 13.4, vitest 5, Playwright 1.63 (the phone projects `iphone-15`, `pixel-7`, `ipad` emulate touch; swipes are dispatched through CDP `Input.dispatchTouchEvent`).

**Spec:** `docs/superpowers/specs/2026-09-25-journey-card-deck-design.md`: §2 (Phone stage: "deck behind"; Navigation: swipe), §6 (Layout: phone anchors; relayout debounced 150 ms and on orientation change), §7 (Motion: tilt from `deviceorientation` after a tap, no camera parallax on phones; Gestures: swipe thresholds, tap on the next card, iOS permission once, denial silent), §9 (tiers, pixel ratio, state attributes), §11 (40 MB phone ceiling), §12 (tests: "a horizontal swipe on a 390 viewport moves one rank"; baselines at 390), §13 (`deviceorientation` only after a tap, never uninvited), §15 phase 5 (gate: browser check at 390, 430 and 768).

## Global Constraints

- pnpm only; every commit GPG-signed by Marcus's global config (stop if signing fails; never `--no-gpg-sign`); no Co-Authored-By or AI attribution anywhere. One branch: `journey-card-deck`.
- CSP: no inline `style=` attributes, no `is:inline`; classes and CSSOM writes only. `touch-action` lives in the component's `<style>`.
- No `any`, no non-null assertions in new code (guards or `??`). No hex literals outside the palette allow list (`test/deckPalette.test.ts` scans `src/scripts/deck/`).
- Line caps: `deck-stage.ts` ≤ 600 (it is 588; Task 2 takes it below 520 before Task 3 adds), `deck-input.ts` ≤ 170, `deck-gestures.ts` ≤ 90, `index.ts` ≤ 360.
- Budgets unchanged: deck chunk ≤ 170 KB gz (146 today), bloom ≤ 40 KB, initial JS ≤ 100 KB; the gesture code lives in `index.ts` (initial graph, a few hundred bytes gz) and the input class in the deck chunk.
- `deviceorientation` is listened to only after a tap on the presented card; `DeviceOrientationEvent.requestPermission()` is called at most once per page load, inside the tap's user gesture; a denial or a throw ends the matter silently (spec §7, §13).
- Vertical touch movement always belongs to the page: the canvas declares `touch-action: pan-y`, and the swipe is judged only at pointer up (spec §7).
- Every gate: `pnpm format && pnpm lint && pnpm check && pnpm test`; Tasks 3–6 add `pnpm build && pnpm size && pnpm test:e2e`; Task 6 adds `pnpm test:visual` (the six baselines must pass unchanged).
- Never dispatch two implementers at once; the controller records BASE before each dispatch.

## Review Focus

1. **A vertical scroll on the stage must never be eaten by the swipe.** A visitor dragging up over the canvas expects the page to scroll. Pinned in Task 5: a vertical touch drag on `iphone-15` changes `scrollY` and leaves `data-deck-rank` alone; Task 4's CSS test pins `touch-action: pan-y`.
2. **The permission prompt appears only after a deliberate tap and never twice.** Pinned in Task 5: with `requestPermission` stubbed to resolve "denied", `data-deck-tilt` stays "off", no error surfaces, and a second tap does not call the stub again (the stub counts calls).
3. **No camera parallax on phones, whatever the tier.** Pinned in Task 2's unit tests: `StageInput.updateTargets` leaves the camera target at 0 when the mode is `phone`, even with `parallax: true`.
4. **Orientation change relayouts once and keeps the deck.** Pinned in Task 5: swapping the `pixel-7` viewport to landscape and back keeps `data-deck-ready`, keeps the rank, logs no page error, and relayouts at most once per change (the stage exposes nothing for the count; the test asserts stability and the debounce is reviewed in Task 3).
5. **A tap on the presented card never jumps, a tap on the peeking card moves forward.** Pinned in Task 5 on `iphone-15`.

## Deviations from the spec (recorded here, ruled by the controller)

- The hint reads `↓ scroll, swipe or pick a rank` on coarse pointers (the spec's copy stays on fine pointers). Set by the page script, so the server-rendered markup is unchanged.
- A new state attribute `data-deck-tilt` ("off" | "on") mirrors whether the orientation listener is live, so the tap-to-enable flow is observable in e2e. Removed in `fallback()`.
- A `gestures` block joins `DeckParams` (`swipeMinPx`, `swipeRatio`, `orientationGain`) and `layout.relayoutDebounceMs`; the spec's numbers are its defaults.
- The stage's mode follows `matchMedia("(min-width: 60rem)")` (the CSS breakpoint), with the width compare as the fallback when `matchMedia` is missing. The two can no longer diverge.
- The pointer, tilt, camera and hover targets move out of `deck-stage.ts` into `deck-input.ts` (a class with unit tests), the same kind of extraction Plan 3 made for the card meshes.

## File structure

| File                                                                  | Role                                                                                                               | Task |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---- |
| `src/scripts/deck/deck-gestures.ts` (new)                             | Pure: `judgeSwipe`, `orientationTilt`, `screenAngleOf`.                                                            | 1    |
| `test/deckGestures.test.ts` (new)                                     | Thresholds, ratio, signs, baseline, clamp, landscape, non-finite.                                                  | 1    |
| `src/scripts/deck/deck-params.ts`                                     | `gestures` block; `layout.relayoutDebounceMs`.                                                                     | 1    |
| `src/scripts/deck/deck-input.ts` (new)                                | `StageInput`: pointer, external tilt, targets, smoothing.                                                          | 2    |
| `test/deckInput.test.ts` (new)                                        | Targets per mode, parallax gate, smoothing, release.                                                               | 2    |
| `src/scripts/deck/deck-stage.ts`                                      | Uses `StageInput`; `tilt()` on the handle; mode from `matchMedia`; debounced relayout; orientation media listener. | 2, 3 |
| `src/components/journey/Journey.astro`                                | `touch-action: pan-y` on the canvas.                                                                               | 4    |
| `src/scripts/deck/index.ts`                                           | Swipe, tap-to-tilt with the permission flow, `data-deck-tilt`, the coarse-pointer hint.                            | 4    |
| `test/ui/Journey.test.ts`                                             | The canvas rule is in the emitted CSS.                                                                             | 4    |
| `e2e/journey.spec.ts`                                                 | Phone tests: swipe, vertical drag, taps, tilt on/off, denied permission, tier and budget, orientation change.      | 5    |
| Spec status and §9 attributes, CLAUDE.md, this plan's Execution notes | The record.                                                                                                        | 6    |

## Interfaces

```ts
// deck-gestures.ts
export type SwipeDirection = -1 | 0 | 1;                 // +1 = forward (a leftward swipe)
export function judgeSwipe(dx: number, dy: number, params?: DeckParams): SwipeDirection;
export interface Orientation { beta: number; gamma: number }
export type ScreenAngle = 0 | 90 | 180 | 270;
export function screenAngleOf(angle: number): ScreenAngle;
export function orientationTilt(reading: Orientation, baseline: Orientation, angle: ScreenAngle, params?: DeckParams): { x: number; y: number };

// deck-input.ts
export interface InputTargetsArgs { presentedX: number; presentedY: number; cardW: number; cardH: number; stageW: number; stageH: number; rect: { left: number; top: number }; mode: DeckMode; parallax: boolean; presented: number; racked: (index: number) => boolean; hitAt: (clientX: number, clientY: number) => number | null }
export class StageInput {
  constructor(count: number, params: DeckParams);
  readonly tilt: { x: number; y: number };   // smoothed, degrees (the pose reads it)
  readonly cam: { x: number; y: number };    // smoothed, world units
  readonly hover: number[];                  // smoothed, 0–1 per card
  pointer(clientX: number | null, clientY: number | null): void;
  tilt2(x: number | null, y: number | null): void;   // NOTE: named `setTilt` in code; external (orientation) target in degrees, null releases
  updateTargets(args: InputTargetsArgs): boolean;    // returns true when a racked card is under the pointer (cursor)
  step(dt: number): void;                            // smoothing toward the targets (never called under freeze)
  reset(): void;                                     // targets and values to 0 (dispose, context loss)
}

// deck-stage.ts, StageHandle gains
tilt(x: number | null, y: number | null): void;      // phone orientation tilt target, degrees

// index.ts, DOM contract gains
data-deck-tilt = "off" | "on"
```

(In code the external-tilt setter is `setTilt`; the table above names it once as `tilt2` only to keep it distinct from the `tilt` field.)

---

### Task 1: The gesture arithmetic, pure

**Files:**

- Create: `src/scripts/deck/deck-gestures.ts`
- Modify: `src/scripts/deck/deck-params.ts` (the `gestures` block, `layout.relayoutDebounceMs`), `test/deckParams.test.ts` (pin two defaults)
- Test: `test/deckGestures.test.ts`

**Interfaces:** Produces `judgeSwipe`, `orientationTilt`, `screenAngleOf`, `Orientation`, `ScreenAngle`, `SwipeDirection` (Task 4 consumes all; Task 2 consumes nothing here).

- [ ] **Step 1: Params**

In `DeckParams` (`deck-params.ts`) add to the `layout` interface `relayoutDebounceMs: number;` with the doc `/** Resize and orientation changes wait this long before the deck relayouts (spec §6). */` and, as a new top-level block after `tilt`:

```ts
/** Touch gestures (spec §7). */
gestures: {
  /** A swipe needs at least this much horizontal travel, in CSS px. */
  swipeMinPx: number;
  /** …and at least this many times more horizontal than vertical travel. */
  swipeRatio: number;
  /** Degrees of card tilt per degree of device tilt, before the tilt clamps apply. */
  orientationGain: number;
}
```

Defaults: `relayoutDebounceMs: 150` inside `layout`, and `gestures: { swipeMinPx: 40, swipeRatio: 2, orientationGain: 0.5 }`. In `test/deckParams.test.ts` add, beside the existing pins:

```ts
expect(DECK_PARAMS.gestures.swipeMinPx).toBe(40);
expect(DECK_PARAMS.layout.relayoutDebounceMs).toBe(150);
```

- [ ] **Step 2: Write the failing tests** (`test/deckGestures.test.ts`)

```ts
import { describe, expect, it } from "vitest";
import {
  judgeSwipe,
  orientationTilt,
  screenAngleOf,
  type ScreenAngle,
} from "../src/scripts/deck/deck-gestures";
import { DECK_PARAMS } from "../src/scripts/deck/deck-params";

describe("judgeSwipe", () => {
  it("needs more than swipeMinPx of horizontal travel", () => {
    expect(judgeSwipe(-40, 0)).toBe(0);
    expect(judgeSwipe(-41, 0)).toBe(1);
    expect(judgeSwipe(41, 0)).toBe(-1);
  });
  it("needs the horizontal travel to beat swipeRatio times the vertical", () => {
    expect(judgeSwipe(-60, 30)).toBe(0); // 60 is not > 2 × 30
    expect(judgeSwipe(-61, 30)).toBe(1);
    expect(judgeSwipe(-61, -30)).toBe(1); // the sign of dy does not matter
  });
  it("reads a leftward swipe as forward and a rightward one as back", () => {
    expect(judgeSwipe(-120, 5)).toBe(1);
    expect(judgeSwipe(120, 5)).toBe(-1);
  });
  it("ignores non-finite input", () => {
    expect(judgeSwipe(Number.NaN, 0)).toBe(0);
    expect(judgeSwipe(-100, Number.POSITIVE_INFINITY)).toBe(0);
  });
  it("takes its thresholds from the params", () => {
    const P = {
      ...DECK_PARAMS,
      gestures: { ...DECK_PARAMS.gestures, swipeMinPx: 10, swipeRatio: 1 },
    };
    expect(judgeSwipe(-11, 10, P)).toBe(1);
    expect(judgeSwipe(-11, 12, P)).toBe(0);
  });
});

describe("screenAngleOf", () => {
  it("snaps any angle to the four screen orientations", () => {
    expect(screenAngleOf(0)).toBe(0);
    expect(screenAngleOf(90)).toBe(90);
    expect(screenAngleOf(-90)).toBe(270);
    expect(screenAngleOf(179)).toBe(180);
    expect(screenAngleOf(361)).toBe(0);
  });
});

describe("orientationTilt", () => {
  const base = { beta: 40, gamma: -5 };
  it("is zero at the baseline captured when tilt was enabled", () => {
    expect(orientationTilt(base, base, 0)).toEqual({ x: 0, y: 0 });
  });
  it("maps beta to rotX and gamma to rotY through the gain in portrait", () => {
    const t = orientationTilt({ beta: 50, gamma: 5 }, base, 0);
    expect(t.x).toBeCloseTo(10 * DECK_PARAMS.gestures.orientationGain, 6);
    expect(t.y).toBeCloseTo(10 * DECK_PARAMS.gestures.orientationGain, 6);
  });
  it("clamps to the tilt limits", () => {
    const t = orientationTilt({ beta: 140, gamma: 85 }, base, 0);
    expect(t.x).toBe(DECK_PARAMS.tilt.maxX);
    expect(t.y).toBe(DECK_PARAMS.tilt.maxY);
    const n = orientationTilt({ beta: -60, gamma: -95 }, base, 0);
    expect(n.x).toBe(-DECK_PARAMS.tilt.maxX);
    expect(n.y).toBe(-DECK_PARAMS.tilt.maxY);
  });
  it("swaps the axes in landscape so the card still follows the screen", () => {
    const portrait = orientationTilt({ beta: 50, gamma: -5 }, base, 0); // beta only
    const left = orientationTilt({ beta: 50, gamma: -5 }, base, 90);
    const right = orientationTilt({ beta: 50, gamma: -5 }, base, 270);
    expect(portrait.y).toBe(0);
    expect(left.x).toBe(0);
    expect(left.y).toBeCloseTo(-portrait.x, 6);
    expect(right.x).toBe(0);
    expect(right.y).toBeCloseTo(portrait.x, 6);
    const upside = orientationTilt({ beta: 50, gamma: 5 }, base, 180);
    expect(upside.x).toBeCloseTo(-5, 6);
    expect(upside.y).toBeCloseTo(-5, 6);
  });
  it("returns zero for a reading without numbers (desktop browsers fire nulls)", () => {
    const bad = { beta: Number.NaN, gamma: 3 };
    expect(orientationTilt(bad, base, 0 as ScreenAngle)).toEqual({ x: 0, y: 0 });
  });
});
```

- [ ] **Step 3: Run, expect failure** (`pnpm vitest run test/deckGestures.test.ts`: the module is missing).

- [ ] **Step 4: The module** (`src/scripts/deck/deck-gestures.ts`)

```ts
// Touch gestures for the deck (deck spec §7): the swipe that moves one rank and the mapping from a
// phone's orientation to the presented card's tilt. Pure: no DOM, so the page script and the tests
// share one definition of "a swipe".
import { DECK_PARAMS, type DeckParams } from "./deck-params";

/** +1 moves forward (a leftward swipe drags the next card in), −1 back, 0 is not a swipe. */
export type SwipeDirection = -1 | 0 | 1;

/**
 * Judged once, at pointer up (spec §7): the horizontal travel must beat `swipeMinPx` and
 * `swipeRatio` times the vertical travel, so a diagonal flick that the browser let through as a pan
 * does not move the deck.
 */
export function judgeSwipe(
  dx: number,
  dy: number,
  params: DeckParams = DECK_PARAMS,
): SwipeDirection {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return 0;
  const G = params.gestures;
  const ax = Math.abs(dx);
  if (ax <= G.swipeMinPx || ax <= G.swipeRatio * Math.abs(dy)) return 0;
  return dx < 0 ? 1 : -1;
}

export interface Orientation {
  /** Front-to-back tilt in degrees (the device's x axis). */
  beta: number;
  /** Left-to-right tilt in degrees (the device's y axis). */
  gamma: number;
}

export type ScreenAngle = 0 | 90 | 180 | 270;

/** `screen.orientation.angle` (or the legacy `window.orientation`) snapped to a quarter turn. */
export function screenAngleOf(angle: number): ScreenAngle {
  const quarter = Math.round(angle / 90) * 90;
  return (((quarter % 360) + 360) % 360) as ScreenAngle;
}

const clamp = (v: number, limit: number): number => Math.max(-limit, Math.min(limit, v));

/**
 * The card's tilt target in degrees from a device reading, relative to the reading captured when
 * the visitor turned tilt on (so the phone's resting angle is "flat"). Beta drives rotX and gamma
 * drives rotY in portrait; in landscape the device's axes turn against the screen's, so they swap.
 * Clamped to the same limits the pointer tilt uses (spec §7: rotX ±8°, rotY ±10°).
 */
export function orientationTilt(
  reading: Orientation,
  baseline: Orientation,
  angle: ScreenAngle,
  params: DeckParams = DECK_PARAMS,
): { x: number; y: number } {
  const db = reading.beta - baseline.beta;
  const dg = reading.gamma - baseline.gamma;
  if (!Number.isFinite(db) || !Number.isFinite(dg)) return { x: 0, y: 0 };
  let frontBack = db;
  let leftRight = dg;
  if (angle === 90) {
    frontBack = dg;
    leftRight = -db;
  } else if (angle === 270) {
    frontBack = -dg;
    leftRight = db;
  } else if (angle === 180) {
    frontBack = -db;
    leftRight = -dg;
  }
  const gain = params.gestures.orientationGain;
  return {
    x: clamp(frontBack * gain, params.tilt.maxX),
    y: clamp(leftRight * gain, params.tilt.maxY),
  };
}
```

- [ ] **Step 5: Run, expect pass** (`pnpm vitest run test/deckGestures.test.ts test/deckParams.test.ts`).

- [ ] **Step 6: Gate and commit**

```bash
pnpm format && pnpm lint && pnpm check && pnpm test
git add src/scripts/deck/deck-gestures.ts src/scripts/deck/deck-params.ts test/deckGestures.test.ts test/deckParams.test.ts
git commit -m "deck: the swipe judgement and the orientation tilt, pure"
```

---

### Task 2: The stage's input targets move into `deck-input.ts`

**Files:**

- Create: `src/scripts/deck/deck-input.ts`
- Modify: `src/scripts/deck/deck-stage.ts` (lines 255–261 declarations, `updateTargets` 302–331, the smoothing block 400–408, the `input` object 411, the camera write 476–477, the handle's `pointer` 550–553, `dispose`)
- Test: `test/deckInput.test.ts`

**Interfaces:** Consumes `smooth` from `deck-util.ts`, `DeckMode` from `deck-layout.ts`, `DeckParams`. Produces `StageInput` and `InputTargetsArgs` (Task 3 adds the phone branch on top; the stage keeps `hitAt`).

This is a move, not a rewrite: the arithmetic in `updateTargets` (the ±1 normalisation over the presented card's half extents, `params.tilt.maxX × ny`, `params.tilt.maxY × nx`, the parallax from the pointer's position over the stage, the racked-card hover) and the smoothing constants (`params.tilt.tau`, `params.camera.parallaxTau`, `params.hover.inMs/outMs`) must come out byte-for-byte in behaviour. The tests below pin them.

- [ ] **Step 1: Write the failing tests** (`test/deckInput.test.ts`)

```ts
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
  });
  it("parallaxes the camera with the pointer on desktop when allowed, never on phones", () => {
    const desk = new StageInput(7, P);
    desk.pointer(1400, 0); // right edge, top
    desk.updateTargets(args());
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
    input.step(10_000);
    expect(input.hover[1]).toBeCloseTo(1, 3);
    expect(input.hover[3]).toBe(0);
    expect(input.updateTargets(args({ hitAt: () => 3 }))).toBe(false); // the presented card
    expect(input.updateTargets(args({ hitAt: () => 1, mode: "phone" }))).toBe(false);
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
```

- [ ] **Step 2: Run, expect failure** (`pnpm vitest run test/deckInput.test.ts`).

- [ ] **Step 3: The class** (`src/scripts/deck/deck-input.ts`)

```ts
// The stage's pointer-driven targets and their smoothing (deck spec §7: tilt, hover lift, camera
// parallax), plus the phone's external tilt. Pure arithmetic over numbers the stage hands in, so
// the phone and desktop rules are unit-tested and deck-stage.ts only wires them.
import type { DeckMode } from "./deck-layout";
import type { DeckParams } from "./deck-params";
import { smooth } from "./deck-util";

export interface InputTargetsArgs {
  /** The presented card's centre and size, CSS px inside the canvas. */
  presentedX: number;
  presentedY: number;
  cardW: number;
  cardH: number;
  stageW: number;
  stageH: number;
  /** The canvas's client rect origin, to bring client coordinates into the canvas. */
  rect: { left: number; top: number };
  mode: DeckMode;
  /** Whether this tier parallaxes the camera at all (high only). Phones never do, whatever this says. */
  parallax: boolean;
  /** The landed card's index, or −1. */
  presented: number;
  racked: (index: number) => boolean;
  hitAt: (clientX: number, clientY: number) => number | null;
}

const clamp1 = (v: number): number => Math.max(-1, Math.min(1, v));

export class StageInput {
  readonly tilt = { x: 0, y: 0 };
  readonly cam = { x: 0, y: 0 };
  readonly hover: number[];
  private pointerAt: { x: number; y: number } | null = null;
  private external: { x: number; y: number } | null = null;
  private readonly tiltTarget = { x: 0, y: 0 };
  private readonly camTarget = { x: 0, y: 0 };
  private readonly hoverTarget: number[];
  private readonly params: DeckParams;

  constructor(count: number, params: DeckParams) {
    this.params = params;
    this.hover = new Array<number>(count).fill(0);
    this.hoverTarget = new Array<number>(count).fill(0);
  }

  pointer(clientX: number | null, clientY: number | null): void {
    this.pointerAt = clientX === null || clientY === null ? null : { x: clientX, y: clientY };
  }

  /** The phone's orientation tilt target, degrees; `null` releases it to 0. */
  setTilt(x: number | null, y: number | null): void {
    this.external = x === null || y === null ? null : { x, y };
  }

  /** Recomputes the targets. Returns true when a racked card sits under a desktop pointer. */
  updateTargets(a: InputTargetsArgs): boolean {
    const P = this.params;
    this.hoverTarget.fill(0);
    if (a.mode === "phone") {
      // Spec §7: no pointer tilt, no hover and no camera parallax on phones. The tilt comes from
      // the device's orientation, when the visitor turned it on.
      this.tiltTarget.x = this.external?.x ?? 0;
      this.tiltTarget.y = this.external?.y ?? 0;
      this.camTarget.x = this.camTarget.y = 0;
      return false;
    }
    if (!this.pointerAt) {
      this.tiltTarget.x = this.tiltTarget.y = 0;
      this.camTarget.x = this.camTarget.y = 0;
      return false;
    }
    const px = this.pointerAt.x - a.rect.left;
    const py = this.pointerAt.y - a.rect.top;
    if (a.presented >= 0) {
      const nx = clamp1((px - a.presentedX) / (a.cardW / 2));
      const ny = clamp1((py - a.presentedY) / (a.cardH / 2));
      this.tiltTarget.x = P.tilt.maxX * ny;
      this.tiltTarget.y = P.tilt.maxY * nx;
    } else {
      this.tiltTarget.x = this.tiltTarget.y = 0;
    }
    if (a.parallax) {
      this.camTarget.x = ((px / a.stageW) * 2 - 1) * P.camera.parallax;
      this.camTarget.y = -((py / a.stageH) * 2 - 1) * P.camera.parallax;
    } else {
      this.camTarget.x = this.camTarget.y = 0;
    }
    const hit = a.hitAt(this.pointerAt.x, this.pointerAt.y);
    const racked = hit !== null && a.racked(hit);
    if (racked && hit !== null) this.hoverTarget[hit] = 1;
    return racked;
  }

  /** Advances the smoothed values by `dt` ms (spec §7's time constants). */
  step(dt: number): void {
    const P = this.params;
    this.tilt.x = smooth(this.tilt.x, this.tiltTarget.x, dt, P.tilt.tau);
    this.tilt.y = smooth(this.tilt.y, this.tiltTarget.y, dt, P.tilt.tau);
    this.cam.x = smooth(this.cam.x, this.camTarget.x, dt, P.camera.parallaxTau);
    this.cam.y = smooth(this.cam.y, this.camTarget.y, dt, P.camera.parallaxTau);
    for (let i = 0; i < this.hover.length; i++) {
      const cur = this.hover[i] ?? 0;
      const tgt = this.hoverTarget[i] ?? 0;
      this.hover[i] = smooth(cur, tgt, dt, tgt > cur ? P.hover.inMs : P.hover.outMs);
    }
  }

  reset(): void {
    this.pointerAt = null;
    this.external = null;
    this.tilt.x = this.tilt.y = 0;
    this.cam.x = this.cam.y = 0;
    this.tiltTarget.x = this.tiltTarget.y = 0;
    this.camTarget.x = this.camTarget.y = 0;
    this.hover.fill(0);
    this.hoverTarget.fill(0);
  }
}
```

(`smooth(current, target, dt, tau)` is the existing helper in `deck-util.ts`; read its signature before use. If `smooth` snaps within a tolerance, the `toBeCloseTo(…, 3)` assertions still hold.)

- [ ] **Step 4: Wire the stage.** In `deck-stage.ts`:
  1. Import `{ StageInput } from "./deck-input"`; drop `smooth` from the `deck-util` import if it is now unused (check `p = smooth(...)` on line 399 still uses it: it does, keep it).
  2. Replace the declarations on lines 255–261 (`pointerAt`, `tilt`, `tiltTarget`, `hover`, `hoverTarget`, `cam`, `camTarget`) with `const input = new StageInput(count, params);`.
  3. Replace `updateTargets(pose)` (302–331) with:
     ```ts
     function updateTargets(pose: StagePose): void {
       if (!layout) return;
       const r = canvas.getBoundingClientRect();
       const racked = input.updateTargets({
         presentedX: layout.presented.x,
         presentedY: layout.presented.y,
         cardW: layout.cardW,
         cardH: layout.cardH,
         stageW,
         stageH,
         rect: { left: r.left, top: r.top },
         mode: layout.mode,
         parallax: opts.tier === "high",
         presented: pose.cards.findIndex((c) => c.landed),
         racked: (i) => (pose.cards[i]?.pull ?? 1) <= 0,
         hitAt,
       });
       canvas.classList.toggle("is-pointer", racked);
     }
     ```
  4. In `frame()`, replace lines 400–408 (the tilt/cam/hover smoothing) with `input.step(dt);` (still inside the `else` of `if (freeze)`).
  5. Line 411: `const input = { p, labels, layout, tilt, hover, time, landedAt, intro };` becomes `const poseInput = { p, labels, layout, tilt: input.tilt, hover: input.hover, time, landedAt, intro };` and the `deckPose(poseInput, params)` call follows; rename the local to avoid shadowing.
  6. Lines 476–477: `camera.position.x = input.cam.x; camera.position.y = input.cam.y;`.
  7. The handle's `pointer(clientX, clientY)` body becomes `input.pointer(clientX, clientY); requestRender();`.
  8. In `dispose()` and in the context-lost path (`onLost`), call `input.reset()` before the renderer is dropped, so a re-mount or restore starts flat.
  9. Any other reference to the removed names (`pointerAt` in `updateTargets`'s old guard, the `hover` array elsewhere) resolves through `input.*`; `pnpm check` finds the rest.

- [ ] **Step 5: Run** `pnpm vitest run test/deckInput.test.ts` (6 pass) and `pnpm check` (0 errors); `wc -l src/scripts/deck/deck-stage.ts` ≤ 520.

- [ ] **Step 6: Gate, build, e2e and commit** (the desktop "rack click + hover" and resize tests exercise the moved code):

```bash
pnpm format && pnpm lint && pnpm check && pnpm test && pnpm build && pnpm size && pnpm test:e2e
git add src/scripts/deck/deck-input.ts src/scripts/deck/deck-stage.ts test/deckInput.test.ts
git commit -m "deck: the pointer, tilt, hover and camera targets move into deck-input.ts"
```

---

### Task 3: The stage on a phone: tilt input, no parallax, the breakpoint and a debounced relayout

**Files:**

- Modify: `src/scripts/deck/deck-stage.ts` (`StageHandle`, `computeLayout`, the ResizeObserver, the handle, `dispose`)

**Interfaces:** Consumes `StageInput.setTilt`. Produces `StageHandle.tilt(x, y)` (Task 4 calls it) and the media-query mode.

- [ ] **Step 1: The handle.** Add to `StageHandle` (after `pointer`): `/** The phone's orientation tilt target in degrees; null releases it (spec §7). */ tilt(x: number | null, y: number | null): void;` and to the returned object: `tilt(x, y) { input.setTilt(x, y); requestRender(); },`.

- [ ] **Step 2: The mode from the breakpoint.** Above `mountStage`, replace the `DESKTOP_MIN_PX` comment with:

```ts
const DESKTOP_MIN_PX = 960; // 60rem at the default root size: the fallback when matchMedia is missing
const DESKTOP_QUERY = "(min-width: 60rem)"; // the same breakpoint Journey.astro's styles use
```

In `computeLayout()` (line 164) the mode becomes:

```ts
const mode: DeckMode = desktopQuery
  ? desktopQuery.matches
    ? "desktop"
    : "phone"
  : stageW >= DESKTOP_MIN_PX
    ? "desktop"
    : "phone";
```

with, declared once near the renderer setup: `const desktopQuery = typeof matchMedia === "function" ? matchMedia(DESKTOP_QUERY) : null;` and `const portraitQuery = typeof matchMedia === "function" ? matchMedia("(orientation: portrait)") : null;`.

- [ ] **Step 3: Debounced relayout and the orientation change.** Replace the ResizeObserver block (lines 221–226) with:

```ts
// Spec §6: relayout debounced 150 ms, and on orientation change. A rotating phone fires several
// resize callbacks in a row; one trailing relayout repaints the textures once.
let relayoutTimer: ReturnType<typeof setTimeout> | undefined;
const scheduleRelayout = (): void => {
  clearTimeout(relayoutTimer);
  relayoutTimer = setTimeout(() => {
    relayoutTimer = undefined;
    if (disposed) return;
    computeLayout();
    applyLayout();
    if (assetsSettled) requestRender();
  }, params.layout.relayoutDebounceMs);
};
const resizer = new ResizeObserver(scheduleRelayout);
resizer.observe(stage);
const onOrientation = (): void => scheduleRelayout();
portraitQuery?.addEventListener("change", onOrientation);
desktopQuery?.addEventListener("change", onOrientation);
```

`disposed` is declared before this block already (check; if it is declared later, move its `let disposed = false;` up). In `dispose()`: `clearTimeout(relayoutTimer); portraitQuery?.removeEventListener("change", onOrientation); desktopQuery?.removeEventListener("change", onOrientation);` beside `resizer.disconnect()`.

The first layout (`computeLayout(); applyLayout();` before the observer) stays immediate: only later changes wait.

- [ ] **Step 4: Freeze.** Under `freeze` the debounce must not delay the single frame: the freeze branch already lays out before its frame and never resizes; nothing to change, but confirm the frozen e2e and visual runs still pass in Step 6.

- [ ] **Step 5: Run** `pnpm check`; `wc -l src/scripts/deck/deck-stage.ts` ≤ 560.

- [ ] **Step 6: Gate, build, e2e and commit** (the desktop resize e2e must still pass with the debounce: Playwright's `expect` polls):

```bash
pnpm format && pnpm lint && pnpm check && pnpm test && pnpm build && pnpm size && pnpm test:e2e
git add src/scripts/deck/deck-stage.ts
git commit -m "deck: the stage takes a phone tilt, follows the breakpoint and debounces its relayout"
```

---

### Task 4: The page script's gestures and the canvas's touch rule

**Files:**

- Modify: `src/components/journey/Journey.astro` (`.journey__gl` gets `touch-action: pan-y`), `src/scripts/deck/index.ts`, `test/ui/Journey.test.ts`

**Interfaces:** Consumes `judgeSwipe`, `orientationTilt`, `screenAngleOf` (Task 1), `StageHandle.tilt` and `hit` (Task 3), `jump`, `presented`, `handle`, `rail`. Produces `data-deck-tilt`.

- [ ] **Step 1: Failing component test.** In `test/ui/Journey.test.ts` add:

```ts
it("lets vertical touch scrolling through the canvas and keeps horizontal swipes for the deck", async () => {
  const html = await render(Journey);
  // The scoped stylesheet is emitted with the markup by the container: the rule must be there.
  expect(html).toMatch(/\.journey__gl[^{]*\{[^}]*touch-action:\s*pan-y/);
});
```

If the container does not emit the scoped stylesheet in the returned HTML (check by logging `html.includes("<style")` once), assert against the component source instead: `readFileSync("src/components/journey/Journey.astro", "utf8")` matched by the same regex, and say so in the report.

- [ ] **Step 2: The CSS.** In `Journey.astro`'s `.journey__gl` rule add `touch-action: pan-y;` with a comment: `/* Vertical pans stay the page's; horizontal ones reach the swipe (spec §7). */`.

- [ ] **Step 3: The page script.** In `index.ts`:

1. Imports: `import { judgeSwipe, orientationTilt, screenAngleOf, type Orientation } from "./deck-gestures";`.
2. In `fallback()` add `delete track.dataset.deckTilt;` beside the others.
3. After `track.dataset.deckTier = tier;` set the hint copy for coarse pointers:
   ```ts
   const coarse = matchMedia("(pointer: coarse)").matches;
   const hint = track.querySelector<HTMLElement>("[data-deck-hint]");
   if (coarse && hint) hint.textContent = "↓ scroll, swipe or pick a rank";
   ```
4. After the `click` listener, the swipe and the tap-to-tilt:

```ts
// Touch (spec §7). The canvas's touch-action is pan-y, so the browser owns vertical pans and
// cancels the pointer; what reaches pointerup is a horizontal gesture or a tap.
let touchStart: { id: number; x: number; y: number } | null = null;
canvas.addEventListener("pointerdown", (event) => {
  if (event.pointerType !== "touch" || !event.isPrimary) return;
  touchStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
});
canvas.addEventListener("pointercancel", () => (touchStart = null));
canvas.addEventListener("pointerup", (event) => {
  if (event.pointerType !== "touch" || !touchStart || touchStart.id !== event.pointerId) return;
  const dx = event.clientX - touchStart.x;
  const dy = event.clientY - touchStart.y;
  touchStart = null;
  const dir = judgeSwipe(dx, dy);
  if (dir !== 0) {
    const next = Math.max(0, Math.min(count - 1, presented + dir));
    if (next !== presented) jump(next);
    return;
  }
  // A tap. On the presented card it turns the orientation tilt on; anywhere else the click
  // handler above already jumps to the tapped card.
  if (
    Math.abs(dx) < 8 &&
    Math.abs(dy) < 8 &&
    handle?.hit(event.clientX, event.clientY) === presented
  ) {
    void enableOrientation();
  }
});
```

and the orientation flow, declared before the listeners:

```ts
// deviceorientation (spec §7, §13): listened to only after a tap on the presented card. iOS
// asks once, inside that tap's gesture; a denial ends it silently. The baseline is the first
// reading after enabling, so the phone's resting angle is "flat".
type Permission = "granted" | "denied" | "prompt";
interface OrientationCtor {
  requestPermission?: () => Promise<Permission>;
}
let permission: Permission | "unknown" = "unknown";
let orientationOn = false;
let baseline: Orientation | null = null;
const setTiltState = (on: boolean): void => {
  orientationOn = on;
  track.dataset.deckTilt = on ? "on" : "off";
  if (!on) {
    baseline = null;
    handle?.tilt(null, null);
  }
};
const onOrientation = (event: DeviceOrientationEvent): void => {
  if (!orientationOn || !handle) return;
  const reading = { beta: event.beta ?? Number.NaN, gamma: event.gamma ?? Number.NaN };
  if (!Number.isFinite(reading.beta) || !Number.isFinite(reading.gamma)) return;
  baseline ??= reading;
  const angle = screenAngleOf(screen.orientation?.angle ?? 0);
  const t = orientationTilt(reading, baseline, angle);
  handle.tilt(t.x, t.y);
};
const stopOrientation = (): void => {
  if (!orientationOn) return;
  removeEventListener("deviceorientation", onOrientation);
  setTiltState(false);
};
const enableOrientation = async (): Promise<void> => {
  if (orientationOn || permission === "denied") return;
  const ctor = (globalThis as { DeviceOrientationEvent?: OrientationCtor }).DeviceOrientationEvent;
  if (!ctor) return;
  if (typeof ctor.requestPermission === "function" && permission !== "granted") {
    try {
      permission = await ctor.requestPermission();
    } catch {
      permission = "denied";
    }
    if (permission !== "granted") {
      permission = "denied";
      return;
    }
  }
  addEventListener("deviceorientation", onOrientation, { passive: true });
  setTiltState(true);
};
track.dataset.deckTilt = "off";
```

5. Stop the listener whenever the stage stops: in the IntersectionObserver callback, after `handle?.setVisible(...)`: `if (!intersecting) stopOrientation();`; in the `visibilitychange` handler: `if (document.hidden) stopOrientation();`; in `armDispose`'s timeout and in `giveUp`, before the handle is dropped: `stopOrientation();`.
6. The `click` listener stays as it is (a tap on the peeking or an exited card jumps to it; a tap on the presented card is `index === presented` and does nothing there).

- [ ] **Step 4: Run** `pnpm vitest run test/ui/Journey.test.ts` (the new test passes) and `pnpm check`; `wc -l src/scripts/deck/index.ts` ≤ 360.

- [ ] **Step 5: Gate, build, e2e and commit** (the existing phone-project tests must stay green; Task 5 adds the new ones):

```bash
pnpm format && pnpm lint && pnpm check && pnpm test && pnpm build && pnpm size && pnpm test:e2e
git add src/components/journey/Journey.astro src/scripts/deck/index.ts test/ui/Journey.test.ts
git commit -m "deck: swipe, tap and orientation tilt on phones, with the canvas leaving vertical pans to the page"
```

---

### Task 5: Phone end-to-end tests

**Files:**

- Modify: `e2e/journey.spec.ts`

**Interfaces:** Consumes the DOM contract (`data-deck-rank`, `data-deck-ready`, `data-deck-tilt`, `data-deck-tier`, `data-deck-bloom`, `data-deck-vram`) and the file's helpers (`scrollToRank`, `ready`, `track`, `scrollToEnd`, `settledVram`, `forceTier`).

- [ ] **Step 1: Helpers.** Add near the other helpers:

```ts
/** A one-finger drag through CDP, so the page sees real touch pointer events (pointerType "touch"). */
async function touchDrag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  steps = 8,
) {
  const cdp = await page.context().newCDPSession(page);
  const point = (x: number, y: number) => ({ x, y, radiusX: 2, radiusY: 2, force: 1, id: 1 });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [point(from.x, from.y)],
  });
  for (let i = 1; i <= steps; i++) {
    const x = from.x + ((to.x - from.x) * i) / steps;
    const y = from.y + ((to.y - from.y) * i) / steps;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point(x, y)] });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
}

/** The canvas's on-screen box and the phone layout's anchors, in client px. */
async function phoneAnchors(page: Page) {
  return page.evaluate(() => {
    const c = document.querySelector<HTMLCanvasElement>("[data-deck-gl]");
    if (!c) throw new Error("no canvas");
    const r = c.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  });
}

const phoneOnly = (info: { project: { name: string } }) =>
  test.skip(!["iphone-15", "pixel-7", "ipad"].includes(info.project.name), "touch projects only");
```

- [ ] **Step 2: The tests.** Add a `test.describe("the deck on a phone", …)` with `test.beforeEach(({}, info) => phoneOnly(info));`:

```ts
test("a horizontal swipe moves one rank each way, and a vertical drag scrolls the page", async ({
  page,
}) => {
  await page.goto("/");
  await scrollToRank(page, 2);
  await ready(page);
  await expect(track(page)).toHaveAttribute("data-deck-rank", "C");
  const box = await phoneAnchors(page);
  const y = box.top + box.height * 0.45;
  await touchDrag(page, { x: box.left + box.width * 0.8, y }, { x: box.left + box.width * 0.2, y });
  await expect(track(page)).toHaveAttribute("data-deck-rank", "B");
  await touchDrag(page, { x: box.left + box.width * 0.2, y }, { x: box.left + box.width * 0.8, y });
  await expect(track(page)).toHaveAttribute("data-deck-rank", "C");
  const before = await page.evaluate(() => scrollY);
  await touchDrag(
    page,
    { x: box.left + box.width * 0.5, y: box.top + box.height * 0.7 },
    { x: box.left + box.width * 0.5, y: box.top + box.height * 0.2 },
  );
  await expect.poll(() => page.evaluate(() => scrollY)).not.toBe(before);
  // The page moved, so the deck may have moved with the scroll, but not by the swipe's rule:
  // a vertical drag never jumps a rank. Compare against the scroll-derived rank instead.
  const rank = await track(page).getAttribute("data-deck-rank");
  expect(["B", "C", "D"]).toContain(rank);
});

test("a tap on the peeking card moves forward; a tap on the presented card does not jump", async ({
  page,
}) => {
  await page.goto("/");
  await scrollToRank(page, 1);
  await ready(page);
  await expect(track(page)).toHaveAttribute("data-deck-rank", "D");
  const box = await phoneAnchors(page);
  // The next card peeks in 24 px from the right edge (spec §6); the card's vertical centre sits
  // in the upper half above the rail.
  await page.touchscreen.tap(box.left + box.width - 18, box.top + box.height * 0.42);
  await expect(track(page)).toHaveAttribute("data-deck-rank", "C");
  await page.touchscreen.tap(box.left + box.width * 0.5, box.top + box.height * 0.42);
  await page.waitForTimeout(400);
  await expect(track(page)).toHaveAttribute("data-deck-rank", "C");
});

test("a tap on the presented card turns orientation tilt on, and leaving the section turns it off", async ({
  page,
}) => {
  await page.goto("/");
  await scrollToRank(page, 3);
  await ready(page);
  await expect(track(page)).toHaveAttribute("data-deck-tilt", "off");
  const box = await phoneAnchors(page);
  await page.touchscreen.tap(box.left + box.width * 0.5, box.top + box.height * 0.42);
  await expect(track(page)).toHaveAttribute("data-deck-tilt", "on");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.evaluate(() => {
    for (const [beta, gamma] of [
      [40, -5],
      [48, 3],
      [30, -12],
    ]) {
      window.dispatchEvent(new DeviceOrientationEvent("deviceorientation", { beta, gamma }));
    }
  });
  await page.waitForTimeout(300);
  expect(errors).toEqual([]);
  await expect(track(page)).toHaveAttribute("data-deck-ready", "");
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await expect(track(page)).toHaveAttribute("data-deck-tilt", "off");
});

test("a denied orientation permission is asked once and ends silently", async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __asked: number };
    w.__asked = 0;
    Object.defineProperty(DeviceOrientationEvent, "requestPermission", {
      value: () => {
        w.__asked += 1;
        return Promise.resolve("denied");
      },
      configurable: true,
    });
  });
  await page.goto("/");
  await scrollToRank(page, 3);
  await ready(page);
  const box = await phoneAnchors(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.touchscreen.tap(box.left + box.width * 0.5, box.top + box.height * 0.42);
  await page.waitForTimeout(300);
  await page.touchscreen.tap(box.left + box.width * 0.5, box.top + box.height * 0.42);
  await page.waitForTimeout(300);
  await expect(track(page)).toHaveAttribute("data-deck-tilt", "off");
  expect(await page.evaluate(() => (window as unknown as { __asked: number }).__asked)).toBe(1);
  expect(errors).toEqual([]);
});

test("runs the mid tier within the phone budget: no bloom request, fog on, under 40 MB", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("/");
  await scrollToEnd(page);
  await ready(page);
  await expect(track(page)).toHaveAttribute("data-deck-tier", "mid");
  await expect(track(page)).toHaveAttribute("data-deck-bloom", "off");
  await page.waitForTimeout(1500);
  expect(requests.some((u) => /deck-bloom/.test(u))).toBe(false);
  const vram = await settledVram(page);
  expect(vram).toBeGreaterThan(0);
  expect(vram).toBeLessThanOrEqual(40);
});

test("an orientation change relayouts and keeps the deck", async ({ page }, info) => {
  test.skip(info.project.name !== "pixel-7", "one phone is enough");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await scrollToRank(page, 4);
  await ready(page);
  const size = page.viewportSize();
  if (!size) throw new Error("no viewport");
  await page.setViewportSize({ width: size.height, height: size.width });
  await page.waitForTimeout(400);
  await expect(track(page)).toHaveAttribute("data-deck-ready", "");
  await page.setViewportSize(size);
  await page.waitForTimeout(400);
  await expect(track(page)).toHaveAttribute("data-deck-ready", "");
  await scrollToRank(page, 4);
  await expect(track(page)).toHaveAttribute("data-deck-rank", "A");
  expect(errors).toEqual([]);
});
```

Adjust the tap coordinates from the real layout if the first run shows the next card's centre elsewhere (`deck-layout.ts`: `next.x = stageW − phoneNextInset − projected/2`, `projected = |cos(−80°)| × cardW ≈ 0.17 × cardW`; `rackY` for y). Do not loosen an assertion; report NEEDS_CONTEXT with the observed attributes if a test cannot pass.

- [ ] **Step 3: Run** `pnpm build && pnpm test:e2e` (all five projects); then `pnpm test:visual` twice: the six journey baselines must pass unchanged (the hint is not shown under freeze; the tilt is off; the frames are the same).

- [ ] **Step 4: Commit**

```bash
git add e2e/journey.spec.ts
git commit -m "e2e: the deck on a phone: swipe, taps, orientation tilt, the mid tier's budget, an orientation change"
```

---

### Task 6: The record

**Files:**

- Modify: `docs/superpowers/specs/2026-09-25-journey-card-deck-design.md` (status line; §9 state attributes gain `data-deck-tilt`; §7 gets one sentence on the hint copy for coarse pointers), `CLAUDE.md` (banner: "Plans 1, 2, 0, 3 and 4 are done; the tuning/retirement phase follows"; the Journey bullet gains "on phones a swipe moves one rank, a tap on the peeking card moves forward, a tap on the presented card turns orientation tilt on"; `deck-gestures.ts` and `deck-input.ts` join the module list), this plan (an "Execution notes" section, as Plan 3 has).

- [ ] **Step 1: Edits** as listed, with the Edit tool after `pnpm format` reflows.

- [ ] **Step 2: Full gate**

```bash
pnpm format && pnpm lint && pnpm check && pnpm test && pnpm build && pnpm size && pnpm test:e2e && pnpm test:visual
git add docs/superpowers/specs/2026-09-25-journey-card-deck-design.md CLAUDE.md docs/superpowers/plans/2026-09-26-journey-deck-4-phone.md
git commit -m "docs: Plan 4 in the spec's status and CLAUDE.md"
```

- [ ] **Step 3: Hand back for the browser check.** The controller checks the production build at 390, 430 and 768 in headless Chromium with touch emulation (exact widths; the claude-in-chrome tab cannot emulate a phone): E, S and S+ frames, a swipe through CDP, a tap on the peeking card, the hint copy, `data-deck-tier`/`data-deck-vram`; shows Marcus the screenshots; writes the Build Log; fast-forwards local main; pushes the branch.

## Self-review

- **Spec coverage.** §2 phone stage and swipe navigation: Tasks 4–5. §6 relayout debounce and orientation change, breakpoint mode: Task 3. §7 tilt from `deviceorientation` after a tap, iOS permission once, denial silent, no parallax, swipe thresholds judged at pointer up, tap on the next card: Tasks 1, 3, 4, 5. §9 tiers on phones (mid via coarse pointer, pixel ratio 1.5, pool 70, no bloom, fog on): already in the code; asserted in Task 5. §11 40 MB phone ceiling: Task 5. §12 swipe e2e on a 390 viewport: Task 5 (`iphone-15` is the 393-wide project); baselines at 390: unchanged and re-run in Tasks 5–6. §13 `deviceorientation` only after a tap: Task 4's flow and Review Focus 2. §15 gate at 390, 430 and 768: the controller's browser check.
- **Placeholders.** None: every step carries its code or its exact edit.
- **Type consistency.** `StageInput.setTilt` (the Interfaces table's `tilt2` note explains the naming), `StageHandle.tilt`, `judgeSwipe` returns `SwipeDirection`, `orientationTilt(reading, baseline, angle, params?)`, `InputTargetsArgs` fields match Task 2's stage call. `e2e` helpers use the file's existing `scrollToRank`, `ready`, `track`, `scrollToEnd`, `settledVram`.
- **Review Focus.** Each of the five lines names the task whose test pins it (1: Task 5 vertical drag + Task 4 CSS test; 2: Task 5 denied permission; 3: Task 2 unit test; 4: Task 5 orientation change; 5: Task 5 taps).
- **Open risk.** The tap coordinates for the peeking card are derived, not measured; Task 5 says how to correct them from the layout. `page.touchscreen.tap` and CDP touch events produce `pointerType: "touch"` in Chromium's mobile emulation; if a project's device lacks `hasTouch`, the test skips itself through `phoneOnly`.
