# Journey Deck, Plan 3: The Energy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the S and S+ cards come alive: the violet glow masks light the eyes and the coat, the back seams pulse in the rack, a violet point light breathes on the presented card, smoke rises from it and drifts across the section, a far-field fog grows behind S+, the landing flares, a contact shadow grounds the presented card, and the high tier blooms the glowing parts through a second lazy chunk. Everything is deterministic under `?deck-freeze`, tunable from the dev panel, and inside the budgets.

**Architecture:** Spec Phase 4. The arithmetic of the energy (light intensity, breath, flare, glow and seam opacity, sprite scale, fog level, shadow, smoke rate) lives in a pure module, `deck-energy.ts`, and the smoke's particle state in a pure `SmokePool` (`deck-smoke.ts`), both unit-tested. `deck-effects.ts` owns the Three.js objects (glow planes, seam planes, the glow sprite, the point light, the smoke sprites, the fog plane, the contact shadows) and copies those numbers onto them every frame; it exposes `prewarm()` so a frozen deck renders a settled cloud. `deck-fog.ts` holds the fog's GLSL and its uniform objects with no Three import. `deck-bloom.ts` is the second lazy chunk: an `EffectComposer` running the selective bloom pattern (darken everything off the bloom layer, bloom, composite additively over the base render) on the high tier only. `deck-stage.ts` first sheds its card-mesh construction into `deck-cards.ts` so it stays under its 600-line ceiling, then wires the effects and the composer into its frame, resize, freeze and dispose paths. `pnpm size` gains the bloom row and the portrait rendition rows.

**Tech Stack:** Astro 7, TypeScript 6, Three.js 0.186 (`three/addons/postprocessing/*`), vitest 5, Playwright 1.63.

**Spec:** `docs/superpowers/specs/2026-09-25-journey-card-deck-design.md`, §5 (glow mask, seams, states), §7 (render loop), §8 (energy, light, smoke, fog, shadow, bloom, tiers), §9 (chunks, textures, freeze), §11 (budgets), §12 (tests), §15 (Phase 4). **Depends on:** Plans 1, 2 and 0 on `journey-card-deck` (head e3d76a7): the stage, the pose model's `energy`/`kind`/`energyIndex`, `DECK_PARAMS.{energy,light,smoke,fog,glow,seam,shadow,bloom}` already declared, the seven portraits and their `-glow.webp` masks under `src/images/deck/`, and the rail's `data-glow` URLs.

## Facts about the code as built (read before any task)

- `deck-stage.ts` is 599 lines against a 600-line ceiling; Task 1 extracts the card-mesh code before anything is added. Its frame already computes `pose.energy`, `pose.kind` and `pose.energyIndex`, tracks `landedAt[i]`, seeds a `mulberry32` RNG (`freeze ? 7 : random`) reserved for the smoke, and loads each rank's glow mask into `glows[i]` with a comment pointing here.
- The portraits are rendered on a dark graphite field (`#191919`) with true black cloth; `paintBody` cover-fits the portrait into the card's top 52 % anchored top-centre, so the glow mask (the same picture keyed to violet, 400 px wide) must be placed with the same fit: `coverFit()` in Task 2 mirrors `paintBody`'s maths and the plane uses `texture.repeat/offset`.
- Every rank's eye colour is `deckArt[i].eyeColor` (`cards[i].art.eyeColor` in the stage); the S+ mask covers the coat's energy as well as the eyes (its coverage is 6.9 %).
- `test/deckPalette.test.ts` scans every `.ts` file in `src/scripts/deck/` for `#rrggbb` and `0xrrggbb` literals; new files must use `COLORS` from `deck-paint.ts`, `COLORS.violet`, or a literal added to the allowed set with a comment. `#9d86d8` (the lighter quarter of the puffs, spec §8) joins `COLORS` as `puffLight` and the allowed set in Task 4; the eye colours reach the effects as data (`deckArt[i].eyeColor`), never as literals.
- The rail's buttons carry `data-deck-rank`; so does the track's state attribute. E2E selectors for buttons use `button[data-deck-rank]`.
- Freeze mode (`?deck-freeze=YYYY-MM-DD`): `dt = 0`, the clock is fixed, one frame renders after the assets settle, `firstFrameDone` seeds `landedAt`. Smoke needs a deterministic pre-warm there (Task 6).
- The stage's tier is `"mid" | "high"` (`opts.tier`); `index.ts` never mounts tier `none`. The mid tier has no composer and renders the bloom-layer objects with 1.6× opacity.
- `scripts/check-bundle-size.mjs` walks static imports from the pages' HTML; every `_astro/*.js` not in that closure is "lazy". The `deck-bloom` chunk must be its own file (a dynamic import from `deck-stage.ts`), counted in its own row, and never in the initial graph (the leak regex already names it).
- `deck-tune.ts` binds range inputs to dotted paths into `DECK_PARAMS` (`ROWS: [label, path, min, max, step]`); the panel runs only under `astro dev` with `?tune`.

## Global Constraints

- pnpm only; no new dependencies (Three.js 0.186 already ships the postprocessing addons). Branch `journey-card-deck` in this worktree. Every commit is GPG-signed through Marcus's global git config; if signing fails, STOP and report BLOCKED; never pass `--no-gpg-sign`. No AI attribution anywhere. Never `git stash`; never push.
- Before every commit: `pnpm format && pnpm lint && pnpm check && pnpm test`, `0 errors` from check. `pnpm build && pnpm size` at Tasks 8, 9 and 12. E2E (`pnpm build && pnpm test:e2e`) at Tasks 8, 11 and 12. The suite stays green after every task.
- Budgets: initial JS on `/` ≤ 100 KB gz; the deck chunk ≤ 170 KB gz; the bloom chunk ≤ 40 KB gz; neither in the initial graph; served portrait renditions 800 px ≤ 120 KB, 400 px ≤ 40 KB, mask ≤ 10 KB; zero third-party requests; the stage's texture estimate ≤ 80 MB on desktop.
- Colour management stays exact: `NoToneMapping`, `SRGBColorSpace` output, painted colour textures tagged sRGB; the composer's `OutputPass` is the only place the sRGB conversion happens when bloom is on. Every hex in `src/scripts/deck/` is a token, violet, or in the palette test's allowed set.
- Animate only `transform` and `opacity` in the DOM; the canvas draws what its shaders draw (ADR 0004). Nothing flashes faster than the 400 ms flare. `prefers-reduced-motion` never mounts the stage, so no new motion needs a reduced path.
- CSP: no inline `style=`, no `is:inline`; the dev panel keeps using `el.style.cssText`.
- `deck-stage.ts` stays ≤ 600 lines; `deck-effects.ts` ≤ 400; `deck-bloom.ts` ≤ 120. No `any`, no non-null assertions in new code (guards or `??`). No per-frame allocation in the hot paths that the plan marks as such.
- World units: 100 CSS px per unit (`PX = 1 / 100`); the stage's helpers `toX`/`toY` convert layout px; z is positive toward the camera; the presented card sits at `z = pull.liftZ px`.
- `src/fetch.ts` is reserved by Astro 7: never create it.

## Review Focus

1. **A re-mount after the 30 s dispose leaks nothing** (140 sprite materials, three puff textures, two composers, the fog material, the seams): every object created in Tasks 6 and 7 is disposed in `dispose()`, and the e2e reads `data-deck-vram` after a dispose and re-mount and finds it unchanged. Pinned in Task 6 (dispose list), Task 7 (composer disposal) and Task 11 (the re-mount test).
2. **Bloom over a transparent canvas**: the composite must keep the canvas transparent where nothing is drawn (the page behind the stage stays visible; no black rectangle over the section) and must not shift the painted colours. Pinned in Task 7 (the mix shader keeps `max(base.a, glow)`, `OutputPass` does the one sRGB conversion) and Task 11 (a pixel of the stage outside every card is transparent on the high tier; the S+ visual baseline).
3. **A frozen deck renders the same smoke twice**: the RNG is seeded, the pool pre-warms a fixed number of frames, and nothing reads `performance.now()` or `Math.random()`. Pinned in Task 3 (determinism test), Task 6 (`prewarm`) and Task 11 (the visual baselines pass on a second plain run).
4. **The glow mask sits exactly on the portrait**: eyes lit a few pixels off the eyes would look like a defect at S. Pinned in Task 2 (`coverFit` mirrors `paintBody`'s maths for a 3:2 mask in a 5:7 card's 52 % window) and the S visual baseline.
5. **The energy never bleeds onto E–A**: the light is at 0, the glow planes at 0, the fog invisible, no puff alive, no seam on those backs. Pinned in Task 2 (every helper returns 0 for `kind === null`), Task 3 (rate 0 spawns nothing) and Task 11 (`data-deck-energy` is `0` through E–A and the pixel sample beside the A card is unlit).

## Deviations from the spec, decided while planning

