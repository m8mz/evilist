# Journey Deck, Plan 2: The Stage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the card deck on the home page: a lazily loaded Three.js stage that racks seven laminated card meshes, deals them in, pulls the current rank out as the visitor scrolls, prints its stats, floats and tilts it, and hands everything back to the timeline when WebGL is missing. Desktop first; the phone layout's gestures, the energy (smoke, fog, bloom, seams) and the tuning session are Plans 3–5.

**Architecture:** Spec Phase 3. `Journey.astro` renders the stage's DOM contract (a full-bleed canvas, the centred layout column, the rank rail, the counter, the hint, an aria-live region, and the timeline as the accessible twin). `src/scripts/deck/index.ts` runs in the page's initial bundle: it decides the device tier, binds Motion's `scroll()`, prefetches the stage chunk after the first scroll, mounts it when the journey is on screen, and mirrors the stage's state into data attributes and the rail. `deck-stage.ts` (a dynamic import, so Three.js never enters the initial graph) owns the renderer, the card meshes and their painted layers (`deck-textures.ts` paints through Plan 1's `deck-paint.ts`), the environment map (`deck-env.ts`), the lights, the render loop that feeds Plan 1's `deckPose` and applies its output, hit testing, and context-loss handling. `deck-tune.ts` is a dev-only panel bound to `DECK_PARAMS`.

**Tech Stack:** Astro 7, TypeScript 6, Three.js 0.186 with `@types/three`, Motion 13.4 (`scroll()`), vitest 5, Playwright 1.63.

**Spec:** `docs/superpowers/specs/2026-09-25-journey-card-deck-design.md`, §3, §5–§9, §11–§14. **Depends on:** Plan 1 (`2026-09-25-journey-deck-1-foundations.md`) merged into the branch: `career.ts` helpers, `src/data/deck.ts`, `src/scripts/deck/{deck-params,deck-layout,deck-pose,deck-paint}.ts`, `src/images/devil-mark.svg`.

## Global Constraints

- pnpm only; the only lockfile is `pnpm-lock.yaml`. `minimumReleaseAge` rejects releases younger than 24 h: if `three@0.186.1` is refused, pin `0.186.0` (and `@types/three@0.186.0`), never add an exclusion. Pin exact versions (`-E`).
- Branch `journey-card-deck` in this worktree. Every commit is GPG-signed through Marcus's global git config; if signing fails, STOP and report BLOCKED; never pass `--no-gpg-sign`. No AI attribution anywhere. Never `git stash`; never push.
- Before every commit: `pnpm format && pnpm lint && pnpm check && pnpm test`, `0 errors` from check. `pnpm build && pnpm size` at Tasks 9, 12 and 14. E2E (`pnpm build && pnpm test:e2e`) at Task 13. The suite stays green after every task.
- CSP: no inline `style=` attributes, no `is:inline` scripts, keep `build.inlineStylesheets: "never"` and `trailingSlash: "never"`. CSSOM writes (`el.style.setProperty`, `el.style.cursor`) are fine; the canvas is drawn by WebGL, not by CSS.
- Budgets: initial JS on `/` ≤ 100 KB gz; the deck chunk (`deck-stage` and anything Three.js) ≤ 170 KB gz and never in the initial graph; Motion ≤ 30 KB gz; fonts 20–120 KB; zero third-party requests (Three.js ships from our bundle, never a CDN).
- Colour management is non-negotiable: `NoToneMapping`, `SRGBColorSpace` output, every painted texture tagged sRGB, faces on the emissive recipe (spec §8). Every hex in `src/scripts/deck/` is a token or violet (`test/deckPalette.test.ts` extends to the new files).
- Visibility only, never `display`, for any switch that can happen while the section is pinned. The fallback swap collapses the track, and may only happen at script start or after a context loss.
- Stage ids in rank order: `t1-support`, `web-concierge`, `professional-services`, `t3-support`, `sysadmin`, `linux-engineer`, `systems-architect`. Ranks `E D C B A S S+`.
- World units: 100 CSS px per unit. The stage converts Plan 1's px poses with `x / 100`, `−y / 100` (y down in px, up in world) and `z / 100`; rotations degrees → radians, `rotation.set(rotX, rotY, rotZ)` in Three's convention (positive `rotation.y` turns the card's right edge away from the camera).
- `src/fetch.ts` is reserved by Astro 7: never create it.

## Review Focus

1. **The stage mounts while the visitor is already deep in the track** (a deep link to `#journey` then a fast scroll, or a slow chunk): the first frame must paint the current rank presented, with its text already printed, no intro and no riffle from E. Pinned in Task 8 (the mount path sets progress before the first frame and skips the intro when `p ≥ 0.5 / 7`) and in the e2e "a stage that arrives late paints the rank the visitor is on" (Task 13).
2. **WebGL context lost and not restored** (GPU reset, too many contexts, a tab backgrounded for a day): within 2 s the track must collapse and the timeline show, with no console error and nothing left pinned. Pinned in Task 8 (the handler) and the e2e forced-loss test (Task 13).
3. **A portrait that never arrives** (404, a blocked request): the card stays on the placeholder, `data-deck-ready` still fires, and nothing retries in a loop. Pinned in Task 7 (textures) and Task 8 (the loader resolves on error).
4. **Resizing while presented** (a window drag, a phone rotation): the card must not jump size mid-animation, textures must repaint only when the card's size changes by more than 10 %, and the camera must keep the stage's exact height. Pinned in Task 8 (the resize path) and the e2e resize test (Task 13).
5. **Two cards' text at once** (a fast handoff S → S+ while S's print-in is still running): the text slots must never show S's lines on S+'s card. Pinned in Task 7 (slot ownership tests).

## Deviations from the spec, decided while planning

- The rail is a `<div role="toolbar">` of `<button>`s rather than an `<ol>`: a list with the toolbar role loses its list semantics and confuses screen readers. `aria-pressed` marks the presented rank.
- The fallback attribute lives on the deck's own root (`[data-deck-root]`) rather than on the `<section>`, so the component's scoped CSS can react to it. Same behaviour.
- ADR 0004 is written in this plan (Task 14), not in Phase 6: Three.js enters the codebase here, so the decision record lands with it.
- In freeze mode the track also exposes `data-deck-slots` (the racked cards' stage px centres) so Playwright can click a specific card without knowing the layout maths.
- `src/components/journey/silhouette.svg`, `src/scripts/{journey,avatar,scene}.ts` and `test/{avatar,scene}.test.ts` go in Task 11 (the spec's Phase 3 deletions); the art pipeline, `scene.svg`, `avatarRig` and their tests stay for Phase 6.

## The DOM contract (written by Task 9, read by Tasks 8, 10 and 13)

```
<div class="deck" data-deck-root>                       ← [data-deck-fallback] set by JS on fallback
  <div class="wrap"><a class="journey-skip" href="#skills">Skip the career journey</a></div>
  <div class="journey" data-deck data-now="2026-09-25" data-count="7" data-mark="/_astro/devil-mark.HASH.svg"
       data-deck-state="loading">                       ← + data-deck-rank, -phase, -energy, -tier, -vram, -ready, -slots (JS)
    <div class="journey__stage">                        ← sticky, 100dvh − header, full bleed, overflow hidden
      <canvas class="journey__gl" data-deck-gl aria-hidden="true"></canvas>
      <div class="journey__column" data-deck-column></div>   ← min(78%, 1200px) centred; measured, never painted
      <div class="journey__rail" data-deck-rail role="toolbar" aria-label="Ranks">
        <button type="button" class="journey__rank is-reached" data-deck-rank data-index="0" data-stage-id="t1-support"
                data-portrait-1x="/_astro/…" data-portrait-2x="/_astro/…" data-glow="/_astro/…"   ← only when the source exists
                aria-pressed="true" aria-label="Rank E, T1 Tech Support" tabindex="0"> <RankChip sm/> </button>
        … seven buttons; only the presented one has tabindex="0" …
        <span class="journey__track-line" role="presentation"><span class="journey__fill"></span></span>
      </div>
      <p class="journey__counter" data-deck-counter aria-hidden="true">01 / 07</p>
      <p class="journey__hint" data-deck-hint aria-hidden="true">↓ scroll or pick a rank</p>
      <p class="visually-hidden" data-deck-live aria-live="polite"></p>
    </div>
  </div>
  <div class="wrap journey-fallback"><JourneyTimeline now="2026-09-25" /></div>
</div>
```

State attribute values: `data-deck-state` ∈ `loading | intro | scroll | fallback`; `data-deck-rank` ∈ `E…S+`; `data-deck-phase` ∈ `racked | pulling | landing | presented | leaving` (the presented card's phase, `pulling` while a handoff runs); `data-deck-energy` a number rounded to 0.05; `data-deck-tier` ∈ `mid | high`; `data-deck-vram` the texture estimate in MB; `data-deck-ready` present once the first frame after every texture and portrait (or its failure) has rendered.

## File structure

New:

- `src/scripts/deck/deck-tier.ts` — `detectTier(env)`: the device tier from reduced motion, save-data, WebGL2, cores, memory, pointer.
- `src/scripts/deck/deck-util.ts` — `smooth`, `parseFreeze`, `pickRendition`, `mulberry32`, `once`, `idle`.
- `src/scripts/deck/deck-rail.ts` — the rail's pure helpers (`rankAfterKey`, `scrollTargetFor`, `counterText`, `liveText`) and `initRail()`.
- `src/scripts/deck/deck-textures.ts` — `DeckTextures`: the canvases and textures per layer, slot ownership for text, resize, VRAM estimate.
- `src/scripts/deck/deck-env.ts` — `paintEnvironment()`: the dark-studio equirect canvas.
- `src/scripts/deck/deck-stage.ts` — `mountStage()`: the Three.js scene and loop.
- `src/scripts/deck/deck-tune.ts` — the dev-only tuning panel.
- `src/scripts/deck/index.ts` — `initDeck()`: tier, rail, prefetch, mount, scroll binding, state, fallbacks.
- `src/data/deckImages.ts` — `deckPortrait(id)`, `deckGlow(id)` from an `import.meta.glob` of `src/images/deck/*.webp`.
- `docs/decisions/0004-three-js-in-the-journey.md`.
- Tests: `test/deckTier.test.ts`, `test/deckUtil.test.ts`, `test/deckRail.test.ts`, `test/deckTextures.test.ts`, `test/deckEnv.test.ts`, `test/journey.test.ts` (rewritten), `test/ui/Journey.test.ts` (rewritten), `test/ui/JourneyTimeline.test.ts` (extended), `test/checkBundleSize.test.ts` (extended), `e2e/journey.spec.ts` (rewritten), `e2e/visual.spec.ts` (two tests changed).

Modified: `package.json`, `pnpm-lock.yaml`, `astro.config.ts`, `src/components/journey/Journey.astro`, `src/components/journey/JourneyTimeline.astro`, `src/pages/index.astro`, `scripts/check-bundle-size.mjs`, `test/deckPalette.test.ts`, `test/tokens.test.ts` (a comment), `CLAUDE.md`, the spec's status line.

Deleted (Task 11): `src/scripts/journey.ts`, `src/scripts/avatar.ts`, `src/scripts/scene.ts`, `src/components/journey/silhouette.svg`, `test/avatar.test.ts`, `test/scene.test.ts`.

---

### Task 1: Three.js and the italic face

**Files:**

- Modify: `package.json`, `pnpm-lock.yaml`
- Modify: `astro.config.ts` (the `fonts` entry)
- Test: `test/deckDeps.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `test/deckDeps.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const config = readFileSync("astro.config.ts", "utf8");

describe("the deck's dependencies", () => {
  it("pins three and its types exactly, on the same minor", () => {
    const three: string = pkg.dependencies.three;
    const types: string = pkg.devDependencies["@types/three"];
    expect(three).toMatch(/^\d+\.\d+\.\d+$/);
    expect(types).toMatch(/^\d+\.\d+\.\d+$/);
    expect(three.split(".").slice(0, 2)).toEqual(types.split(".").slice(0, 2));
  });

  it("ships JetBrains Mono in normal and italic, 400 and 700, so the card's quote is a real italic", () => {
    expect(config).toMatch(/styles:\s*\["normal",\s*"italic"\]/);
    expect(config).toMatch(/weights:\s*\[400,\s*700\]/);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm vitest run test/deckDeps.test.ts`
Expected: FAIL, `pkg.dependencies.three` is undefined.

- [ ] **Step 3: Add the dependencies**

Run: `pnpm add -E three@0.186.1 && pnpm add -D -E @types/three@0.186.0`
Expected: both land in `package.json` with exact versions. If pnpm refuses `three@0.186.1` for being younger than 24 h, run `pnpm add -E three@0.186.0` instead. Confirm `pnpm-workspace.yaml` is unchanged (no exclusions added).

- [ ] **Step 4: Add the italic style**

In `astro.config.ts`, change the font entry's `styles: ["normal"],` to:

```ts
      styles: ["normal", "italic"],
```

- [ ] **Step 5: Run the tests, then the size check**

Run: `pnpm vitest run test/deckDeps.test.ts && pnpm build && pnpm size`
Expected: PASS; `pnpm size` prints `ok   Fonts (woff2)` with a total between 20 and 120 KB (four woff2 files now, about 85 KB), `ok   Initial JS on / (gz)` unchanged, and no Three.js chunk (nothing imports it yet).

- [ ] **Step 6: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test`

```bash
git add package.json pnpm-lock.yaml astro.config.ts test/deckDeps.test.ts
git commit -m "deck: add three.js and the italic face"
```

---

### Task 2: The device tier

**Files:**

- Create: `src/scripts/deck/deck-tier.ts`
- Test: `test/deckTier.test.ts`

**Interfaces:**

- Produces:

  ```ts
  export type Tier = "none" | "mid" | "high";
  export interface TierEnv {
    reducedMotion: boolean;
    saveData: boolean;
    webgl2: boolean;
    cores: number | undefined;
    memory: number | undefined;
    coarsePointer: boolean;
  }
  export function detectTier(env: TierEnv): Tier;
  export function readTierEnv(win?: Window): TierEnv; // DOM: matchMedia, navigator, a probe canvas
  export function pixelRatioCap(tier: Tier, params?: DeckParams): number; // 2 high, 1.5 mid
  ```

- [ ] **Step 1: Write the failing test**

Create `test/deckTier.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { detectTier, pixelRatioCap, type TierEnv } from "../src/scripts/deck/deck-tier";

const desktop: TierEnv = {
  reducedMotion: false,
  saveData: false,
  webgl2: true,
  cores: 8,
  memory: 8,
  coarsePointer: false,
};

describe("detectTier", () => {
  it("is high on a capable desktop", () => {
    expect(detectTier(desktop)).toBe("high");
  });

  it("is none under reduced motion, save-data, no WebGL2, or a very small device", () => {
    expect(detectTier({ ...desktop, reducedMotion: true })).toBe("none");
    expect(detectTier({ ...desktop, saveData: true })).toBe("none");
    expect(detectTier({ ...desktop, webgl2: false })).toBe("none");
    expect(detectTier({ ...desktop, cores: 2 })).toBe("none");
    expect(detectTier({ ...desktop, memory: 2 })).toBe("none");
  });

  it("is mid on a coarse pointer, four cores or 4 GB", () => {
    expect(detectTier({ ...desktop, coarsePointer: true })).toBe("mid");
    expect(detectTier({ ...desktop, cores: 4 })).toBe("mid");
    expect(detectTier({ ...desktop, memory: 4 })).toBe("mid");
  });

  it("treats a missing cores or memory reading as passing (Safari and Firefox)", () => {
    expect(detectTier({ ...desktop, cores: undefined, memory: undefined })).toBe("high");
    expect(detectTier({ ...desktop, memory: undefined, coarsePointer: true })).toBe("mid");
  });

  it("caps the pixel ratio by tier", () => {
    expect(pixelRatioCap("high")).toBe(2);
    expect(pixelRatioCap("mid")).toBe(1.5);
    expect(pixelRatioCap("none")).toBe(1);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm vitest run test/deckTier.test.ts`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Implement**

Create `src/scripts/deck/deck-tier.ts`:

```ts
// Which deck a device gets (deck spec §8, "Tiers"): none (the timeline), mid (no bloom, a lower
// pixel ratio, half the smoke) or high. Decided once at script start from readings that cost
// nothing; a missing reading never disqualifies a device.
import { DECK_PARAMS, type DeckParams } from "./deck-params";

export type Tier = "none" | "mid" | "high";

export interface TierEnv {
  reducedMotion: boolean;
  saveData: boolean;
  webgl2: boolean;
  cores: number | undefined;
  memory: number | undefined;
  coarsePointer: boolean;
}

export function detectTier(env: TierEnv): Tier {
  if (env.reducedMotion || env.saveData || !env.webgl2) return "none";
  if ((env.cores ?? 8) <= 2 || (env.memory ?? 8) <= 2) return "none";
  if (env.coarsePointer || (env.cores ?? 8) <= 4 || (env.memory ?? 8) <= 4) return "mid";
  return "high";
}

export function pixelRatioCap(tier: Tier, params: DeckParams = DECK_PARAMS): number {
  if (tier === "high") return params.tiers.dprHigh;
  if (tier === "mid") return params.tiers.dprMid;
  return 1;
}

interface NavigatorReadings extends Navigator {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

/** Reads the tier inputs from the browser. A probe canvas answers the WebGL2 question. */
export function readTierEnv(win: Window = window): TierEnv {
  const nav = win.navigator as NavigatorReadings;
  let webgl2 = false;
  try {
    const probe = win.document.createElement("canvas");
    webgl2 = probe.getContext("webgl2", { failIfMajorPerformanceCaveat: false }) != null;
  } catch {
    webgl2 = false;
  }
  return {
    reducedMotion: win.matchMedia("(prefers-reduced-motion: reduce)").matches,
    saveData: nav.connection?.saveData === true,
    webgl2,
    cores: typeof nav.hardwareConcurrency === "number" ? nav.hardwareConcurrency : undefined,
    memory: typeof nav.deviceMemory === "number" ? nav.deviceMemory : undefined,
    coarsePointer: win.matchMedia("(pointer: coarse)").matches,
  };
}
```

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run test/deckTier.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test`

```bash
git add src/scripts/deck/deck-tier.ts test/deckTier.test.ts
git commit -m "deck: the device tier"
```

---

### Task 3: Small pure utilities: smoothing, freeze, renditions, RNG

**Files:**

- Create: `src/scripts/deck/deck-util.ts`
- Test: `test/deckUtil.test.ts`

**Interfaces:**

- Produces:

  ```ts
  export function smooth(current: number, target: number, dtMs: number, tauMs: number): number; // exponential approach; snaps within 5e-4
  export interface Freeze {
    time: number;
  } // ms since the epoch, from the ISO date
  export function parseFreeze(search: string): Freeze | null; // "?deck-freeze=2026-09-25" → { time }
  export function pickRendition(dpr: number, x1: string | null, x2: string | null): string | null;
  export function mulberry32(seed: number): () => number; // deterministic 0–1
  export function once<T extends (...a: never[]) => void>(fn: T): T;
  export function idle(fn: () => void, timeoutMs?: number): void; // requestIdleCallback or setTimeout
  export function nowFrom(iso: string | undefined): Date; // "2026-09-25" → local midnight; invalid → today
  ```

- [ ] **Step 1: Write the failing tests**

Create `test/deckUtil.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  mulberry32,
  nowFrom,
  once,
  parseFreeze,
  pickRendition,
  smooth,
} from "../src/scripts/deck/deck-util";

describe("smooth", () => {
  it("approaches the target exponentially with the time constant", () => {
    expect(smooth(0, 1, 90, 90)).toBeCloseTo(1 - Math.exp(-1), 6);
    expect(smooth(0, 1, 0, 90)).toBe(0);
    expect(smooth(1, 1, 16, 90)).toBe(1);
  });

  it("snaps to the target once within half a thousandth", () => {
    expect(smooth(0.9996, 1, 16, 90)).toBe(1);
    expect(smooth(0.4, 0.4003, 16, 90)).toBe(0.4003);
  });

  it("never moves backwards or overshoots, and survives huge frames", () => {
    expect(smooth(0, 1, 5000, 90)).toBe(1);
    expect(smooth(0, 1, Number.NaN, 90)).toBe(0);
  });
});

describe("parseFreeze", () => {
  it("reads an ISO date into a fixed clock, and ignores anything else", () => {
    expect(parseFreeze("?deck-freeze=2026-09-25")).toEqual({
      time: new Date(2026, 8, 25).getTime(),
    });
    expect(parseFreeze("?tune&deck-freeze=2026-01-02")).toEqual({
      time: new Date(2026, 0, 2).getTime(),
    });
    expect(parseFreeze("")).toBeNull();
    expect(parseFreeze("?deck-freeze=yesterday")).toBeNull();
    expect(parseFreeze("?deck-freeze=")).toBeNull();
  });
});

describe("pickRendition", () => {
  it("takes the 2× file from 1.5× up, the 1× below, and copes with missing files", () => {
    expect(pickRendition(1, "a1", "a2")).toBe("a1");
    expect(pickRendition(1.5, "a1", "a2")).toBe("a2");
    expect(pickRendition(3, "a1", "a2")).toBe("a2");
    expect(pickRendition(2, "a1", null)).toBe("a1");
    expect(pickRendition(1, null, "a2")).toBe("a2");
    expect(pickRendition(1, null, null)).toBeNull();
  });
});

describe("mulberry32", () => {
  it("is deterministic per seed and stays inside [0, 1)", () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    const seq = Array.from({ length: 5 }, () => a());
    expect(Array.from({ length: 5 }, () => b())).toEqual(seq);
    for (const v of seq) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    expect(mulberry32(8)()).not.toBe(seq[0]);
  });
});

describe("once and nowFrom", () => {
  it("runs a function a single time", () => {
    let calls = 0;
    const f = once(() => {
      calls++;
    });
    f();
    f();
    expect(calls).toBe(1);
  });

  it("turns the build date into local midnight, and falls back to today when it is missing", () => {
    expect(nowFrom("2026-09-25").getTime()).toBe(new Date(2026, 8, 25).getTime());
    const today = new Date();
    const fallback = nowFrom(undefined);
    expect(fallback.getFullYear()).toBe(today.getFullYear());
    expect(nowFrom("garbage").getFullYear()).toBe(today.getFullYear());
  });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `pnpm vitest run test/deckUtil.test.ts`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Implement**

Create `src/scripts/deck/deck-util.ts`:

```ts
// Small pure helpers shared by the deck's page script and its stage.

/** Exponential approach toward `target` with time constant `tauMs`; snaps when within 5e-4. */
export function smooth(current: number, target: number, dtMs: number, tauMs: number): number {
  if (!Number.isFinite(dtMs) || dtMs <= 0) return current;
  const next = current + (target - current) * (1 - Math.exp(-dtMs / tauMs));
  return Math.abs(target - next) < 5e-4 ? target : next;
}

export interface Freeze {
  /** The fixed clock, ms since the epoch. */
  time: number;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `?deck-freeze=YYYY-MM-DD` fixes the clock, the RNG and the frame (deck spec §9). */
export function parseFreeze(search: string): Freeze | null {
  const value = new URLSearchParams(search).get("deck-freeze");
  const m = value ? ISO_DATE.exec(value) : null;
  if (!m) return null;
  return { time: new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime() };
}

/** The 2× rendition from 1.5× up, the 1× below, whichever exists. */
export function pickRendition(dpr: number, x1: string | null, x2: string | null): string | null {
  const preferred = dpr >= 1.5 ? x2 : x1;
  return preferred ?? x2 ?? x1;
}

/** A small deterministic RNG (the smoke and the visual baselines rely on it). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function once<T extends (...args: never[]) => void>(fn: T): T {
  let done = false;
  return ((...args: never[]) => {
    if (done) return;
    done = true;
    fn(...args);
  }) as T;
}

/** Runs `fn` when the browser is idle, or after `timeoutMs` at the latest. */
export function idle(fn: () => void, timeoutMs = 1500): void {
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
  };
  if (typeof w.requestIdleCallback === "function")
    w.requestIdleCallback(fn, { timeout: timeoutMs });
  else setTimeout(fn, 200);
}

/** The build date the page carries as `data-now`, as local midnight; today when it is missing. */
export function nowFrom(iso: string | undefined): Date {
  const m = iso ? ISO_DATE.exec(iso) : null;
  if (!m) return new Date();
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}
```

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run test/deckUtil.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test`

```bash
git add src/scripts/deck/deck-util.ts test/deckUtil.test.ts
git commit -m "deck: smoothing, freeze, rendition and RNG helpers"
```

---

### Task 4: The rank rail

**Files:**

- Create: `src/scripts/deck/deck-rail.ts`
- Test: `test/deckRail.test.ts`

**Interfaces:**

- Produces:

  ```ts
  export function rankAfterKey(current: number, key: string, count: number): number | null; // ArrowRight/Down +1, ArrowLeft/Up −1, Home 0, End count−1, else null; clamped
  export function scrollTargetFor(
    trackTop: number,
    trackHeight: number,
    viewportHeight: number,
    headerPx: number,
    index: number,
    count: number,
  ): number;
  export function counterText(index: number, count: number): string; // "06 / 07"
  export function liveText(stage: CareerStage): string; // "Rank S, Linux Engineer, Caris Life Sciences"
  export interface Rail {
    buttons: HTMLButtonElement[];
    setPresented(index: number): void; // aria-pressed, tabindex, is-reached, counter, live text, pulse
    setProgress(p: number): void; // --progress on the track
    showHint(): void;
    hideHint(): void;
  }
  export function initRail(
    track: HTMLElement,
    stages: readonly CareerStage[],
    onJump: (index: number) => void,
  ): Rail;
  export function scrollToRank(
    track: HTMLElement,
    index: number,
    count: number,
    reduced: boolean,
  ): void;
  ```

  `scrollTargetFor` mirrors the old e2e helper: `trackTop − header + (trackHeight − (viewportHeight − header)) × ((index + 0.5) / count)`.

- [ ] **Step 1: Write the failing tests**

Create `test/deckRail.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { career } from "../src/data/career";
import {
  counterText,
  liveText,
  rankAfterKey,
  scrollTargetFor,
} from "../src/scripts/deck/deck-rail";

describe("rankAfterKey", () => {
  it("moves with the arrows, jumps with Home and End, clamps at the ends", () => {
    expect(rankAfterKey(2, "ArrowRight", 7)).toBe(3);
    expect(rankAfterKey(2, "ArrowDown", 7)).toBe(3);
    expect(rankAfterKey(2, "ArrowLeft", 7)).toBe(1);
    expect(rankAfterKey(2, "ArrowUp", 7)).toBe(1);
    expect(rankAfterKey(6, "ArrowRight", 7)).toBe(6);
    expect(rankAfterKey(0, "ArrowLeft", 7)).toBe(0);
    expect(rankAfterKey(3, "Home", 7)).toBe(0);
    expect(rankAfterKey(3, "End", 7)).toBe(6);
  });

  it("ignores other keys", () => {
    expect(rankAfterKey(3, "Enter", 7)).toBeNull();
    expect(rankAfterKey(3, "a", 7)).toBeNull();
  });
});

describe("scrollTargetFor", () => {
  it("lands in the middle of a rank's stretch, the way the e2e helper always has", () => {
    // Track 5000 px tall starting at 1200, viewport 900, header 64: span = 5000 − 836.
    expect(scrollTargetFor(1200, 5000, 900, 64, 0, 7)).toBeCloseTo(1136 + 4164 * (0.5 / 7), 6);
    expect(scrollTargetFor(1200, 5000, 900, 64, 6, 7)).toBeCloseTo(1136 + 4164 * (6.5 / 7), 6);
  });
});

describe("counterText and liveText", () => {
  it("format the counter and the announcement", () => {
    expect(counterText(5, 7)).toBe("06 / 07");
    expect(counterText(0, 7)).toBe("01 / 07");
    expect(liveText(career[5]!)).toBe("Rank S, Linux Engineer, Caris Life Sciences");
    expect(liveText(career[6]!)).toBe("Rank S+, Sr. Systems Architect, BankSITE® Services");
  });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `pnpm vitest run test/deckRail.test.ts`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Implement**

Create `src/scripts/deck/deck-rail.ts`:

```ts
// The rank rail (deck spec §3): seven buttons with aria-pressed on the presented rank, a roving
// tabindex with arrow keys, the counter, the hint and the aria-live announcement. The pure helpers
// are tested; the DOM wiring is exercised by the e2e suite.
import type { CareerStage } from "../../data/career";

export function rankAfterKey(current: number, key: string, count: number): number | null {
  const last = count - 1;
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return Math.min(last, current + 1);
    case "ArrowLeft":
    case "ArrowUp":
      return Math.max(0, current - 1);
    case "Home":
      return 0;
    case "End":
      return last;
    default:
      return null;
  }
}

/** The page's scroll position that puts the journey in the middle of rank `index`'s stretch. */
export function scrollTargetFor(
  trackTop: number,
  trackHeight: number,
  viewportHeight: number,
  headerPx: number,
  index: number,
  count: number,
): number {
  const span = trackHeight - (viewportHeight - headerPx);
  return trackTop - headerPx + span * ((index + 0.5) / count);
}

export const counterText = (index: number, count: number): string =>
  `${String(index + 1).padStart(2, "0")} / ${String(count).padStart(2, "0")}`;

export const liveText = (stage: CareerStage): string =>
  `Rank ${stage.rankLabel}, ${stage.shortTitle ?? stage.title}, ${stage.org}`;

export interface Rail {
  buttons: HTMLButtonElement[];
  setPresented(index: number): void;
  setProgress(p: number): void;
  showHint(): void;
  hideHint(): void;
}

function headerPx(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--header-h").trim();
  const px = raw.endsWith("rem") ? Number.parseFloat(raw) * 16 : Number.parseFloat(raw);
  return Number.isFinite(px) ? px : 64;
}

export function scrollToRank(
  track: HTMLElement,
  index: number,
  count: number,
  reduced: boolean,
): void {
  const top = scrollTargetFor(
    track.getBoundingClientRect().top + scrollY,
    track.offsetHeight,
    innerHeight,
    headerPx(),
    index,
    count,
  );
  scrollTo({ top, behavior: reduced ? "instant" : "smooth" });
}

export function initRail(
  track: HTMLElement,
  stages: readonly CareerStage[],
  onJump: (index: number) => void,
): Rail {
  const buttons = [...track.querySelectorAll<HTMLButtonElement>("[data-deck-rank]")];
  const counter = track.querySelector<HTMLElement>("[data-deck-counter]");
  const hint = track.querySelector<HTMLElement>("[data-deck-hint]");
  const live = track.querySelector<HTMLElement>("[data-deck-live]");
  let presented = 0;
  let hintTimer: ReturnType<typeof setTimeout> | undefined;

  const focusRank = (index: number) => {
    buttons.forEach((b, i) => b.setAttribute("tabindex", i === index ? "0" : "-1"));
    buttons[index]?.focus();
  };

  buttons.forEach((button, i) => {
    button.addEventListener("click", () => onJump(i));
    button.addEventListener("keydown", (event) => {
      const next = rankAfterKey(i, event.key, buttons.length);
      if (next === null) return;
      event.preventDefault();
      focusRank(next);
    });
  });

  return {
    buttons,
    setPresented(index) {
      if (index === presented && buttons[index]?.getAttribute("aria-pressed") === "true") return;
      presented = index;
      const stage = stages[index];
      buttons.forEach((b, i) => {
        b.setAttribute("aria-pressed", i === index ? "true" : "false");
        b.classList.toggle("is-reached", i <= index);
        // Keep the roving tabindex on the presented rank unless the visitor is using the rail.
        if (!track.contains(document.activeElement) || document.activeElement === track) {
          b.setAttribute("tabindex", i === index ? "0" : "-1");
        }
      });
      if (counter) counter.textContent = counterText(index, buttons.length);
      if (live && stage) live.textContent = liveText(stage);
    },
    setProgress(p) {
      // CSSOM writes are allowed under the CSP (only inline style attributes are blocked).
      track.style.setProperty("--progress", p.toFixed(4));
    },
    showHint() {
      hint?.classList.add("is-shown");
      clearTimeout(hintTimer);
      hintTimer = setTimeout(() => hint?.classList.remove("is-shown"), 8000);
    },
    hideHint() {
      clearTimeout(hintTimer);
      hint?.classList.remove("is-shown");
    },
  };
}
```

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run test/deckRail.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test`

```bash
git add src/scripts/deck/deck-rail.ts test/deckRail.test.ts
git commit -m "deck: the rank rail's helpers and wiring"
```

---

### Task 5: The texture pool

**Files:**

- Create: `src/scripts/deck/deck-textures.ts`
- Test: `test/deckTextures.test.ts`

**Interfaces:**

- Produces:
  ```ts
  export interface TextureFactory {
    canvas(width: number, height: number): HTMLCanvasElement;
    texture(canvas: HTMLCanvasElement): Texture; // the stage passes a CanvasTexture maker
  }
  export const MAX_TEXTURE_W = 1040;
  export function textureSize(cardW: number, dpr: number): { w: number; h: number }; // w = min(1040, round(cardW × dpr)), h = round(w × 7 / 5)
  export class DeckTextures {
    constructor(cards: CardModel[], factory: TextureFactory, params?: DeckParams);
    /** Sets the card's on-screen width and pixel ratio; repaints everything present when the texture width changes by more than 10% (or the first time). Returns whether it repainted. */
    setSize(cardW: number, dpr: number): boolean;
    body(index: number): Texture; // painted lazily, with the portrait if it has arrived
    setPortrait(index: number, image: CanvasImageSource | null): void;
    frame(): Texture; // shared
    back(): Texture; // shared
    setMark(image: CanvasImageSource | null): void;
    chip(index: number): Texture; // per rank, CHIP_W × CHIP_H scaled
    blank(): Texture; // a shared 1 × 1 transparent texture: what a text plane shows when its card owns no slot
    text(index: number): Texture; // one of two slots; taking a slot clears it
    paintText(index: number, lines: number, cursor: boolean): boolean; // repaints only on change
    releaseText(index: number): void; // clears the slot and frees it
    ownerOfSlot(slot: 0 | 1): number | null; // for tests and the tuning panel
    estimateBytes(): number; // RGBA × 1.33 for mipmapped layers
    dispose(): void;
  }
  ```
- Consumes: Plan 1's painters and `CardModel`; `Texture` type from three (type only, so this module stays free of Three at runtime and testable in node).

- [ ] **Step 1: Write the failing tests**

Create `test/deckTextures.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Texture } from "three";
import { career } from "../src/data/career";
import { cardModel } from "../src/scripts/deck/deck-paint";
import { DeckTextures, textureSize, type TextureFactory } from "../src/scripts/deck/deck-textures";
import { FakeContext, fakeImage } from "./helpers/fakeCanvas";

const NOW = new Date(2026, 8, 25);
const cards = career.map((s) => cardModel(s, NOW));

interface FakeTexture {
  needsUpdate: boolean;
  disposed: boolean;
  canvas: { width: number; height: number; ctx: FakeContext };
}

function factory() {
  const made: FakeTexture[] = [];
  const f: TextureFactory = {
    canvas(width, height) {
      const ctx = new FakeContext();
      const canvas = { width, height, ctx, getContext: () => ctx };
      return canvas as unknown as HTMLCanvasElement;
    },
    texture(canvas) {
      const t: FakeTexture = {
        needsUpdate: false,
        disposed: false,
        canvas: canvas as unknown as FakeTexture["canvas"],
      };
      made.push(t);
      return Object.assign(t, { dispose: () => (t.disposed = true) }) as unknown as Texture;
    },
  };
  return { f, made };
}

describe("textureSize", () => {
  it("scales with the card and the pixel ratio, capped at 1040 wide, 5:7", () => {
    expect(textureSize(370, 2)).toEqual({ w: 740, h: 1036 });
    expect(textureSize(560, 2)).toEqual({ w: 1040, h: 1456 });
    expect(textureSize(342, 1.5)).toEqual({ w: 513, h: 718 });
  });
});

describe("DeckTextures", () => {
  it("paints bodies lazily and only repaints on a size change over 10%", () => {
    const { f, made } = factory();
    const t = new DeckTextures(cards, f);
    expect(t.setSize(370, 2)).toBe(true);
    expect(made).toHaveLength(0);
    t.body(0);
    expect(made).toHaveLength(1);
    expect(made[0]!.canvas.width).toBe(740);
    const paints = () => made[0]!.canvas.ctx.ops.filter((o) => o.op === "fillRect").length;
    const before = paints();
    expect(t.setSize(390, 2)).toBe(false); // 5% wider: no repaint
    expect(paints()).toBe(before);
    expect(t.setSize(460, 2)).toBe(true); // 24% wider: repaint at the new size
    expect(made[0]!.canvas.width).toBe(920);
    expect(paints()).toBeGreaterThan(before);
  });

  it("shares one frame and one back, and paints the mark into the back when it arrives", () => {
    const { f, made } = factory();
    const t = new DeckTextures(cards, f);
    t.setSize(370, 1);
    expect(t.frame()).toBe(t.frame());
    expect(t.back()).toBe(t.back());
    const back = made.find((m) => m.canvas.ctx.texts().join("") === "EVILIST · JOURNEY")!;
    expect(back.canvas.ctx.ops.some((o) => o.op === "drawImage")).toBe(false);
    back.needsUpdate = false;
    t.setMark(fakeImage(226, 242));
    expect(back.canvas.ctx.ops.some((o) => o.op === "drawImage")).toBe(true);
    expect(back.needsUpdate).toBe(true);
  });

  it("repaints a body with its portrait when it arrives, and marks the texture dirty", () => {
    const { f, made } = factory();
    const t = new DeckTextures(cards, f);
    t.setSize(370, 1);
    t.body(5);
    made[0]!.needsUpdate = false;
    t.setPortrait(5, fakeImage(800, 533));
    expect(made[0]!.canvas.ctx.ops.some((o) => o.op === "drawImage")).toBe(true);
    expect(made[0]!.needsUpdate).toBe(true);
    // A portrait for a card whose body was never painted is kept for later, not painted now.
    t.setPortrait(2, fakeImage(800, 533));
    expect(made).toHaveLength(1);
    t.body(2);
    expect(made[1]!.canvas.ctx.ops.some((o) => o.op === "drawImage")).toBe(true);
  });

  it("gives text its own slot per card, two at a time, and never shows one card's lines on another", () => {
    const { f } = factory();
    const t = new DeckTextures(cards, f);
    t.setSize(370, 1);
    const s5 = t.text(5);
    expect(t.paintText(5, 3, false)).toBe(true);
    expect(t.paintText(5, 3, false)).toBe(false); // unchanged
    expect(t.paintText(5, 4, false)).toBe(true);
    const s6 = t.text(6);
    expect(s6).not.toBe(s5);
    expect(t.ownerOfSlot(0)).toBe(5);
    expect(t.ownerOfSlot(1)).toBe(6);
    // A third card evicts the least recently used slot, which is cleared first.
    const s0 = t.text(0);
    expect(s0).toBe(s5);
    expect(t.ownerOfSlot(0)).toBe(0);
    const ctx = (s0 as unknown as FakeTexture).canvas.ctx;
    const last = ctx.ops.at(-1)!;
    expect(last.op).toBe("clearRect");
    expect(t.paintText(0, 1, false)).toBe(true);
    expect(ctx.texts()).toContain("T1 Tech Support");
    expect(ctx.texts()).not.toContain("Linux Engineer");
  });

  it("releases a slot back to the pool, cleared", () => {
    const { f } = factory();
    const t = new DeckTextures(cards, f);
    t.setSize(370, 1);
    t.text(3);
    t.paintText(3, 7, true);
    t.releaseText(3);
    expect(t.ownerOfSlot(0)).toBeNull();
    const ctx = (t.text(3) as unknown as FakeTexture).canvas.ctx;
    expect(ctx.texts().filter((x) => x === "T3 Tech Support")).toHaveLength(1);
    expect(t.paintText(3, 0, false)).toBe(false); // a fresh slot is already at 0 lines
  });

  it("hands out one shared blank texture for cards without a slot", () => {
    const { f, made } = factory();
    const t = new DeckTextures(cards, f);
    t.setSize(370, 1);
    expect(t.blank()).toBe(t.blank());
    expect(made).toHaveLength(1);
    expect(made[0]!.canvas.width).toBe(1);
    expect(made[0]!.canvas.height).toBe(1);
  });

  it("estimates the texture memory with mipmaps, and disposes everything", () => {
    const { f, made } = factory();
    const t = new DeckTextures(cards, f);
    t.setSize(370, 2);
    for (let i = 0; i < 7; i++) t.body(i);
    t.frame();
    t.back();
    t.text(0);
    t.text(1);
    for (let i = 0; i < 7; i++) t.chip(i);
    const layer = 740 * 1036 * 4 * 1.33;
    const chip = Math.round(80 * 2 * (370 / 520)) * Math.round(28 * 2 * (370 / 520)) * 4;
    expect(t.estimateBytes()).toBeCloseTo(11 * layer + 7 * chip, -3);
    t.dispose();
    expect(made.every((m) => m.disposed)).toBe(true);
  });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `pnpm vitest run test/deckTextures.test.ts`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Implement**

Create `src/scripts/deck/deck-textures.ts`:

```ts
// The deck's canvases and textures (deck spec §9, "Textures and memory"). One body per card,
// painted lazily; one frame and one back, shared; one chip per rank; two text slots that cards
// borrow while presented, so a fast handoff can never show one card's lines on another. The
// factory is injected: the stage passes CanvasTexture, the tests pass a recorder.
import type { Texture } from "three";
import {
  CARD_W,
  CHIP_H,
  CHIP_W,
  paintBack,
  paintBody,
  paintChip,
  paintFrame,
  paintText,
  type CardModel,
} from "./deck-paint";
import { DECK_PARAMS, type DeckParams } from "./deck-params";

export interface TextureFactory {
  canvas(width: number, height: number): HTMLCanvasElement;
  texture(canvas: HTMLCanvasElement): Texture;
}

export const MAX_TEXTURE_W = 1040;
const MIPMAP = 1.33;

export function textureSize(cardW: number, dpr: number): { w: number; h: number } {
  const w = Math.min(MAX_TEXTURE_W, Math.round(cardW * dpr));
  return { w, h: Math.round((w * 7) / 5) };
}

interface Layer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: Texture;
  mipmapped: boolean;
}

interface TextSlot {
  layer: Layer;
  owner: number | null;
  lines: number;
  cursor: boolean;
  used: number;
}

export class DeckTextures {
  private size = { w: 0, h: 0 };
  private cardW = 0;
  private dpr = 1;
  private bodies = new Map<number, Layer>();
  private portraits = new Map<number, CanvasImageSource>();
  private chips = new Map<number, Layer>();
  private frameLayer: Layer | null = null;
  private backLayer: Layer | null = null;
  private mark: CanvasImageSource | null = null;
  private slots: TextSlot[] = [];
  private blankLayer: Layer | null = null;
  private tick = 0;

  constructor(
    private readonly cards: CardModel[],
    private readonly factory: TextureFactory,
    private readonly params: DeckParams = DECK_PARAMS,
  ) {}

  private make(w: number, h: number, mipmapped = true): Layer {
    const canvas = this.factory.canvas(w, h);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas unavailable");
    return { canvas, ctx, texture: this.factory.texture(canvas), mipmapped };
  }

  private dirty(layer: Layer): void {
    layer.texture.needsUpdate = true;
  }

  setSize(cardW: number, dpr: number): boolean {
    const next = textureSize(cardW, dpr);
    const first = this.size.w === 0;
    const changed = Math.abs(next.w - this.size.w) > this.size.w * 0.1;
    this.cardW = cardW;
    this.dpr = dpr;
    if (!first && !changed) return false;
    this.size = next;
    for (const [i, layer] of this.bodies)
      this.resizeLayer(layer, next.w, next.h, () => this.paintBodyInto(layer, i));
    if (this.frameLayer)
      this.resizeLayer(this.frameLayer, next.w, next.h, () =>
        paintFrame(this.frameLayer!.ctx, next.w, next.h),
      );
    if (this.backLayer)
      this.resizeLayer(this.backLayer, next.w, next.h, () =>
        paintBack(this.backLayer!.ctx, next.w, next.h, this.mark),
      );
    for (const slot of this.slots) {
      this.resizeLayer(slot.layer, next.w, next.h, () => {
        if (slot.owner !== null)
          paintText(
            slot.layer.ctx,
            next.w,
            next.h,
            this.cards[slot.owner]!,
            slot.lines,
            slot.cursor,
          );
        else slot.layer.ctx.clearRect(0, 0, next.w, next.h);
      });
    }
    const chip = this.chipSize();
    for (const [i, layer] of this.chips)
      this.resizeLayer(layer, chip.w, chip.h, () =>
        paintChip(layer.ctx, chip.w, chip.h, this.cards[i]!.stage.rankLabel),
      );
    return true;
  }

  private resizeLayer(layer: Layer, w: number, h: number, paint: () => void): void {
    layer.canvas.width = w;
    layer.canvas.height = h;
    paint();
    this.dirty(layer);
  }

  private chipSize(): { w: number; h: number } {
    const s = (this.cardW / CARD_W) * this.dpr;
    return { w: Math.max(1, Math.round(CHIP_W * s)), h: Math.max(1, Math.round(CHIP_H * s)) };
  }

  private paintBodyInto(layer: Layer, index: number): void {
    paintBody(
      layer.ctx,
      this.size.w,
      this.size.h,
      this.cards[index]!,
      this.portraits.get(index) ?? null,
    );
  }

  body(index: number): Texture {
    let layer = this.bodies.get(index);
    if (!layer) {
      layer = this.make(this.size.w, this.size.h);
      this.bodies.set(index, layer);
      this.paintBodyInto(layer, index);
      this.dirty(layer);
    }
    return layer.texture;
  }

  setPortrait(index: number, image: CanvasImageSource | null): void {
    if (image) this.portraits.set(index, image);
    else this.portraits.delete(index);
    const layer = this.bodies.get(index);
    if (!layer) return;
    this.paintBodyInto(layer, index);
    this.dirty(layer);
  }

  frame(): Texture {
    if (!this.frameLayer) {
      this.frameLayer = this.make(this.size.w, this.size.h);
      paintFrame(this.frameLayer.ctx, this.size.w, this.size.h);
      this.dirty(this.frameLayer);
    }
    return this.frameLayer.texture;
  }

  back(): Texture {
    if (!this.backLayer) {
      this.backLayer = this.make(this.size.w, this.size.h);
      paintBack(this.backLayer.ctx, this.size.w, this.size.h, this.mark);
      this.dirty(this.backLayer);
    }
    return this.backLayer.texture;
  }

  setMark(image: CanvasImageSource | null): void {
    this.mark = image;
    if (!this.backLayer) return;
    paintBack(this.backLayer.ctx, this.size.w, this.size.h, this.mark);
    this.dirty(this.backLayer);
  }

  chip(index: number): Texture {
    let layer = this.chips.get(index);
    if (!layer) {
      const { w, h } = this.chipSize();
      layer = this.make(w, h, false);
      this.chips.set(index, layer);
      paintChip(layer.ctx, w, h, this.cards[index]!.stage.rankLabel);
      this.dirty(layer);
    }
    return layer.texture;
  }

  private slotFor(index: number): TextSlot {
    const owned = this.slots.find((s) => s.owner === index);
    if (owned) {
      owned.used = ++this.tick;
      return owned;
    }
    let slot = this.slots.find((s) => s.owner === null);
    if (!slot && this.slots.length < 2) {
      slot = {
        layer: this.make(this.size.w, this.size.h),
        owner: null,
        lines: 0,
        cursor: false,
        used: 0,
      };
      this.slots.push(slot);
    }
    if (!slot) slot = this.slots.reduce((a, b) => (a.used <= b.used ? a : b));
    slot.owner = index;
    slot.lines = 0;
    slot.cursor = false;
    slot.used = ++this.tick;
    slot.layer.ctx.clearRect(0, 0, this.size.w, this.size.h);
    this.dirty(slot.layer);
    return slot;
  }

  /** A 1 × 1 transparent texture: a text plane shows it whenever its card owns no slot. */
  blank(): Texture {
    if (!this.blankLayer) {
      this.blankLayer = this.make(1, 1, false);
      this.blankLayer.ctx.clearRect(0, 0, 1, 1);
      this.dirty(this.blankLayer);
    }
    return this.blankLayer.texture;
  }

  text(index: number): Texture {
    return this.slotFor(index).layer.texture;
  }

  paintText(index: number, lines: number, cursor: boolean): boolean {
    const slot = this.slotFor(index);
    if (slot.lines === lines && slot.cursor === cursor) return false;
    slot.lines = lines;
    slot.cursor = cursor;
    paintText(slot.layer.ctx, this.size.w, this.size.h, this.cards[index]!, lines, cursor);
    this.dirty(slot.layer);
    return true;
  }

  releaseText(index: number): void {
    const slot = this.slots.find((s) => s.owner === index);
    if (!slot) return;
    slot.owner = null;
    slot.lines = 0;
    slot.cursor = false;
    slot.layer.ctx.clearRect(0, 0, this.size.w, this.size.h);
    this.dirty(slot.layer);
  }

  ownerOfSlot(slot: 0 | 1): number | null {
    return this.slots[slot]?.owner ?? null;
  }

  estimateBytes(): number {
    const bytes = (layer: Layer) =>
      layer.canvas.width * layer.canvas.height * 4 * (layer.mipmapped ? MIPMAP : 1);
    let total = 0;
    for (const layer of this.bodies.values()) total += bytes(layer);
    for (const layer of this.chips.values()) total += bytes(layer);
    for (const slot of this.slots) total += bytes(slot.layer);
    if (this.frameLayer) total += bytes(this.frameLayer);
    if (this.backLayer) total += bytes(this.backLayer);
    return total;
  }

  dispose(): void {
    const all = [
      ...this.bodies.values(),
      ...this.chips.values(),
      ...this.slots.map((s) => s.layer),
      this.frameLayer,
      this.backLayer,
      this.blankLayer,
    ];
    for (const layer of all) layer?.texture.dispose();
    this.bodies.clear();
    this.chips.clear();
    this.slots = [];
    this.frameLayer = null;
    this.backLayer = null;
    this.blankLayer = null;
  }
}
```

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run test/deckTextures.test.ts`
Expected: PASS. If the estimate test is off by rounding, check the chip size maths against `chipSize()` rather than loosening the tolerance.

- [ ] **Step 5: Extend the palette guard to the new files**

In `test/deckPalette.test.ts`, change the file list in "has no other hex colours in the deck scripts" to:

```ts
    for (const file of [
      "deck-paint.ts",
      "deck-pose.ts",
      "deck-layout.ts",
      "deck-params.ts",
      "deck-textures.ts",
      "deck-tier.ts",
      "deck-util.ts",
      "deck-rail.ts",
    ]) {
```

- [ ] **Step 6: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test`

```bash
git add src/scripts/deck/deck-textures.ts test/deckTextures.test.ts test/deckPalette.test.ts
git commit -m "deck: the texture pool with lazy bodies and two text slots"
```

---

### Task 6: The dark-studio environment

**Files:**

- Create: `src/scripts/deck/deck-env.ts`
- Test: `test/deckEnv.test.ts`

**Interfaces:**

- Produces:

  ```ts
  export const ENV_W = 512;
  export const ENV_H = 256;
  export function paintEnvironment(ctx: CanvasRenderingContext2D, w: number, h: number): void;
  ```

  Near-black, one soft white bar upper-left (the key light's reflection, matching the key's direction) and one dim violet bar on the right. The stage turns the canvas into a PMREM (Task 7).

- [ ] **Step 1: Write the failing test**

Create `test/deckEnv.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ENV_H, ENV_W, paintEnvironment } from "../src/scripts/deck/deck-env";
import { fakeContext } from "./helpers/fakeCanvas";

describe("paintEnvironment", () => {
  it("fills near-black, then a key bar upper-left and a violet bar right, as gradients", () => {
    const ctx = fakeContext();
    paintEnvironment(ctx, ENV_W, ENV_H);
    const fills = ctx.rects();
    expect(fills[0]).toEqual({ x: 0, y: 0, w: ENV_W, h: ENV_H, color: "#050505" });
    const gradients = ctx.ops.filter((o) => o.op === "fillRect" && o.fillStyle === "gradient");
    expect(gradients).toHaveLength(2);
    const [key, violet] = gradients.map((o) => o.args as number[]);
    expect(key![0]! + key![2]! / 2).toBeLessThan(ENV_W / 2); // the key sits left of centre
    expect(key![1]! + key![3]! / 2).toBeLessThan(ENV_H / 2); // and above it
    expect(violet![0]! + violet![2]! / 2).toBeGreaterThan(ENV_W * 0.7); // the violet sits right
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm vitest run test/deckEnv.test.ts`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Implement**

Create `src/scripts/deck/deck-env.ts`:

```ts
// The reflection environment for the laminated cards (deck spec §8, "Environment"): a painted
// equirectangular canvas, near-black, with one soft white bar where the key light is (upper-left)
// and a dim violet bar to the right. The stage runs it through PMREMGenerator once.
export const ENV_W = 512;
export const ENV_H = 256;

export function paintEnvironment(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, w, h);

  // Key light: a soft white bar, upper-left of the front hemisphere.
  const key = ctx.createRadialGradient(w * 0.3, h * 0.3, 0, w * 0.3, h * 0.3, w * 0.16);
  key.addColorStop(0, "rgba(255,255,255,0.95)");
  key.addColorStop(0.5, "rgba(255,255,255,0.35)");
  key.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = key;
  ctx.fillRect(w * 0.14, h * 0.14, w * 0.32, h * 0.32);

  // Rim: a dim violet bar on the right.
  const rim = ctx.createRadialGradient(w * 0.85, h * 0.5, 0, w * 0.85, h * 0.5, w * 0.12);
  rim.addColorStop(0, "rgba(112,64,210,0.6)");
  rim.addColorStop(1, "rgba(112,64,210,0)");
  ctx.fillStyle = rim;
  ctx.fillRect(w * 0.73, h * 0.26, w * 0.24, h * 0.48);
}
```

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run test/deckEnv.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test` (add `"deck-env.ts"` to the palette test's file list; `#050505` joins its allow-list).

```bash
git add src/scripts/deck/deck-env.ts test/deckEnv.test.ts test/deckPalette.test.ts
git commit -m "deck: the dark-studio environment painter"
```

---

### Task 7: The Three.js stage

**Files:**

- Create: `src/scripts/deck/deck-stage.ts`

No unit test: this module is the renderer, and `pnpm check` type-checks it; Task 13's e2e and the visual baselines cover it. Keep it under 600 lines; anything pure belongs in the modules above.

**Interfaces:**

- Produces:
  ```ts
  export interface StagePortrait {
    x1: string | null;
    x2: string | null;
    glow: string | null;
  }
  export interface StageState {
    state: "intro" | "scroll";
    rank: RankLabel;
    phase: CardPhase;
    energy: number;
    vram: number; // MB, one decimal
    slots: string | null; // freeze only: "x,y;x,y;…" stage px of the racked centres (desktop)
  }
  export interface StageOptions {
    canvas: HTMLCanvasElement;
    stage: HTMLElement;
    column: HTMLElement;
    cards: CardModel[];
    labels: RankLabel[];
    portraits: StagePortrait[];
    markUrl: string | null;
    tier: "mid" | "high";
    params?: DeckParams;
    freeze: Freeze | null;
    onState(state: StageState): void;
    onContextLost(): void;
  }
  export interface StageHandle {
    ready: Promise<void>;
    setProgress(p: number): void;
    pointer(clientX: number | null, clientY: number | null): void;
    hit(clientX: number, clientY: number): number | null;
    startIntro(): void;
    setVisible(visible: boolean): void;
    dispose(): void;
  }
  export async function mountStage(opts: StageOptions): Promise<StageHandle>;
  ```
- Consumes: `deckLayout`, `columnFor` (Plan 1), `deckPose`, `introDurationMs` (Plan 1), `DeckTextures` (Task 5), `paintEnvironment` (Task 6), `smooth`, `pickRendition`, `mulberry32` (Task 3), `pixelRatioCap` (Task 2).

- [ ] **Step 1: Write the stage**

Create `src/scripts/deck/deck-stage.ts`:

```ts
// The journey deck's WebGL stage (deck spec §5–§9): seven laminated card meshes in a Three.js
// scene, driven by the pure pose model each frame. This module is a dynamic import, so Three.js
// never sits in the page's initial graph. Colour management is fixed: no tone mapping, sRGB out,
// faces on the emissive recipe, so every painted token survives the renderer exactly.
import {
  AmbientLight,
  CanvasTexture,
  Color,
  DirectionalLight,
  EquirectangularReflectionMapping,
  Group,
  LinearMipmapLinearFilter,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NoToneMapping,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  WebGLRenderer,
  type Material,
  type Texture,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { RankLabel } from "../../data/career";
import { ENV_H, ENV_W, paintEnvironment } from "./deck-env";
import { columnFor, deckLayout, type DeckLayout, type DeckMode } from "./deck-layout";
import { CARD_W, CHIP_H, CHIP_W, COLORS, PRINT_STEPS, type CardModel } from "./deck-paint";
import { DECK_PARAMS, type DeckParams } from "./deck-params";
import { deckPose, type CardPhase, type IntroState, type StagePose } from "./deck-pose";
import { DeckTextures } from "./deck-textures";
import { pixelRatioCap } from "./deck-tier";
import { mulberry32, pickRendition, smooth, type Freeze } from "./deck-util";

export interface StagePortrait {
  x1: string | null;
  x2: string | null;
  glow: string | null;
}

export interface StageState {
  state: "intro" | "scroll";
  rank: RankLabel;
  phase: CardPhase;
  energy: number;
  vram: number;
  slots: string | null;
}

export interface StageOptions {
  canvas: HTMLCanvasElement;
  stage: HTMLElement;
  column: HTMLElement;
  cards: CardModel[];
  labels: RankLabel[];
  portraits: StagePortrait[];
  markUrl: string | null;
  tier: "mid" | "high";
  params?: DeckParams;
  freeze: Freeze | null;
  onState(state: StageState): void;
  onContextLost(): void;
}

export interface StageHandle {
  ready: Promise<void>;
  setProgress(p: number): void;
  pointer(clientX: number | null, clientY: number | null): void;
  hit(clientX: number, clientY: number): number | null;
  startIntro(): void;
  setVisible(visible: boolean): void;
  dispose(): void;
}

const DEG = Math.PI / 180;
const PX = 1 / 100;
const DESKTOP_MIN_PX = 960; // 60rem

interface CardMeshes {
  group: Group;
  slab: Mesh;
  slabMat: MeshStandardMaterial;
  body: Mesh;
  bodyMat: MeshPhysicalMaterial;
  frame: Mesh;
  text: Mesh;
  chip: Mesh;
  back: Mesh;
  backMat: MeshPhysicalMaterial;
  layerMats: Material[];
}

function loadImage(url: string | null): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      img.decode().then(
        () => resolve(img),
        () => resolve(img),
      );
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function mountStage(opts: StageOptions): Promise<StageHandle> {
  const params = opts.params ?? DECK_PARAMS;
  const { canvas, stage, column, cards, labels, freeze } = opts;
  const count = cards.length;
  const rng = mulberry32(freeze ? 7 : (Math.random() * 2 ** 31) | 0);
  void rng; // the smoke (Plan 3) draws from it
  const clock = () => (freeze ? freeze.time : performance.now());

  /* ---------- Renderer, scene, camera ---------- */
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    premultipliedAlpha: true,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NoToneMapping;
  renderer.setClearColor(0x000000, 0);
  const dpr = Math.min(devicePixelRatio || 1, pixelRatioCap(opts.tier, params));
  renderer.setPixelRatio(dpr);
  const scene = new Scene();
  const camera = new PerspectiveCamera(params.camera.fov, 1, 0.1, 100);

  /* ---------- Environment and lights ---------- */
  const envCanvas = document.createElement("canvas");
  envCanvas.width = ENV_W;
  envCanvas.height = ENV_H;
  paintEnvironment(envCanvas.getContext("2d")!, ENV_W, ENV_H);
  const envSource = new CanvasTexture(envCanvas);
  envSource.mapping = EquirectangularReflectionMapping;
  envSource.colorSpace = SRGBColorSpace;
  const pmrem = new PMREMGenerator(renderer);
  const envMap = pmrem.fromEquirectangular(envSource).texture;
  pmrem.dispose();
  envSource.dispose();

  const ambient = new AmbientLight(0xffffff, params.light.ambient);
  const key = new DirectionalLight(0xffffff, params.light.key);
  key.position.set(-6, 8, 10);
  const rim = new DirectionalLight(0x9080ff, params.light.rim);
  rim.position.set(8, 3, -4);
  scene.add(ambient, key, rim);

  /* ---------- Textures ---------- */
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const textures = new DeckTextures(
    cards,
    {
      canvas: (w, h) => {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        return c;
      },
      texture: (c) => {
        const t = new CanvasTexture(c);
        t.colorSpace = SRGBColorSpace;
        t.anisotropy = maxAniso;
        t.generateMipmaps = true;
        t.minFilter = LinearMipmapLinearFilter;
        return t;
      },
    },
    params,
  );

  /* ---------- Cards ---------- */
  const M = params.material;
  const laminated = (map: Texture, sheen: boolean): MeshPhysicalMaterial => {
    const mat = new MeshPhysicalMaterial({
      color: 0x000000,
      emissive: 0xffffff,
      emissiveMap: map,
      metalness: M.metalness,
      roughness: M.roughness,
      clearcoat: M.clearcoat,
      clearcoatRoughness: M.clearcoatRoughness,
      envMap,
      envMapIntensity: M.envMapIntensity,
    });
    if (sheen) {
      mat.sheen = M.sheen;
      mat.sheenColor = new Color(COLORS.violet);
      mat.sheenRoughness = M.sheenRoughness;
    }
    return mat;
  };
  const unlit = (map: Texture): MeshBasicMaterial =>
    new MeshBasicMaterial({ map, transparent: true, depthWrite: false });
  const unit = new PlaneGeometry(1, 1);

  /* ---------- Layout, part 1: measure before any texture is painted ---------- */
  let layout: DeckLayout | null = null;
  let stageW = 1;
  let stageH = 1;
  const toX = (px: number) => (px - stageW / 2) * PX;
  const toY = (py: number) => -(py - stageH / 2) * PX;

  function computeLayout(): void {
    stageW = Math.max(1, stage.clientWidth);
    stageH = Math.max(1, stage.clientHeight);
    const mode: DeckMode = stageW >= DESKTOP_MIN_PX ? "desktop" : "phone";
    const stageRect = stage.getBoundingClientRect();
    const columnRect = column.getBoundingClientRect();
    const fallback = columnFor(stageW, params.layout);
    const columnLeft = columnRect.width > 0 ? columnRect.left - stageRect.left : fallback.left;
    const columnW = columnRect.width > 0 ? columnRect.width : fallback.width;
    layout = deckLayout({ stageW, stageH, columnLeft, columnW, mode, count }, params.layout);
    renderer.setSize(stageW, stageH, false);
    camera.aspect = stageW / stageH;
    camera.position.z = (stageH * PX) / 2 / Math.tan((params.camera.fov / 2) * DEG);
    camera.updateProjectionMatrix();
    textures.setSize(layout.cardW, dpr);
  }
  computeLayout();

  const meshes: CardMeshes[] = cards.map((card, i) => {
    const group = new Group();
    const slabMat = new MeshStandardMaterial({
      color: 0x1b1b1b,
      roughness: M.edgeRoughness,
      metalness: M.edgeMetalness,
      envMap,
      envMapIntensity: M.envMapIntensity,
    });
    const slab = new Mesh(new RoundedBoxGeometry(1, 1, 1, 2, 0.01), slabMat);
    slab.userData.index = i;
    const energetic = card.stage.rankLabel === "S" || card.stage.rankLabel === "S+";
    const bodyMat = laminated(textures.body(i), energetic);
    const body = new Mesh(unit, bodyMat);
    const frame = new Mesh(unit, unlit(textures.frame()));
    // Text planes start blank; a card gets a slot texture only while it is presented.
    const text = new Mesh(unit, unlit(textures.blank()));
    const chip = new Mesh(unit, unlit(textures.chip(i)));
    const backMat = laminated(textures.back(), false);
    const back = new Mesh(unit, backMat);
    back.rotation.y = Math.PI;
    group.add(slab, body, frame, text, chip, back);
    scene.add(group);
    return {
      group,
      slab,
      slabMat,
      body,
      bodyMat,
      frame,
      text,
      chip,
      back,
      backMat,
      layerMats: [
        slabMat,
        bodyMat,
        frame.material as Material,
        text.material as Material,
        chip.material as Material,
        backMat,
      ],
    };
  });
  const floor = new Mesh(unit, new MeshBasicMaterial({ color: COLORS.iron }));
  scene.add(floor);

  /* ---------- Layout, part 2: size the meshes ---------- */
  function applyLayout(): void {
    if (!layout) return;
    const w = layout.cardW * PX;
    const h = layout.cardH * PX;
    const t = M.thickness * PX;
    const s = layout.cardW / CARD_W;
    for (const m of meshes) {
      m.slab.geometry.dispose();
      m.slab.geometry = new RoundedBoxGeometry(w, h, t, 2, M.cornerRadius * PX);
      const front = t / 2 + 0.001;
      m.body.scale.set(w, h, 1);
      m.body.position.z = front;
      m.frame.scale.set(w, h, 1);
      m.frame.position.z = front + M.layerZ.frame * PX;
      m.text.scale.set(w, h, 1);
      m.text.position.z = front + M.layerZ.text * PX;
      m.chip.scale.set(CHIP_W * s * PX, CHIP_H * s * PX, 1);
      m.chip.position.set(
        -w / 2 + (12 + CHIP_W / 2) * s * PX,
        h / 2 - (12 + CHIP_H / 2) * s * PX,
        front + M.layerZ.chip * PX,
      );
      m.back.scale.set(w, h, 1);
      m.back.position.z = -front;
    }
    floor.scale.set(stageW * PX, 0.01, 1);
    floor.position.set(0, toY(layout.floorY), -0.001);
  }
  applyLayout();
  const resizer = new ResizeObserver(() => {
    computeLayout();
    applyLayout();
    requestRender();
  });
  resizer.observe(stage);

  /* ---------- Portraits and the mark ---------- */
  const glows: (HTMLImageElement | null)[] = new Array(count).fill(null);
  const portraitLoads = opts.portraits.map((p, i) =>
    loadImage(pickRendition(dpr, p.x1, p.x2)).then((img) => {
      if (img) textures.setPortrait(i, img);
      return loadImage(p.glow).then((g) => {
        glows[i] = g; // Plan 3 turns these into the glow-mask planes
      });
    }),
  );
  const markLoad = loadImage(opts.markUrl).then((img) => textures.setMark(img));
  const assets = Promise.allSettled([...portraitLoads, markLoad]);

  /* ---------- Frame state ---------- */
  const N = count;
  let targetP = 0;
  let p = 0;
  let pointerAt: { x: number; y: number } | null = null;
  const tilt = { x: 0, y: 0 };
  const tiltTarget = { x: 0, y: 0 };
  const hover = new Array<number>(count).fill(0);
  const hoverTarget = new Array<number>(count).fill(0);
  const cam = { x: 0, y: 0 };
  const camTarget = { x: 0, y: 0 };
  const landedAt: (number | null)[] = new Array(count).fill(null);
  let intro: IntroState | null = null;
  let lastNow = performance.now();
  let raf = 0;
  let visible = true;
  let disposed = false;
  let lastState = "";
  let readyResolve!: () => void;
  const ready = new Promise<void>((resolve) => (readyResolve = resolve));
  let readyDone = false;
  const raycaster = new Raycaster();
  const ndc = new Vector2();

  function hitAt(clientX: number, clientY: number): number | null {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -(((clientY - r.top) / r.height) * 2 - 1));
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(
      meshes.map((m) => m.slab),
      false,
    );
    return hits.length ? (hits[0]!.object.userData.index as number) : null;
  }

  function updateTargets(pose: StagePose): void {
    if (!pointerAt || !layout) {
      tiltTarget.x = tiltTarget.y = 0;
      camTarget.x = camTarget.y = 0;
      hoverTarget.fill(0);
      canvas.classList.remove("is-pointer");
      return;
    }
    const r = canvas.getBoundingClientRect();
    const px = pointerAt.x - r.left;
    const py = pointerAt.y - r.top;
    const presented = pose.cards.findIndex((c) => c.landed);
    if (presented >= 0) {
      const nx = Math.max(-1, Math.min(1, (px - layout.presented.x) / (layout.cardW / 2)));
      const ny = Math.max(-1, Math.min(1, (py - layout.presented.y) / (layout.cardH / 2)));
      tiltTarget.x = params.tilt.maxX * ny;
      tiltTarget.y = params.tilt.maxY * nx;
    } else {
      tiltTarget.x = tiltTarget.y = 0;
    }
    if (opts.tier === "high") {
      camTarget.x = ((px / stageW) * 2 - 1) * params.camera.parallax;
      camTarget.y = -((py / stageH) * 2 - 1) * params.camera.parallax;
    }
    const hit = layout.mode === "desktop" ? hitAt(pointerAt.x, pointerAt.y) : null;
    const racked = hit !== null && (pose.cards[hit]?.pull ?? 1) <= 0;
    hoverTarget.fill(0);
    if (racked && hit !== null) hoverTarget[hit] = 1;
    canvas.classList.toggle("is-pointer", racked);
  }

  function applyText(i: number, phase: CardPhase, time: number): void {
    const mat = meshes[i]!.text.material as MeshBasicMaterial;
    const at = landedAt[i];
    if (at === null || phase === "leaving" || phase === "racked" || phase === "pulling") {
      textures.releaseText(i);
      if (mat.map !== textures.blank()) {
        mat.map = textures.blank();
        mat.needsUpdate = true;
      }
      return;
    }
    const elapsed = time - at;
    const lines = Math.min(PRINT_STEPS, Math.floor(elapsed / params.print.stepMs) + 1);
    const cursor = lines >= 6 && Math.floor(elapsed / (params.print.cursorMs / 2)) % 2 === 0;
    if (textures.paintText(i, lines, cursor)) {
      const slot = textures.text(i);
      if (mat.map !== slot) {
        mat.map = slot;
        mat.needsUpdate = true;
      }
    }
  }

  function emitState(pose: StagePose): void {
    const presented = pose.cards.reduce(
      (best, c, i) => (c.pull > pose.cards[best]!.pull ? i : best),
      0,
    );
    const state: StageState = {
      state: intro ? "intro" : "scroll",
      rank: labels[pose.active]!,
      phase: pose.cards[presented]!.phase,
      energy: Math.round(pose.energy * 20) / 20,
      vram: Math.round((textures.estimateBytes() / 1_048_576) * 10) / 10,
      slots:
        freeze && layout?.mode === "desktop"
          ? layout.slots.map((s) => `${Math.round(s.x)},${Math.round(s.y)}`).join(";")
          : null,
    };
    const key = JSON.stringify(state);
    if (key === lastState) return;
    lastState = key;
    opts.onState(state);
  }

  function frame(now: number): void {
    raf = 0;
    if (disposed || !layout) return;
    const dt = freeze ? 0 : Math.min(50, Math.max(0, now - lastNow));
    lastNow = now;
    const time = clock();

    if (freeze) {
      p = targetP;
    } else {
      p = smooth(p, targetP, dt, params.scroll.tau);
      tilt.x = smooth(tilt.x, tiltTarget.x, dt, params.tilt.tau);
      tilt.y = smooth(tilt.y, tiltTarget.y, dt, params.tilt.tau);
      cam.x = smooth(cam.x, camTarget.x, dt, params.camera.parallaxTau);
      cam.y = smooth(cam.y, camTarget.y, dt, params.camera.parallaxTau);
      for (let i = 0; i < count; i++) {
        const tau = hoverTarget[i]! > hover[i]! ? params.hover.inMs : params.hover.outMs;
        hover[i] = smooth(hover[i]!, hoverTarget[i]!, dt, tau);
      }
    }
    if (intro && targetP > 0.5 / N) intro.speed = params.intro.fastForward;

    const pose = deckPose({ p, labels, layout, tilt, hover, time, landedAt, intro }, params);
    if (intro && pose.intro === null) intro = null;
    updateTargets(pose);

    for (let i = 0; i < count; i++) {
      const c = pose.cards[i]!;
      const m = meshes[i]!;
      if (c.landed && landedAt[i] === null) landedAt[i] = freeze ? time - 10_000 : time;
      if (!c.landed && landedAt[i] !== null) landedAt[i] = null;
      applyText(i, c.phase, time);
      m.group.position.set(toX(c.x), toY(c.y), c.z * PX);
      m.group.rotation.set(c.rotX * DEG, c.rotY * DEG, c.rotZ * DEG);
      m.group.scale.setScalar(c.scale);
      const translucent = c.opacity < 0.999;
      for (const mat of m.layerMats) {
        if (mat.transparent !== translucent || mat.opacity !== c.opacity) {
          if (mat !== m.frame.material && mat !== m.text.material && mat !== m.chip.material) {
            mat.transparent = translucent;
          }
          mat.opacity = c.opacity;
          mat.needsUpdate = false;
        }
      }
      m.group.visible = c.opacity > 0.001;
    }

    const floorScale = pose.intro ? pose.intro.floor : 1;
    floor.scale.x = stageW * PX * floorScale;
    floor.position.x = -stageW * PX * 0.5 + floor.scale.x / 2;
    camera.position.x = cam.x;
    camera.position.y = cam.y;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    emitState(pose);
    if (!readyDone) {
      readyDone = true;
      readyResolve();
    }
    if (!freeze && visible && !disposed) raf = requestAnimationFrame(frame);
  }

  function requestRender(): void {
    if (disposed || raf) return;
    if (freeze) {
      raf = requestAnimationFrame(frame);
      return;
    }
    if (visible) {
      lastNow = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }

  /* ---------- Context loss ---------- */
  let lostTimer: ReturnType<typeof setTimeout> | undefined;
  const onLost = (event: Event) => {
    event.preventDefault();
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    lostTimer = setTimeout(() => {
      if (!disposed) opts.onContextLost();
    }, 2000);
  };
  const onRestored = () => {
    clearTimeout(lostTimer);
    requestRender();
  };
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);

  /* ---------- Start ---------- */
  // The first frame waits for the assets in freeze mode (a still must be complete); otherwise it
  // starts at once and the portraits fade in as they land.
  if (freeze) await assets;
  else void assets.then(() => requestRender());
  requestRender();

  return {
    ready,
    setProgress(value) {
      targetP = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
      if (freeze) p = targetP;
      requestRender();
    },
    pointer(clientX, clientY) {
      pointerAt = clientX === null || clientY === null ? null : { x: clientX, y: clientY };
      requestRender();
    },
    hit: hitAt,
    startIntro() {
      if (freeze || intro || targetP >= 0.5 / N) return;
      intro = { startedAt: clock(), speed: 1 };
      requestRender();
    },
    setVisible(next) {
      visible = next;
      if (visible) requestRender();
      else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    },
    dispose() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      clearTimeout(lostTimer);
      resizer.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      for (const m of meshes) {
        m.slab.geometry.dispose();
        for (const mat of m.layerMats) mat.dispose();
      }
      unit.dispose();
      (floor.material as Material).dispose();
      textures.dispose();
      envMap.dispose();
      renderer.dispose();
    },
  };
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm check`
Expected: `0 errors`. Two things commonly trip here: `three/addons/geometries/RoundedBoxGeometry.js` needs `@types/three` from Task 1, and `img.decoding = "async"` needs the DOM lib (Astro's strict tsconfig includes it).

- [ ] **Step 3: Confirm nothing imports it yet, and the build is unchanged**

Run: `pnpm build && pnpm size`
Expected: no `deck-stage` or `three` chunk in `dist/client/_astro` yet (nothing imports the module until Task 9); every size row still `ok`.

- [ ] **Step 4: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test`

```bash
git add src/scripts/deck/deck-stage.ts
git commit -m "deck: the Three.js stage"
```

---

### Task 8: The page script and the tuning panel

**Files:**

- Create: `src/scripts/deck/index.ts`
- Create: `src/scripts/deck/deck-tune.ts`

No unit test (DOM orchestration; the e2e suite in Task 13 covers every branch). `pnpm check` type-checks both.

**Interfaces:**

- Produces: `initDeck(): void` (called by `Journey.astro`'s script tag) and `mountTunePanel(track: HTMLElement): void` (dev only).
- Consumes: the DOM contract above; `mountStage` (Task 7, dynamically imported); `initRail`, `scrollToRank` (Task 4); `detectTier`, `readTierEnv` (Task 2); `parseFreeze`, `nowFrom`, `once`, `idle`, `pickRendition` (Task 3); `cardModel` (Plan 1); Motion's `scroll`.

- [ ] **Step 1: Write the page script**

Create `src/scripts/deck/index.ts`:

```ts
// The journey deck's page script (deck spec §3, §7, §9). It runs in the initial bundle and stays
// small: decide the tier, wire the rail, bind Motion's scroll(), prefetch the stage chunk after
// the first scroll, mount it when the journey is on screen, mirror the stage's state into data
// attributes, and hand the section to the timeline when anything is missing.
import { scroll } from "motion";
import { career } from "../../data/career";
import { cardModel } from "./deck-paint";
import { DECK_PARAMS } from "./deck-params";
import { initRail, scrollToRank } from "./deck-rail";
import type { StageHandle, StagePortrait, StageState } from "./deck-stage";
import { detectTier, readTierEnv } from "./deck-tier";
import { idle, nowFrom, once, parseFreeze, pickRendition } from "./deck-util";

const FONTS = [
  '400 14px "JetBrains Mono"',
  'italic 400 10px "JetBrains Mono"',
  '700 12px "JetBrains Mono"',
];

function fallback(root: HTMLElement, track: HTMLElement): void {
  root.setAttribute("data-deck-fallback", "");
  track.dataset.deckState = "fallback";
  delete track.dataset.deckReady;
}

export function initDeck(): void {
  const root = document.querySelector<HTMLElement>("[data-deck-root]");
  const track = root?.querySelector<HTMLElement>("[data-deck]");
  const canvas = track?.querySelector<HTMLCanvasElement>("[data-deck-gl]");
  const stage = track?.querySelector<HTMLElement>(".journey__stage");
  const column = track?.querySelector<HTMLElement>("[data-deck-column]");
  if (!root || !track || !canvas || !stage || !column) return;

  const tier = detectTier(readTierEnv());
  if (tier === "none") {
    fallback(root, track);
    return;
  }
  track.dataset.deckTier = tier;

  const count = career.length;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const freeze = parseFreeze(location.search);
  const now = nowFrom(track.dataset.now);
  const cards = career.map((s) => cardModel(s, now));
  const labels = career.map((s) => s.rankLabel);

  let targetP = 0;
  let handle: StageHandle | null = null;
  let mounting = false;
  let intersecting = false;
  let introPlayed = false;
  let presented = 0;
  let hintShown = false;
  let disposeTimer: ReturnType<typeof setTimeout> | undefined;
  let stageModule: Promise<typeof import("./deck-stage")> | null = null;
  const loadStage = () => (stageModule ??= import("./deck-stage"));

  const jump = (index: number) => {
    rail.hideHint();
    scrollToRank(track, index, count, reduced);
  };
  const rail = initRail(track, career, jump);
  const portraits: StagePortrait[] = rail.buttons.map((b) => ({
    x1: b.dataset.portrait1x ?? null,
    x2: b.dataset.portrait2x ?? null,
    glow: b.dataset.glow ?? null,
  }));

  const onState = (state: StageState) => {
    track.dataset.deckState = state.state;
    track.dataset.deckRank = state.rank;
    track.dataset.deckPhase = state.phase;
    track.dataset.deckEnergy = state.energy.toFixed(2);
    track.dataset.deckVram = String(state.vram);
    if (state.slots) track.dataset.deckSlots = state.slots;
    else delete track.dataset.deckSlots;
    const index = labels.indexOf(state.rank);
    if (state.state === "scroll" && !hintShown && !freeze) {
      hintShown = true;
      rail.showHint();
    }
    if (index !== presented) {
      presented = index;
      rail.setPresented(index);
      if (hintShown) rail.hideHint();
    }
  };

  const wirePointer = (h: StageHandle) => {
    canvas.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch") return;
      h.pointer(event.clientX, event.clientY);
    });
    canvas.addEventListener("pointerleave", () => h.pointer(null, null));
    canvas.addEventListener("click", (event) => {
      const index = h.hit(event.clientX, event.clientY);
      if (index !== null && index !== presented) jump(index);
    });
  };

  const mount = async () => {
    if (handle || mounting) return;
    mounting = true;
    try {
      const mod = await loadStage();
      await Promise.allSettled(FONTS.map((f) => document.fonts.load(f)));
      const mounted = await mod.mountStage({
        canvas,
        stage,
        column,
        cards,
        labels,
        portraits,
        markUrl: track.dataset.mark ?? null,
        tier,
        params: DECK_PARAMS,
        freeze,
        onState,
        onContextLost: () => {
          handle?.dispose();
          handle = null;
          fallback(root, track);
        },
      });
      handle = mounted;
      mounted.setProgress(targetP);
      mounted.setVisible(intersecting && !document.hidden);
      if (!freeze && !introPlayed && targetP < 0.5 / count) {
        introPlayed = true;
        mounted.startIntro();
      }
      wirePointer(mounted);
      void mounted.ready.then(() => {
        if (handle === mounted) track.dataset.deckReady = "";
      });
    } catch {
      fallback(root, track);
    } finally {
      mounting = false;
    }
  };

  // Prefetch the stage (and E's portrait) after the first scroll, when the browser is idle.
  addEventListener(
    "scroll",
    once(() =>
      idle(() => {
        void loadStage();
        const url = pickRendition(
          devicePixelRatio || 1,
          portraits[0]?.x1 ?? null,
          portraits[0]?.x2 ?? null,
        );
        if (url) new Image().src = url;
      }),
    ),
    { passive: true },
  );

  // Ignores the window's bottom 15%: a strip of journey peeking up at load mounts nothing.
  new IntersectionObserver(
    (entries) => {
      intersecting = entries[entries.length - 1]!.isIntersecting;
      if (intersecting) {
        clearTimeout(disposeTimer);
        void mount();
      } else if (handle) {
        disposeTimer = setTimeout(() => {
          handle?.dispose();
          handle = null;
          delete track.dataset.deckReady;
        }, DECK_PARAMS.tiers.disposeAfterMs);
      }
      handle?.setVisible(intersecting && !document.hidden);
    },
    { rootMargin: "0px 0px -15% 0px" },
  ).observe(track);

  document.addEventListener("visibilitychange", () => {
    handle?.setVisible(intersecting && !document.hidden);
  });

  // Listens for the page's whole life (a back/forward-cache restore must not freeze the deck).
  scroll(
    (progress: number) => {
      targetP = progress;
      rail.setProgress(progress);
      handle?.setProgress(progress);
    },
    { target: track, offset: ["start start", "end end"] },
  );

  if (import.meta.env.DEV && location.search.includes("tune")) {
    void import("./deck-tune").then((m) => m.mountTunePanel(track));
  }
}
```

- [ ] **Step 2: Write the tuning panel**

Create `src/scripts/deck/deck-tune.ts`:

```ts
// Dev-only tuning panel (deck spec §9): sliders bound to DECK_PARAMS, a live FPS and VRAM
// readout, and a button that copies the current values as JSON for deck-params.ts. It loads
// only under `astro dev` with `?tune` in the URL, so nothing here reaches production and the
// inline styles below never meet the CSP (which is off in dev).
import { DECK_PARAMS } from "./deck-params";

type Row = [label: string, path: string, min: number, max: number, step: number];

const ROWS: Row[] = [
  ["scroll τ (ms)", "scroll.tau", 0, 400, 5],
  ["handoff start", "pull.handoffStart", 0.4, 0.95, 0.01],
  ["overshoot", "pull.overshoot", 0, 3, 0.05],
  ["lift z (px)", "pull.liftZ", 0, 200, 2],
  ["lift peak", "pull.liftPeak", 0, 4, 0.1],
  ["rack rotY (°)", "pull.rackRotY", 80, 130, 1],
  ["tilt max X (°)", "tilt.maxX", 0, 20, 0.5],
  ["tilt max Y (°)", "tilt.maxY", 0, 20, 0.5],
  ["tilt τ (ms)", "tilt.tau", 0, 400, 5],
  ["float y (px)", "float.y.amp", 0, 12, 0.5],
  ["float rotY (°)", "float.rotY.amp", 0, 4, 0.1],
  ["hover z (px)", "hover.z", 0, 20, 1],
  ["intro deal (ms)", "intro.dealMs", 100, 1200, 10],
  ["intro stagger (ms)", "intro.staggerMs", 0, 200, 5],
  ["intro pull (ms)", "intro.pullMs", 200, 2000, 10],
  ["print step (ms)", "print.stepMs", 20, 300, 5],
  ["camera fov (°)", "camera.fov", 15, 45, 0.5],
  ["camera parallax", "camera.parallax", 0, 0.5, 0.01],
  ["card height ratio", "layout.cardHRatio", 0.4, 0.8, 0.01],
  ["slot gap", "layout.slotGap", 0.08, 0.25, 0.005],
  ["rack gap", "layout.gap", 0.1, 0.6, 0.01],
];

function read(path: string): number {
  return path
    .split(".")
    .reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], DECK_PARAMS) as number;
}

function write(path: string, value: number): void {
  const keys = path.split(".");
  const last = keys.pop()!;
  const target = keys.reduce<Record<string, unknown>>(
    (o, k) => o[k] as Record<string, unknown>,
    DECK_PARAMS as unknown as Record<string, unknown>,
  );
  target[last] = value;
}

export function mountTunePanel(track: HTMLElement): void {
  const panel = document.createElement("div");
  panel.setAttribute(
    "style",
    "position:fixed;top:72px;right:12px;z-index:9999;width:280px;max-height:80vh;overflow:auto;background:#111;border:1px solid #3a3a3a;border-radius:2px;padding:10px;color:#eee;font:11px/1.5 'JetBrains Mono',monospace",
  );
  const head = document.createElement("div");
  head.setAttribute(
    "style",
    "display:flex;justify-content:space-between;margin-bottom:6px;color:#848484",
  );
  const stats = document.createElement("span");
  const copy = document.createElement("button");
  copy.textContent = "copy JSON";
  copy.setAttribute(
    "style",
    "font:inherit;background:#191919;color:#eee;border:1px solid #3a3a3a;border-radius:2px;padding:0 6px;cursor:pointer",
  );
  copy.addEventListener("click", () => {
    void navigator.clipboard.writeText(JSON.stringify(DECK_PARAMS, null, 2));
  });
  head.append(stats, copy);
  panel.append(head);

  for (const [label, path, min, max, step] of ROWS) {
    const row = document.createElement("label");
    row.setAttribute(
      "style",
      "display:grid;grid-template-columns:1fr 90px 44px;gap:6px;align-items:center;margin:2px 0",
    );
    const name = document.createElement("span");
    name.textContent = label;
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(read(path));
    const value = document.createElement("span");
    value.textContent = String(read(path));
    input.addEventListener("input", () => {
      write(path, Number(input.value));
      value.textContent = input.value;
    });
    row.append(name, input, value);
    panel.append(row);
  }
  document.body.append(panel);

  let frames = 0;
  let last = performance.now();
  const tick = (now: number) => {
    frames++;
    if (now - last >= 1000) {
      stats.textContent = `${frames} fps · ${track.dataset.deckVram ?? "?"} MB · ${track.dataset.deckRank ?? ""} ${track.dataset.deckPhase ?? ""}`;
      frames = 0;
      last = now;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
```

Note the panel changes numbers the stage reads every frame (curves, tilt, float, intro, print) live; the material, light and camera-fov values are read once at mount, so those rows take effect after a reload. Plan 5's tuning session can add live rebinding if Marcus wants it.

- [ ] **Step 3: Type-check and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test`
Expected: `0 errors`. Nothing imports these modules yet, so the build output is unchanged.

```bash
git add src/scripts/deck/index.ts src/scripts/deck/deck-tune.ts
git commit -m "deck: the page script and the dev tuning panel"
```

---

### Task 9: The component, the portrait sources and the page

**Files:**

- Create: `src/data/deckImages.ts`
- Modify: `src/components/journey/Journey.astro` (rewrite)
- Modify: `test/ui/Journey.test.ts` (rewrite)

**Interfaces:**

- Produces: the DOM contract above; `deckPortrait(id): ImageMetadata | undefined`, `deckGlow(id): ImageMetadata | undefined`.
- Consumes: `initDeck` (Task 8), `RankChip`, `JourneyTimeline` (Task 10 extends it; until then it renders as today), `career`, `devil-mark.svg` (Plan 1).

- [ ] **Step 1: Write the failing component test**

Replace `test/ui/Journey.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import Journey from "../../src/components/journey/Journey.astro";
import { career } from "../../src/data/career";
import { deckPortrait } from "../../src/data/deckImages";
import { render } from "../render";

describe("Journey (the card deck's stage)", () => {
  it("renders the track with the build date, the count, the mark and a loading state", async () => {
    const html = await render(Journey);
    const track = html.match(/<div class="journey"[^>]*data-deck[^>]*>/)?.[0];
    expect(track).toBeDefined();
    expect(track).toMatch(/data-now="\d{4}-\d{2}-\d{2}"/);
    expect(track).toContain(`data-count="${career.length}"`);
    expect(track).toMatch(/data-mark="[^"]+\.svg"/);
    expect(track).toContain('data-deck-state="loading"');
    expect(html).toContain('<div class="deck" data-deck-root');
  });

  it("holds one hidden canvas and the layout column inside the sticky stage", async () => {
    const html = await render(Journey);
    expect(html.match(/<canvas /g)).toHaveLength(1);
    expect(html).toMatch(/<canvas class="journey__gl"[^>]*data-deck-gl[^>]*aria-hidden="true"/);
    expect(html).toContain('class="journey__column" data-deck-column');
    expect(html).toMatch(/<div class="journey__stage"/);
  });

  it("renders the rail as a toolbar of seven rank buttons, the first presented and focusable", async () => {
    const html = await render(Journey);
    expect(html).toMatch(
      /<div class="journey__rail"[^>]*data-deck-rail[^>]*role="toolbar"[^>]*aria-label="Ranks"/,
    );
    const buttons = html.match(/<button[^>]*data-deck-rank[^>]*>/g) ?? [];
    expect(buttons).toHaveLength(career.length);
    for (const [i, button] of buttons.entries()) {
      const stage = career[i]!;
      expect(button).toContain(`data-index="${i}"`);
      expect(button).toContain(`data-stage-id="${stage.id}"`);
      expect(button).toContain(
        `aria-label="Rank ${stage.rankLabel}, ${stage.shortTitle ?? stage.title}"`,
      );
      expect(button).toContain(`aria-pressed="${i === 0 ? "true" : "false"}"`);
      expect(button).toContain(`tabindex="${i === 0 ? "0" : "-1"}"`);
      expect(button).toContain('type="button"');
    }
    expect(html.match(/class="rank-chip/g)).toHaveLength(career.length + career.length); // rail + timeline
  });

  it("carries the portrait renditions on the buttons only when the source exists", async () => {
    const html = await render(Journey);
    const first = html.match(/<button[^>]*data-stage-id="t1-support"[^>]*>/)![0];
    if (deckPortrait("t1-support")) {
      expect(first).toMatch(/data-portrait-1x="\/_astro\/[^"]+\.webp"/);
      expect(first).toMatch(/data-portrait-2x="\/_astro\/[^"]+\.webp"/);
    } else {
      expect(first).not.toContain("data-portrait-1x");
      expect(first).not.toContain("data-portrait-2x");
      expect(first).not.toContain("data-glow");
    }
  });

  it("renders the counter, the hint and a polite live region", async () => {
    const html = await render(Journey);
    expect(html).toMatch(
      /<p class="journey__counter"[^>]*data-deck-counter[^>]*aria-hidden="true"[^>]*>01 \/ 07</,
    );
    expect(html).toMatch(/<p class="journey__hint"[^>]*data-deck-hint[^>]*aria-hidden="true"/);
    expect(html).toMatch(/<p class="visually-hidden"[^>]*data-deck-live[^>]*aria-live="polite"/);
  });

  it("keeps the timeline as the accessible twin, and the skip link", async () => {
    const html = await render(Journey);
    expect(html).toContain('class="wrap journey-fallback"');
    expect(html.match(/class="timeline__title"/g)).toHaveLength(career.length);
    expect(html).toContain('href="#skills"');
  });

  it("ships no inline styles, no scene and no video", async () => {
    const html = await render(Journey);
    expect(html).not.toContain(" style=");
    expect(html).not.toContain("data-scene");
    expect(html).not.toContain("<video");
    expect(html).not.toContain("<svg");
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm vitest run test/ui/Journey.test.ts`
Expected: FAIL, cannot find module `deckImages` (and the old markup).

- [ ] **Step 3: Write the portrait sources module**

Create `src/data/deckImages.ts`:

```ts
// The deck's portrait sources, whichever exist yet: src/images/deck/<stage-id>.webp and its
// -glow mask (deck spec §10, imported by scripts/import-portrait.mjs). A missing file simply
// returns undefined: the stage paints its placeholder and the timeline keeps the old still.
import type { ImageMetadata } from "astro";

const files = import.meta.glob<ImageMetadata>("../images/deck/*.webp", {
  eager: true,
  import: "default",
});

export const deckPortrait = (id: string): ImageMetadata | undefined =>
  files[`../images/deck/${id}.webp`];

export const deckGlow = (id: string): ImageMetadata | undefined =>
  files[`../images/deck/${id}-glow.webp`];
```

- [ ] **Step 4: Rewrite the component**

Replace `src/components/journey/Journey.astro` with:

```astro
---
// The journey card deck's stage (deck spec §3): a tall track with a pinned, full-bleed stage. The
// stage is a WebGL canvas (src/scripts/deck/deck-stage.ts, loaded lazily) that racks seven card
// meshes and pulls the current rank out as the visitor scrolls; src/scripts/deck/index.ts wires
// it. The layout column is measured, never painted. The rail is the keyboard and screen-reader
// surface; JourneyTimeline (in .journey-fallback) is the readable twin and the fallback.
//
// Under `(scripting: enabled) and (prefers-reduced-motion: no-preference)` the deck shows and
// the timeline is visually hidden; without scripting, under reduced motion, or when the script
// sets data-deck-fallback (no WebGL2, a lost context), the timeline shows instead.
import { getImage } from "astro:assets";
import markUrl from "../../images/devil-mark.svg?url";
import JourneyTimeline from "./JourneyTimeline.astro";
import RankChip from "../ui/RankChip.astro";
import { career } from "../../data/career";
import { deckGlow, deckPortrait } from "../../data/deckImages";

/** The build date: every tenure and XP figure is computed against it, in the twin and the stage. */
const now = new Date().toISOString().slice(0, 10);

const renditions = await Promise.all(
  career.map(async (stage) => {
    const source = deckPortrait(stage.id);
    if (!source) return null;
    const glow = deckGlow(stage.id);
    const [x1, x2, mask] = await Promise.all([
      getImage({ src: source, width: 400, format: "webp" }),
      getImage({ src: source, width: 800, format: "webp" }),
      glow ? getImage({ src: glow, width: 400, format: "webp" }) : Promise.resolve(null),
    ]);
    return { x1: x1.src, x2: x2.src, glow: mask?.src ?? null };
  }),
);
---

<div class="deck" data-deck-root>
  <div class="wrap">
    <a href="#skills" class="journey-skip">
      Skip the career journey
    </a>
  </div>

  <div
    class="journey"
    data-deck
    data-now={now}
    data-count={career.length}
    data-mark={markUrl}
    data-deck-state="loading"
  >
    <div class="journey__stage">
      <canvas class="journey__gl" data-deck-gl aria-hidden="true"></canvas>
      <div class="journey__column" data-deck-column></div>

      <div class="journey__rail" data-deck-rail role="toolbar" aria-label="Ranks">
        {career.map((stage, i) => (
          <button
            type="button"
            class:list={["journey__rank", { "is-reached": i === 0 }]}
            data-deck-rank
            data-index={i}
            data-stage-id={stage.id}
            data-portrait-1x={renditions[i]?.x1}
            data-portrait-2x={renditions[i]?.x2}
            data-glow={renditions[i]?.glow ?? undefined}
            aria-pressed={i === 0 ? "true" : "false"}
            aria-label={`Rank ${stage.rankLabel}, ${stage.shortTitle ?? stage.title}`}
            tabindex={i === 0 ? 0 : -1}
          >
            <RankChip rank={stage.rankLabel} size="sm" />
          </button>
        ))}
        <span class="journey__track-line" role="presentation">
          <span class="journey__fill"></span>
        </span>
      </div>

      <p
        class="journey__counter"
        data-deck-counter
        aria-hidden="true"
      >{`01 / ${String(career.length).padStart(2, "0")}`}</p>
      <p class="journey__hint" data-deck-hint aria-hidden="true">
        ↓ scroll or pick a rank
      </p>
      <p class="visually-hidden" data-deck-live aria-live="polite"></p>
    </div>
  </div>

  <div class="wrap journey-fallback">
    <JourneyTimeline now={now} />
  </div>
</div>

<script>
  import { initDeck } from "../../scripts/deck";
  initDeck();
</script>

<style>
  /* ---------- Which version shows ---------- */
  .journey,
  .journey-skip {
    display: none;
  }

  @media (scripting: enabled) and (prefers-reduced-motion: no-preference) {
    .deck:not([data-deck-fallback]) .journey {
      display: block;
    }

    .deck:not([data-deck-fallback]) .journey-skip {
      display: inline-block;
    }

    /* The timeline stays for screen readers and search, but not on screen. */
    .deck:not([data-deck-fallback]) .journey-fallback {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }

    /* Its stills would load behind the hidden timeline; the stage shows the art instead. */
    .deck:not([data-deck-fallback]) .journey-fallback :global(.timeline__still) {
      display: none;
    }
  }

  /* Visually hidden until focused (keyboard users). */
  .journey-skip {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    padding: 0;
    background: var(--color-ember);
    color: var(--color-void); /* paper on ember is 3.3:1 */
    font-weight: 700;
    text-decoration: none;
  }

  .journey-skip:focus-visible {
    position: static;
    width: auto;
    height: auto;
    overflow: visible;
    clip-path: none;
    padding: 0.5rem 1rem;
    margin-top: 1rem;
  }

  /* ---------- Track and pinned stage ---------- */
  .journey {
    --stages: 7;
    --header: var(--header-h);
    position: relative;
    height: calc(var(--stages) * 70dvh + 100dvh - var(--header));
    margin-top: 2rem;
  }

  .journey__stage {
    position: sticky;
    top: var(--header);
    height: calc(100dvh - var(--header));
    overflow: hidden;
  }

  .journey__gl {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
  }

  .journey__gl.is-pointer {
    cursor: pointer;
  }

  /* Measured by the stage, never painted: the deck's composition sits inside it. */
  .journey__column {
    position: absolute;
    inset: 0 auto 0 50%;
    width: calc(100% - 2 * var(--gutter));
    translate: -50% 0;
    pointer-events: none;
  }

  @media (min-width: 60rem) {
    .journey__column {
      width: min(78%, 1200px);
    }
  }

  /* ---------- Rail, counter, hint ---------- */
  .journey__rail {
    position: absolute;
    left: var(--gutter);
    right: var(--gutter);
    bottom: 1.5rem;
    z-index: 2;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  @media (min-width: 60rem) {
    .journey__rail {
      left: max(var(--gutter), calc((100% - min(78%, 1200px)) / 2));
      right: auto;
      gap: 0.625rem;
    }
  }

  .journey__rank {
    position: relative;
    z-index: 1;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
    opacity: 0;
    transition:
      opacity 400ms ease-out,
      transform 240ms ease-out;
  }

  .journey__rank:focus-visible {
    outline: 2px solid var(--color-ember);
    outline-offset: 2px;
  }

  /* The chips fade in with the deal-in, one after another; any later state shows them at once. */
  [data-deck-state="intro"] .journey__rank,
  [data-deck-state="scroll"] .journey__rank,
  [data-deck-state="fallback"] .journey__rank {
    opacity: 1;
  }

  [data-deck-state="intro"] .journey__rank:nth-child(2) {
    transition-delay: 55ms;
  }
  [data-deck-state="intro"] .journey__rank:nth-child(3) {
    transition-delay: 110ms;
  }
  [data-deck-state="intro"] .journey__rank:nth-child(4) {
    transition-delay: 165ms;
  }
  [data-deck-state="intro"] .journey__rank:nth-child(5) {
    transition-delay: 220ms;
  }
  [data-deck-state="intro"] .journey__rank:nth-child(6) {
    transition-delay: 275ms;
  }
  [data-deck-state="intro"] .journey__rank:nth-child(7) {
    transition-delay: 330ms;
  }

  .journey__rank[aria-pressed="true"] {
    transform: scale(1.12);
  }

  .journey__rank[aria-pressed="true"] :global(.rank-chip) {
    animation: chip-pulse 200ms ease-out;
  }

  /* Not reached yet: dimmed by colour, not opacity, so the chip text still passes 4.5:1. */
  .journey__rank:not(.is-reached) :global(.rank-chip) {
    border-color: var(--color-iron);
    background: var(--color-graphite);
    color: var(--color-ash);
  }

  /* Seven chips must fit a 390 px phone. */
  @media (max-width: 39.99rem) {
    .journey__rank :global(.rank-chip) {
      padding-inline: 0.25rem;
    }
  }

  .journey__track-line {
    position: absolute;
    inset: 50% 1rem auto;
    height: 1px;
    background: var(--color-slate);
  }

  .journey__fill {
    position: absolute;
    inset: 0;
    background: var(--color-ember);
    transform-origin: left;
    transform: scaleX(var(--progress, 0));
  }

  .journey__counter,
  .journey__hint {
    position: absolute;
    right: var(--gutter);
    z-index: 2;
    color: var(--color-steel);
    font-size: var(--text-caption);
  }

  .journey__counter {
    bottom: 1.5rem;
  }

  .journey__hint {
    bottom: 3.25rem;
    opacity: 0;
    transition: opacity 500ms ease-out;
  }

  .journey__hint.is-shown {
    opacity: 1;
  }

  /* On phones the counter would collide with the rail: lift it above. */
  @media (max-width: 59.99rem) {
    .journey__counter {
      bottom: 3.75rem;
    }

    .journey__hint {
      bottom: 5.5rem;
    }
  }

  @keyframes chip-pulse {
    from {
      transform: scale(0.9);
    }
  }
</style>
```

- [ ] **Step 5: Run the component tests**

Run: `pnpm vitest run test/ui/Journey.test.ts`
Expected: PASS. If `getImage` complains in the container, the Container API needs the same image service the site uses: `render.ts` already creates a container that renders `Still`, so this is a regression in the component, not the harness.

- [ ] **Step 6: Build, then check the chunking and the budgets**

Run: `pnpm build && pnpm size && ls dist/client/_astro | grep -E "deck-stage|three"`
Expected: a `deck-stage.<hash>.js` chunk exists; `pnpm size` still passes its rows, but its "Three.js chunk present" rule now fails on the new chunk. That rule is rewritten in Task 12; for this commit, run the remaining gate and record the failing row in the commit message body.

- [ ] **Step 7: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test`

```bash
git add src/data/deckImages.ts src/components/journey/Journey.astro test/ui/Journey.test.ts
git commit -m "deck: the stage component replaces the vector scene on the page" -m "pnpm size flags the new lazy deck-stage chunk under the old no-Three rule; Task 12 rewrites that rule."
```

---

### Task 10: The timeline as the twin, and the section

**Files:**

- Modify: `src/components/journey/JourneyTimeline.astro`
- Modify: `src/pages/index.astro`
- Modify: `test/ui/JourneyTimeline.test.ts`

**Interfaces:**

- Produces: `JourneyTimeline` accepts `now?: string` (ISO date; defaults to today) and renders, per rank: RankChip, title, org, dates, summary, a `dl.timeline__stats` with tenure and XP, a `ul.timeline__skills` of the acquired skills, a `p.timeline__log` quote, and the portrait (the deck's when it exists, else today's still).

- [ ] **Step 1: Write the failing tests**

Append to `test/ui/JourneyTimeline.test.ts` (extend the imports with `import { deckArtById } from "../../src/data/deck"; import { deckPortrait } from "../../src/data/deckImages";`):

```ts
describe("JourneyTimeline as the deck's twin", () => {
  const props = { now: "2026-09-25" };

  it("prints tenure and XP for every stage against the build date", async () => {
    const html = await render(JourneyTimeline, { props });
    expect(html.match(/class="timeline__stats"/g)).toHaveLength(career.length);
    expect(html).toContain("<dd>19 months</dd>");
    expect(html).toContain("<dd>4 years, 10 months</dd>");
    expect(html).toContain("<dd>50%</dd>");
    expect(html).toContain("<dd>100%</dd>");
  });

  it("lists the acquired skills, capped at eight plus the rest", async () => {
    const html = await render(JourneyTimeline, { props });
    const lists = html.match(/<ul class="timeline__skills"[\s\S]*?<\/ul>/g) ?? [];
    expect(lists).toHaveLength(career.length);
    expect(lists[5]!.match(/<li/g)).toHaveLength(9);
    expect(lists[5]).toContain(">+6<");
  });

  it("quotes each stage's log line", async () => {
    const html = await render(JourneyTimeline, { props });
    for (const stage of career) expect(html).toContain(`“${stage.log}”`);
  });

  it("uses the deck portrait and its subject once it exists, and the old still until then", async () => {
    const html = await render(JourneyTimeline, { props });
    for (const stage of career) {
      const subject = deckPortrait(stage.id)
        ? deckArtById[stage.id]!.subject
        : stageArt[stage.id]!.subject;
      expect(html).toContain(`alt="Illustration: ${subject}"`);
    }
  });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `pnpm vitest run test/ui/JourneyTimeline.test.ts`
Expected: FAIL on the stats.

- [ ] **Step 3: Extend the timeline**

Replace the frontmatter and markup of `src/components/journey/JourneyTimeline.astro` (keep its `<style>`, then add the rules below) with:

```astro
---
// Static career timeline: the no-JS, reduced-motion and no-WebGL version of the journey, and the
// accessible twin of the card deck (deck spec §3). It prints everything a card paints, against
// the same build date, so a screen reader hears what the canvas shows.
import RankChip from "../ui/RankChip.astro";
import Still from "../ui/Still.astro";
import Tag from "../ui/Tag.astro";
import { acquired, career, formatRange, tenure, xp } from "../../data/career";
import { deckArtById } from "../../data/deck";
import { deckPortrait } from "../../data/deckImages";
import { stageArt } from "../../data/journeyArt";
import { nowFrom } from "../../scripts/deck/deck-util";

interface Props {
  /** The build date, yyyy-mm-dd. Tenure and XP are computed against it. */
  now?: string;
}

const { now } = Astro.props;
const date = nowFrom(now);
---

<ol class="timeline" role="list">
  {career.map((stage) => {
    const portrait = deckPortrait(stage.id);
    const still = portrait ?? stageArt[stage.id]!.still;
    const subject = portrait ? deckArtById[stage.id]!.subject : stageArt[stage.id]!.subject;
    return (
      <li class="timeline__stage" data-stage={stage.id}>
        <RankChip rank={stage.rankLabel} size="md" />
        <div class="timeline__body">
          <h3 class="timeline__title">{stage.title}</h3>
          <p class="timeline__meta">{stage.org}</p>
          <Tag class="timeline__dates">{formatRange(stage.start, stage.end)}</Tag>
          <p class="timeline__summary">{stage.summary}</p>
          <dl class="timeline__stats">
            <dt>Tenure</dt>
            <dd>{tenure(stage, date)}</dd>
            <dt>XP</dt>
            <dd>{Math.round(xp(stage, date) * 100)}%</dd>
          </dl>
          <ul class="timeline__skills" role="list" aria-label="Skills acquired">
            {acquired(stage).map((skill) => (
              <li>{skill}</li>
            ))}
          </ul>
          <p class="timeline__log">“{stage.log}”</p>
        </div>
        <Still
          src={still}
          subject={subject}
          sizes="(min-width: 48rem) 18rem, 80vw"
          class="timeline__still"
        />
      </li>
    );
  })}
</ol>
```

Add to the component's `<style>`:

```css
.timeline__stats {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.25rem 1rem;
  margin-top: 0.75rem;
  font-size: var(--text-caption);
}

.timeline__stats dt {
  color: var(--color-ash);
}

.timeline__stats dd {
  margin: 0;
  color: var(--color-paper);
}

.timeline__skills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin: 0.75rem 0 0;
  padding: 0;
  list-style: none;
}

.timeline__skills li {
  padding: 0 0.375rem;
  border: 1px solid var(--color-slate);
  border-radius: var(--radius);
  color: var(--color-ash);
  font-size: var(--text-caption);
  line-height: 1.6;
}

.timeline__log {
  margin-top: 0.75rem;
  color: var(--color-fog);
  font-style: italic;
}
```

- [ ] **Step 4: Update the section**

In `src/pages/index.astro`, change the journey `Section` to `tone="void"` and its lede to:

```astro
<p class="lede">
  {decade}, seven ranks: from answering support calls to architecting two datacenters. Scroll, or
  pick a rank.
</p>
```

- [ ] **Step 5: Run the tests**

Run: `pnpm vitest run test/ui/JourneyTimeline.test.ts test/ui/Journey.test.ts`
Expected: PASS (the Journey test counts `timeline__title` seven times, unchanged).

- [ ] **Step 6: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test`

```bash
git add src/components/journey/JourneyTimeline.astro src/pages/index.astro test/ui/JourneyTimeline.test.ts
git commit -m "deck: the timeline prints the cards' stats and the section goes void"
```

---

### Task 11: Retire the scene modules the page no longer imports

**Files:**

- Delete: `src/scripts/journey.ts`, `src/scripts/avatar.ts`, `src/scripts/scene.ts`, `src/components/journey/silhouette.svg`, `test/journey.test.ts`, `test/avatar.test.ts`, `test/scene.test.ts`
- Modify: `test/tokens.test.ts:49` (a comment)

The art pipeline (`scripts/build-scene.mjs` and friends), `public/journey/scene.svg`, `src/data/avatarRig.ts` and their tests stay until Phase 6; `test/buildScene.test.ts` writes its own silhouette into a temp dir, so the committed one can go.

- [ ] **Step 1: Confirm nothing else imports them**

Run: `grep -rln -e "scripts/avatar" -e "scripts/scene" -e "scripts/journey\"" -e "silhouette.svg" src test e2e scripts`
Expected: only the files listed above (and `scripts/build-scene.mjs`, which writes the silhouette path as output and stays).

- [ ] **Step 2: Delete them**

```bash
git rm src/scripts/journey.ts src/scripts/avatar.ts src/scripts/scene.ts src/components/journey/silhouette.svg test/journey.test.ts test/avatar.test.ts test/scene.test.ts
```

- [ ] **Step 3: Fix the comment in the tokens test**

In `test/tokens.test.ts`, change the `--progress` line to:

```ts
  "--progress", // set on [data-deck] by src/scripts/deck/index.ts
```

- [ ] **Step 4: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test`
Expected: `0 errors`; the suite passes without the three deleted test files.

```bash
git add test/tokens.test.ts
git commit -m "deck: retire the vector scene's runtime modules"
```

---

### Task 12: The size check learns about lazy chunks

**Files:**

- Modify: `scripts/check-bundle-size.mjs`
- Modify: `test/checkBundleSize.test.ts`

**Interfaces:**

- The script's new rules: every `_astro/*.js` that no page references directly is a lazy chunk; their gzipped total is the "Deck lazy JS" row (budget 170 KB); a `deck-stage` chunk must exist among them; no chunk matching `deck-stage`, `deck-bloom` or `three` may appear in the home page's initial graph. The old "Three.js chunk present" rule goes. The scene row and the stray-file rule stay until Phase 6.

- [ ] **Step 1: Update the tests**

In `test/checkBundleSize.test.ts`, add a helper after `withScene`:

```ts
/** Writes a small lazy deck-stage chunk (no page references it) so the deck rows stay green. */
function withDeck(dist: string, bytes = 10 * 1024, name = "deck-stage.abc.js"): void {
  writeFileSync(join(dist, "dist/client/_astro", name), Buffer.alloc(bytes, 1));
}
```

Call `withDeck(dist)` alongside every existing `withScene(dist)` (the passing cases), replace the "fails when a Three.js chunk is present" test, and add the deck cases:

```ts
it("passes a lazy deck-stage chunk under 170 KB gz and reports it", () => {
  const dist = fakeDist({ "fonts/a.woff2": 42_000 });
  withScene(dist);
  writeFileSync(join(dist, "dist/client/_astro/deck-stage.abc.js"), randomBytes(150 * 1024));
  const res = run(dist);
  expect(res.stdout).toMatch(/ok {3}Deck lazy JS \(gz\): 15\d\.\d KB \(budget 170 KB\)/);
  expect(res.status).toBe(0);
});

it("fails when the deck-stage chunk is missing (inlined into a page)", () => {
  const dist = fakeDist({ "fonts/a.woff2": 42_000 });
  withScene(dist);
  const res = run(dist);
  expect(res.stdout).toContain("FAIL deck-stage chunk missing");
  expect(res.status).toBe(1);
});

it("fails when a deck or Three.js chunk is in the home page's initial graph", () => {
  const dist = fakeDist({ "fonts/a.woff2": 42_000, "three.def.js": 10 });
  withScene(dist);
  withDeck(dist);
  writeFileSync(
    join(dist, "dist/client/index.html"),
    '<!doctype html><script type="module" src="/_astro/three.def.js"></script>',
  );
  const res = run(dist);
  expect(res.stdout).toContain("FAIL deck chunk in the initial graph: /_astro/three.def.js");
  expect(res.status).toBe(1);
});

it("fails lazy JS over 170 KB gz", () => {
  const dist = fakeDist({ "fonts/a.woff2": 42_000 });
  withScene(dist);
  writeFileSync(join(dist, "dist/client/_astro/deck-stage.abc.js"), randomBytes(200 * 1024));
  const res = run(dist);
  expect(res.stdout).toMatch(/FAIL Deck lazy JS \(gz\)/);
  expect(res.status).toBe(1);
});

it("does not count a page's own scripts as lazy", () => {
  const dist = fakeDist({ "fonts/a.woff2": 42_000, "contact.ghi.js": 300 * 1024 });
  withScene(dist);
  withDeck(dist);
  mkdirSync(join(dist, "dist/client/contact"), { recursive: true });
  writeFileSync(
    join(dist, "dist/client/contact/index.html"),
    '<!doctype html><script type="module" src="/_astro/contact.ghi.js"></script>',
  );
  const res = run(dist);
  expect(res.stdout).toMatch(/ok {3}Deck lazy JS \(gz\)/);
  expect(res.status).toBe(0);
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `pnpm vitest run test/checkBundleSize.test.ts`
Expected: FAIL (no "Deck lazy JS" row yet; the old Three rule fires).

- [ ] **Step 3: Rewrite the script**

Replace `scripts/check-bundle-size.mjs` with:

```js
// Fails the build if asset budgets are exceeded (see CLAUDE.md "Budgets").
// - Initial JS on the home page: every module script and modulepreload referenced by index.html.
// - Self-hosted fonts: every woff2 Astro emitted. woff2 is already compressed, so raw bytes count.
//   There is a floor too: no fonts at all means the Fonts API entry broke and the site would ship
//   in the fallback face with every other gate green.
// - The journey deck: Three.js and the stage live in lazy chunks (the JS no page references
//   directly), under their own budget, and never in the home page's initial graph (deck spec §11).
// - Journey scene: only scene.svg may live in dist/client/journey, gzipped within its budget
//   (until Phase 6 retires it).
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const KB = 1024;
const BUDGETS = { initialHome: 100 * KB, fonts: 120 * KB, scene: 300 * KB, deck: 170 * KB };
const FONT_FLOOR = 20 * KB; // JetBrains Mono 400 + 700 + italic 400, latin: ~65 KB
const gz = (path) => gzipSync(readFileSync(path)).length;

/** Every module script and modulepreload a page's HTML references. */
const scriptsIn = (html) => [
  ...new Set(
    [
      ...html.matchAll(/<script[^>]+src="(\/_astro\/[^"]+\.js)"/g),
      ...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="(\/_astro\/[^"]+\.js)"/g),
    ].map((m) => m[1]),
  ),
];

function htmlFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) htmlFiles(p, out);
    else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}

const home = readFileSync("dist/client/index.html", "utf8");
const initial = scriptsIn(home);
const initialBytes = initial.reduce((sum, src) => sum + gz(`dist/client${src}`), 0);

const fontDir = "dist/client/_astro/fonts";
const fontBytes = existsSync(fontDir)
  ? readdirSync(fontDir)
      .filter((f) => f.endsWith(".woff2"))
      .reduce((sum, f) => sum + statSync(`${fontDir}/${f}`).size, 0)
  : 0;

const referenced = new Set(
  htmlFiles("dist/client").flatMap((file) => scriptsIn(readFileSync(file, "utf8"))),
);
const lazy = readdirSync("dist/client/_astro")
  .filter((f) => f.endsWith(".js"))
  .map((f) => `/_astro/${f}`)
  .filter((f) => !referenced.has(f));
const lazyBytes = lazy.reduce((sum, f) => sum + gz(`dist/client${f}`), 0);

const rows = [
  ["Initial JS on / (gz)", initialBytes, BUDGETS.initialHome, 0],
  ["Fonts (woff2)", fontBytes, BUDGETS.fonts, FONT_FLOOR],
  ["Deck lazy JS (gz)", lazyBytes, BUDGETS.deck, 0],
];

let failed = false;
const scenePath = "dist/client/journey/scene.svg";
if (existsSync(scenePath)) {
  rows.push(["Journey scene (gz)", gz(scenePath), BUDGETS.scene, 0]);
} else {
  console.log("FAIL Journey scene (gz): missing");
  failed = true;
}
for (const [name, bytes, budget, floor] of rows) {
  const ok = bytes <= budget && bytes >= floor;
  failed ||= !ok;
  const range = floor ? `${floor / KB}–${budget / KB} KB` : `budget ${budget / KB} KB`;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}: ${(bytes / KB).toFixed(1)} KB (${range})`);
}

if (!lazy.some((f) => /deck-stage/.test(f))) {
  console.log("FAIL deck-stage chunk missing: the stage was inlined into a page's graph");
  failed = true;
}
const leaked = initial.filter((f) => /deck-stage|deck-bloom|three/.test(f));
if (leaked.length) {
  console.log(`FAIL deck chunk in the initial graph: ${leaked.join(", ")}`);
  failed = true;
}

const journeyDir = "dist/client/journey";
if (existsSync(journeyDir)) {
  for (const name of readdirSync(journeyDir).filter((f) => f !== "scene.svg")) {
    console.log(`FAIL stray journey file: ${name}`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
```

- [ ] **Step 4: Run the tests, then the real check**

Run: `pnpm vitest run test/checkBundleSize.test.ts && pnpm build && pnpm size`
Expected: PASS, and on the real build every row `ok`, including `Deck lazy JS (gz)` somewhere between 110 and 170 KB. If the initial JS row grew by more than 3 KB against Task 1's number, `index.ts` pulled something heavy: check with `ls -la dist/client/_astro` that neither `deck-stage` nor `three` is in the initial set and that `deck-paint`/`career` are the only new initial code.

- [ ] **Step 5: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test`

```bash
git add scripts/check-bundle-size.mjs test/checkBundleSize.test.ts
git commit -m "size: budget the deck's lazy chunks and keep Three.js out of the initial graph"
```

---

### Task 13: End-to-end and visual coverage

**Files:**

- Modify: `e2e/journey.spec.ts` (rewrite)
- Modify: `e2e/visual.spec.ts` (the two journey tests)
- Maybe modify: `playwright.config.ts` (WebGL flags for headless Chromium)
- Delete: `e2e/__screenshots__/*/journey-rank-b-*.png` (the controller regenerates baselines)

- [ ] **Step 1: Rewrite the journey spec**

Replace `e2e/journey.spec.ts` with:

```ts
import { test, expect, type Page } from "@playwright/test";
import { HEADER_PX } from "./constants";

const RANKS = ["E", "D", "C", "B", "A", "S", "S+"] as const;
const TITLES = [
  "T1 Tech Support",
  "Web Concierge (WP Live)",
  "Professional Services Engineer",
  "T3 Tech Support",
  "Systems Administrator",
  "Linux Engineer",
  "Sr. Systems Architect",
] as const;
const FROZEN = "/?deck-freeze=2026-09-25";

/** Scrolls so the journey is at the middle of rank `i` (of 7). */
async function scrollToRank(page: Page, i: number) {
  await page.evaluate(
    ({ rank, header }) => {
      const el = document.querySelector<HTMLElement>("[data-deck]")!;
      const top = el.getBoundingClientRect().top + scrollY - header;
      const span = el.offsetHeight - (innerHeight - header);
      scrollTo({ top: top + span * ((rank + 0.5) / 7), behavior: "instant" });
    },
    { rank: i, header: HEADER_PX },
  );
}

const track = (page: Page) => page.locator("[data-deck]");
const ready = (page: Page) =>
  expect(track(page)).toHaveAttribute("data-deck-ready", "", { timeout: 20_000 });

/** Records the deck chunk and the portrait requests. */
function trackRequests(page: Page) {
  const seen = { deck: false, hosts: new Set<string>() };
  page.on("request", (request) => {
    const url = new URL(request.url());
    seen.hosts.add(url.host);
    if (/\/_astro\/(deck-stage|three)/.test(url.pathname)) seen.deck = true;
  });
  return seen;
}

test.describe("the card deck", () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name === "reduced-motion", "covered below");
  });

  test("loads no deck chunk with the page, then prefetches it after the first scroll", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "one project is enough");
    const seen = trackRequests(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(seen.deck).toBe(false);
    const chunk = page.waitForRequest(/\/_astro\/deck-stage/, { timeout: 10_000 });
    await page.evaluate(() => scrollBy({ top: 120, behavior: "instant" }));
    await chunk;
    expect(seen.deck).toBe(true);
  });

  test("mounts when the journey is on screen, plays the intro, and settles in the scroll state", async ({
    page,
  }) => {
    await page.goto("/");
    await scrollToRank(page, 0);
    await ready(page);
    await expect(track(page)).toHaveAttribute("data-deck-tier", /^(mid|high)$/);
    await expect(track(page)).toHaveAttribute("data-deck-state", "scroll", { timeout: 10_000 });
    await expect(track(page)).toHaveAttribute("data-deck-rank", "E");
    await expect(track(page)).toHaveAttribute("data-deck-phase", /^(landing|presented)$/);
  });

  test("advances through all seven ranks in order as you scroll, and the rail follows", async ({
    page,
  }) => {
    await page.goto(FROZEN);
    await scrollToRank(page, 0);
    await ready(page);
    for (const [i, rank] of RANKS.entries()) {
      await scrollToRank(page, i);
      await expect(track(page)).toHaveAttribute("data-deck-rank", rank);
      await expect(
        page.getByRole("button", { name: `Rank ${rank}, ${TITLES[i]}` }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("[data-deck-rank][aria-pressed='true']")).toHaveCount(1);
      await expect(page.locator("[data-deck-counter]")).toHaveText(`0${i + 1} / 07`);
      await expect(page.locator("[data-deck-live]")).toContainText(`Rank ${rank}, `);
    }
  });

  test("scrolling back up rewinds the deck", async ({ page }) => {
    await page.goto(FROZEN);
    await scrollToRank(page, 6);
    await ready(page);
    await expect(track(page)).toHaveAttribute("data-deck-rank", "S+");
    await scrollToRank(page, 1);
    await expect(track(page)).toHaveAttribute("data-deck-rank", "D");
  });

  test("the rail jumps to a rank on click and moves focus with the arrows", async ({ page }) => {
    await page.goto(FROZEN);
    await scrollToRank(page, 0);
    await ready(page);
    await page.getByRole("button", { name: "Rank S+, Sr. Systems Architect" }).click();
    await expect(track(page)).toHaveAttribute("data-deck-rank", "S+", { timeout: 10_000 });
    const first = page.getByRole("button", { name: "Rank E, T1 Tech Support" });
    await first.focus();
    await page.keyboard.press("ArrowRight");
    await expect(
      page.getByRole("button", { name: "Rank D, Web Concierge (WP Live)" }),
    ).toBeFocused();
    await page.keyboard.press("End");
    await expect(
      page.getByRole("button", { name: "Rank S+, Sr. Systems Architect" }),
    ).toBeFocused();
  });

  test("clicking a racked card jumps to it, and hovering one shows a pointer", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "the rack is a desktop layout");
    await page.goto(FROZEN);
    await scrollToRank(page, 0);
    await ready(page);
    const slots = (await track(page).getAttribute("data-deck-slots"))!
      .split(";")
      .map((s) => s.split(",").map(Number));
    expect(slots).toHaveLength(7);
    const stage = (await page.locator(".journey__stage").boundingBox())!;
    const [x, y] = slots[3]!;
    await page.mouse.move(stage.x + x!, stage.y + y!);
    await expect(page.locator("[data-deck-gl]")).toHaveClass(/is-pointer/);
    await page.mouse.click(stage.x + x!, stage.y + y!);
    await expect(track(page)).toHaveAttribute("data-deck-rank", "B", { timeout: 10_000 });
  });

  test("a stage that arrives late paints the rank the visitor is on, with no intro", async ({
    page,
  }) => {
    await page.route(/\/_astro\/deck-stage/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });
    const states: string[] = [];
    await page.goto(FROZEN);
    await scrollToRank(page, 4);
    await ready(page);
    states.push((await track(page).getAttribute("data-deck-state"))!);
    await expect(track(page)).toHaveAttribute("data-deck-rank", "A");
    expect(states).not.toContain("intro");
  });

  test("keeps the canvas the size of the stage through a resize", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "desktop windows");
    await page.goto(FROZEN);
    await scrollToRank(page, 2);
    await ready(page);
    await page.setViewportSize({ width: 1024, height: 700 });
    await scrollToRank(page, 2);
    await expect(track(page)).toHaveAttribute("data-deck-rank", "C");
    const sizes = await page.evaluate(() => {
      const canvas = document.querySelector<HTMLCanvasElement>("[data-deck-gl]")!;
      const stage = document.querySelector<HTMLElement>(".journey__stage")!;
      return {
        canvas: canvas.width / devicePixelRatio,
        stage: stage.clientWidth,
        dpr: devicePixelRatio,
      };
    });
    expect(Math.abs(sizes.canvas - sizes.stage)).toBeLessThanOrEqual(2 * sizes.dpr);
  });

  test("is hidden from assistive tech while the timeline stays readable", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-deck-gl]")).toHaveAttribute("aria-hidden", "true");
    await expect(page.getByRole("heading", { level: 3, name: "T1 Tech Support" })).toHaveCount(1);
    await expect(page.getByRole("toolbar", { name: "Ranks" })).toBeVisible();
  });

  test("offers a way to skip past it, visible only on focus", async ({ page }) => {
    await page.goto("/");
    const skip = page.getByRole("link", { name: "Skip the career journey" });
    await expect(skip).toHaveAttribute("href", "#skills");
    const box = await skip.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(1);
    await skip.focus();
    expect((await skip.boundingBox())!.width).toBeGreaterThan(40);
  });

  test("a lost WebGL context hands the section to the timeline within two seconds", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "one project is enough");
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(FROZEN);
    await scrollToRank(page, 1);
    await ready(page);
    await page.evaluate(() => {
      const canvas = document.querySelector<HTMLCanvasElement>("[data-deck-gl]")!;
      const gl = canvas.getContext("webgl2")!;
      gl.getExtension("WEBGL_lose_context")!.loseContext();
    });
    await expect(page.locator("[data-deck-root]")).toHaveAttribute("data-deck-fallback", "", {
      timeout: 5000,
    });
    await expect(page.locator(".journey-fallback .timeline")).toBeVisible();
    await expect(track(page)).toBeHidden();
    expect(errors).toEqual([]);
  });

  test("loads nothing from third parties, keeps the textures under the ceiling and reaches the end", async ({
    page,
  }, info) => {
    const seen = trackRequests(page);
    await page.goto(FROZEN);
    await scrollToRank(page, 6);
    await ready(page);
    expect([...seen.hosts]).toEqual(["127.0.0.1:4399"]);
    const vram = Number(await track(page).getAttribute("data-deck-vram"));
    expect(vram).toBeGreaterThan(0);
    expect(vram).toBeLessThanOrEqual(info.project.name === "desktop" ? 80 : 40);
    await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
    await expect
      .poll(() =>
        page.evaluate(() =>
          Number(
            getComputedStyle(document.querySelector("[data-deck]")!).getPropertyValue("--progress"),
          ),
        ),
      )
      .toBeGreaterThanOrEqual(0.999);
    await expect(track(page)).toHaveAttribute("data-deck-rank", "S+");
  });
});

