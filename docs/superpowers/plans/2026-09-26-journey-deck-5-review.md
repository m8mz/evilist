# Journey Card Deck, Plan 5: Marcus's Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Act on Marcus's review of the deck (2026-09-26): scroll picks the rank and each card change plays as one full, slower transition that cannot be parked half-way; a click or swipe opens the target card directly; the glow becomes a violet aura hugging the character's outline and the S+ card stays readable; the floor line, the contact shadows and the wandering point-light highlight go; the single-frame tear of the portrait during the print-in is reproduced and fixed.

**Architecture:** A new pure module, `deck-drive.ts`, owns the deck's rank state: the presented rank, the rank the scroll or a jump wants (chosen with hysteresis), and one queued transition `{from, to, startMs}` that eases over a fixed duration. The pose model stops reading a progress value and takes the drive's pulls (`pull[from]` falling, `pull[to]` rising, every other card at rest), so a jump across several ranks is one transition with the cards between staying racked. The scroll keeps two jobs: it selects the wanted rank across a threshold, and inside S+ it still ramps the energy. The glow layer changes shape: an aura mask per portrait (the figure's outline dilated and blurred, generated from the graphite background) drives a violet additive plane per card, the eye mask keeps the eyes, both fade out above the name plate, and the halo sprite, the point light and its breath go. The floor mesh, its intro draw-in and the two contact shadows go. The text slots that repaint every print step move to CPU-backed canvases without mipmaps, after a headed screencast harness reproduces the tear and then shows it gone.

**Tech Stack:** Astro 7, TypeScript 6 strict, Three.js 0.186.1, Motion 13.4, vitest 5, Playwright 1.63, sharp, pnpm 12.

**Spec:** `docs/superpowers/specs/2026-09-25-journey-card-deck-design.md`. This plan amends §2 (Navigation), §6 (no floor line), §7 (Progress and Pose model: the drive replaces the scrubbed progress; "a rail jump riffles the deck" is reversed), §8 (aura instead of the sprite; no point light; no contact shadow), §9 (state attributes; freeze's `deck-k`), §12 (tests). Task 8 writes the amendments; the ledger records the rulings as they are made.

## Global Constraints

- pnpm only; every commit GPG-signed (stop if signing fails; never `--no-gpg-sign`); no Co-Authored-By or AI attribution anywhere. One branch: `journey-card-deck`. After the plan lands: local main fast-forwarded (ExitWorktree, merge, EnterWorktree), the branch pushed, GitHub's main untouched.
- CSP: no inline `style=`, no `is:inline`. No `any`, no non-null assertions in new code. No hex literals outside the palette allow list. `src/fetch.ts` never created.
- Budgets unchanged: initial JS ≤ 100 KB gz; deck ≤ 170 KB; bloom ≤ 40 KB; textures ≤ 80 MB desktop / 40 MB phone; served aura masks ≤ 10 KB each (they join the glow row of `pnpm size`).
- Line caps: `deck-stage.ts` ≤ 640, `deck-effects.ts` ≤ 480 (it loses the light, the sprite and the shadows), `deck-pose.ts` ≤ 400, `deck-drive.ts` ≤ 140, `index.ts` ≤ 390, `scripts/import-portrait.mjs` ≤ 300.
- Determinism under `?deck-freeze=` stays: the drive is settled at the scroll's rank, or at `deck-k` inside a transition, with no clock.
- Reduced motion never mounts the stage (unchanged). The timeline twin is unchanged.
- Every gate: `pnpm format && pnpm lint && pnpm check && pnpm test`; tasks that touch the stage, the page script, the effects or the component add `pnpm build && pnpm size && pnpm test:e2e`; the visual baselines regenerate once, in Task 7 after the tuning values land, and Task 8 proves them stable.
- Tuning values are Marcus's (Task 7); subagents change a default only where a task says so.

## Review Focus

1. **A visitor who scrolls slowly can never park the deck half-way.** Pinned in Task 1 (the drive's unit tests: once a transition starts, its `k` depends on time only) and Task 6 (e2e: after a scroll that crosses a threshold and stops, `data-deck-phase` reaches `presented` within the duration plus the landing, and never stays `pulling`).
2. **A click on the S+ chip from E shows E leaving and S+ arriving, nothing between.** Pinned in Task 1 (a transition from 0 to 6 has pulls only at 0 and 6) and Task 6 (a MutationObserver on `data-deck-rank` records exactly `E` then `S+`).
3. **The S+ card's title and description stay readable at full energy.** Pinned in Task 4 (the glow and aura alpha are zero at and below the name plate's row: a unit test on the fade painter) and Task 7 (the regenerated S+ baseline is inspected).
4. **The aura hugs the figure, not the card.** Pinned in Task 4 (unit: the aura mask of a synthetic figure is zero inside the figure, zero far from it, and positive in a band around it) and the browser check.
5. **The tear is gone on a real GPU.** Pinned in Task 5 (the headed screencast harness reports zero torn frames over three print-ins after the fix, having reported some before).

## Deviations from the spec (ruled here; Task 8 records them)

- §7's scrubbed progress and its 70 % handoff become the drive; the rail jump opens the target directly.
- §8's glow sprite becomes the aura plane; the point light, its breath and its landing flare go; §8's contact shadow and §6's floor line go.
- `?deck-freeze` accepts `deck-k=<0..1>` to render the transition into the scroll's rank at a fixed `k` (tests and, if wanted, a mid-transition baseline).
- A `drive` params block (`durationMs`, `hysteresis`) and an `aura` block replace `scroll.tau`, `glow.scale*`, `light.point*`, `light.breath*` and `shadow.*`.

## File structure

| File                                                                                                                                                                                                                                                                                                                                                                                        | Role                                                                                                       | Task |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---- |
| `src/scripts/deck/deck-drive.ts` (new), `test/deckDrive.test.ts` (new)                                                                                                                                                                                                                                                                                                                      | Rank selection with hysteresis, the queued transition, pulls from time.                                    | 1    |
| `src/scripts/deck/deck-pose.ts`, `test/deckPose.test.ts`, `deck-params.ts`, `test/deckParams.test.ts`                                                                                                                                                                                                                                                                                       | `deckPose` takes `Pulls`; `pullsFor` goes; `drive` params.                                                 | 1    |
| `src/scripts/deck/deck-stage.ts`, `index.ts`, `deck-rail.ts`, `deck-util.ts` (freeze parsing)                                                                                                                                                                                                                                                                                               | The drive in the loop, instant jumps, `deck-k`.                                                            | 2    |
| `deck-stage.ts`, `deck-effects.ts`, `deck-energy.ts`, `deck-layout.ts`, `deck-params.ts`, `deck-paint.ts` (no `paintRadial` void), tests                                                                                                                                                                                                                                                    | Floor, shadows, point light removed.                                                                       | 3    |
| `scripts/import-portrait.mjs`, `scripts/aura-mask.mjs` (new), `test/importPortrait.test.ts`, `src/images/deck/<id>-aura.webp` ×7, `src/data/deckImages.ts`, `src/components/journey/Journey.astro`, `index.ts`, `deck-stage.ts`, `deck-effects.ts`, `deck-energy.ts`, `deck-paint.ts`, `deck-params.ts`, `deck-smoke-sprites.ts`, `scripts/check-bundle-size.mjs`, tests, `docs/imagery.md` | The aura, the glow fade, the gain param, the halo out, smoke on the landed card, fog scaled with the card. | 4    |
| `scripts/deck-tear.mjs` (new), `deck-textures.ts`, `deck-stage.ts` (the canvas factory)                                                                                                                                                                                                                                                                                                     | Harness, then the text slots on CPU-backed canvases without mipmaps.                                       | 5    |
| `e2e/journey.spec.ts`, `e2e/visual.spec.ts`                                                                                                                                                                                                                                                                                                                                                 | The new model's tests; the visual loop unchanged.                                                          | 6    |
| `deck-params.ts`, `deck-tune.ts`, the six baselines                                                                                                                                                                                                                                                                                                                                         | Panel rows, the session's values, baselines.                                                               | 7    |
| The spec, CLAUDE.md, `docs/imagery.md`, this plan                                                                                                                                                                                                                                                                                                                                           | The record.                                                                                                | 8    |

## Interfaces

```ts
// deck-drive.ts
export interface Transition { from: number; to: number; startMs: number }
export interface DriveState { current: number; wanted: number; transition: Transition | null }
export function rankFromScroll(p: number, current: number, count: number, hysteresis: number): number;
export function initialDrive(p: number, count: number, params?: DeckParams): DriveState;   // settled at the scroll's rank
export function stepDrive(state: DriveState, p: number, jump: number | null, timeMs: number, count: number, params?: DeckParams): DriveState;
export function transitionK(t: Transition | null, timeMs: number, params?: DeckParams): number; // 0..1 linear time fraction
export function pullsForDrive(state: DriveState, p: number, timeMs: number, count: number, params?: DeckParams): Pulls;
// Pulls (moved here from deck-pose.ts, extended)
export interface Pulls { active: number; within: number; pull: number[]; from: number | null; to: number | null; k: number }

// deck-pose.ts
export interface PoseInput { pulls: Pulls; labels; layout; tilt; hover; time; landedAt; intro }  // `p` is gone
// deck-params.ts
drive: { durationMs: number; hysteresis: number }                  // 900, 0.15
aura: { s: number; sPlusBase: number; sPlusRamp: number; fadeFrom: number } // 0.45, 0.55, 0.45, 0.72
glow: { gain: number; flareScale: number }                           // 1.2, 1.4 (scaleS/scaleSPlus* removed)
// deck-util.ts
export interface Freeze { time: number; k: number | null }           // k from `deck-k`
// StageHandle
jumpTo(rank: number): void                                            // sets the drive's wanted rank at once
// deck-energy.ts
export function auraOpacity(kind: EnergyKind | null, energy: number, flareGlow: number, params?): number;
export function smokeActive(phase: CardPhase): boolean;
export function fogFor(kind, energy, kick, cardWPx, params?): FogLevel;
// deck-paint.ts
export function paintMaskFaded(ctx: Ctx, image: CanvasImageSource, w: number, h: number, fadeFrom: number): void; // draws the mask and multiplies alpha by a ramp from fadeFrom·h to h
// scripts/import-portrait.mjs
export async function auraMask(input, opts?: { width?: number; rim?: number; tolerance?: number }): Promise<{ mask: Buffer; width: number; height: number; figureShare: number }>;
```

---

### Task 1: The drive, pure, and the pose model on pulls

**Files:**

- Create: `src/scripts/deck/deck-drive.ts`, `test/deckDrive.test.ts`
- Modify: `src/scripts/deck/deck-pose.ts` (`PoseInput.p` → `pulls`; `pullsFor` and `Pulls` move to the drive; `deckPose` and `energyFor` consume `Pulls`), `test/deckPose.test.ts` (build inputs through the drive), `src/scripts/deck/deck-params.ts` (`drive` block; `scroll.tau` removed), `test/deckParams.test.ts`

**Interfaces:** Produces everything under `deck-drive.ts` above and the new `PoseInput`; Task 2 consumes them.

- [ ] **Step 1: Failing tests** (`test/deckDrive.test.ts`):

```ts
import { describe, expect, it } from "vitest";
import {
  initialDrive,
  pullsForDrive,
  rankFromScroll,
  stepDrive,
  transitionK,
} from "../src/scripts/deck/deck-drive";
import { DECK_PARAMS } from "../src/scripts/deck/deck-params";

const N = 7;
const D = DECK_PARAMS.drive.durationMs;
const H = DECK_PARAMS.drive.hysteresis;
const centre = (rank: number) => (rank + 0.5) / N;

describe("rankFromScroll", () => {
  it("picks the rank whose stretch the scroll is in, with hysteresis around the boundaries", () => {
    expect(rankFromScroll(centre(0), 0, N, H)).toBe(0);
    expect(rankFromScroll(centre(3), 0, N, H)).toBe(3);
    // Just past the 0|1 boundary: still 0 within the hysteresis band, 1 beyond it.
    expect(rankFromScroll((1 + H * 0.5) / N, 0, N, H)).toBe(0);
    expect(rankFromScroll((1 + H * 1.5) / N, 0, N, H)).toBe(1);
    // Coming back from 1, the same band holds 1.
    expect(rankFromScroll((1 - H * 0.5) / N, 1, N, H)).toBe(1);
    expect(rankFromScroll((1 - H * 1.5) / N, 1, N, H)).toBe(0);
  });
  it("clamps to the ends", () => {
    expect(rankFromScroll(-1, 3, N, H)).toBe(0);
    expect(rankFromScroll(2, 3, N, H)).toBe(N - 1);
  });
});

describe("stepDrive", () => {
  it("starts settled at the scroll's rank", () => {
    const s = initialDrive(centre(4), N);
    expect(s).toEqual({ current: 4, wanted: 4, transition: null });
  });
  it("starts one transition when the wanted rank changes, and does not restart it while it runs", () => {
    let s = initialDrive(centre(0), N);
    s = stepDrive(s, centre(1), null, 1000, N);
    expect(s.transition).toEqual({ from: 0, to: 1, startMs: 1000 });
    s = stepDrive(s, centre(3), null, 1400, N); // the scroll ran ahead
    expect(s.transition).toEqual({ from: 0, to: 1, startMs: 1000 });
    expect(s.wanted).toBe(3);
  });
  it("settles at the end of the duration, then queues the next transition directly to the wanted rank", () => {
    let s = initialDrive(centre(0), N);
    s = stepDrive(s, centre(3), null, 1000, N);
    s = stepDrive(s, centre(3), null, 1000 + D - 1, N);
    expect(s.current).toBe(0);
    s = stepDrive(s, centre(3), null, 1000 + D, N);
    expect(s.current).toBe(3);
    expect(s.transition).toBeNull();
    s = stepDrive(s, centre(5), null, 1000 + D, N);
    expect(s.transition).toEqual({ from: 3, to: 5, startMs: 1000 + D });
  });
  it("takes a jump as the wanted rank at once, whatever the scroll says", () => {
    let s = initialDrive(centre(0), N);
    s = stepDrive(s, centre(0), 6, 500, N);
    expect(s.transition).toEqual({ from: 0, to: 6, startMs: 500 });
  });
  it("does nothing when wanted equals current", () => {
    const s = initialDrive(centre(2), N);
    expect(stepDrive(s, centre(2), null, 99, N)).toEqual(s);
  });
});

describe("transitionK and pullsForDrive", () => {
  it("is the linear time fraction, clamped", () => {
    const t = { from: 0, to: 1, startMs: 100 };
    expect(transitionK(t, 100)).toBe(0);
    expect(transitionK(t, 100 + D / 2)).toBeCloseTo(0.5, 6);
    expect(transitionK(t, 100 + 2 * D)).toBe(1);
    expect(transitionK(null, 5)).toBe(0);
  });
  it("gives a settled deck one full pull at the current rank and within from the scroll", () => {
    const s = initialDrive(centre(6), N);
    const p = pullsForDrive(s, (6 + 0.9) / N, 0, N);
    expect(p.pull[6]).toBe(1);
    expect(p.pull.filter((x) => x > 0)).toHaveLength(1);
    expect(p.active).toBe(6);
    expect(p.within).toBeCloseTo(0.9, 6);
    expect(p.from).toBeNull();
    expect(p.k).toBe(0);
  });
  it("eases the leaving and arriving cards against each other and leaves the rest racked, even across several ranks", () => {
    const s = { current: 1, wanted: 5, transition: { from: 1, to: 5, startMs: 0 } };
    const half = pullsForDrive(s, centre(5), D / 2, N);
    expect(half.pull[1]).toBeCloseTo(0.5, 6);
    expect(half.pull[5]).toBeCloseTo(0.5, 6);
    expect(half.pull.filter((x) => x > 0)).toHaveLength(2);
    const early = pullsForDrive(s, centre(5), D * 0.1, N);
    expect(early.pull[1]).toBeGreaterThan(0.9); // cubic in-out: slow start
    expect(early.active).toBe(1);
    const late = pullsForDrive(s, centre(5), D * 0.9, N);
    expect(late.active).toBe(5);
    expect(late.within).toBe(0); // the arriving rank's energy ramp starts at 0
  });
  it("keeps the arriving card's within at 0 until it has settled", () => {
    const s = { current: 5, wanted: 6, transition: { from: 5, to: 6, startMs: 0 } };
    expect(pullsForDrive(s, (6 + 0.8) / N, D * 0.99, N).within).toBe(0);
  });
});
```

- [ ] **Step 2: The module** (`src/scripts/deck/deck-drive.ts`):

```ts
// The deck's rank drive (deck spec §7 as amended by Plan 5): the scroll chooses a rank, and every
// change of rank plays as one transition of a fixed duration that nothing can park half-way. A
// jump (rail, click, swipe) is a transition straight from the current card to the target. Pure, so
// the tests pin the queue and the pulls without a clock or a DOM.
import { DECK_PARAMS, type DeckParams } from "./deck-params";

export interface Transition {
  from: number;
  to: number;
  startMs: number;
}

export interface DriveState {
  /** The settled rank (the presented card once no transition runs). */
  current: number;
  /** What the scroll, or the last jump, asks for. */
  wanted: number;
  transition: Transition | null;
}

/** The pulls the pose model consumes: one per card, plus who is moving. */
export interface Pulls {
  active: number;
  /** 0–1 through the active rank's scroll stretch; 0 while a card is still arriving. */
  within: number;
  pull: number[];
  from: number | null;
  to: number | null;
  /** Eased transition fraction, 0 when settled. */
  k: number;
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/**
 * The rank whose stretch the scroll is in. Leaving `current` needs the scroll to pass the boundary
 * by `hysteresis` of a stretch, so a finger resting on a boundary never flickers the deck.
 */
export function rankFromScroll(
  p: number,
  current: number,
  count: number,
  hysteresis: number,
): number {
  const f = clamp01(p) * count; // 0..count; rank r spans [r, r + 1)
  const lo = current - hysteresis;
  const hi = current + 1 + hysteresis;
  if (f >= lo && f < hi) return current;
  return Math.min(count - 1, Math.max(0, Math.floor(f)));
}

export function initialDrive(
  p: number,
  count: number,
  params: DeckParams = DECK_PARAMS,
): DriveState {
  const rank = rankFromScroll(p, 0, count, params.drive.hysteresis);
  return { current: rank, wanted: rank, transition: null };
}

export function transitionK(
  t: Transition | null,
  timeMs: number,
  params: DeckParams = DECK_PARAMS,
): number {
  if (!t) return 0;
  return clamp01((timeMs - t.startMs) / params.drive.durationMs);
}

/** One frame of the queue: settle a finished transition, read the wanted rank, start the next. */
export function stepDrive(
  state: DriveState,
  p: number,
  jump: number | null,
  timeMs: number,
  count: number,
  params: DeckParams = DECK_PARAMS,
): DriveState {
  let { current, transition } = state;
  if (transition && transitionK(transition, timeMs, params) >= 1) {
    current = transition.to;
    transition = null;
  }
  const wanted =
    jump !== null
      ? Math.min(count - 1, Math.max(0, Math.round(jump)))
      : rankFromScroll(p, state.wanted, count, params.drive.hysteresis);
  if (!transition && wanted !== current)
    transition = { from: current, to: wanted, startMs: timeMs };
  if (current === state.current && wanted === state.wanted && transition === state.transition)
    return state;
  return { current, wanted, transition };
}

export function pullsForDrive(
  state: DriveState,
  p: number,
  timeMs: number,
  count: number,
  params: DeckParams = DECK_PARAMS,
): Pulls {
  const pull = new Array<number>(count).fill(0);
  const t = state.transition;
  if (!t) {
    pull[state.current] = 1;
    const within = clamp01(clamp01(p) * count - state.current);
    return { active: state.current, within, pull, from: null, to: null, k: 0 };
  }
  const k = easeInOutCubic(transitionK(t, timeMs, params));
  pull[t.from] = 1 - k;
  pull[t.to] = k;
  const active = k < 0.5 ? t.from : t.to;
  return { active, within: 0, pull, from: t.from, to: t.to, k };
}
```

Note `rankFromScroll`'s hysteresis is anchored on `state.wanted` in `stepDrive` (the last chosen rank), so a scroll parked just past a boundary keeps its choice both ways; the unit tests above pass `current` for the same effect.

- [ ] **Step 3: Params.** Remove `scroll: { tau }` (and its interface, its panel row in `deck-tune.ts`, and any pin in `test/deckParams.test.ts`); add `drive: { durationMs: 900, hysteresis: 0.15 }` with docs ("one rank change plays this long, whatever the wheel does"; "a boundary must be passed by this fraction of a stretch before the rank changes"). Pin both in the params test.
- [ ] **Step 4: The pose model.** In `deck-pose.ts`: delete `pullsFor` and the local `Pulls` (import `Pulls` from `./deck-drive`); `PoseInput` loses `p` and gains `pulls: Pulls`; `deckPose` uses `input.pulls` where it called `pullsFor`; `energyFor(pulls, …)` keeps its signature (the `within` gate `i === pulls.active` still holds: `within` is 0 for an arriving card by construction). `restPose`'s `visibleNext` (the card kept visible at `active + 2` during a handoff) becomes: the card after `pulls.to ?? active` (`(pulls.to ?? active) + 1`) so a direct jump shows the right peeking card on phones. The intro is unchanged (it never read `p`). Export `easeInOutCubic` from the drive or keep the pose's copy (one definition: move the eases used by both into `deck-util.ts` if that is cleaner; do not duplicate).
- [ ] **Step 5: Tests.** `test/deckPose.test.ts`: replace every input built with `p` by a `pulls` from the drive: settled cases use `pullsForDrive(initialDrive(centre(r), 7), centre(r), 0, 7)`; handoff cases use a transition state at a time fraction (the test at line 47 "hands off during the last 30% of a rank" becomes "hands off over the drive's duration, cubic in-out"; the test at 59 "is continuous across the rank boundary" becomes "is continuous across the transition's end"; "keeps E presented at the top and S+ at the end" stays with settled pulls; the "Finding 1" energy test uses a transition 5 → 6). Every other assertion keeps its meaning. `test/deckDrive.test.ts` from Step 1 passes.
- [ ] **Step 6: Gate and commit**

```bash
pnpm format && pnpm lint && pnpm check && pnpm test
git add src/scripts/deck/deck-drive.ts src/scripts/deck/deck-pose.ts src/scripts/deck/deck-params.ts src/scripts/deck/deck-tune.ts src/scripts/deck/deck-util.ts test/deckDrive.test.ts test/deckPose.test.ts test/deckParams.test.ts
git commit -m "deck: the drive owns the rank; the pose model takes pulls, not progress"
```

(`pnpm check` will fail in `deck-stage.ts` until Task 2 wires the drive; if so, Task 1's gate runs `pnpm vitest run` and `pnpm lint` only, and the commit message says "stage follows in the next commit"; Task 2's gate is the full one. Prefer keeping the stage compiling by making Task 1 also do Task 2's minimal wiring if the implementer can; the reviewer accepts either as long as the two commits land back to back.)

---

### Task 2: The stage on the drive; instant jumps; `deck-k`

**Files:**

- Modify: `src/scripts/deck/deck-stage.ts`, `src/scripts/deck/index.ts`, `src/scripts/deck/deck-rail.ts`, `src/scripts/deck/deck-util.ts` (`parseFreeze` gains `k`), `test/deckUtil.test.ts` (if it exists; else the freeze parsing test that exists)

- [ ] **Step 1: Freeze parsing.** `parseFreeze(search)` returns `{ time, k }` with `k = null` unless `deck-k` is a number in [0, 1]. Test it.
- [ ] **Step 2: The stage.**
  1. State: `let drive = initialDrive(targetP, N, params);` created after the first `setProgress` (in `setProgress`, when `!firstFrameDone`, re-initialise `drive` from the new `targetP` so a deep link mounts settled); `let pendingJump: number | null = null;`.
  2. `frame()`: replace `p = smooth(p, targetP, …)` and the freeze `p = targetP` with:
     ```ts
     if (freeze) {
       drive = initialDrive(targetP, N, params);
       if (freeze.k !== null && drive.current > 0)
         drive = {
           ...drive,
           transition: {
             from: drive.current - 1,
             to: drive.current,
             startMs: time - freeze.k * params.drive.durationMs,
           },
         };
     } else {
       drive = stepDrive(drive, targetP, pendingJump, time, N, params);
       pendingJump = null;
     }
     const pulls = pullsForDrive(drive, targetP, time, N, params);
     ```
     and `poseInput = { pulls, labels, layout, tilt: input.tilt, hover: input.hover, time, landedAt, intro }`. Under freeze the render still happens once; `deck-k` gives a deterministic mid-transition frame (the `startMs` arithmetic makes `transitionK` equal `k`).
  3. The loop must keep rendering while a transition runs even if nothing else changes: `requestRender()` is already continuous while visible; confirm the loop does not idle when `targetP` is unchanged (it is continuous per spec §7).
  4. `emitState`: `rank: labels[pulls.active]`; `phase` as before (the card with the largest pull).
  5. `StageHandle.jumpTo(rank)`: sets `pendingJump = rank` and `requestRender()`.
  6. Remove `smooth`'s import if now unused; `p` the smoothed variable goes.
- [ ] **Step 3: The page script and rail.** `deck-rail.ts`'s `scrollToRank` scrolls with `behavior: "instant"` always (the drive animates; a smooth page scroll would step the wanted rank through the ranks between). `index.ts`'s `jump(index)` calls `handle?.jumpTo(index)` before `scrollToRank` so the transition starts this frame; the swipe's clamp and the click path are unchanged. The rail's `--progress` still follows the scroll.
- [ ] **Step 4: Gate.** `pnpm format && pnpm lint && pnpm check && pnpm test && pnpm build && pnpm size && pnpm test:e2e`. Expect e2e changes: the rail-click and racked-click tests still pass (they wait for the rank); "advances 7 ranks" passes (each scroll stop crosses a threshold and the transition settles); if a test depends on scrubbing timing, do not edit it here: report it for Task 6 with the assertion. Visual: `pnpm test:visual` once; the frozen frames at rank centres are settled poses and must be unchanged (the drive at a centre equals the old `p` at a centre); if a frame differs, stop and report NEEDS_CONTEXT with the diff path.
- [ ] **Step 5: Commit** `deck: scroll picks the rank, transitions play in full, jumps open the card directly`.

---

### Task 3: The floor, the shadows and the point light go

**Files:**

- Modify: `deck-stage.ts` (floor mesh, its intro draw-in, `floorY` in `effects.setLayout`), `deck-effects.ts` (the two shadow sprites, `placeShadow`, `SHADOW_Z`, `SHADOW_VISIBLE_MIN`, the point light, `LIGHT_AHEAD`, the light's per-frame block, `EffectsLayout.floorY`), `deck-energy.ts` (`shadowFor`, `pointLightIntensity`, `breath` removed), `deck-pose.ts` (`IntroPose.floor` removed), `deck-layout.ts` (`floorY`, `layout.floorOffset` removed; racked `y` unchanged), `deck-params.ts` (`shadow`, `light.pointS/pointSPlus/breath/breathMs` removed; `light.flareS/flareSPlus/flareMs` stay for the glow/fog flare), `deck-paint.ts` (nothing to remove if `paintRadial` is still used by the aura in Task 4; confirm), `deck-tune.ts` (rows), tests (`deckEnergy`, `deckLayout`, `deckPose`, `deckParams`, `deckPaint` if it pinned the shadow texture)

- [ ] **Step 1: Tests first.** Remove the tests for the removed functions; add one assertion in `test/deckLayout.test.ts` that the layout has no `floorY` (a type-level removal makes this a compile check: skip the runtime test), and in `test/deckPose.test.ts` that `intro` no longer reports `floor`.
- [ ] **Step 2: Remove.** The floor mesh and `scene.add(floor)`, the per-frame floor scale, its dispose; `effects.setLayout` loses `floorY`; the shadows' construction, placement and dispose; the point light's construction, `layers.enable`, per-frame position/intensity, dispose; the `breath` call; `EffectsLayout.floorY`. Keep `flare` (its `.glow` feeds the aura in Task 4; `.fog` the fog); drop its `.light` field.
- [ ] **Step 3: Gate** `pnpm format && pnpm lint && pnpm check && pnpm test && pnpm build && pnpm size && pnpm test:e2e`; `pnpm test:visual` once: the E, S and S+ frames change (no floor line, no shadow, no light highlight): report the diffs, do not update baselines (Task 7 does).
- [ ] **Step 4: Commit** `deck: the cards float — no floor line, no contact shadows, no point light`.

---

### Task 4: The aura, the glow fade, smoke on the landed card, the fog scaled with the card

**Files:**

- Modify: `scripts/import-portrait.mjs` (`auraMask`, written alongside the glow on import), Create: `scripts/aura-mask.mjs` (regenerates `<id>-aura.webp` from the imported `src/images/deck/<id>.webp` without re-encoding the portrait; CLI `node scripts/aura-mask.mjs <stage-id>|--all`), `test/importPortrait.test.ts` (aura tests), the seven `src/images/deck/<id>-aura.webp` (generated by the implementer with `--all`), `src/data/deckImages.ts` (`deckAura`), `src/components/journey/Journey.astro` (`data-aura` rendition, 400 px), `src/scripts/deck/index.ts` (`StagePortrait.aura`), `deck-stage.ts` (load the aura like the glow: `effects.setAura(i, img)`), `deck-effects.ts` (the aura plane per card; the halo sprite and `spriteBehind` removed; the glow plane's alphaMap through `paintMaskFaded`), `deck-energy.ts` (`auraOpacity`, `smokeActive`, `fogFor` with `cardWPx`; `glowSpriteScale` removed), `deck-paint.ts` (`paintMaskFaded`), `deck-params.ts` (`aura` block; `glow.gain` replaces the `GLOW_GAIN` constant; `glow.scale*` removed), `deck-smoke-sprites.ts` (the gate), `scripts/check-bundle-size.mjs` + test (the glow row also measures `data-aura`), `docs/imagery.md` (the aura's recipe), tests (`deckEnergy`, `deckPaint`, `deckParams`, `checkBundleSize`)

- [ ] **Step 1: The aura mask, pure enough to test.** In `scripts/import-portrait.mjs`:

```js
export const AURA = { width: 400, rim: 0.035, tolerance: 14, blur: 3 };

/**
 * The figure's outline as a soft band (deck spec §8 as amended by Plan 5): everything that is not
 * the graphite field, reached by a flood fill from the borders, is the figure; the band is the
 * figure dilated by `rim` of the width, minus the figure, blurred. Single channel, `width` px.
 */
export async function auraMask(input, opts = AURA) {
  const { data, info } = await sharp(input)
    .resize({ width: opts.width, withoutEnlargement: true })
    .flatten({ background: "#000" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const isField = (i) =>
    Math.abs(data[i] - KEY.fill[0]) <= opts.tolerance &&
    Math.abs(data[i + 1] - KEY.fill[1]) <= opts.tolerance &&
    Math.abs(data[i + 2] - KEY.fill[2]) <= opts.tolerance;
  // Flood fill the field from the borders, so field-coloured pixels inside the figure stay figure.
  const field = new Uint8Array(width * height);
  const stack = [];
  const push = (x, y) => {
    const n = y * width + x;
    if (field[n] || !isField(n * 3)) return;
    field[n] = 1;
    stack.push(n);
  };
  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }
  while (stack.length) {
    const n = stack.pop();
    const x = n % width;
    const y = (n - x) / width;
    if (x > 0) push(x - 1, y);
    if (x < width - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < height - 1) push(x, y + 1);
  }
  const figure = new Uint8Array(width * height);
  let figurePx = 0;
  for (let n = 0; n < figure.length; n++)
    if (!field[n]) {
      figure[n] = 255;
      figurePx++;
    }
  // Dilate by a disc of radius `rim × width` (separable approximation: a square, then the blur rounds it).
  const r = Math.max(1, Math.round(opts.rim * width));
  const dilated = dilate(figure, width, height, r);
  const band = Buffer.alloc(width * height);
  for (let n = 0; n < band.length; n++) band[n] = dilated[n] && !figure[n] ? 255 : 0;
  const mask = await sharp(band, { raw: { width, height, channels: 1 } })
    .blur(opts.blur)
    .raw()
    .toBuffer();
  return { mask, width, height, figureShare: (100 * figurePx) / (width * height) };
}

function dilate(src, width, height, r) {
  const rows = new Uint8Array(width * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      let hit = 0;
      for (let dx = -r; dx <= r && !hit; dx++) {
        const xx = x + dx;
        if (xx >= 0 && xx < width && src[y * width + xx]) hit = 255;
      }
      rows[y * width + x] = hit;
    }
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      let hit = 0;
      for (let dy = -r; dy <= r && !hit; dy++) {
        const yy = y + dy;
        if (yy >= 0 && yy < height && rows[yy * width + x]) hit = 255;
      }
      out[y * width + x] = hit;
    }
  return out;
}
```

`importPortrait` also writes `<id>-aura.webp` (lossless-ish: `.webp({ quality: 90 })`, single channel via `toColourspace("b-w")`) and returns it in `files`; `scripts/aura-mask.mjs` reads `src/images/deck/<id>.webp` and writes only the aura file (and `--all` loops the seven ids from `src/data/deck-glow-bands.json`). Tests in `test/importPortrait.test.ts`: a synthetic 900 × 600 PNG with a graphite `#191919` field and a `#2b2724` figure rectangle at (300,150)–(600,600) (reuse the white-field test's SVG without the white): `auraMask` returns width 400; `figureShare` ≈ (300 × 450)/(900 × 600) × 100 within ±1; the mask is 0 at the figure's centre (200, 250 in mask px) and at (20, 20), and > 40 at a point 6 px outside the figure's left edge (about (128, 250)); a second test: a figure with a field-coloured hole inside stays figure (the hole is not reached by the flood fill).

- [ ] **Step 2: Generate the seven masks** with `node scripts/aura-mask.mjs --all`, look at two of them (`sharp` to PNG in the job temp dir and Read), and record their sizes (each ≤ 10 KB) in the report.
- [ ] **Step 3: Data and component.** `deckImages.ts`: `deckAura(id)`. `Journey.astro`: a fourth `getImage` (400 px WebP) → `data-aura` on the rail button. `index.ts`: `StagePortrait.aura`. `check-bundle-size.mjs`: the glow row's file set includes `data-aura` URLs (name it "Portrait masks (max)"), test updated.
- [ ] **Step 4: The fade painter** (`deck-paint.ts`):

```ts
/** Draws a mask image over the whole canvas and fades it out from `fadeFrom` of the height to the
 *  bottom, so no glow sits on the name plate (spec §8 as amended by Plan 5). */
export function paintMaskFaded(
  ctx: Ctx,
  image: CanvasImageSource,
  w: number,
  h: number,
  fadeFrom: number,
): void {
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(image, 0, 0, w, h);
  ctx.globalCompositeOperation = "destination-in";
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "rgba(0,0,0,1)");
  g.addColorStop(Math.max(0, Math.min(1, fadeFrom)), "rgba(0,0,0,1)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "source-over";
}
```

with a `test/deckPaint.test.ts` case on the fake context: one `drawImage`, then a `fillRect` under `destination-in` with a gradient (the fake records `globalCompositeOperation`; if it does not, add the field to `Op` and the recorder), and the operation restored to `source-over`.

- [ ] **Step 5: Effects.**
  1. The glow plane's `setGlow(index, image)` paints the image through `paintMaskFaded` into a canvas at the image's size (`fadeFrom = params.aura.fadeFrom`) and uses that canvas as the `alphaMap` (keep `coverFit`).
  2. `setAura(index, image)`: a second plane per card, built in `attach` like the glow plane (same geometry, `MeshBasicMaterial({ color: COLORS.violet, transparent: true, depthWrite: false, blending: AdditiveBlending })`, `layers.enable(BLOOM_LAYER)`), its `alphaMap` the aura mask through `paintMaskFaded`, placed and cover-fitted with the glow plane in `placeCard`, opacity per frame `Math.min(1, auraOpacity(kind, energy, fl.glow, P) * P.glow.gain)` for the energetic card only (hidden otherwise), visibility rule like the glow plane's.
  3. Remove the halo sprite (`spriteMat`, `sprite`, `spriteBehind`, `SPRITE_CLEARANCE`, `glowTexture` if only the sprite used it) and `GLOW_GAIN` (use `params.glow.gain`).
  4. `energy`: `auraOpacity(kind, energy, flareGlow, P) = kind === "S" ? P.aura.s × energy / P.energy.s × flareGlow : kind === "S+" ? (P.aura.sPlusBase + P.aura.sPlusRamp × energy) × flareGlow : 0`, clamped to 1; tests (0 without a kind; S at its full energy gives `aura.s`; S+ ramps; the flare multiplies).
  5. `smokeActive(phase)` gates emission in `deck-smoke-sprites.ts` (bursts stay on landing); `fogFor(kind, energy, kick, cardWPx, params)` multiplies the radius by `proportion(cardWPx)`; the effects pass `L.cardWPx`. Tests as in the plan this replaced (`fogFor` at 260 keeps the spec's numbers; 520 doubles the radius; `smokeActive` true only for landing and presented).
  6. `estimateBytes` counts the aura textures; `dispose` disposes them.
- [ ] **Step 6: Params.** `aura: { s: 0.45, sPlusBase: 0.55, sPlusRamp: 0.45, fadeFrom: 0.72 }` (docs: the S aura's opacity at S's energy; the S+ base and ramp; the fraction of the portrait window where the fade to nothing begins); `glow: { gain: 1.2, flareScale: 1.4 }`; pins in the params test.
- [ ] **Step 7: Gate** `pnpm format && pnpm lint && pnpm check && pnpm test && pnpm build && pnpm size && pnpm test:e2e`; `pnpm test:visual` once, report the S/S+ diffs (do not update).
- [ ] **Step 8: Commit** `deck: the aura hugs the figure, the glow fades above the name plate, the halo and the wandering light are gone`.

---

### Task 5: The tear, reproduced and fixed

**Files:**

- Create: `scripts/deck-tear.mjs`
- Modify: `src/scripts/deck/deck-textures.ts` (text slots on CPU-backed canvases, no mipmaps, linear filter), `src/scripts/deck/deck-stage.ts` (the canvas/texture factories take a `kind`), `package.json` (`"tear:deck": "node scripts/deck-tear.mjs"`), `CLAUDE.md` Commands (one bullet)

- [ ] **Step 1: The harness.** `scripts/deck-tear.mjs`: starts the production server on 4394 (the `build-og.mjs` pattern), launches **headed** Chromium (`--headless` flag optional, with a note that the tear needs the real GPU), 1440 × 900, forces the high tier through the init script, opens `/`, and three times: scrolls to rank E's centre, waits for `data-deck-ready`, starts a CDP screencast (`Page.startScreencast`, `format: "png"`, `everyNthFrame: 1`, `maxWidth: 1440`), jumps to rank S (`scrollTo` the S centre instantly; the drive plays the transition and the print-in), collects frames for 2.5 s, stops the screencast. For each frame decode the PNG with `sharp`, crop the presented card's portrait window (the box from `[data-deck-gl]`'s rect and the layout: the implementer reads `data-deck-slots`? No: take the right 40 % of the stage and the top 55 % of it, which contains the presented card's portrait on desktop), downsample to 64 × 64 grey, and flag a frame as torn when its mean absolute difference from **both** neighbours exceeds 12/255 while the neighbours differ from each other by less than 4/255 (a one-frame excursion). Print per run: frames captured, torn frames, and the indices; save torn frames as PNGs to `/tmp/deck-tear/`. Exit 1 if any run has a torn frame.
- [ ] **Step 2: Reproduce.** `pnpm build && pnpm tear:deck` on the dev Mac (headed). Record the numbers in the report. If zero torn frames appear in three runs, run three more; if still zero, report NEEDS_CONTEXT (the controller reproduces with Marcus's steps) before changing code.
- [ ] **Step 3: The fix.** The text slots' canvases are created with `getContext("2d", { willReadFrequently: true })` (CPU raster, so a repaint is complete before WebGL reads it) and their textures skip mipmaps (`generateMipmaps = false`, `minFilter = LinearFilter`) since the text is drawn at its on-screen size; the factories in the stage take a `kind: "text" | "art"` argument and `deck-textures.ts` passes it for the slots. Comment why in both places. Nothing else changes.
- [ ] **Step 4: Verify.** `pnpm build && pnpm tear:deck`: zero torn frames in three runs. Then `pnpm test:visual` once (the frozen frames print the whole text at once, unchanged).
- [ ] **Step 5: Gate and commit** `pnpm format && pnpm lint && pnpm check && pnpm test && pnpm build && pnpm size && pnpm test:e2e`; commit `deck: the text slots paint on CPU canvases without mipmaps, so the print-in cannot tear the portrait`.

---

### Task 6: E2E for the new model

**Files:** `e2e/journey.spec.ts`.

- [ ] **Step 1: Tests** (desktop unless noted; helpers: `scrollToRank`, `ready`, `track`, `scrollToEnd`):
  1. **A threshold crossing plays in full without more scrolling:** at E, scroll to `(1 + 0.4) / 7` of the span in one instant `scrollTo` (past the boundary and the hysteresis), then poll `data-deck-rank` → "D" and `data-deck-phase` → `landing|presented` within 2.5 s; assert `data-deck-phase` is never `pulling` for longer than 1.5 s (poll every 100 ms and count).
  2. **Nothing between on a jump:** at E, install a MutationObserver on `data-deck-rank` (`page.evaluate` storing to `window.__ranks`), click the S+ rail chip, wait for "S+", read `__ranks`: exactly `["S+"]` (the attribute changes once, at the transition's midpoint; no D, C, B, A or S).
  3. **A racked-card click is direct too:** the existing racked-click test additionally asserts the recorded ranks contain only the target.
  4. **Scrolling ahead during a transition queues one direct transition:** at E, instant-scroll to D's centre, wait 200 ms, instant-scroll to A's centre; the recorded ranks are `["D", "A"]` (not C, B).
  5. **A parked scroll never shows a half card:** scroll to exactly the E|D boundary (`1/7`), wait 1.5 s: `data-deck-rank` is "E" and `data-deck-phase` is `presented` (hysteresis holds E); scroll to `(1 + 0.3)/7`: rank becomes "D" and settles.
  6. **Energy still ramps inside S+:** unchanged test, plus at `(6 + 0.1)/7` energy ≤ 0.5 and at the end ≥ 0.95.
  7. **The mid-transition frozen frame:** `/?deck-freeze=2026-09-25&deck-k=0.5` scrolled to S+'s centre renders with `data-deck-phase` `pulling` or `leaving` and both text slots live (`data-deck-slots` names two on desktop); on the 2560 × 1440 dpr-2 context this is the frame whose `data-deck-vram` ≤ 80 is asserted (replacing the handoff test if one exists).
  8. Phone (`pixel-7`): a swipe from C lands B with recorded ranks `["B"]`; the tap on the peeking card is direct.
  9. Remove or rewrite any test that asserted the riffle (none is expected: the inventory found none).
- [ ] **Step 2: Run** the desktop and pixel-7 projects while iterating, then `pnpm build && pnpm test:e2e`. Do not edit `src/`; a failure that needs code is NEEDS_CONTEXT with the observed values.
- [ ] **Step 3: Commit** `e2e: the drive — full transitions, direct jumps, the queue, the parked scroll, the frozen mid-transition`.

---

### Task 7: The tuning session (controller + Marcus) and the baselines

Protocol as in the previous Plan 5 draft: the controller runs the branch's dev server on 4396; Marcus opens `http://localhost:4396/?tune` (the panel gains rows for `drive.durationMs`, `drive.hysteresis`, `aura.s`, `aura.sPlusBase`, `aura.sPlusRamp`, `aura.fadeFrom`, `glow.gain`, `bloom.strength`, `fog.strengthSPlus`, `fog.radiusSPlusRamp`, `smoke.rateSPlusBase`; the rows for the removed params go), tunes, copies the JSON, pastes it; the controller applies the changed values, pins the changed defaults in the params test, regenerates the six baselines (`pnpm build && pnpm test:visual --update-snapshots`, then twice plain), inspects the S and S+ frames for readability and the aura, and commits `deck: the review session's values and the baselines that show them`. Marcus's decisions on the table: the transition duration (900 ms proposed), the aura's strength, the S+ readability (the fade point), whether the S+ flames in the painted art should also be masked down (the portrait would need a re-import with the flames toned down: a Plan 6 item if wanted).

---

### Task 8: The record

**Files:** the spec (§2 Navigation row: "a click or swipe opens the card directly"; §6: the floor-line sentences replaced by "the racked cards stand 30 px below the presented card's baseline; nothing is drawn under them"; §7 Progress and Pose model rewritten for the drive: rank from scroll with hysteresis, one transition of `drive.durationMs`, cubic in-out pulls `1 − ease(k)`/`ease(k)` on `from`/`to`, `within` from the scroll once settled, `deck-k` under freeze, "a jump is one transition to the target"; §8: the aura paragraph replaces the sprite, the point light and contact shadow paragraphs are removed, the glow fade above the name plate is stated; §9: `deck-k`; §12: the e2e lines from Task 6 replace "clicking the stage where the B card sits jumps to B" with "…opens B directly"), CLAUDE.md (the Journey bullets: "scroll picks the rank, a change plays as one transition; clicks and swipes open the card directly"; Commands: `pnpm tear:deck`), `docs/imagery.md` (the aura's recipe under the Card deck section and the seven masks' sizes), this plan (Execution notes).

- [ ] **Step 1: Edits**, `pnpm format`, re-read, edit.
- [ ] **Step 2: Full gate** `pnpm format && pnpm lint && pnpm check && pnpm test && pnpm build && pnpm size && pnpm test:e2e && pnpm test:visual`.
- [ ] **Step 3: Commit** `docs: the deck's drive, aura and floating cards in the spec, CLAUDE.md and the imagery record`.
- [ ] **Step 4: Hand back.** The controller: the browser check at 1440 and 390 (transitions, a click jump, S and S+ readability, the aura, no floor, no highlight), `pnpm tear:deck` headed once more, screenshots for Marcus, the Build Log, local main, the push.

## Self-review

- **Coverage of Marcus's review.** Distortion: the tear (Task 5) and the flat card in the rack (gone with the drive: a pulled card's rotation lead is now inside one 900 ms transition, never parked). Direct open on click: Tasks 1, 2, 6. S+ readability: Task 4's fade and gain, Task 7's tuning. Aura on the outline: Task 4. No horizontal line: Task 3. No wandering purple dot: Task 3. Slower, fluid swaps: `drive.durationMs` (Tasks 1, 7). No in-between states and queued full transitions: Tasks 1, 2, 6.
- **Placeholders.** None; Task 7 is a protocol by design.
- **Type consistency.** `Pulls` (from, to, k, active, within, pull[]) shared by the drive, the pose and the energy; `PoseInput.pulls`; `Freeze.k`; `StageHandle.jumpTo`; `auraOpacity(kind, energy, flareGlow, params?)`; `paintMaskFaded(ctx, image, w, h, fadeFrom)`; `auraMask(input, opts?)`; `EffectsLayout` without `floorY`.
- **Review Focus** → 1: Tasks 1, 6; 2: Tasks 1, 6; 3: Tasks 4, 7; 4: Task 4 and the browser check; 5: Task 5.
- **Risk.** Task 1's pose refactor touches every pose test; the drive's `active` flips at `k = 0.5`, which moves the rank label mid-transition (intended: the rail lights the target early). Task 5 depends on reproducing on a real GPU; the harness runs headed on the dev Mac. Task 4's flood fill assumes the graphite field reaches every border; a portrait whose figure touches the bottom edge (the busts do) still keys, because the fill only needs the field's connected region.

## Execution notes

### Task 1–2 (The drive and the pose)

Commits: 23fa1e7, 85a6f3f (implementer), 4835a0c, a869d2e (fix round 2). 480–490 tests; pose ≤ 375, drive ≤ 159, stage ≤ 640. `Pulls` includes `fromWithin`: the leaving rank's within at the transition's start, kept across frames when the scroll changes between motion callbacks, so the leaving card's energy continues from what was drawn rather than jumping if a jump lands in between. Fix round 2: backward multi-rank phone test added, `deck-k` equates `transitionK` result, `stepDrive` accepts optional `drawnWithin` parameter. Parked: `pull.handoffStart` has no runtime consumer (drop the param and its tune row); swipes step from `presented` (which flips mid-transition), so two swipes in the first half collapse into one (watch in Task 7).

### Task 3 (Removing the floor, lights and shadows)

Commit: 397f853 (implementer). 475 tests; stage 629, effects 418. `EffectsLayout` loses `floorY`, the intro draw-in sentence about the floor line, `paintRadial` (unused after removing the halo and shadows). Parked: `intro.floorMs` is unreferenced (remove in the final wave).

### Task 4 (The aura and the glow fade)

Commits: 0f8853f (implementer, attempt 1), a0e6d7e (fix round 1), 408d6d3 (fix round 2, implementer). 487–492 tests; effects 464, energy 167. The colour flood approach (round 0 and 1) failed on S and S+ because black cloth and graphite field sit at equal tones. Controller's ruling: Higgsfield background remover on all seven portraits (jobs run 2026-09-26); the alpha channel is the silhouette. `aura-mask.mjs` generates masks from the committed silhouettes (rim 0.025, blur 3, at 400 px); importPortrait no longer writes auras. `paintMaskFaded` darkens RGB to black from fadeFrom (0.72) to fadeTo (0.9) under source-over so the title and name plate stay readable. Aura planes only on kinds that show one (S, S+); E–A load no aura. Parked: the fadeTo tune row is inert until remount (a Plan 6 tuning decision: clamp or regen); the dilate disc is square not round (√2 × rim on diagonals, test and regenerate later); E–A aura fetches can be gated once Task 5 frees stage lines; imagery.md naming and the masking history.

### Task 5 (The tear harness and the fix)

Commits: b71c403 (implementer), 5b4fff5 (fix round 1), 609c647 (fix round 2, controller). 498 tests; harness 280 lines. The pre-Plan-5 recording showed slab-across-face tear during transitions (GPU hazard, not a texture seam). Harness built to verify: 64×64 blocks, per-block mean |Δ| > 12/255 vs both neighbours (which differ < 4/255). Tear did not reproduce on the drive build; Marcus's recording predates Plan 5. Fix: text slots on CPU-raster canvases (`willReadFrequently: true`, no mipmaps) in `deck-canvas.ts`. Draw policy (`drawPolicy(phase)` in `deck-pose.ts`, applied in `deck-cards.ts`): pulling/landing at order 3 no depth-test, leaving at order 2, presented at order 1 with depth-test, others at order 0. Parked: the detector's sensitivity to fast motion (residual flags in verify runs are motion, not tears); the FROZEN constant reuse in e2e.

### Task 6 (E2E for the drive model)

Commit: 7cd6d7f (implementer). 383 e2e tests. Model tests for hysteresis, transitions, queued jumps, parked scroll (settled by hysteresis), energy ramp. Data-deck-slots clarification: the seven rack anchors, not the live text slots (the plan text was wrong; the test is correct). Parked: reuse FROZEN constant in e2e specs; the frozen URL assignment at e2e/journey.spec.ts:687.

### Task 7 (Tuning and baselines)

Commit: 817a1d8 (controller). Five panel rows added (`drive.durationMs`, `drive.hysteresis`, `aura.s`, `aura.sPlusBase`, `aura.fadeFrom`), dead `pull.handoffStart` row dropped, six baselines regenerated (S, S+, and iphone-15 variants on desktop; visual passes twice). S reads with a thin violet rim, S+ readable with flames blooming above the name plate, floating cards present, phone matches.

### Parked for Plan 6

From the ledger:

- `intro.floorMs` param (dead, unused).
- `pull.handoffStart` param and its tune row (dead, no consumer).
- Swipes from `presented` step (watch for collapse in first half of transition).
- `aura.fadeTo` tune row inert until remount (tuning decision: clamp or re-bake).
- Square dilate (diagonals get √2 × rim; test and regenerate masks if changed).
- Aura fetches on E–A cards (gate once Task 5 frees stage lines).
- Detector sensitivity to fast motion (watch in future sessions).
- FROZEN constant reuse in e2e.
- Imagery.md aura masking history (complete the record).