- The card-mesh construction moves out of `deck-stage.ts` into `deck-cards.ts` (not in the spec's file table): a mechanical extraction so the stage stays under its ceiling. No behaviour change.
- The smoke is a pool of `Sprite` objects with one `SpriteMaterial` each (per-sprite opacity and rotation need it), sharing three puff textures, rather than a single points cloud; 140 draw calls on the high tier are within budget for this scene.
- The seam is a painted texture on a back-side plane (a 1.5 px violet rounded rectangle 6 px in), not a line geometry, so it blooms like the other painted glow.
- The bloom composite keeps alpha as `max(base.a, glow)` so the additive glow reads over the page's void; the spec's "composited additively" left alpha unsaid.
- `StageState` gains `bloom: boolean` and the track gains `data-deck-bloom` (`on | off`) so e2e can prove the tier rule without reading network timing.
- The portrait rendition rows of `pnpm size` (spec §11, scheduled for Phase 6) land here: the portraits exist now, and the row is cheap.
- The fog's radius is passed to the shader in stage-height units (radius world ÷ stage height world) with the x axis scaled by the aspect, so the falloff is circular on screen.
- `DECK_PARAMS.smoke` gains `prewarmFrames: 240` (the frozen cloud's age) so the panel and the freeze agree.

## File structure

| File                                             | Role                                                                                                                                                       | Tests                          |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `src/scripts/deck/deck-cards.ts`                 | New: `loadImage`, `CardMeshes`, `buildCards` (slab, layers, laminated and unlit materials), `layoutCards` (sizes and z offsets). Extracted from the stage. | e2e (unchanged behaviour)      |
| `src/scripts/deck/deck-energy.ts`                | New, pure: breath, flare, glow opacity, seam opacity, glow sprite scale, point light intensity, fog level, shadow, smoke rate and side speed, `coverFit`.  | `test/deckEnergy.test.ts`      |
| `src/scripts/deck/deck-smoke.ts`                 | New, pure: `SmokePool` (spawn from the card's edges, rate accumulator, step, opacity and scale curves), seeded.                                            | `test/deckSmoke.test.ts`       |
| `src/scripts/deck/deck-paint.ts`                 | Adds `paintPuff`, `paintRadial`, `paintSeam`, `PUFF_SIZE`, `RADIAL_SIZE`.                                                                                  | `test/deckPaint.test.ts`       |
| `src/scripts/deck/deck-fog.ts`                   | New, pure: `FOG_VERTEX`, `FOG_FRAGMENT`, `fogUniforms()`.                                                                                                  | `test/deckFog.test.ts`         |
| `src/scripts/deck/deck-effects.ts`               | New: `DeckEffects` (Three objects for glow, seams, sprite, light, smoke, fog, shadows), `BLOOM_LAYER`.                                                     | e2e + visual                   |
| `src/scripts/deck/deck-bloom.ts`                 | New lazy chunk: `mountBloom` (selective bloom composer).                                                                                                   | visual + size                  |
| `src/scripts/deck/deck-stage.ts`                 | Wires effects and bloom; `leaveAt`; freeze prewarm; `bloom` in `StageState`; vram sum.                                                                     | e2e + visual                   |
| `src/scripts/deck/deck-params.ts`                | `smoke.prewarmFrames`.                                                                                                                                     | type-checked                   |
| `src/scripts/deck/deck-tune.ts`                  | Rows for energy, light, smoke, fog, glow, seam, shadow, bloom.                                                                                             | none (dev only)                |
| `src/scripts/deck/index.ts`                      | Writes `data-deck-bloom`; clears it on fallback.                                                                                                           | e2e                            |
| `scripts/check-bundle-size.mjs`                  | Bloom row; the deck row excludes the bloom chunk; portrait rendition rows from `index.html`.                                                               | `test/checkBundleSize.test.ts` |
| `e2e/journey.spec.ts`, `e2e/visual.spec.ts`      | Bloom tier tests, energy and vram assertions, re-mount leak test, transparency sample; regenerated S and S+ baselines.                                     | themselves                     |
| `docs/superpowers/specs/…design.md`, `CLAUDE.md` | Status and the deck bullet.                                                                                                                                | none                           |

## Interfaces (the contracts between tasks)

```ts
// deck-energy.ts
export type EnergyKind = "S" | "S+";
export const GLOW_LEAVE_MS = 200;
export const easeOutCubic: (t: number) => number;
export function breath(time: number, params?: DeckParams): number;
export interface Flare { light: number; fog: number; glow: number }
export function flare(kind: EnergyKind | null, sinceLandMs: number | null, params?: DeckParams): Flare;
export function glowOpacity(phase: CardPhase, sinceLandMs: number | null, sinceLeaveMs: number | null, params?: DeckParams): number;
export function seamOpacity(kind: EnergyKind, time: number, params?: DeckParams): number;
export const proportion: (cardWPx: number) => number; // cardW / 260
export function glowSpriteScale(kind: EnergyKind, energy: number, cardWPx: number, params?: DeckParams): number;
export function pointLightIntensity(kind: EnergyKind | null, energy: number, breathValue: number, flareLight: number, params?: DeckParams): number;
export interface FogLevel { radius: number; strength: number } // radius in world units
export function fogFor(kind: EnergyKind | null, energy: number, kick: number, params?: DeckParams): FogLevel;
export interface Shadow { w: number; h: number; opacity: number } // world units
export function shadowFor(pull: number, zPx: number, cardWPx: number, params?: DeckParams): Shadow;
export function smokeRate(kind: EnergyKind | null, energy: number, params?: DeckParams): number;
export function smokeSideSpeed(kind: EnergyKind | null, energy: number, params?: DeckParams): number;
export function burstCount(kind: EnergyKind, params?: DeckParams): number;
export interface CoverFit { repeatX: number; repeatY: number; offsetX: number; offsetY: number }
export function coverFit(w: number, winH: number, iw: number, ih: number): CoverFit;

// deck-smoke.ts
export interface Puff { alive: boolean; x: number; y: number; z: number; vx: number; vy: number; rot: number; vrot: number; scale0: number; scale1: number; peak: number; life: number; age: number; variant: 0 | 1 | 2; tint: 0 | 1 }
export interface SmokeEmitter { x: number; y: number; z: number; halfW: number; halfH: number; k: number }
export const SMOKE: { riseMin; riseMax; driftMax; sidePush; zMin; zMax; scale0Min; scale0Max; growMin; growMax; lifeMin; lifeMax; spinMax };
export class SmokePool {
  constructor(capacity: number, rng: () => number, opacityMin: number, opacityMax: number);
  readonly capacity: number; readonly puffs: Puff[]; get alive(): number;
  spawn(e: SmokeEmitter, n: number, sideSpeed: number): number;
  emit(e: SmokeEmitter, ratePerFrame: number, sideSpeed: number, frames: number): number;
  step(frames: number): void; clear(): void;
  static t(p: Puff): number; static opacity(p: Puff, energy: number): number; static scale(p: Puff): number;
}

// deck-paint.ts additions
export const PUFF_SIZE = 256; export const RADIAL_SIZE = 128;
export function paintPuff(ctx: Ctx, size: number, rng: () => number): void;
export function paintRadial(ctx: Ctx, size: number, color: string, innerAlpha: number): void;
export function paintSeam(ctx: Ctx, w: number, h: number): void;

// deck-fog.ts
export const FOG_VERTEX: string; export const FOG_FRAGMENT: string;
export interface FogUniforms { uTime: { value: number }; uCentre: { value: [number, number] }; uRadius: { value: number }; uStrength: { value: number }; uAspect: { value: number }; uColor: { value: [number, number, number] } }
export function fogUniforms(color: [number, number, number]): FogUniforms;

// deck-effects.ts
export const BLOOM_LAYER = 1;
export interface EffectsOptions { scene: Scene; params: DeckParams; tier: "mid" | "high"; rng: () => number; kinds: (EnergyKind | null)[]; eyeColors: string[] }
export interface EffectCard { group: Group; phase: CardPhase; pull: number; zPx: number; sinceLandMs: number | null; sinceLeaveMs: number | null }
export interface EffectsFrame { time: number; frames: number; energy: number; energyIndex: number | null; kind: EnergyKind | null; cards: EffectCard[] }
export interface EffectsLayout { cardWPx: number; w: number; h: number; front: number; stageW: number; stageH: number; floorY: number } // w, h, front, stageW, stageH, floorY in world units
export class DeckEffects {
  constructor(opts: EffectsOptions);
  attach(index: number, group: Group): void;           // glow plane (blank until setGlow) and, for S/S+, the seam plane
  setGlow(index: number, image: HTMLImageElement | null): void;
  setLayout(layout: EffectsLayout): void;
  update(frame: EffectsFrame): void;
  prewarm(frame: EffectsFrame, frames: number): void;
  estimateBytes(): number;
  dispose(): void;
}

// deck-bloom.ts
export interface BloomHandle { render(): void; setSize(w: number, h: number): void; dispose(): void }
export function mountBloom(renderer: WebGLRenderer, scene: Scene, camera: Camera, params: DeckParams, width: number, height: number): BloomHandle;

// deck-stage.ts
export interface StageState { …; bloom: boolean }      // added
```

---

### Task 1: Extract the card meshes into `deck-cards.ts`

**Files:**

- Create: `src/scripts/deck/deck-cards.ts`
- Modify: `src/scripts/deck/deck-stage.ts` (delete the moved code, import it)

**Interfaces:**

- Produces: `loadImage(url)`, `CardMeshes`, `buildCards(cards, textures, envMap, unit, params)`, `layoutCards(meshes, layout, params)`. Consumes nothing new.

- [ ] **Step 1: Write the module**

Create `src/scripts/deck/deck-cards.ts` with the code currently in `deck-stage.ts` lines 82–109 (`CardMeshes`, `loadImage`), 177–199 (`laminated`, `unlit`, `unit` is passed in), 226–268 (the meshes map) and 274–298 (the per-card body of `applyLayout`), exactly as they are, wrapped:

```ts
// The seven card meshes (deck spec §5): a rounded slab with the face's painted layers on the front
// and the back on the back, built and sized here so deck-stage.ts keeps to the loop.
import {
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  type Material,
  type PlaneGeometry,
  type Texture,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { DeckLayout } from "./deck-layout";
import { CARD_W, CHIP_H, CHIP_W, COLORS, type CardModel } from "./deck-paint";
import type { DeckParams } from "./deck-params";
import type { DeckTextures } from "./deck-textures";

const PX = 1 / 100;

export interface CardMeshes {
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

export function loadImage(url: string | null): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () =>
      img.decode().then(
        () => resolve(img),
        () => resolve(img),
      );
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** The laminated recipe (spec §8): exact painted colours through the emissive, clearcoat on top. */
export function laminated(
  map: Texture,
  envMap: Texture,
  sheen: boolean,
  params: DeckParams,
): MeshPhysicalMaterial {
  const M = params.material;
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
}

export const unlit = (map: Texture): MeshBasicMaterial =>
  new MeshBasicMaterial({ map, transparent: true, depthWrite: false });

export function buildCards(
  cards: CardModel[],
  textures: DeckTextures,
  envMap: Texture,
  unit: PlaneGeometry,
  params: DeckParams,
): CardMeshes[] {
  const M = params.material;
  return cards.map((card, i) => {
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
    const bodyMat = laminated(textures.body(i), envMap, energetic, params);
    const body = new Mesh(unit, bodyMat);
    const frame = new Mesh(unit, unlit(textures.frame()));
    const text = new Mesh(unit, unlit(textures.blank())); // blank until a card is presented
    const chip = new Mesh(unit, unlit(textures.chip(i)));
    const backMat = laminated(textures.back(), envMap, false, params);
    const back = new Mesh(unit, backMat);
    back.rotation.y = Math.PI;
    group.add(slab, body, frame, text, chip, back);
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
}

/** Sizes every card to the layout; returns the front face's z (world) for the effects' planes. */
export function layoutCards(meshes: CardMeshes[], layout: DeckLayout, params: DeckParams): number {
  const M = params.material;
  const w = layout.cardW * PX;
  const h = layout.cardH * PX;
  const t = M.thickness * PX;
  const s = layout.cardW / CARD_W;
  const front = t / 2 + 0.001;
  for (const m of meshes) {
    m.slab.geometry.dispose();
    m.slab.geometry = new RoundedBoxGeometry(w, h, t, 2, M.cornerRadius * PX);
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
  return front;
}
```

- [ ] **Step 2: Use it from the stage**

In `deck-stage.ts`: remove the moved code; import `{ buildCards, layoutCards, loadImage, type CardMeshes } from "./deck-cards"`; replace the meshes map with `const meshes = buildCards(cards, textures, envMap, unit, params); for (const m of meshes) scene.add(m.group);`; replace `applyLayout`'s per-card loop with `const front = layoutCards(meshes, layout, params);` (keep the floor lines; keep a module-level `let front = 0` assigned there, Task 8 reads it); drop the now-unused imports (`Color`, `Group`, `Mesh`, `MeshBasicMaterial`, `MeshPhysicalMaterial`, `MeshStandardMaterial`, `RoundedBoxGeometry`, `CARD_W`, `CHIP_H`, `CHIP_W`, `Material` if unused). `applyText` still casts `mesh.text.material as MeshBasicMaterial`: keep that import if needed.

- [ ] **Step 3: Gate**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test && pnpm build && pnpm size`
Expected: 0 errors; 411 tests; four `ok` rows; `wc -l src/scripts/deck/deck-stage.ts` under 480.

- [ ] **Step 4: Commit**

```bash
git add src/scripts/deck/deck-cards.ts src/scripts/deck/deck-stage.ts
git commit -m "deck: the card meshes move into deck-cards.ts"
```

---

### Task 2: The energy arithmetic, pure

**Files:**

- Create: `src/scripts/deck/deck-energy.ts`
- Test: `test/deckEnergy.test.ts`

**Interfaces:** Produces every function in the Interfaces block above. Consumes `DECK_PARAMS` and `CardPhase`.

- [ ] **Step 1: Write the failing tests**

```ts
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
  it("is 0 while racked or pulling, whatever the clocks say", () => {
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
  it("has no fog without a kind, a fixed fog at S and a growing one at S+", () => {
    expect(fogFor(null, 1, 0, P)).toEqual({ radius: 0, strength: 0 });
    expect(fogFor("S", 0.3, 0, P)).toEqual({ radius: P.fog.radiusS, strength: P.fog.strengthS });
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
```

- [ ] **Step 2: Run them, expect failure**

Run: `pnpm vitest run test/deckEnergy.test.ts`
Expected: FAIL, the module does not exist.

- [ ] **Step 3: Write the module**

```ts
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
```

- [ ] **Step 4: Run the tests, expect green; gate; commit**

Run: `pnpm vitest run test/deckEnergy.test.ts` then `pnpm format && pnpm lint && pnpm check && pnpm test`.

```bash
git add src/scripts/deck/deck-energy.ts test/deckEnergy.test.ts
git commit -m "deck: the energy arithmetic, pure"
```

---

### Task 3: The smoke pool, pure

**Files:**

- Create: `src/scripts/deck/deck-smoke.ts`
- Test: `test/deckSmoke.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { SMOKE, SmokePool, type SmokeEmitter } from "../src/scripts/deck/deck-smoke";
import { mulberry32 } from "../src/scripts/deck/deck-util";

const emitter: SmokeEmitter = { x: 1, y: -0.5, z: 0.6, halfW: 1.3, halfH: 1.82, k: 1 };
const pool = (seed = 7, capacity = 20) => new SmokePool(capacity, mulberry32(seed), 0.1, 0.22);

describe("SmokePool", () => {
  it("spawns from the top edge half the time and each side a quarter, never past capacity", () => {
    const p = new SmokePool(4000, mulberry32(3), 0.1, 0.22);
    expect(p.spawn(emitter, 5000, 1)).toBe(4000);
    expect(p.alive).toBe(4000);
    const top = p.puffs.filter((q) => q.y === emitter.y + emitter.halfH).length;
    const left = p.puffs.filter((q) => q.x === emitter.x - emitter.halfW).length;
    const right = p.puffs.filter((q) => q.x === emitter.x + emitter.halfW).length;
    expect(top + left + right).toBe(4000);
    expect(top / 4000).toBeCloseTo(0.5, 1);
    expect(left / 4000).toBeCloseTo(0.25, 1);
    expect(right / 4000).toBeCloseTo(0.25, 1);
    for (const q of p.puffs) {
      expect(q.z).toBeGreaterThanOrEqual(emitter.z + SMOKE.zMin);
      expect(q.z).toBeLessThanOrEqual(emitter.z + SMOKE.zMax);
      expect(q.life).toBeGreaterThanOrEqual(SMOKE.lifeMin);
      expect(q.life).toBeLessThanOrEqual(SMOKE.lifeMax);
      expect(q.peak).toBeGreaterThanOrEqual(0.1);
      expect(q.peak).toBeLessThanOrEqual(0.22);
    }
    expect(p.puffs.filter((q) => q.tint === 1).length / 4000).toBeCloseTo(0.25, 1);
  });

  it("pushes side puffs outward, faster with sideSpeed, and lets top puffs drift either way", () => {
    const slow = pool(1, 400);
    slow.spawn(emitter, 400, 1);
    const fast = pool(1, 400);
    fast.spawn(emitter, 400, 2.5);
    const leftSlow = slow.puffs.find((q) => q.x === emitter.x - emitter.halfW);
    const leftFast = fast.puffs.find((q) => q.x === emitter.x - emitter.halfW);
    if (!leftSlow || !leftFast) throw new Error("expected a left-edge puff");
    expect(leftSlow.vx).toBeLessThan(0);
    expect(leftFast.vx).toBeCloseTo(leftSlow.vx * 2.5, 9);
    expect(slow.puffs.every((q) => q.vy > 0)).toBe(true);
  });

  it("accumulates a fractional rate: 0.35 per frame spawns 35 over 100 frames", () => {
    const p = pool(2, 200);
    let spawned = 0;
    for (let i = 0; i < 100; i++) spawned += p.emit(emitter, 0.35, 1, 1);
    expect(spawned).toBe(35);
    expect(pool(2, 200).emit(emitter, 0, 1, 100)).toBe(0);
  });

  it("ages, moves and recycles puffs, with sin(πt) opacity and a growing scale", () => {
    const p = pool(5, 2);
    p.spawn(emitter, 1, 1);
    const q = p.puffs[0];
    if (!q) throw new Error("expected a puff");
    const { x, y, life } = q;
    p.step(10);
    expect(q.age).toBe(10);
    expect(q.y).toBeGreaterThan(y);
    expect(q.x).not.toBe(x);
    expect(SmokePool.opacity(q, 1)).toBeCloseTo(Math.sin((Math.PI * 10) / life) * q.peak, 9);
    expect(SmokePool.opacity(q, 0.5)).toBeCloseTo(SmokePool.opacity(q, 1) / 2, 9);
    expect(SmokePool.scale(q)).toBeGreaterThan(q.scale0);
    expect(SmokePool.scale(q)).toBeLessThan(q.scale1);
    p.step(life);
    expect(q.alive).toBe(false);
    expect(p.alive).toBe(0);
    expect(p.spawn(emitter, 1, 1)).toBe(1);
  });

  it("is deterministic: the same seed and steps give the same puffs", () => {
    const run = () => {
      const p = pool(11, 60);
      for (let i = 0; i < 240; i++) {
        p.emit(emitter, 0.8, 1.6, 1);
        p.step(1);
      }
      return JSON.stringify(p.puffs);
    };
    expect(run()).toBe(run());
  });
});
```

- [ ] **Step 2: Run, expect failure. Step 3: Write the module**

```ts
// The smoke pool (deck spec §8, "Smoke"): a fixed pool of puffs simulated in plain numbers, frame
// by frame, from a seeded RNG, so a frozen deck renders the same cloud twice. deck-effects.ts owns
// the sprites and copies this state onto them. Units: world units (100 CSS px) scaled by k, the
// card's proportion; time in frames of 16.7 ms.
export interface Puff {
  alive: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  scale0: number;
  scale1: number;
  peak: number;
  life: number;
  age: number;
  variant: 0 | 1 | 2;
  tint: 0 | 1;
}

/** The energetic card's centre, half extents and proportion, in world units. */
export interface SmokeEmitter {
  x: number;
  y: number;
  z: number;
  halfW: number;
  halfH: number;
  k: number;
}

export const SMOKE = {
  riseMin: 0.0035,
  riseMax: 0.007,
  driftMax: 0.0012,
  sidePush: 0.004,
  zMin: -0.3,
  zMax: 0.35,
  scale0Min: 0.35,
  scale0Max: 0.7,
  growMin: 0.4,
  growMax: 1.0,
  lifeMin: 140,
  lifeMax: 290,
  spinMax: 0.012,
};

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const blank = (): Puff => ({
  alive: false,
  x: 0,
  y: 0,
  z: 0,
  vx: 0,
  vy: 0,
  rot: 0,
  vrot: 0,
  scale0: 0,
  scale1: 0,
  peak: 0,
  life: 1,
  age: 0,
  variant: 0,
  tint: 0,
});

export class SmokePool {
  readonly puffs: Puff[];
  private acc = 0;

  constructor(
    readonly capacity: number,
    private readonly rng: () => number,
    private readonly opacityMin: number,
    private readonly opacityMax: number,
  ) {
    this.puffs = Array.from({ length: capacity }, blank);
  }

  get alive(): number {
    let n = 0;
    for (const p of this.puffs) if (p.alive) n++;
    return n;
  }

  /** Spawns up to n puffs: half from the top edge, a quarter from each side edge. */
  spawn(e: SmokeEmitter, n: number, sideSpeed: number): number {
    let spawned = 0;
    for (const p of this.puffs) {
      if (spawned >= n) break;
      if (p.alive) continue;
      const pick = this.rng();
      const u = this.rng();
      if (pick < 0.5) {
        p.x = e.x + (u * 2 - 1) * e.halfW;
        p.y = e.y + e.halfH;
        p.vx = (this.rng() * 2 - 1) * SMOKE.driftMax * e.k;
      } else {
        const dir = pick < 0.75 ? -1 : 1;
        p.x = e.x + dir * e.halfW;
        p.y = e.y + (u * 2 - 1) * e.halfH;
        p.vx = dir * SMOKE.sidePush * sideSpeed * e.k;
        this.rng(); // keep the draw count equal on every branch
      }
      p.z = e.z + lerp(SMOKE.zMin, SMOKE.zMax, this.rng());
      p.vy = lerp(SMOKE.riseMin, SMOKE.riseMax, this.rng()) * e.k;
      p.rot = this.rng() * Math.PI * 2;
      p.vrot = (this.rng() * 2 - 1) * SMOKE.spinMax;
      p.scale0 = lerp(SMOKE.scale0Min, SMOKE.scale0Max, this.rng()) * e.k;
      p.scale1 = p.scale0 + lerp(SMOKE.growMin, SMOKE.growMax, this.rng()) * e.k;
      p.peak = lerp(this.opacityMin, this.opacityMax, this.rng());
      p.life = Math.round(lerp(SMOKE.lifeMin, SMOKE.lifeMax, this.rng()));
      p.age = 0;
      p.variant = Math.min(2, Math.floor(this.rng() * 3)) as 0 | 1 | 2;
      p.tint = this.rng() < 0.25 ? 1 : 0;
      p.alive = true;
      spawned++;
    }
    return spawned;
  }

  /** Emits at `rate` puffs per frame over `frames`, carrying the fraction to the next call. */
  emit(e: SmokeEmitter, rate: number, sideSpeed: number, frames: number): number {
    this.acc += rate * frames;
    const n = Math.floor(this.acc);
    this.acc -= n;
    return n > 0 ? this.spawn(e, n, sideSpeed) : 0;
  }

  step(frames: number): void {
    for (const p of this.puffs) {
      if (!p.alive) continue;
      p.age += frames;
      if (p.age >= p.life) {
        p.alive = false;
        continue;
      }
      p.x += p.vx * frames;
      p.y += p.vy * frames;
      p.rot += p.vrot * frames;
    }
  }

  clear(): void {
    for (const p of this.puffs) p.alive = false;
    this.acc = 0;
  }

  static t(p: Puff): number {
    return p.life > 0 ? Math.min(1, p.age / p.life) : 1;
  }

  /** sin(πt) up to the puff's peak, scaled by the stage's energy so a leaving card's cloud thins. */
  static opacity(p: Puff, energy: number): number {
    return Math.sin(Math.PI * SmokePool.t(p)) * p.peak * energy;
  }

  static scale(p: Puff): number {
    return lerp(p.scale0, p.scale1, SmokePool.t(p));
  }
}
```

- [ ] **Step 4: Green, gate, commit**

```bash
git add src/scripts/deck/deck-smoke.ts test/deckSmoke.test.ts
git commit -m "deck: the smoke pool, pure and seeded"
```

---

### Task 4: The puff, radial and seam painters

**Files:**

- Modify: `src/scripts/deck/deck-paint.ts` (append), `test/deckPalette.test.ts` (allowed set), `test/deckPaint.test.ts` (append)

- [ ] **Step 1: Write the failing tests** (append to `test/deckPaint.test.ts`; add `paintPuff`, `paintRadial`, `paintSeam`, `PUFF_SIZE`, `RADIAL_SIZE` to its import; it already imports `fakeContext` and `mulberry32` is in `deck-util`)

```ts
describe("paintPuff, paintRadial, paintSeam", () => {
  it("paints a puff as nine soft white blobs on a cleared square", () => {
    const ctx = fakeContext();
    paintPuff(ctx, PUFF_SIZE, mulberry32(1));
    expect(ctx.ops[0]?.op).toBe("clearRect");
    expect(ctx.ops.filter((o) => o.op === "arc")).toHaveLength(9);
    expect(ctx.ops.filter((o) => o.op === "fill" && o.fillStyle === "gradient")).toHaveLength(9);
    for (const o of ctx.ops.filter((o) => o.op === "arc")) {
      const [x, y, r] = o.args as number[];
      expect(x! - r!).toBeGreaterThanOrEqual(-PUFF_SIZE * 0.05);
      expect(x! + r!).toBeLessThanOrEqual(PUFF_SIZE * 1.05);
      expect(y! - r!).toBeGreaterThanOrEqual(-PUFF_SIZE * 0.05);
      expect(y! + r!).toBeLessThanOrEqual(PUFF_SIZE * 1.05);
    }
  });
  it("paints different puffs from different seeds and the same from the same", () => {
    const a = fakeContext();
    const b = fakeContext();
    const c = fakeContext();
    paintPuff(a, PUFF_SIZE, mulberry32(1));
    paintPuff(b, PUFF_SIZE, mulberry32(2));
    paintPuff(c, PUFF_SIZE, mulberry32(1));
    expect(JSON.stringify(a.ops)).not.toBe(JSON.stringify(b.ops));
    expect(JSON.stringify(a.ops)).toBe(JSON.stringify(c.ops));
  });
  it("paints a radial disc from the colour to transparent, filling the whole square", () => {
    const ctx = fakeContext();
    paintRadial(ctx, RADIAL_SIZE, COLORS.violet, 1);
    const fills = ctx.rects("fillRect");
    expect(fills).toEqual([{ x: 0, y: 0, w: RADIAL_SIZE, h: RADIAL_SIZE, color: "gradient" }]);
  });
  it("paints the seam as one violet rounded outline 6 px in at the card's scale", () => {
    const ctx = fakeContext();
    paintSeam(ctx, CARD_W * 2, CARD_H * 2);
    expect(ctx.ops[0]?.op).toBe("clearRect");
    const stroke = ctx.ops.find((o) => o.op === "stroke");
    expect(stroke?.strokeStyle).toBe(COLORS.violet);
    expect(ctx.lineWidth).toBeCloseTo(3, 6); // 1.5 px at 2×
    const arcs = ctx.ops.filter((o) => o.op === "arc");
    expect(arcs).toHaveLength(4);
    const xs = arcs.map((o) => (o.args as number[])[0]!);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(12);
    expect(Math.max(...xs)).toBeLessThanOrEqual(CARD_W * 2 - 12);
    expect(ctx.ops.filter((o) => o.op === "fillRect")).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run, expect failure. Step 3: Append to `deck-paint.ts`**

```ts
export const PUFF_SIZE = 256;
export const RADIAL_SIZE = 128;

/**
 * A smoke puff (spec §8): nine overlapping soft blobs, white on transparent so the sprite's colour
 * tints it. The RNG decides the layout, so three seeds give the three texture variants and a seeded
 * run repeats them.
 */
export function paintPuff(ctx: Ctx, size: number, rng: () => number): void {
  ctx.clearRect(0, 0, size, size);
  const c = size / 2;
  for (let i = 0; i < 9; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = (0.06 + 0.2 * rng()) * size;
    const x = c + Math.cos(angle) * dist;
    const y = c + Math.sin(angle) * dist;
    const r = (0.14 + 0.1 * rng()) * size;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(255,255,255,0.5)");
    g.addColorStop(0.55, "rgba(255,255,255,0.16)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A soft disc: `color` at `innerAlpha` in the centre to transparent at the edge (glow, shadow). */
export function paintRadial(ctx: Ctx, size: number, color: string, innerAlpha: number): void {
  ctx.clearRect(0, 0, size, size);
  const c = size / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  const rgb = hexToRgb(color);
  g.addColorStop(0, `rgba(${rgb},${innerAlpha})`);
  g.addColorStop(0.5, `rgba(${rgb},${innerAlpha * 0.35})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
}

/** The S and S+ backs' seam (spec §5): a 1.5 px violet rounded outline 6 px in, at the card's scale. */
export function paintSeam(ctx: Ctx, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h);
  const s = w / CARD_W;
  const inset = 6 * s;
  const r = 2 * s;
  const x0 = inset;
  const y0 = inset;
  const x1 = w - inset;
  const y1 = h - inset;
  ctx.strokeStyle = COLORS.violet;
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.moveTo(x0 + r, y0);
  ctx.lineTo(x1 - r, y0);
  ctx.arc(x1 - r, y0 + r, r, -Math.PI / 2, 0);
  ctx.lineTo(x1, y1 - r);
  ctx.arc(x1 - r, y1 - r, r, 0, Math.PI / 2);
  ctx.lineTo(x0 + r, y1);
  ctx.arc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI);
  ctx.lineTo(x0, y0 + r);
  ctx.arc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5);
  ctx.closePath();
  ctx.stroke();
}

function hexToRgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}
```

If `deck-paint.ts` has no `Ctx` alias in scope for these (it does: the existing painters use it), reuse it. `paintPuff` uses `rgba(255,255,255,…)` strings, not hex literals, so the palette test is unaffected.

- [ ] **Step 4: Palette allow list**

In `deck-paint.ts`, add `puffLight: "#9d86d8"` to `COLORS` (the puffs' lighter quarter, spec §8) and, in `test/deckPalette.test.ts`, add `"#9d86d8"` to the allowed set with the same comment. Nothing else new: the glow planes take each rank's eye colour from `deckArt` as data.

- [ ] **Step 5: Green, gate, commit**

```bash
git add src/scripts/deck/deck-paint.ts test/deckPaint.test.ts test/deckPalette.test.ts
git commit -m "deck: the puff, radial and seam painters"
```

---

### Task 5: The fog shader, pure strings

**Files:**

- Create: `src/scripts/deck/deck-fog.ts`
- Test: `test/deckFog.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { FOG_FRAGMENT, FOG_VERTEX, fogUniforms } from "../src/scripts/deck/deck-fog";

describe("the fog shader", () => {
  it("declares every uniform the stage drives", () => {
    for (const name of ["uTime", "uCentre", "uRadius", "uStrength", "uAspect", "uColor"]) {
      expect(FOG_FRAGMENT).toContain(`uniform`);
      expect(FOG_FRAGMENT).toMatch(new RegExp(`uniform\\s+\\w+\\s+${name};`));
    }
    expect(FOG_VERTEX).toContain("gl_Position");
  });
  it("sums three octaves of value noise, scrolled upward, inside a radial falloff", () => {
    expect((FOG_FRAGMENT.match(/vnoise\(/g) ?? []).length).toBeGreaterThanOrEqual(4); // 1 definition + 3 calls
    expect(FOG_FRAGMENT).toContain("smoothstep(0.0, uRadius");
    expect(FOG_FRAGMENT).toContain("uTime");
    expect(FOG_FRAGMENT).toContain("gl_FragColor = vec4(uColor * a, a)");
  });
  it("builds plain uniform objects with the colour", () => {
    const u = fogUniforms([0.2, 0.05, 0.6]);
    expect(u.uColor.value).toEqual([0.2, 0.05, 0.6]);
    expect(u.uStrength.value).toBe(0);
    expect(u.uCentre.value).toEqual([0.5, 0.5]);
    expect(u.uAspect.value).toBe(1);
  });
});
```

- [ ] **Step 2: Run, expect failure. Step 3: Write the module**

```ts
// The far-field fog (deck spec §8, "Fog"): three octaves of value noise scrolled upward, masked by a
// radial falloff around the energetic card, additive violet. Plain strings and uniform objects, no
// Three import, so the shader is unit-testable; deck-effects.ts wraps them in a ShaderMaterial.
// Coordinates: the plane's uv with x scaled by the stage's aspect, so distances are circular on
// screen; uCentre in uv, uRadius in stage-height units.
export interface FogUniforms {
  uTime: { value: number };
  uCentre: { value: [number, number] };
  uRadius: { value: number };
  uStrength: { value: number };
  uAspect: { value: number };
  uColor: { value: [number, number, number] };
}

export function fogUniforms(color: [number, number, number]): FogUniforms {
  return {
    uTime: { value: 0 },
    uCentre: { value: [0.5, 0.5] },
    uRadius: { value: 0 },
    uStrength: { value: 0 },
    uAspect: { value: 1 },
    uColor: { value: color },
  };
}

export const FOG_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const FOG_FRAGMENT = /* glsl */ `
precision mediump float;
uniform float uTime;
uniform vec2 uCentre;
uniform float uRadius;
uniform float uStrength;
uniform float uAspect;
uniform vec3 uColor;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

void main() {
  vec2 q = vec2(vUv.x * uAspect, vUv.y);
  float rise = uTime * 0.00004;
  float n = 0.55 * vnoise(q * 3.0 + vec2(0.0, -rise * 2.0))
          + 0.30 * vnoise(q * 6.0 + vec2(7.3, -rise * 3.0))
          + 0.15 * vnoise(q * 12.0 + vec2(3.1, -rise * 5.0));
  float d = distance(q, vec2(uCentre.x * uAspect, uCentre.y));
  float falloff = 1.0 - smoothstep(0.0, uRadius, d);
  float a = uStrength * n * falloff;
  gl_FragColor = vec4(uColor * a, a);
}
`;
```

- [ ] **Step 4: Green, gate, commit**

```bash
git add src/scripts/deck/deck-fog.ts test/deckFog.test.ts
git commit -m "deck: the fog shader"
```

---

### Task 6: `deck-effects.ts`, the energy's objects

**Files:**

- Create: `src/scripts/deck/deck-effects.ts`
- Modify: `src/scripts/deck/deck-params.ts` (`smoke.prewarmFrames: 240`)

**Interfaces:** Consumes Tasks 2–5 and `COLORS`. Produces `DeckEffects`, `BLOOM_LAYER` (Task 8 wires it; Task 7 reads the layer).

- [ ] **Step 1: The param**

In `DeckParams.smoke` add `prewarmFrames: number` (doc: "frames the frozen deck's cloud has aged before its one render") and `prewarmFrames: 240` in the defaults.

- [ ] **Step 2: Write the module**

```ts
// The energy's objects (deck spec §5 "glow mask", "seam"; §8 lights, glow, smoke, fog, shadow):
// built once per mount, driven every frame from the pure numbers in deck-energy.ts and the pool in
// deck-smoke.ts. Everything that glows sits on BLOOM_LAYER for deck-bloom.ts; the mid tier has no
// composer and instead renders those objects at 1.6× opacity.
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PointLight,
  Scene,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Texture,
} from "three";
import {
  breath,
  burstCount,
  coverFit,
  flare,
  fogFor,
  glowOpacity,
  glowSpriteScale,
  pointLightIntensity,
  proportion,
  seamOpacity,
  shadowFor,
  smokeRate,
  smokeSideSpeed,
  type EnergyKind,
} from "./deck-energy";
import { FOG_FRAGMENT, FOG_VERTEX, fogUniforms } from "./deck-fog";
import {
  COLORS,
  paintPuff,
  paintRadial,
  paintSeam,
  PUFF_SIZE,
  RADIAL_SIZE,
  WINDOW,
} from "./deck-paint";
import type { DeckParams } from "./deck-params";
import type { CardPhase } from "./deck-pose";
import { SmokePool, type SmokeEmitter } from "./deck-smoke";
import { mulberry32 } from "./deck-util";

export const BLOOM_LAYER = 1;
const PX = 1 / 100;
const MID_BOOST = 1.6;
const LIGHT_AHEAD = 1.6; // world units in front of the energetic card
const FOG_Z = -0.5;

export interface EffectsOptions {
  scene: Scene;
  params: DeckParams;
  tier: "mid" | "high";
  rng: () => number;
  kinds: (EnergyKind | null)[];
  eyeColors: string[];
}

export interface EffectCard {
  group: Group;
  phase: CardPhase;
  pull: number;
  zPx: number;
  sinceLandMs: number | null;
  sinceLeaveMs: number | null;
}

export interface EffectsFrame {
  time: number;
  frames: number;
  energy: number;
  energyIndex: number | null;
  kind: EnergyKind | null;
  cards: EffectCard[];
}

/** World units except cardWPx, which keeps the proportion k. */
export interface EffectsLayout {
  cardWPx: number;
  w: number;
  h: number;
  front: number;
  stageW: number;
  stageH: number;
  floorY: number;
}

function canvasTexture(
  size: number,
  paint: (ctx: CanvasRenderingContext2D) => void,
  srgb: boolean,
): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  paint(ctx);
  const texture = new CanvasTexture(canvas);
  if (srgb) texture.colorSpace = SRGBColorSpace;
  return texture;
}

export class DeckEffects {
  private readonly scene: Scene;
  private readonly params: DeckParams;
  private readonly boost: number;
  private readonly kinds: (EnergyKind | null)[];
  private readonly unit = new PlaneGeometry(1, 1);
  private readonly glowMats: MeshBasicMaterial[];
  private readonly glows: (Mesh | null)[];
  private readonly glowImages: (HTMLImageElement | null)[];
  private readonly seams: (Mesh | null)[];
  private readonly seamCanvases: (HTMLCanvasElement | null)[];
  private readonly light: PointLight;
  private readonly sprite: Sprite;
  private readonly spriteMat: SpriteMaterial;
  private readonly pool: SmokePool;
  private readonly puffs: Sprite[];
  private readonly puffTextures: Texture[];
  private readonly fog: Mesh;
  private readonly fogMat: ShaderMaterial;
  private readonly shadows: Sprite[];
  private readonly textures: Texture[] = [];
  private readonly burstDone: boolean[];
  private layout: EffectsLayout | null = null;
  private readonly emitter: SmokeEmitter = { x: 0, y: 0, z: 0, halfW: 1, halfH: 1, k: 1 };
  private prewarmed = false;

  constructor(opts: EffectsOptions) {
    this.scene = opts.scene;
    this.params = opts.params;
    this.kinds = opts.kinds;
    this.boost = opts.tier === "mid" ? MID_BOOST : 1;
    const n = opts.kinds.length;
    const P = this.params;

    // Glow planes: one per card, blank until the mask arrives; tinted by the rank's eye colour.
    this.glowMats = opts.eyeColors.map(
      (eye) =>
        new MeshBasicMaterial({
          color: new Color(eye),
          transparent: true,
          opacity: 0,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
    );
    this.glows = new Array<Mesh | null>(n).fill(null);
    this.glowImages = new Array<HTMLImageElement | null>(n).fill(null);
    this.seams = new Array<Mesh | null>(n).fill(null);
    this.seamCanvases = new Array<HTMLCanvasElement | null>(n).fill(null);
    this.burstDone = new Array<boolean>(n).fill(false);

    this.light = new PointLight(new Color(COLORS.violet), 0, 8, 2);
    this.scene.add(this.light);

    const glowTexture = canvasTexture(
      RADIAL_SIZE,
      (ctx) => paintRadial(ctx, RADIAL_SIZE, COLORS.violet, 0.8),
      true,
    );
    this.textures.push(glowTexture);
    this.spriteMat = new SpriteMaterial({
      map: glowTexture,
      color: new Color(COLORS.violet),
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    this.sprite = new Sprite(this.spriteMat);
    this.sprite.layers.enable(BLOOM_LAYER);
    this.sprite.visible = false;
    this.scene.add(this.sprite);

    // Smoke: three puff textures, a pool of sprites sized by the tier.
    this.puffTextures = [0, 1, 2].map((variant) =>
      canvasTexture(PUFF_SIZE, (ctx) => paintPuff(ctx, PUFF_SIZE, mulberry32(100 + variant)), true),
    );
    this.textures.push(...this.puffTextures);
    const capacity = opts.tier === "mid" ? P.smoke.poolMid : P.smoke.pool;
    this.pool = new SmokePool(capacity, opts.rng, P.smoke.opacityMin, P.smoke.opacityMax);
    this.puffs = this.pool.puffs.map(() => {
      const mat = new SpriteMaterial({
        map: this.puffTextures[0] ?? null,
        color: new Color(COLORS.violet),
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const s = new Sprite(mat);
      s.visible = false;
      this.scene.add(s);
      return s;
    });

    // Fog: one full-stage plane behind everything.
    const violet = new Color(COLORS.violet);
    this.fogMat = new ShaderMaterial({
      uniforms: fogUniforms([violet.r, violet.g, violet.b]),
      vertexShader: FOG_VERTEX,
      fragmentShader: FOG_FRAGMENT,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });
    this.fog = new Mesh(this.unit, this.fogMat);
    this.fog.position.z = FOG_Z;
    this.fog.visible = false;
    this.scene.add(this.fog);

    // Contact shadows: two sprites, for the presented card and a card pulling in.
    const shadowTexture = canvasTexture(
      RADIAL_SIZE,
      (ctx) => paintRadial(ctx, RADIAL_SIZE, COLORS.void, 1),
      true,
    );
    this.textures.push(shadowTexture);
    this.shadows = [0, 1].map(() => {
      const s = new Sprite(
        new SpriteMaterial({
          map: shadowTexture,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      );
      s.visible = false;
      this.scene.add(s);
      return s;
    });
  }

  /** Adds the card's glow plane (blank until setGlow) and, on S and S+, its back seam. */
  attach(index: number, group: Group): void {
    const mat = this.glowMats[index];
    if (!mat) return;
    const glow = new Mesh(this.unit, mat);
    glow.layers.enable(BLOOM_LAYER);
    glow.visible = false;
    group.add(glow);
    this.glows[index] = glow;
    if (this.kinds[index]) {
      const canvas = document.createElement("canvas");
      canvas.width = 2;
      canvas.height = 2;
      const texture = new CanvasTexture(canvas);
      texture.colorSpace = SRGBColorSpace;
      this.textures.push(texture);
      const seam = new Mesh(
        this.unit,
        new MeshBasicMaterial({
          map: texture,
          transparent: true,
          opacity: 0,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      );
      seam.rotation.y = Math.PI;
      seam.layers.enable(BLOOM_LAYER);
      group.add(seam);
      this.seams[index] = seam;
      this.seamCanvases[index] = canvas;
    }
    if (this.layout) this.placeCard(index);
  }

  setGlow(index: number, image: HTMLImageElement | null): void {
    this.glowImages[index] = image;
    const mat = this.glowMats[index];
    if (!mat) return;
    mat.alphaMap?.dispose();
    if (!image) {
      mat.alphaMap = null;
      mat.needsUpdate = true;
      return;
    }
    const texture = new CanvasTexture(image);
    this.textures.push(texture);
    mat.alphaMap = texture;
    mat.needsUpdate = true;
    if (this.layout) this.placeCard(index);
  }

  setLayout(layout: EffectsLayout): void {
    this.layout = layout;
    for (let i = 0; i < this.glows.length; i++) this.placeCard(i);
    this.fog.scale.set(layout.stageW, layout.stageH, 1);
    this.fogMat.uniforms.uAspect!.value = layout.stageW / layout.stageH;
    this.emitter.halfW = layout.w / 2;
    this.emitter.halfH = layout.h / 2;
    this.emitter.k = proportion(layout.cardWPx);
  }

  /** The glow plane over the portrait window with paintBody's cover fit; the seam over the back. */
  private placeCard(index: number): void {
    const L = this.layout;
    if (!L) return;
    const glow = this.glows[index];
    const M = this.params.material;
    if (glow) {
      const winH = L.h * WINDOW;
      glow.scale.set(L.w, winH, 1);
      glow.position.set(0, L.h / 2 - winH / 2, L.front + M.layerZ.glow * PX);
      const image = this.glowImages[index];
      const mat = this.glowMats[index];
      if (image && mat?.alphaMap) {
        const fit = coverFit(
          L.w,
          winH,
          image.naturalWidth || image.width,
          image.naturalHeight || image.height,
        );
        mat.alphaMap.repeat.set(fit.repeatX, fit.repeatY);
        mat.alphaMap.offset.set(fit.offsetX, fit.offsetY);
      }
    }
    const seam = this.seams[index];
    const canvas = this.seamCanvases[index];
    if (seam && canvas) {
      const w = Math.max(2, Math.round(L.cardWPx * 2));
      const h = Math.max(2, Math.round((L.h / L.w) * w));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) paintSeam(ctx, w, h);
        const mat = seam.material as MeshBasicMaterial;
        if (mat.map) mat.map.needsUpdate = true;
      }
      seam.scale.set(L.w, L.h, 1);
      seam.position.z = -(L.front + 0.001);
    }
  }

  /** Runs the smoke `frames` frames from the given state (the frozen deck's cloud). */
  prewarm(frame: EffectsFrame, frames: number): void {
    if (this.prewarmed) return;
    this.prewarmed = true;
    const kind = frame.kind;
    if (!kind || frame.energyIndex === null) return;
    const card = frame.cards[frame.energyIndex];
    if (!card) return;
    this.pointEmitter(card);
    const rate = smokeRate(kind, frame.energy, this.params);
    const side = smokeSideSpeed(kind, frame.energy, this.params);
    for (let i = 0; i < frames; i++) {
      this.pool.emit(this.emitter, rate, side, 1);
      this.pool.step(1);
    }
  }

  private pointEmitter(card: EffectCard): void {
    this.emitter.x = card.group.position.x;
    this.emitter.y = card.group.position.y;
    this.emitter.z = card.group.position.z;
  }

  update(frame: EffectsFrame): void {
    const L = this.layout;
    if (!L) return;
    const P = this.params;
    const { kind, energy, energyIndex } = frame;
    const energetic = energyIndex === null ? null : (frame.cards[energyIndex] ?? null);
    const fl = flare(kind, energetic?.sinceLandMs ?? null, P);
    const br = breath(frame.time, P);

    // Glow planes and seams, every card.
    for (let i = 0; i < frame.cards.length; i++) {
      const c = frame.cards[i];
      const glow = this.glows[i];
      const mat = this.glowMats[i];
      if (c && glow && mat) {
        const o = glowOpacity(c.phase, c.sinceLandMs, c.sinceLeaveMs, P) * this.boost;
        mat.opacity = Math.min(1, o);
        glow.visible = o > 0.001 && mat.alphaMap !== null;
      }
      const seam = this.seams[i];
      const k = this.kinds[i];
      if (c && seam && k) {
        const m = seam.material as MeshBasicMaterial;
        m.opacity = Math.min(1, seamOpacity(k, frame.time, P) * this.boost);
      }
      if (c && c.pull <= 0) this.burstDone[i] = false;
    }

    // The light and the glow sprite follow the energetic card.
    if (kind && energetic) {
      const pos = energetic.group.position;
      this.light.position.set(pos.x, pos.y, pos.z + LIGHT_AHEAD);
      this.light.intensity = pointLightIntensity(kind, energy, br, fl.light, P);
      this.sprite.position.set(pos.x, pos.y, pos.z - 0.05);
      const scale = glowSpriteScale(kind, energy, L.cardWPx, P) * fl.glow;
      this.sprite.scale.set(scale, scale, 1);
      this.spriteMat.opacity = Math.min(1, energy * this.boost);
      this.sprite.visible = energy > 0.001;
      // Landing burst, once per landing.
      if (energyIndex !== null && energetic.sinceLandMs !== null && !this.burstDone[energyIndex]) {
        this.burstDone[energyIndex] = true;
        this.pointEmitter(energetic);
        this.pool.spawn(this.emitter, burstCount(kind, P), smokeSideSpeed(kind, energy, P));
      }
    } else {
      this.light.intensity = 0;
      this.sprite.visible = false;
    }

    // Smoke.
    if (kind && energetic && frame.frames > 0) {
      this.pointEmitter(energetic);
      this.pool.emit(
        this.emitter,
        smokeRate(kind, energy, P),
        smokeSideSpeed(kind, energy, P),
        frame.frames,
      );
    }
    if (frame.frames > 0) this.pool.step(frame.frames);
    const shown = kind ? energy : 0;
    for (let i = 0; i < this.puffs.length; i++) {
      const p = this.pool.puffs[i];
      const s = this.puffs[i];
      if (!p || !s) continue;
      if (!p.alive) {
        s.visible = false;
        continue;
      }
      const m = s.material;
      const o = SmokePool.opacity(p, shown);
      s.visible = o > 0.002;
      m.opacity = o;
      m.rotation = p.rot;
      const tex = this.puffTextures[p.variant] ?? null;
      if (m.map !== tex) m.map = tex;
      m.color.set(p.tint === 1 ? COLORS.puffLight : COLORS.violet);
      const sc = SmokePool.scale(p);
      s.scale.set(sc, sc, 1);
      s.position.set(p.x, p.y, p.z);
    }

    // Fog.
    const level = fogFor(kind, energy, fl.fog, P);
    const u = this.fogMat.uniforms;
    if (kind && energetic && level.strength > 0.001) {
      const pos = energetic.group.position;
      u.uTime!.value = frame.time;
      u.uCentre!.value = [pos.x / L.stageW + 0.5, pos.y / L.stageH + 0.5];
      u.uRadius!.value = level.radius / L.stageH;
      u.uStrength!.value = level.strength;
      this.fog.visible = true;
    } else {
      u.uStrength!.value = 0;
      this.fog.visible = false;
    }

    // Contact shadows under the two largest pulls.
    let first = -1;
    let second = -1;
    for (let i = 0; i < frame.cards.length; i++) {
      const pull = frame.cards[i]?.pull ?? 0;
      if (pull <= 0) continue;
      if (first < 0 || pull > (frame.cards[first]?.pull ?? 0)) {
        second = first;
        first = i;
      } else if (second < 0 || pull > (frame.cards[second]?.pull ?? 0)) second = i;
    }
    [first, second].forEach((idx, n) => {
      const s = this.shadows[n];
      const c = idx >= 0 ? frame.cards[idx] : null;
      if (!s) return;
      if (!c) {
        s.visible = false;
        return;
      }
      const sh = shadowFor(c.pull, c.zPx, L.cardWPx, P);
      s.scale.set(sh.w, sh.h, 1);
      s.position.set(c.group.position.x, L.floorY, 0.02);
      s.material.opacity = sh.opacity;
      s.visible = sh.opacity > 0.01;
    });
  }

  estimateBytes(): number {
    let bytes = 0;
    for (const t of this.textures) {
      const img = t.image as { width?: number; height?: number } | undefined;
      bytes += (img?.width ?? 0) * (img?.height ?? 0) * 4;
    }
    for (const mat of this.glowMats) {
      const img = mat.alphaMap?.image as { width?: number; height?: number } | undefined;
      bytes += (img?.width ?? 0) * (img?.height ?? 0) * 4;
    }
    return bytes;
  }

  dispose(): void {
    this.scene.remove(this.light, this.sprite, this.fog, ...this.puffs, ...this.shadows);
    for (const g of this.glows) g?.removeFromParent();
    for (const s of this.seams) {
      if (!s) continue;
      s.removeFromParent();
      (s.material as MeshBasicMaterial).dispose();
    }
    for (const m of this.glowMats) {
      m.alphaMap?.dispose();
      m.dispose();
    }
    this.spriteMat.dispose();
    for (const p of this.puffs) p.material.dispose();
    for (const s of this.shadows) s.material.dispose();
    this.fogMat.dispose();
    for (const t of this.textures) t.dispose();
    this.unit.dispose();
    this.light.dispose();
  }
}
```

Notes for the implementer: `uniforms.uX!` uses the non-null form only because `ShaderMaterial.uniforms` is typed as an index signature; replace each with a local `const u = this.fogMat.uniforms as unknown as FogUniforms` once, taken at construction, and drop the assertions (the plan's Global Constraints forbid `!`). `Sprite.material` is typed `SpriteMaterial`, so no casts there. The per-frame `[first, second].forEach` allocates a two-element array; write it as two calls to a private `placeShadow(n, idx)` instead. `COLORS.puffLight` and `COLORS.glowS` come from Task 4.

- [ ] **Step 3: Gate and commit** (`pnpm format && pnpm lint && pnpm check && pnpm test`; the palette test scans the new file)

```bash
git add src/scripts/deck/deck-effects.ts src/scripts/deck/deck-params.ts
git commit -m "deck: the energy's objects"
```

---

### Task 7: `deck-bloom.ts`, the selective bloom chunk

**Files:**

- Create: `src/scripts/deck/deck-bloom.ts`

- [ ] **Step 1: Write the module**

```ts
// Selective bloom for the high tier (deck spec §8, "Bloom"; ADR 0004): the scene renders once with
// everything off BLOOM_LAYER darkened, that pass blooms at half resolution, and a second composer
// adds the result over the normal render. Its own lazy chunk, imported by deck-stage.ts only on the
// high tier, so the mid tier never pays for the postprocessing code.
import {
  HalfFloatType,
  Mesh,
  MeshBasicMaterial,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  Vector2,
  WebGLRenderTarget,
  type Camera,
  type Material,
  type Object3D,
  type Scene,
  type WebGLRenderer,
} from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { BLOOM_LAYER } from "./deck-effects";
import type { DeckParams } from "./deck-params";

export interface BloomHandle {
  render(): void;
  setSize(w: number, h: number): void;
  dispose(): void;
}

const MIX_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Adds the bloom over the base; alpha keeps the page visible where nothing is drawn and lets the
// glow read over the section's void where the cards are not.
const MIX_FRAGMENT = /* glsl */ `
uniform sampler2D baseTexture;
uniform sampler2D bloomTexture;
varying vec2 vUv;
void main() {
  vec4 base = texture2D(baseTexture, vUv);
  vec4 bloom = texture2D(bloomTexture, vUv);
  float glow = max(bloom.r, max(bloom.g, bloom.b));
  gl_FragColor = vec4(base.rgb + bloom.rgb, max(base.a, min(1.0, glow)));
}
`;

export function mountBloom(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  params: DeckParams,
  width: number,
  height: number,
): BloomHandle {
  const size = renderer.getDrawingBufferSize(new Vector2());
  const target = new WebGLRenderTarget(size.x, size.y, { type: HalfFloatType });
  const bloomComposer = new EffectComposer(renderer, target);
  bloomComposer.renderToScreen = false;
  const bloomPass = new UnrealBloomPass(
    new Vector2(width / 2, height / 2),
    params.bloom.strength,
    params.bloom.radius,
    params.bloom.threshold,
  );
  bloomComposer.addPass(new RenderPass(scene, camera));
  bloomComposer.addPass(bloomPass);

  const mixMaterial = new ShaderMaterial({
    uniforms: {
      baseTexture: { value: null },
      bloomTexture: { value: bloomComposer.renderTarget2.texture },
    },
    vertexShader: MIX_VERTEX,
    fragmentShader: MIX_FRAGMENT,
    transparent: true,
    depthWrite: false,
  });
  const mixPass = new ShaderPass(mixMaterial, "baseTexture");
  const finalComposer = new EffectComposer(renderer);
  finalComposer.addPass(new RenderPass(scene, camera));
  finalComposer.addPass(mixPass);
  finalComposer.addPass(new OutputPass());

  const dark = new MeshBasicMaterial({ color: 0x000000 });
  const darkSprite = new SpriteMaterial({ color: 0x000000 });
  const saved = new Map<Mesh | Sprite, Material>();
  const darken = (obj: Object3D): void => {
    if (obj.layers.isEnabled(BLOOM_LAYER)) return;
    if (obj instanceof Sprite) {
      saved.set(obj, obj.material);
      obj.material = darkSprite;
    } else if (obj instanceof Mesh) {
      saved.set(obj, obj.material as Material);
      obj.material = dark;
    }
  };
  const restore = (): void => {
    for (const [obj, mat] of saved) obj.material = mat;
    saved.clear();
  };

  return {
    render() {
      bloomPass.strength = params.bloom.strength;
      bloomPass.radius = params.bloom.radius;
      bloomPass.threshold = params.bloom.threshold;
      scene.traverse(darken);
      bloomComposer.render();
      restore();
      finalComposer.render();
    },
    setSize(w, h) {
      bloomComposer.setSize(w, h);
      finalComposer.setSize(w, h);
      bloomPass.resolution.set(w / 2, h / 2);
    },
    dispose() {
      bloomComposer.dispose();
      finalComposer.dispose();
      bloomPass.dispose();
      mixMaterial.dispose();
      dark.dispose();
      darkSprite.dispose();
      target.dispose();
    },
  };
}
```

`Mesh.material` is `Material | Material[]`; the cards use single materials, so cast once as shown. `RenderPass` keeps the renderer's transparent clear (alpha 0).

- [ ] **Step 2: Gate** (`pnpm format && pnpm lint && pnpm check && pnpm test`) and commit

```bash
git add src/scripts/deck/deck-bloom.ts
git commit -m "deck: the selective bloom chunk"
```

---

### Task 8: Wire the effects and the bloom into the stage

**Files:**

- Modify: `src/scripts/deck/deck-stage.ts`, `src/scripts/deck/index.ts`

- [ ] **Step 1: The stage**

In `deck-stage.ts`:

1. Imports: `import { BLOOM_LAYER, DeckEffects, type EffectCard, type EffectsFrame } from "./deck-effects"; import type { BloomHandle } from "./deck-bloom"; import type { EnergyKind } from "./deck-energy";` (`BLOOM_LAYER` only if used; otherwise omit).
2. `StageState` gains `bloom: boolean`.
3. After `const meshes = buildCards(…)`:
   ```ts
   const kinds: (EnergyKind | null)[] = cards.map((c) =>
     c.stage.rankLabel === "S" || c.stage.rankLabel === "S+" ? c.stage.rankLabel : null,
   );
   const effects = new DeckEffects({
     scene,
     params,
     tier: opts.tier,
     rng,
     kinds,
     eyeColors: cards.map((c) => c.art.eyeColor),
   });
   meshes.forEach((m, i) => effects.attach(i, m.group));
   ```
   and delete the `void rng;` line.
4. In `applyLayout`, after `layoutCards` returns `front` and the floor is placed:
   ```ts
   effects.setLayout({
     cardWPx: layout.cardW,
     w: layout.cardW * PX,
     h: layout.cardH * PX,
     front,
     stageW: stageW * PX,
     stageH: stageH * PX,
     floorY: toY(layout.floorY),
   });
   bloom?.setSize(stageW, stageH);
   ```
   (`let bloom: BloomHandle | null = null;` declared before `applyLayout`.)
5. Portraits: replace `return loadImage(p.glow).then((g) => (glows[i] = g));` with `return loadImage(p.glow).then((g) => effects.setGlow(i, g));` and delete the `glows` array.
6. Bloom load, after the assets:
   ```ts
   const bloomLoad =
     opts.tier === "high"
       ? import("./deck-bloom")
           .then(({ mountBloom }) => {
             if (disposed) return;
             bloom = mountBloom(renderer, scene, camera, params, stageW, stageH);
           })
           .catch(() => undefined)
       : Promise.resolve();
   ```
   In the freeze branch: `await Promise.all([assets, bloomLoad]);`. In the live branch also `void bloomLoad.then(() => requestRender());`.
7. Frame state: `const leaveAt: (number | null)[] = new Array(count).fill(null);` and a reusable `const effectCards: EffectCard[] = meshes.map((m) => ({ group: m.group, phase: "racked", pull: 0, zPx: 0, sinceLandMs: null, sinceLeaveMs: null }));` plus `const effectsFrame: EffectsFrame = { time: 0, frames: 0, energy: 0, energyIndex: null, kind: null, cards: effectCards };` (no per-frame allocation).
8. In the per-card loop, after the `landedAt` lines: `if (c.phase === "leaving") { if (leaveAt[i] === null) leaveAt[i] = time; } else leaveAt[i] = null;` and fill `effectCards[i]` from `c`, `landedAt[i]`, `leaveAt[i]` (`sinceLandMs = at === null ? null : time - at`, likewise for leave).
9. After the loop, before `renderer.render`:
   ```ts
   effectsFrame.time = time;
   effectsFrame.frames = dt / (1000 / 60);
   effectsFrame.energy = pose.energy;
   effectsFrame.energyIndex = pose.energyIndex;
   effectsFrame.kind = pose.kind;
   if (freeze) effects.prewarm(effectsFrame, params.smoke.prewarmFrames);
   effects.update(effectsFrame);
   if (bloom) bloom.render();
   else renderer.render(scene, camera);
   ```
   (replace the existing `renderer.render(scene, camera);`).
10. `emitState`: `bloom: bloom !== null`, `cornerAlpha`, and `vram` from `textures.estimateBytes() + effects.estimateBytes()`.
11. `dispose()`: `effects.dispose(); bloom?.dispose(); bloom = null;` before `renderer.dispose()`.
12. The freeze-only transparency probe (Review Focus 2): `StageState` gains `cornerAlpha: number | null` (`null` outside freeze). In `frame()`, right after the render call and only when `freeze` is set, read the drawing buffer's corner while it is still intact in this frame:
    ```ts
    let cornerAlpha: number | null = null;
    …
    if (freeze) {
      const gl = renderer.getContext();
      const px = new Uint8Array(4);
      gl.readPixels(4, 4, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); // (4, 4) from the bottom-left: the stage's corner, no card there
      cornerAlpha = px[3] ?? null;
    }
    ```
    `index.ts` writes `track.dataset.deckCornerAlpha = String(state.cornerAlpha)` when it is not `null`, and removes it in `fallback()` with the others. Nothing is read outside freeze, so the live loop pays nothing.

- [ ] **Step 2: The page script**

In `index.ts`, where `onState` mirrors the state to attributes, add `track.dataset.deckBloom = state.bloom ? "on" : "off";` and remove `deckBloom` in `fallback()` with the others.

- [ ] **Step 3: Gate, build, size, e2e**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test && pnpm build && pnpm size && pnpm test:e2e`
Expected: 0 errors; the deck lazy row will now include the bloom chunk (Task 9 separates it; if the 170 KB budget fails only for that reason, note it in the report and continue: Task 9 fixes the rule); `deck-bloom.<hash>.js` exists under `dist/client/_astro`; e2e green (the visual tests are not part of `test:e2e`); `wc -l src/scripts/deck/deck-stage.ts` ≤ 600.

- [ ] **Step 4: Commit**

```bash
git add src/scripts/deck/deck-stage.ts src/scripts/deck/index.ts
git commit -m "deck: the stage lights, smokes, fogs, shadows and blooms"
```

---

### Task 9: `pnpm size`: the bloom row and the portrait renditions

**Files:**

- Modify: `scripts/check-bundle-size.mjs`, `test/checkBundleSize.test.ts`

- [ ] **Step 1: Failing tests** (append to the existing fake-dist tests; reuse its helpers `withDeck`, `withScene`, `run`)

```ts
it("budgets the bloom chunk on its own row and keeps it out of the deck row", () => {
  const dist = fakeDist();
  withScene(dist);
  withDeck(dist);
  // Without a bloom chunk the run fails on the missing row, but the deck row still prints.
  const before = /Deck lazy JS \(gz\): ([\d.]+) KB/.exec(run(dist).stdout)?.[1];
  writeFileSync(
    join(dist, "client/_astro/deck-bloom.abc.js"),
    randomBytes(20_000).toString("base64"),
  );
  const out = run(dist);
  expect(out.status).toBe(0);
  expect(out.stdout).toMatch(/ok {3}Bloom chunk \(gz\): .* \(budget 40 KB\)/);
  // The bloom bytes are not counted twice: the deck row is what it was before the chunk existed.
  expect(/Deck lazy JS \(gz\): ([\d.]+) KB/.exec(out.stdout)?.[1]).toBe(before);
});

it("fails when the bloom chunk is missing or over 40 KB", () => {
  const dist = fakeDist();
  withScene(dist);
  withDeck(dist);
  expect(run(dist).stdout).toContain("FAIL deck-bloom chunk missing");
  writeFileSync(
    join(dist, "client/_astro/deck-bloom.abc.js"),
    randomBytes(60_000).toString("base64"),
  );
  const out = run(dist);
  expect(out.status).toBe(1);
  expect(out.stdout).toMatch(/FAIL Bloom chunk/);
});

it("measures the served portrait renditions named by the home page", () => {
  const dist = fakeDist();
  withScene(dist);
  withDeck(dist);
  writeFileSync(join(dist, "client/_astro/deck-bloom.abc.js"), "x".repeat(2_000));
  const html = readFileSync(join(dist, "client/index.html"), "utf8").replace(
    "</body>",
    `<button data-deck-rank data-portrait-1x="/_astro/e.1x.webp" data-portrait-2x="/_astro/e.2x.webp" data-glow="/_astro/e.g.webp"></button></body>`,
  );
  writeFileSync(join(dist, "client/index.html"), html);
  writeFileSync(join(dist, "client/_astro/e.1x.webp"), Buffer.alloc(30_000));
  writeFileSync(join(dist, "client/_astro/e.2x.webp"), Buffer.alloc(100_000));
  writeFileSync(join(dist, "client/_astro/e.g.webp"), Buffer.alloc(5_000));
  let out = run(dist);
  expect(out.status).toBe(0);
  expect(out.stdout).toMatch(/ok {3}Portraits 1x \(largest\): 29\.3 KB \(budget 40 KB\)/);
  expect(out.stdout).toMatch(/ok {3}Portraits 2x \(largest\): 97\.7 KB \(budget 120 KB\)/);
  expect(out.stdout).toMatch(/ok {3}Glow masks \(largest\): 4\.9 KB \(budget 10 KB\)/);
  writeFileSync(join(dist, "client/_astro/e.2x.webp"), Buffer.alloc(130_000));
  out = run(dist);
  expect(out.status).toBe(1);
  expect(out.stdout).toMatch(/FAIL Portraits 2x/);
});
```

(`randomBytes` from `node:crypto` defeats gzip; adjust the imports.)

- [ ] **Step 2: The script**

- `BUDGETS` gains `bloom: 40 * KB`, `portrait1x: 40 * KB`, `portrait2x: 120 * KB`, `glow: 10 * KB`.
- Split the lazy set: `const bloomChunks = lazy.filter((f) => /deck-bloom/.test(f)); const deckChunks = lazy.filter((f) => !/deck-bloom/.test(f));` The deck row sums `deckChunks`; add `["Bloom chunk (gz)", bloomBytes, BUDGETS.bloom, 0]` when a bloom chunk exists, else `FAIL deck-bloom chunk missing: the composer was inlined into the stage` and `failed = true`.
- Portraits: from `home`, collect `data-portrait-1x="…"`, `data-portrait-2x="…"`, `data-glow="…"` values with three regexes; for each class, measure `statSync` of `dist/client<path>` (skip missing with a `FAIL portrait file missing: <path>`), take the largest, and push rows `Portraits 1x (largest)`, `Portraits 2x (largest)`, `Glow masks (largest)` with the budgets. When the page names none (no portraits yet), print `ok   Portraits: none referenced` and no rows.

- [ ] **Step 3: Green on the fakes, then the real build**

Run: `pnpm vitest run test/checkBundleSize.test.ts` then `pnpm build && pnpm size`.
Expected: seven `ok` rows (initial, fonts, deck lazy, bloom, portraits 1x, portraits 2x, glow masks, plus the scene row) and the real numbers in the report.

- [ ] **Step 4: Commit**

```bash
git add scripts/check-bundle-size.mjs test/checkBundleSize.test.ts
git commit -m "size: the bloom chunk and the served portraits get rows"
```

---

### Task 10: The tuning panel learns the energy

**Files:**

- Modify: `src/scripts/deck/deck-tune.ts`

- [ ] **Step 1: Rows**

Append to `ROWS` (labels, paths, ranges):

```ts
  ["energy S", "energy.s", 0, 1, 0.01],
  ["energy S+ base", "energy.sPlusBase", 0, 1, 0.01],
  ["energy S+ ramp", "energy.sPlusRamp", 0, 1, 0.01],
  ["light point S", "light.pointS", 0, 60, 0.5],
  ["light point S+", "light.pointSPlus", 0, 120, 0.5],
  ["light breath", "light.breath", 0, 0.5, 0.01],
  ["flare S+ (×)", "light.flareSPlus", 1, 6, 0.1],
  ["flare ms", "light.flareMs", 100, 1200, 10],
  ["smoke rate S", "smoke.rateS", 0, 2, 0.05],
  ["smoke rate S+ base", "smoke.rateSPlusBase", 0, 4, 0.05],
  ["smoke rate S+ ramp", "smoke.rateSPlusRamp", 0, 10, 0.1],
  ["smoke opacity max", "smoke.opacityMax", 0, 0.6, 0.01],
  ["smoke side speed", "smoke.sideSpeed", 0, 4, 0.1],
  ["fog strength S+", "fog.strengthSPlus", 0, 1, 0.01],
  ["fog radius S+ ramp", "fog.radiusSPlusRamp", 0, 6, 0.1],
  ["glow scale S+ ramp", "glow.scaleSPlusRamp", 0, 20, 0.5],
  ["seam S+ max", "seam.sPlusMax", 0, 1, 0.01],
  ["shadow opacity", "shadow.opacity", 0, 1, 0.01],
  ["bloom strength", "bloom.strength", 0, 3, 0.05],
  ["bloom radius", "bloom.radius", 0, 1.5, 0.01],
  ["bloom threshold", "bloom.threshold", 0, 1, 0.01],
```

The stage reads `params.*` every frame, so the sliders act live; the pool's capacity is fixed at mount and stays off the panel.

- [ ] **Step 2: Gate and commit**

```bash
git add src/scripts/deck/deck-tune.ts
git commit -m "deck: the tuning panel learns the energy"
```

---

### Task 11: E2E and visual

**Files:**

- Modify: `e2e/journey.spec.ts`, `e2e/visual.spec.ts`; regenerate `e2e/__screenshots__/{desktop,iphone-15}/journey-rank-{s,s-plus}-darwin.png` (and `e` if it moved)

- [ ] **Step 1: New tests in `e2e/journey.spec.ts`** (desktop project only where noted, with the file's `test.beforeEach(({}, info) => test.skip(…))` pattern; the tier is forced through `page.addInitScript` before `goto`)

```ts
const forceTier = (page: Page, tier: "mid" | "high") =>
  page.addInitScript((t) => {
    const cores = t === "high" ? 8 : 4;
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => cores });
    Object.defineProperty(navigator, "deviceMemory", { get: () => 8 });
  }, tier);

test("blooms on the high tier through its own lazy chunk, and not on the mid tier", async ({
  page,
}) => {
  await forceTier(page, "high");
  const bloomRequest = page.waitForRequest((r) => /deck-bloom/.test(r.url()));
  await page.goto("/");
  await scrollToRank(page, 5);
  await ready(page);
  await bloomRequest;
  await expect(track(page)).toHaveAttribute("data-deck-bloom", "on");

  const mid = await page.context().newPage();
  await forceTier(mid, "mid");
  const requests: string[] = [];
  mid.on("request", (r) => requests.push(r.url()));
  await mid.goto("/");
  await scrollToRank(mid, 5);
  await ready(mid);
  await mid.waitForTimeout(1500);
  expect(requests.some((u) => /deck-bloom/.test(u))).toBe(false);
  await expect(mid.locator("[data-deck]")).toHaveAttribute("data-deck-bloom", "off");
  await mid.close();
});

test("keeps the energy at zero through E–A and reaches full energy at the end of S+", async ({
  page,
}) => {
  await page.goto("/");
  for (const i of [0, 2, 4]) {
    await scrollToRank(page, i);
    await ready(page);
    await expect(track(page)).toHaveAttribute("data-deck-energy", "0");
  }
  await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
  await expect
    .poll(async () => Number(await track(page).getAttribute("data-deck-energy")))
    .toBeGreaterThanOrEqual(0.95);
  const vram = Number(await track(page).getAttribute("data-deck-vram"));
  expect(vram).toBeGreaterThan(0);
  expect(vram).toBeLessThanOrEqual(80);
});

test("leaves the canvas transparent where nothing is drawn, with bloom and without", async ({
  page,
}) => {
  for (const tier of ["high", "mid"] as const) {
    const p = await page.context().newPage();
    await forceTier(p, tier);
    await p.goto("/?deck-freeze=2026-09-25");
    await scrollToRank(p, 6);
    await ready(p);
    await expect(p.locator("[data-deck]")).toHaveAttribute(
      "data-deck-bloom",
      tier === "high" ? "on" : "off",
    );
    // The stage reads its own corner pixel in the frozen frame (Task 8, step 12).
    await expect(p.locator("[data-deck]")).toHaveAttribute("data-deck-corner-alpha", "0");
    await p.close();
  }
});

test("a dispose and re-mount leaves the texture estimate where it was", async ({ page }) => {
  await page.goto("/");
  await scrollToRank(page, 6);
  await ready(page);
  const before = await track(page).getAttribute("data-deck-vram");
  await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
  await page.waitForTimeout(31_000);
  await expect(track(page)).not.toHaveAttribute("data-deck-ready", "");
  await scrollToRank(page, 6);
  await ready(page);
  await expect(track(page)).toHaveAttribute("data-deck-vram", before ?? "");
});
```

The transparency test relies on the stage's own corner read (Task 8, step 12): a `readPixels` from Playwright after the frame would see a cleared buffer, because the renderer does not preserve it.

The re-mount test takes 31 s; give it `test.setTimeout(60_000)` and run it on the desktop project only. The bloom and transparency tests run on the desktop project only as well (the phone projects have coarse pointers, so `detectTier` keeps them on the mid tier regardless of the forced cores).

- [ ] **Step 2: Visual**

`e2e/visual.spec.ts`: the journey tests stay as they are; add `forceTier(page, "high")` before `goto` in each (a helper shared through `e2e/constants.ts` or duplicated), so the baselines carry the bloom on desktop. Delete the six journey baselines, run `pnpm build && pnpm test:visual --update-snapshots` once, then `pnpm test:visual` twice more without the flag: all three green proves the frozen cloud is deterministic (Review Focus 3). Look at the S and S+ desktop images: eyes and coat lit, seams on the racked S/S+ backs, smoke around the presented card, the fog behind S+, the shadow on the floor line.

- [ ] **Step 3: Gate**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test && pnpm build && pnpm test:e2e && pnpm test:visual`
Expected: all green; report the e2e counts and the visual result.

- [ ] **Step 4: Commit**

```bash
git add e2e/journey.spec.ts e2e/visual.spec.ts e2e/constants.ts e2e/__screenshots__ src/scripts/deck/deck-stage.ts
git commit -m "e2e: the energy's tier, transparency, budget and re-mount tests; baselines with the glow"
```

---

### Task 12: The record

**Files:**

- Modify: `docs/superpowers/specs/2026-09-25-journey-card-deck-design.md` (status line), `CLAUDE.md`

- [ ] **Step 1: Spec status**

Change the status line to: `- **Status:** Approved 2026-09-25. Plans 1 (foundations), 2 (the stage, desktop), 0 (the character) and 3 (energy) implemented; ADR 0004 written with Plan 2.` Below the existing "Implementation notes" bullet add: `- **Implementation notes (Plan 3):** the smoke is a pool of sprites with one material each; the seam is a painted back-side plane; the bloom composite keeps alpha as max(base, glow); the fog's radius is passed in stage-height units; \`smoke.prewarmFrames\` ages the frozen cloud; the portrait rendition rows of §11 landed here.`

- [ ] **Step 2: CLAUDE.md**

1. In the rebuild banner's deck paragraph: "Plans 1 (foundations), 2 (the stage, desktop), 0 (the character) and 3 (energy) are done; the phone and the tuning/retirement phases follow."
2. In "Where things live", the deck bullet: after `deck-stage.ts is the lazy Three.js stage` add `, deck-effects.ts its energy (glow, seams, light, smoke, fog, shadows) fed by the pure deck-energy.ts, deck-smoke.ts and deck-fog.ts, deck-bloom.ts the high tier's second lazy chunk, deck-cards.ts the card meshes`.
3. In "Budgets": after the deck chunk line add `- the bloom chunk ≤ 40 KB gz, never in the initial graph; served portraits 800 px ≤ 120 KB, 400 px ≤ 40 KB, glow masks ≤ 10 KB`.
4. In the `pnpm size` command bullet, mention the bloom and portrait rows.

- [ ] **Step 3: Full gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test && pnpm build && pnpm size && pnpm test:e2e`

```bash
git add docs/superpowers/specs/2026-09-25-journey-card-deck-design.md CLAUDE.md
git commit -m "docs: Plan 3 in the spec's status and CLAUDE.md"
```

- [ ] **Step 4: Hand back for the browser check**

Report the head and the `pnpm size` rows. The controller opens the production build at 1440 (headless Chromium for exact widths, Chrome for the feel), checks S's eyes and seam, S+'s coat, smoke, fog and flare, the shadow, the bloom against the mid tier, the frame pacing during an S → S+ handoff, shows Marcus the screenshots, and writes the Build Log entry. The tuning session with the panel is Plan 5.