test.describe("reduced motion", () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "reduced-motion", "reduced-motion project only");
  });

  test("shows the static timeline instead of the deck, and never fetches the stage", async ({
    page,
  }) => {
    const seen = trackRequests(page);
    await page.goto("/");
    await expect(page.locator("[data-deck]")).toBeHidden();
    await expect(page.locator(".journey-fallback .timeline")).toBeVisible();
    await expect(page.locator(".journey-fallback .timeline__title")).toHaveCount(7);
    await expect(page.locator(".journey-fallback .timeline__log")).toHaveCount(7);
    await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
    await page.waitForLoadState("networkidle");
    expect(seen.deck).toBe(false);
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "desktop", "one project is enough");
  });

  test("shows the static timeline", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-deck]")).toBeHidden();
    await expect(page.locator(".journey-fallback .timeline")).toBeVisible();
  });
});
```

- [ ] **Step 2: Replace the two journey visual tests**

In `e2e/visual.spec.ts`, delete the tests "journey mid-way (rank B, escalation)" and "journey start (rank E, headset)" and add:

```ts
for (const [rank, index] of [
  ["e", 0],
  ["s", 5],
  ["s-plus", 6],
] as const) {
  test(`journey rank ${rank.toUpperCase()}`, async ({ page }) => {
    await page.goto("/?deck-freeze=2026-09-25");
    await page.evaluate(
      ({ i, header }) => {
        const el = document.querySelector<HTMLElement>("[data-deck]")!;
        const top = el.getBoundingClientRect().top + scrollY - header;
        scrollTo({
          top: top + (el.offsetHeight - innerHeight + header) * ((i + 0.5) / 7),
          behavior: "instant",
        });
      },
      { i: index, header: HEADER_PX },
    );
    await expect(page.locator("[data-deck]")).toHaveAttribute("data-deck-ready", "", {
      timeout: 20_000,
    });
    await expect(page.locator("[data-deck]")).toHaveAttribute(
      "data-deck-rank",
      rank === "s-plus" ? "S+" : rank.toUpperCase(),
    );
    await expect(page).toHaveScreenshot(`journey-rank-${rank}.png`, {
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
      threshold: 0.02,
    });
  });
}
```

Delete the stale baselines: `git rm e2e/__screenshots__/*/journey-rank-b-*.png e2e/__screenshots__/*/journey-rank-e-*.png`.

- [ ] **Step 3: Build and run the suite**

Run: `pnpm build && pnpm test:e2e`
Expected: green. If the "mounts when the journey is on screen" test ends in fallback on every project, headless Chromium has no WebGL2 here: add to `playwright.config.ts`'s `use` block

```ts
    launchOptions: {
      args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
    },
```

and run again. Never weaken the tests to pass without WebGL.

- [ ] **Step 4: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test`

```bash
git add e2e/journey.spec.ts e2e/visual.spec.ts playwright.config.ts
git commit -m "e2e: the card deck's states, rail, jumps, fallbacks and budgets"
```

The visual baselines (`pnpm test:visual --update-snapshots`) are the controller's job after the browser check.

---

### Task 14: The record

**Files:**

- Create: `docs/decisions/0004-three-js-in-the-journey.md`
- Modify: `CLAUDE.md`
- Modify: `docs/superpowers/specs/2026-09-25-journey-card-deck-design.md` (the status line)

- [ ] **Step 1: Write ADR 0004**

Create `docs/decisions/0004-three-js-in-the-journey.md`:

```markdown
# 0004 — Three.js, lighting, bloom, glow and smoke inside the journey

- **Status:** Accepted
- **Date:** 2026-09-25
- **Decider:** Marcus Hancock-Gaillard
- **Amends:** [0002](0002-axiom-design-system.md) (Motion, Elevation, Imagery, Budgets) and
  [0003](0003-colour-exceptions.md) (Journey art)

## Context

The journey is the site's main attraction. Marcus chose a deck of seven player cards rendered in
WebGL (`docs/superpowers/specs/2026-09-25-journey-card-deck-design.md`): lit card meshes that
rack, flip and float, with violet smoke that leaves the S+ card. ADR 0002 bans shadows, gradients,
blur, glow and Three.js, and ADR 0003 confines violet to the journey art. The deck needs exceptions
to all of them, in one place.

## Decisions

| Area            | Decision                                                                                                                                                                                                         |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Three.js        | Allowed only for the journey deck. It lives in lazy chunks (`deck-stage`, later `deck-bloom`) that never enter a page's initial graph; the chunk may prefetch after the first scroll. `pnpm size` enforces both. |
| Lighting        | WebGL lighting, an environment reflection and (high tier only) selective bloom are allowed on the deck's meshes. Painted colours stay exact through the emissive recipe with no tone mapping.                    |
| Glow            | Allowed on the S and S+ cards only, as light, bloom and additive sprites. Never CSS `box-shadow`, `filter` or `text-shadow` anywhere on the site.                                                                |
| Smoke, fog      | Violet smoke and fog are allowed from the S and S+ cards only, and may cross the deck column inside the journey section.                                                                                         |
| Violet          | 0003's rule stands, extended: violet also appears in the S RankChip's border on the card, the S and S+ back seams, the eyes' glow mask and the energy, all inside the deck.                                      |
| Section         | The journey section's tone is `void`, so the violet reads on true black.                                                                                                                                         |
| Motion          | 0002's "animate only transform and opacity" governs the DOM; the deck's canvas renders whatever its shaders draw.                                                                                                |
| Everything else | UI outside the section keeps ADR 0002 exactly. `test/tokens.test.ts` and `test/deckPalette.test.ts` hold the line.                                                                                               |

## Consequences

- `three` and `@types/three` are pinned dependencies. The deck's lazy JS has a 170 KB gz budget
  and bloom (Plan 3) a 40 KB one.
- Devices without WebGL2, under reduced motion or save-data, or with two cores or 2 GB get the
  timeline; the deck never mounts there.
- The vector scene, its art pipeline and `scene.svg` are retired in Phase 6 of the deck plan.
```

- [ ] **Step 2: Update CLAUDE.md**

Make these edits in `CLAUDE.md`:

1. In the rebuild banner, after the "Vector journey done" paragraph, add:
   `> **Journey card deck in progress** (replaces the vector scene). Spec: docs/superpowers/specs/2026-09-25-journey-card-deck-design.md; plans: docs/superpowers/plans/2026-09-25-journey-deck-*.md; ADR 0004. Plans 1 (foundations) and 2 (the stage, desktop) are done; energy, phone and the tuning/retirement phases follow.`
2. In "Commands", replace the `pnpm size` bullet with: `` `pnpm size` checks `dist/` (it runs in CI): initial JS on `/`, fonts between 20 and 120 KB (0 means the Fonts API entry broke), the deck's lazy JS (Three.js and the stage, ≤ 170 KB gz, never in the initial graph) and the journey scene until Phase 6 retires it. ``
3. In "Where things live", replace the Plan 1 bullet with: ``The journey card deck: `src/components/journey/Journey.astro` (the stage's DOM: canvas, layout column, rank rail, counter, hint, live region) with `JourneyTimeline.astro` as the accessible twin and fallback; `src/scripts/deck/` (`index.ts` runs in the page, `deck-stage.ts` is the lazy Three.js stage, `deck-pose.ts`/`deck-layout.ts`/`deck-paint.ts`/`deck-textures.ts` are pure and unit-tested, `deck-params.ts` holds every tunable, `deck-tune.ts` is the dev panel behind `?tune`); `src/data/deck.ts` (per-rank art record) and `src/images/deck/` (portraits and glow masks from `scripts/import-portrait.mjs`). `?deck-freeze=YYYY-MM-DD` stills the deck for tests.``
4. In "Design brief", change the "Elevation comes only from those steps: no shadows, gradients, blur or glow." sentence to end with "(the journey deck is the one exception, ADR 0004)".
5. Replace the "Journey (`src/components/journey/`)" bullet group with:
   `- Journey (`src/components/journey/`): the card deck. `Journey.astro`renders the stage's DOM contract (see the plan) and`src/scripts/deck/index.ts`decides the tier, prefetches the stage after the first scroll, mounts it when the journey is on screen, mirrors its state to`data-deck-*`attributes and falls back to the timeline when WebGL2 is missing or a context is lost. Colour management is fixed in`deck-stage.ts`: no tone mapping, sRGB out, faces on the emissive recipe. Switch stages with visibility/opacity, never `display`, while the section is pinned.`
6. In "Dark only…", replace "No hero aura effect (the Three.js one is gone)" with "No hero aura effect; Three.js exists only in the journey deck's lazy chunk (ADR 0004)".
7. In "Animate only `transform` and `opacity`…", append " The deck's canvas is WebGL and outside this rule (ADR 0004)."
8. In "Budgets", replace "no Three.js (removed in the Axiom redesign)" with "Three.js only in the deck's lazy chunks: ≤ 170 KB gz, never in the initial graph", and replace the last bullet with "the deck's chunk may prefetch after the first scroll; its portraits load only once the journey is on screen; `scene.svg` ≤ 300 KB gz until Phase 6 removes it".

- [ ] **Step 3: Update the spec's status**

In `docs/superpowers/specs/2026-09-25-journey-card-deck-design.md`, change the status line to:
`- **Status:** Approved 2026-09-25. Plan 1 (foundations) and Plan 2 (the stage, desktop) implemented; ADR 0004 written with Plan 2.`

- [ ] **Step 4: The full gate**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test && pnpm build && pnpm size && pnpm test:e2e`
Expected: everything green.

- [ ] **Step 5: Commit**

```bash
git add docs/decisions/0004-three-js-in-the-journey.md CLAUDE.md docs/superpowers/specs/2026-09-25-journey-card-deck-design.md
git commit -m "docs: ADR 0004 and the deck's place in CLAUDE.md"
```

- [ ] **Step 6: Hand back for the browser check**

Report the branch head and the `pnpm size` rows to the controller. The controller opens the production build at 1440 in claude-in-chrome, checks the intro, a pull, the print-in, the tilt, a rail jump and the fallback under reduced motion, shows Marcus the screenshots, regenerates the visual baselines (`pnpm test:visual --update-snapshots`) and commits them, then writes the Build Log entry. Phone widths are checked in Plan 4.
