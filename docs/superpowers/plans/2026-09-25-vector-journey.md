# The Vector Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the journey's seven Higgsfield clips with one continuous traced-and-rigged vector scene in which the character ranks up E → S+ as the visitor scrolls.

**Architecture:** A pnpm-only art pipeline (`sharp` + the `potrace` npm package) registers each generated flat-vector outfit onto one base pose, traces every image to palette-mapped layered paths, cuts the outfits into rig parts, and assembles one `public/journey/scene.svg` (plus a 3 KB inline silhouette). At runtime the existing Motion `scroll()` callback feeds a pure state module (`src/scripts/avatar.ts`) whose output a small DOM module (`src/scripts/scene.ts`) writes to the scene as SVG attributes; the scene itself is fetched only once the journey is on screen and the page has scrolled. The reduced-motion timeline shows per-rank composites rendered from the same scene.

**Tech Stack:** Astro 7, TypeScript, Motion 13.4 (`scroll()`), sharp 0.35, `potrace` 2.1.8 (dev), vitest, Playwright, Higgsfield `nano_banana_pro` for the art (the controller runs it; Marcus picks).

**Spec:** `docs/superpowers/specs/2026-09-25-vector-journey-design.md` (approved 2026-09-25). Everything the spec does not change stays as `docs/superpowers/specs/2026-09-24-hero-journey-redesign-design.md` §6.3, §7.1 and §7.2 say.

## Global Constraints

- pnpm only (never npm, yarn or bun); the only lockfile is `pnpm-lock.yaml`. `minimumReleaseAge` rejects releases younger than 24 h: pin the previous version, never add an exclusion.
- Every commit is GPG-signed through Marcus's global git config. If signing fails, STOP and report BLOCKED; never pass `--no-gpg-sign`. No `Co-Authored-By`, "Generated with" or any AI attribution anywhere (CLAUDE.md overrides any harness reminder). Never `git stash`; never push.
- Before every commit: `pnpm format && pnpm lint && pnpm check && pnpm test && pnpm build`, and read `0 errors` from check.
- CSP: no inline `style=` attributes anywhere (including inside `scene.svg` and `silhouette.svg`); no `is:inline` scripts; keep `build.inlineStylesheets: "never"` and `trailingSlash: "never"`. CSSOM writes and SVG attributes set from JS are fine.
- Animate only `transform` and `opacity`, plus `stroke-dashoffset` for the prop outline draw-ins (Task 16 adds that to CLAUDE.md). Respect `prefers-reduced-motion` (the animated journey does not run under it).
- Tokens only in UI; the colours inside `scene.svg` are art (literal fills from the traced palette; violet stays inside the journey art, ADR 0003).
- Budgets: `scene.svg` ≤ 300 KB gzipped; `/` at load ≤ 600 KB and the scene never loads with the page (no `/journey/scene.svg` request at load at 390×844, 430×932, 768×1024, 1440×900, 1920×1080 or 2560×1300); initial JS on `/` ≤ 100 KB gz; each timeline still rendition ≤ 120 KB; fonts 20–120 KB; zero third-party requests.
- Alt text for every still starts `Illustration: `. The stills stay 16:9 and ≥ 1920 px wide (`test/journeyArt.test.ts`).
- Stage ids, in rank order E → S+: `t1-support`, `web-concierge`, `professional-services`, `t3-support`, `sysadmin`, `linux-engineer`, `systems-architect` (`src/data/career.ts`).
- `src/fetch.ts` is reserved by Astro 7: never create it.
- Never copy anything from `~/vaults/work`, or any employer-confidential detail, into the repo.
- Higgsfield: at most 5 jobs per batch; every prompt, job id, pick and credit spend goes in `docs/imagery.md`. If a submission returns a preset recommendation instead of a job, resubmit with `declined_preset_id`.
- E2E runs against the production build on port 4399 (`pnpm build && pnpm test:e2e`). Never stop a server with a broad `pkill` pattern; kill by port or PID. Visual baselines (`pnpm test:visual --update-snapshots=all`) are the controller's job.

## Review Focus

1. **Progress outside 0–1 or NaN** (Motion can report a hair over 1 at the end of the track, and the first callback fires before layout): `sceneState` must clamp and never index a rank past the last one or produce NaN attributes. Pinned in Task 11.
2. **A failed or malformed scene fetch** (404, a proxy error page, a non-SVG document): the silhouette and the cards must stay, with no console error and no partial scene. Pinned in Task 13 (unit) and Task 14 (e2e).
3. **The visitor scrolls the journey before the scene arrives** (slow connection): the first `applyState` after load must reflect the current progress, not rank E. Pinned in Task 13.
4. **An outfit that lacks a part** (a hoodie has no coat tails) or a prop set with an empty layer: the builder must still emit the group with the same id so the runtime's lookups never return null. Pinned in Task 4 and Task 12.
5. **A generated outfit the registration rejects** (the residual over 2%): the script must exit non-zero with the residual in its message, so a re-roll happens instead of a misaligned outfit landing in `art/journey/`. Pinned in Task 3.

## File structure

New:

- `src/data/avatar-rig.json` — the rig: canvas, anchors, part polygons, pivots, per-rank poses, the rank order. Read by scripts (Node) and the site (TS) alike.
- `src/data/avatarRig.ts` — the typed view of the JSON (`RIG`, `PART_ORDER`, `PIVOT_OF_PART`, types).
- `scripts/trace-vector.mjs` — palette quantisation, mask rasterising, potrace wrapper, layered tracing, optional part cutting, SVG serialising. CLI for one image.
- `scripts/register-outfit.mjs` — fits an outfit render onto the base pose, measures the residual, rejects over 2%, writes `art/journey/outfit-<rank>.webp`.
- `scripts/import-art.mjs` — resizes a render onto a canvas and writes lossless WebP (base, props, energy).
- `scripts/preview-rig.mjs` — draws the rig's polygons and pivots over the base for tuning.
- `scripts/build-scene.mjs` — traces `art/journey/*` and writes `public/journey/scene.svg` and `src/components/journey/silhouette.svg`.
- `scripts/render-rank-stills.mjs` — per-rank 1920×1080 composites from the scene into `src/images/journey/<id>.webp`.
- `src/scripts/avatar.ts` — pure: scroll progress → scene state.
- `src/scripts/scene.ts` — DOM: binds the scene's ids, applies a state as attributes.
- `src/components/journey/silhouette.svg` — the inline placeholder (built, committed).
- `public/journey/scene.svg` — the scene (built, committed).
- `art/journey/*.webp` — the registered sources (lossless), committed so the scene can be rebuilt.
- Tests: `test/avatarRig.test.ts`, `test/traceVector.test.ts`, `test/registerOutfit.test.ts`, `test/importArt.test.ts`, `test/buildScene.test.ts`, `test/renderRankStills.test.ts`, `test/sceneSvg.test.ts`, `test/avatar.test.ts`, `test/scene.test.ts`.

Modified: `src/components/journey/Journey.astro`, `src/scripts/journey.ts`, `src/data/journeyArt.ts`, `scripts/check-bundle-size.mjs`, `test/journey.test.ts`, `test/journeyArt.test.ts`, `test/checkBundleSize.test.ts`, `test/ui/Journey.test.ts`, `e2e/journey.spec.ts`, `e2e/stills.spec.ts`, `package.json`, `CLAUDE.md`, `docs/imagery.md`, both specs, ADR 0003.

Deleted: `public/journey/*.{webm,mp4}` (28 files), `scripts/encode-clip.mjs`, `scripts/clip-variants.mjs`, `test/encodeClip.test.ts`.

Scene geometry (used by every task): the figure canvas is 1000×1500 (2:3); the scene viewBox is `0 0 1600 1500` with the figure at `translate(300 0)`; prop and energy art is 1500×1500 placed at `translate(50 0)`. Draw order in the scene, bottom to top: `#floor`, `#energy`, `#props`, `#avatar`; inside the avatar, `coat-left`, `coat-right`, `legs`, `arm-left`, `arm-right`, `torso`, `head`. "Left" and "right" are the viewer's sides.

Scene ids (the contract between the builder, the runtime and the stills renderer):

```
#floor                                   a 4px iron line under the feet
#energy                                  the aura layers; opacity/transform set at runtime
#props > #props-<rankId>                 visibility per rank
        > #props-<rankId>-fill           a <g> of colour layers; opacity
        > #props-<rankId>-outline        one <path fill="none" stroke="#6e6e78" stroke-width="3" pathLength="1" stroke-dasharray="1">; stroke-dashoffset + opacity
#avatar > #part-<part>                   rotate(deg px py) set at runtime
          > #part-<part>-idle            CSS idle animation target
            > #outfit-<rankId>-<part>    visibility + opacity per rank
```

---

### Task 1: The rig config

**Files:**

- Create: `src/data/avatar-rig.json`
- Create: `src/data/avatarRig.ts`
- Create: `scripts/preview-rig.mjs`
- Test: `test/avatarRig.test.ts`

**Interfaces:**

- Consumes: `career` from `src/data/career.ts` (only in the test).
- Produces: `RIG` (the JSON, typed as `Rig`), `PART_ORDER: readonly PartId[]` (draw order, bottom to top), `PIVOT_OF_PART: Partial<Record<PartId, PivotId>>` (`head → neck`, `arm-left → shoulder-left`, `arm-right → shoulder-right`), types `PartId`, `PivotId`, `Pose`, `Rig`; `previewRig(basePath, rig, outPath)` in the script.

- [ ] **Step 1: Write the failing test**

`test/avatarRig.test.ts`:

```ts
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { previewRig } from "../scripts/preview-rig.mjs";
import { career } from "../src/data/career";
import { PART_ORDER, PIVOT_OF_PART, RIG, type PartId } from "../src/data/avatarRig";

const PARTS: PartId[] = [
  "head",
  "torso",
  "arm-left",
  "arm-right",
  "legs",
  "coat-left",
  "coat-right",
];

describe("avatar rig", () => {
  it("lists the ranks in career order", () => {
    expect(RIG.ranks).toEqual(career.map((s) => s.id));
  });

  it("names every part once, in a draw order that ends with the torso and the head", () => {
    expect(RIG.parts.map((p) => p.id).sort()).toEqual([...PARTS].sort());
    expect(PART_ORDER).toEqual([
      "coat-left",
      "coat-right",
      "legs",
      "arm-left",
      "arm-right",
      "torso",
      "head",
    ]);
  });

  it("keeps every polygon and pivot inside the figure canvas", () => {
    const { width, height } = RIG.canvas;
    for (const part of RIG.parts) {
      expect(part.polygon.length, part.id).toBeGreaterThanOrEqual(3);
      for (const [x, y] of part.polygon) {
        expect(x, part.id).toBeGreaterThanOrEqual(0);
        expect(x, part.id).toBeLessThanOrEqual(width);
        expect(y, part.id).toBeGreaterThanOrEqual(0);
        expect(y, part.id).toBeLessThanOrEqual(height);
      }
    }
    for (const [name, [x, y]] of Object.entries(RIG.pivots)) {
      expect(x, name).toBeGreaterThan(0);
      expect(x, name).toBeLessThan(width);
      expect(y, name).toBeGreaterThan(0);
      expect(y, name).toBeLessThan(height);
    }
    expect(RIG.anchors.crown).toBeLessThan(RIG.anchors.feet);
    expect(RIG.anchors.feet).toBeLessThanOrEqual(height);
  });

  it("maps the head and the arms to their pivots", () => {
    expect(PIVOT_OF_PART).toEqual({
      head: "neck",
      "arm-left": "shoulder-left",
      "arm-right": "shoulder-right",
    });
  });

  it("gives every rank a pose for every pivot, within ±60°", () => {
    for (const rank of RIG.ranks) {
      const pose = RIG.poses[rank];
      expect(pose, rank).toBeDefined();
      expect(Object.keys(pose!).sort()).toEqual(Object.keys(RIG.pivots).sort());
      for (const deg of Object.values(pose!)) expect(Math.abs(deg)).toBeLessThanOrEqual(60);
    }
  });
});

describe("previewRig", () => {
  let dir: string | undefined;
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = undefined;
  });

  it("draws the polygons and pivots over the base at the base's size", async () => {
    dir = mkdtempSync(join(tmpdir(), "rig-"));
    const base = join(dir, "base.webp");
    await sharp({ create: { width: 100, height: 150, channels: 3, background: "#f4f4f0" } })
      .webp({ lossless: true })
      .toFile(base);
    const rig = {
      ...RIG,
      canvas: { width: 100, height: 150 },
      parts: [
        {
          id: "head",
          polygon: [
            [40, 10],
            [60, 10],
            [60, 40],
            [40, 40],
          ],
        },
      ],
      pivots: { neck: [50, 40] },
    };
    const out = join(dir, "preview.png");
    await previewRig(base, rig, out);
    expect(existsSync(out)).toBe(true);
    const meta = await sharp(out).metadata();
    expect([meta.width, meta.height]).toEqual([100, 150]);
    // The overlay drew something: the pixel on the polygon's edge is no longer background.
    const { data } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
    const at = (x: number, y: number) => data[(y * 100 + x) * 3];
    expect(at(40, 25)).not.toBe(0xf4);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run test/avatarRig.test.ts`
Expected: FAIL (cannot resolve `../src/data/avatarRig` and `../scripts/preview-rig.mjs`).

- [ ] **Step 3: Write the rig JSON**

`src/data/avatar-rig.json` (the polygons are a first fit for a centred A-pose on the 1000×1500 canvas; Task 7 tunes them against the picked base with `scripts/preview-rig.mjs`; the masks overlap on purpose at the pivots, and the torso is drawn above the arms so its edge covers the shoulder seam):

```json
{
  "ranks": [
    "t1-support",
    "web-concierge",
    "professional-services",
    "t3-support",
    "sysadmin",
    "linux-engineer",
    "systems-architect"
  ],
  "canvas": { "width": 1000, "height": 1500 },
  "anchors": { "crown": 110, "feet": 1420, "centre": 500 },
  "parts": [
    {
      "id": "coat-left",
      "polygon": [
        [250, 620],
        [470, 620],
        [470, 1200],
        [230, 1200]
      ]
    },
    {
      "id": "coat-right",
      "polygon": [
        [530, 620],
        [750, 620],
        [770, 1200],
        [530, 1200]
      ]
    },
    {
      "id": "legs",
      "polygon": [
        [330, 860],
        [670, 860],
        [700, 1450],
        [300, 1450]
      ]
    },
    {
      "id": "arm-left",
      "polygon": [
        [290, 460],
        [440, 460],
        [410, 1000],
        [230, 1000]
      ]
    },
    {
      "id": "arm-right",
      "polygon": [
        [560, 460],
        [710, 460],
        [770, 1000],
        [590, 1000]
      ]
    },
    {
      "id": "torso",
      "polygon": [
        [370, 420],
        [630, 420],
        [650, 900],
        [350, 900]
      ]
    },
    {
      "id": "head",
      "polygon": [
        [370, 60],
        [630, 60],
        [630, 470],
        [370, 470]
      ]
    }
  ],
  "pivots": {
    "neck": [500, 430],
    "shoulder-left": [405, 500],
    "shoulder-right": [595, 500],
    "hips": [500, 880]
  },
  "poses": {
    "t1-support": { "neck": 0, "shoulder-left": 0, "shoulder-right": 0, "hips": 0 },
    "web-concierge": { "neck": -3, "shoulder-left": 0, "shoulder-right": -35, "hips": 0 },
    "professional-services": { "neck": 0, "shoulder-left": 22, "shoulder-right": -12, "hips": 0 },
    "t3-support": { "neck": 0, "shoulder-left": 0, "shoulder-right": 0, "hips": 0 },
    "sysadmin": { "neck": 4, "shoulder-left": 0, "shoulder-right": 16, "hips": 0 },
    "linux-engineer": { "neck": -2, "shoulder-left": -28, "shoulder-right": -32, "hips": 0 },
    "systems-architect": { "neck": 0, "shoulder-left": 6, "shoulder-right": -6, "hips": 0 }
  }
}
```

Rotation is in degrees about the pivot, positive clockwise on screen (SVG `rotate`). The `hips` pivot is not rotated (a hip lean would leave the sibling parts behind); it is the transform origin for the torso's idle breathing and the energy's scale.

- [ ] **Step 4: Write the typed view**

`src/data/avatarRig.ts`:

```ts
// The avatar rig (vector journey spec §4.6): the figure canvas, the head/feet anchors the
// registration fits to, the part masks the tracer cuts every outfit by, the pivots the runtime
// rotates about, and each rank's pose. The JSON is the source so scripts/*.mjs can read it too.
import rig from "./avatar-rig.json";

export type PartId =
  "head" | "torso" | "arm-left" | "arm-right" | "legs" | "coat-left" | "coat-right";
export type PivotId = "neck" | "shoulder-left" | "shoulder-right" | "hips";
export type Point = [number, number];
/** Degrees about each pivot, positive clockwise on screen. */
export type Pose = Record<PivotId, number>;

export interface Rig {
  ranks: readonly string[];
  canvas: { width: number; height: number };
  /** y of the top of the head and the bottom of the feet, and the figure's centre x. */
  anchors: { crown: number; feet: number; centre: number };
  parts: readonly { id: PartId; polygon: readonly Point[] }[];
  pivots: Record<PivotId, Point>;
  poses: Readonly<Record<string, Pose>>;
}

export const RIG: Rig = rig as Rig;

/** Draw order, bottom to top: the torso covers the arm seams, the head covers the collar. */
export const PART_ORDER: readonly PartId[] = [
  "coat-left",
  "coat-right",
  "legs",
  "arm-left",
  "arm-right",
  "torso",
  "head",
];

/** The parts the runtime rotates, and about which pivot. */
export const PIVOT_OF_PART: Partial<Record<PartId, PivotId>> = {
  head: "neck",
  "arm-left": "shoulder-left",
  "arm-right": "shoulder-right",
};
```

- [ ] **Step 5: Write the preview script**

`scripts/preview-rig.mjs`:

```js
// Draws the rig's part polygons (ember, 40% fill) and pivots (violet dots) over the base pose,
// for tuning src/data/avatar-rig.json by eye.
// Usage: node scripts/preview-rig.mjs [art/journey/base.webp] [out.png]
import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const require = createRequire(import.meta.url);

export async function previewRig(basePath, rig, outPath) {
  const { width, height } = rig.canvas;
  const polygons = rig.parts
    .map(
      (p) =>
        `<polygon points="${p.polygon.map(([x, y]) => `${x},${y}`).join(" ")}" fill="#da5c2c" fill-opacity="0.4" stroke="#da5c2c" stroke-width="3"/>`,
    )
    .join("");
  const pivots = Object.values(rig.pivots)
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#7040d2"/>`)
    .join("");
  const overlay = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${polygons}${pivots}</svg>`,
  );
  await sharp(basePath)
    .resize(width, height, { fit: "fill" })
    .composite([{ input: overlay }])
    .png()
    .toFile(outPath);
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const [base = "art/journey/base.webp", out = "rig-preview.png"] = process.argv.slice(2);
  await previewRig(base, require("../src/data/avatar-rig.json"), out);
  console.log(`${out}: rig drawn over ${base}`);
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm vitest run test/avatarRig.test.ts`
Expected: PASS (6 tests). If `pnpm check` complains about the JSON import, add `"resolveJsonModule": true` under `compilerOptions` in `tsconfig.json` (Astro's strict base already sets it; only add it if check fails).

- [ ] **Step 7: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test && pnpm build`
Expected: `0 errors` from check; all tests pass; build completes.

```bash
git add src/data/avatar-rig.json src/data/avatarRig.ts scripts/preview-rig.mjs test/avatarRig.test.ts
git commit -m "journey: the avatar rig config (parts, pivots, poses) and its preview script"
```

### Task 2: The tracer

**Files:**

- Modify: `package.json` (devDependency `potrace`), `pnpm-lock.yaml`
- Create: `scripts/trace-vector.mjs`
- Test: `test/traceVector.test.ts`

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces (all exported from `scripts/trace-vector.mjs`): `PALETTE` (name → hex), `BACKGROUND = 255`, `TRACE` (defaults), `hexToRgb(hex): [r,g,b]`, `isBackground(r,g,b): boolean`, `quantise(rgb: Buffer, count: number, palette?): Uint8Array`, `loadIndices(input, { width?, height?, palette?, blur? }): Promise<{ indices, width, height }>`, `polygonMask(polygon, width, height): Promise<Uint8Array>`, `maskPng(indices, width, height, test): Promise<Buffer | null>`, `roundPath(d, decimals?): string`, `tracePath(png, opts?): Promise<string>`, `traceLayers(input, { width?, height?, palette?, parts?, base?, trace? }): Promise<Layer[]>` where `Layer = { part?: string; name: string; fill: string; d: string }`, `layerGroup(layer, extraAttributes?): string`, `svgFromLayers(layers, width, height): string`.

- [ ] **Step 1: Add the dependency**

Run: `pnpm add -D potrace@2.1.8`
Expected: `potrace 2.1.8` under devDependencies (it depends on `jimp` 0.14, pure JS). If pnpm reports a blocked lifecycle script for a transitive package, add it as `false` under `allowBuilds` in `pnpm-workspace.yaml` with a one-line comment (potrace needs no native build), and say so in your report. Run `pnpm audit --prod` and confirm it is still clean (the package is dev-only).

- [ ] **Step 2: Write the failing test**

`test/traceVector.test.ts`:

```ts
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  BACKGROUND,
  PALETTE,
  isBackground,
  quantise,
  roundPath,
  svgFromLayers,
  traceLayers,
} from "../scripts/trace-vector.mjs";

/** A 400×600 flat-art stand-in: a black column with an ember block near its foot. */
const art = () =>
  sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600">
        <rect width="400" height="600" fill="#f4f4f0"/>
        <rect x="100" y="100" width="200" height="400" fill="#101014"/>
        <rect x="150" y="400" width="100" height="80" fill="#da5c2c"/>
      </svg>`,
    ),
  )
    .png()
    .toBuffer();

const bbox = (d: string) => {
  const nums = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const xs = nums.filter((_, i) => i % 2 === 0);
  const ys = nums.filter((_, i) => i % 2 === 1);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
};

describe("isBackground", () => {
  it("treats near-white as background and anything darker or tinted as art", () => {
    expect(isBackground(250, 250, 250)).toBe(true);
    expect(isBackground(244, 244, 240)).toBe(true);
    expect(isBackground(200, 200, 200)).toBe(false);
    expect(isBackground(240, 200, 240)).toBe(false);
  });
});

describe("quantise", () => {
  it("maps each pixel to the nearest palette colour, background to 255", () => {
    const px = Buffer.from([218, 92, 44, 255, 255, 255, 20, 20, 24, 110, 60, 200]);
    const names = Object.keys(PALETTE);
    const out = quantise(px, 4);
    expect(names[out[0]!]).toBe("ember");
    expect(out[1]).toBe(BACKGROUND);
    expect(names[out[2]!]).toBe("ink");
    expect(names[out[3]!]).toBe("violet");
  });
});

describe("roundPath", () => {
  it("rounds to one decimal, drops trailing zeros and folds whitespace", () => {
    expect(roundPath("M 10.000 20.500\nC 1.234 -0.000 3 4")).toBe("M 10 20.5 C 1.2 0 3 4");
  });
});

describe("traceLayers", () => {
  it("traces a silhouette base plus one layer per colour, each where the colour is", async () => {
    const layers = await traceLayers(await art());
    expect(layers.map((l) => l.name)).toEqual(["base", "ember"]);
    expect(layers[0]!.fill).toBe(PALETTE.ink);
    const base = bbox(layers[0]!.d);
    expect(base.x0).toBeGreaterThan(95);
    expect(base.x1).toBeLessThan(305);
    expect(base.y0).toBeGreaterThan(95);
    expect(base.y1).toBeLessThan(505);
    const ember = bbox(layers[1]!.d);
    expect(ember.x0).toBeGreaterThan(145);
    expect(ember.x1).toBeLessThan(255);
    expect(ember.y0).toBeGreaterThan(395);
    expect(ember.y1).toBeLessThan(485);
    for (const l of layers) expect(l.d).not.toMatch(/\d\.\d\d/);
  });

  it("cuts every layer by the part masks, keeping the part's name", async () => {
    const parts = [
      {
        id: "top",
        polygon: [
          [0, 0],
          [400, 0],
          [400, 300],
          [0, 300],
        ],
      },
      {
        id: "bottom",
        polygon: [
          [0, 300],
          [400, 300],
          [400, 600],
          [0, 600],
        ],
      },
    ];
    const layers = await traceLayers(await art(), { parts });
    expect(layers.map((l) => `${l.part}/${l.name}`)).toEqual([
      "top/base",
      "bottom/base",
      "bottom/ember",
    ]);
    expect(bbox(layers[0]!.d).y1).toBeLessThan(305);
    expect(bbox(layers[1]!.d).y0).toBeGreaterThan(295);
  });

  it("traces nothing from a blank image", async () => {
    const blank = await sharp({
      create: { width: 50, height: 50, channels: 3, background: "#fff" },
    })
      .png()
      .toBuffer();
    expect(await traceLayers(blank)).toEqual([]);
  });

  it("resamples to the requested size first", async () => {
    const layers = await traceLayers(await art(), { width: 200, height: 300 });
    const base = bbox(layers[0]!.d);
    expect(base.x0).toBeGreaterThan(45);
    expect(base.x1).toBeLessThan(155);
  });
});

describe("svgFromLayers", () => {
  it("writes one filled group per layer with no style attributes", () => {
    const svg = svgFromLayers(
      [
        { name: "base", fill: "#0e0e12", d: "M 0 0 L 10 0 L 10 10 Z" },
        { name: "ember", fill: "#da5c2c", d: "M 2 2 L 4 2 L 4 4 Z" },
      ],
      10,
      10,
    );
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 10 10">/);
    expect(svg.match(/<g /g)).toHaveLength(2);
    expect(svg).toContain('fill="#da5c2c" fill-rule="evenodd"><path d="M 2 2 L 4 2 L 4 4 Z"/>');
    expect(svg).not.toContain("style=");
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm vitest run test/traceVector.test.ts`
Expected: FAIL (cannot resolve `../scripts/trace-vector.mjs`).

- [ ] **Step 4: Write the tracer**

`scripts/trace-vector.mjs`:

```js
// Traces flat art to layered SVG paths (vector journey spec §4.5): a light blur, every pixel
// mapped to the nearest colour of a fixed palette (near-white is background), then potrace on a
// solid silhouette (the base, which hides hairline seams) and on one mask per colour; optionally
// every layer is cut by the rig's part polygons first. Output paths are absolute, rounded to one
// decimal, with fills as attributes (no style=, for the CSP).
// Usage: node scripts/trace-vector.mjs <image> <out.svg> [width height]
import { realpathSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const potrace = createRequire(import.meta.url)("potrace");

/** The art's palette (from the spike): the name is the layer id, the value the fill. */
export const PALETTE = {
  ink: "#0e0e12",
  coat: "#1e1e24",
  shadow: "#303038",
  cloth: "#484852",
  mid: "#6e6e78",
  skin: "#e0c4b0",
  skinshade: "#b49684",
  eye: "#96a0aa",
  ember: "#da5c2c",
  violet: "#7040d2",
};

/** The index of a background pixel. */
export const BACKGROUND = 255;

/** Tracing defaults, tuned on the spike figure at 1000 px tall (36 KB gz for ten layers). */
export const TRACE = { blur: 0.6, turdSize: 10, alphaMax: 1, optTolerance: 0.6, decimals: 1 };

export const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** Near-white and near-grey: the plain background every render is asked for. */
export const isBackground = (r, g, b) =>
  Math.min(r, g, b) > 205 && Math.max(r, g, b) - Math.min(r, g, b) < 24;

/** Maps raw RGB pixels (3 bytes each) to palette indices; BACKGROUND for the background. */
export function quantise(rgb, count, palette = PALETTE) {
  const colours = Object.values(palette).map(hexToRgb);
  const out = new Uint8Array(count);
  for (let p = 0; p < count; p++) {
    const r = rgb[p * 3];
    const g = rgb[p * 3 + 1];
    const b = rgb[p * 3 + 2];
    if (isBackground(r, g, b)) {
      out[p] = BACKGROUND;
      continue;
    }
    let best = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < colours.length; i++) {
      const [cr, cg, cb] = colours[i];
      const distance = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    }
    out[p] = best;
  }
  return out;
}

/** Reads an image (any format sharp reads), optionally resampled, lightly blurred, into indices. */
export async function loadIndices(
  input,
  { width, height, palette = PALETTE, blur = TRACE.blur } = {},
) {
  let image = sharp(input).flatten({ background: "#ffffff" });
  if (width && height) image = image.resize(width, height, { fit: "fill" });
  if (blur) image = image.blur(blur);
  const { data, info } = await image.removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const count = info.width * info.height;
  return { indices: quantise(data, count, palette), width: info.width, height: info.height };
}

/** Rasterises a polygon (canvas coordinates) to a mask: 1 inside, 0 outside. */
export async function polygonMask(polygon, width, height) {
  const points = polygon.map(([x, y]) => `${x},${y}`).join(" ");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#fff"/><polygon points="${points}" fill="#000"/></svg>`;
  const data = await sharp(Buffer.from(svg)).greyscale().raw().toBuffer();
  const mask = new Uint8Array(width * height);
  for (let p = 0; p < mask.length; p++) mask[p] = data[p] < 128 ? 1 : 0;
  return mask;
}

/** A PNG that is black where `test(index, pixel)` holds and white elsewhere, or null if nowhere. */
export async function maskPng(indices, width, height, test) {
  const raw = Buffer.alloc(width * height, 255);
  let count = 0;
  for (let p = 0; p < raw.length; p++) {
    if (test(indices[p], p)) {
      raw[p] = 0;
      count++;
    }
  }
  if (count === 0) return null;
  return sharp(raw, { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer();
}

/** Rounds every coordinate (dropping trailing zeros) and folds the whitespace potrace emits. */
export const roundPath = (d, decimals = TRACE.decimals) =>
  d
    .replace(/-?\d+\.\d+/g, (n) => String(Number(Number(n).toFixed(decimals))))
    .replace(/\s+/g, " ")
    .trim();

/** Traces a black-on-white PNG with potrace to one path's `d` (absolute coordinates). */
export function tracePath(png, opts = {}) {
  return new Promise((resolve, reject) => {
    const tracer = new potrace.Potrace({
      turdSize: opts.turdSize ?? TRACE.turdSize,
      alphaMax: opts.alphaMax ?? TRACE.alphaMax,
      optCurve: true,
      optTolerance: opts.optTolerance ?? TRACE.optTolerance,
      threshold: 128,
      blackOnWhite: true,
    });
    tracer.loadImage(png, (err) => {
      if (err) return reject(err);
      const d = tracer.getPathTag().match(/ d="([^"]*)"/)?.[1] ?? "";
      resolve(roundPath(d, opts.decimals));
    });
  });
}

/**
 * Traces an image into layers: a silhouette base (filled with the `base` colour) and one layer
 * per palette colour present, in palette order; with `parts`, every layer is cut by each part's
 * polygon in turn and tagged with the part id. Layers that trace to nothing are left out.
 */
export async function traceLayers(
  input,
  { width, height, palette = PALETTE, parts, base = "ink", trace = {} } = {},
) {
  const { indices, width: w, height: h } = await loadIndices(input, { width, height, palette });
  const names = Object.keys(palette);
  const used = [...new Set(indices.filter((i) => i !== BACKGROUND))].sort((a, b) => a - b);
  const regions = parts
    ? await Promise.all(
        parts.map(async (p) => ({ part: p.id, mask: await polygonMask(p.polygon, w, h) })),
      )
    : [{ part: undefined, mask: null }];
  const layers = [];
  for (const { part, mask } of regions) {
    const inside = (p) => !mask || mask[p] === 1;
    const push = async (name, test) => {
      const png = await maskPng(indices, w, h, test);
      if (!png) return;
      const d = await tracePath(png, trace);
      if (d) layers.push({ ...(part ? { part } : {}), name, fill: palette[name], d });
    };
    await push("base", (i, p) => i !== BACKGROUND && inside(p));
    for (const i of used) {
      const name = names[i];
      if (name === base) continue;
      await push(name, (j, p) => j === i && inside(p));
    }
  }
  return layers;
}

/** One layer as a filled group. Fills are attributes, never style. */
export const layerGroup = (layer, extra = "") =>
  `<g${extra} fill="${layer.fill}" fill-rule="evenodd"><path d="${layer.d}"/></g>`;

export function svgFromLayers(layers, width, height) {
  const groups = layers.map((l) => layerGroup(l, ` data-layer="${l.name}"`)).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">${groups}</svg>`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const [input, output, width, height] = process.argv.slice(2);
  if (!input || !output) {
    console.error("usage: node scripts/trace-vector.mjs <image> <out.svg> [width height]");
    process.exit(1);
  }
  const size = width && height ? { width: Number(width), height: Number(height) } : {};
  const layers = await traceLayers(input, size);
  const meta = await sharp(input).metadata();
  const svg = svgFromLayers(layers, size.width ?? meta.width, size.height ?? meta.height);
  writeFileSync(output, svg);
  console.log(`${output}: ${layers.length} layers, ${(svg.length / 1024).toFixed(0)} KB`);
}
```

Note on the `base` colour: the silhouette base is filled with `ink`, so `ink` never gets a layer of its own; every other colour present is drawn on top of it.

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run test/traceVector.test.ts`
Expected: PASS (8 tests). If the bbox assertions are off by more than the tolerances, the likely cause is `blur` bleeding the ember block into the surrounding ink: keep `TRACE.blur` at 0.6 and widen nothing; report it instead.

- [ ] **Step 6: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test && pnpm build`
Expected: `0 errors` from check; all tests pass; build completes.

```bash
git add package.json pnpm-lock.yaml pnpm-workspace.yaml scripts/trace-vector.mjs test/traceVector.test.ts
git commit -m "journey: the vector tracer (palette-mapped layers, part cutting, potrace)"
```

### Task 3: Art import and outfit registration

**Files:**

- Create: `scripts/import-art.mjs`
- Create: `scripts/register-outfit.mjs`
- Test: `test/importArt.test.ts`, `test/registerOutfit.test.ts`

**Interfaces:**

- Consumes: `loadIndices`, `BACKGROUND` from `scripts/trace-vector.mjs` (Task 2).
- Produces: `importArt(input, output, width, height): Promise<sharp.Metadata>`; `measure(input, width, height): Promise<{ rows: ([l, r] | null)[], crown, feet, centre, span }>`; `registerOutfit(basePath, outfitPath, outPath, { threshold = 0.02 }): Promise<{ scale, left, top, residual, accepted }>`; `RESIDUAL_MAX = 0.02`.

- [ ] **Step 1: Write the failing tests**

`test/importArt.test.ts`:

```ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { importArt } from "../scripts/import-art.mjs";

let dir: string | undefined;
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

describe("importArt", () => {
  it("fits a render onto the canvas as lossless WebP, padding with white, never cropping", async () => {
    dir = mkdtempSync(join(tmpdir(), "art-"));
    const input = join(dir, "in.png");
    await sharp({ create: { width: 1600, height: 1600, channels: 4, background: "#101014ff" } })
      .png()
      .toFile(input);
    const meta = await importArt(input, join(dir, "out.webp"), 1000, 1500);
    expect([meta.width, meta.height, meta.format]).toEqual([1000, 1500, "webp"]);
    const { data } = await sharp(join(dir, "out.webp")).raw().toBuffer({ resolveWithObject: true });
    const px = (x: number, y: number) => data[(y * 1000 + x) * 3];
    expect(px(500, 10)).toBe(0xff); // padded top
    expect(px(500, 750)).toBe(0x10); // the art, centred
  });
});
```

`test/registerOutfit.test.ts`:

```ts
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { RESIDUAL_MAX, measure, registerOutfit } from "../scripts/register-outfit.mjs";

let dir: string;
afterEach(() => rmSync(dir, { recursive: true, force: true }));

/** A stick figure on a 500×750 canvas: head, body, boots; `s` scales it, `dx`/`dy` shift it. */
async function figure(path: string, s = 1, dx = 0, dy = 0, bootHalf = 70, torsoHalf = 50) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750">
    <rect width="500" height="750" fill="#f4f4f0"/>
    <g transform="translate(${dx} ${dy}) scale(${s})">
      <circle cx="250" cy="70" r="40" fill="#101014"/>
      <rect x="${250 - torsoHalf}" y="110" width="${torsoHalf * 2}" height="500" fill="#1e1e24"/>
      <rect x="${250 - bootHalf}" y="610" width="${bootHalf * 2}" height="60" fill="#101014"/>
    </g></svg>`;
  await sharp(Buffer.from(svg)).webp({ lossless: true }).toFile(path);
}

describe("measure", () => {
  it("finds the crown, the feet and the crown's centre", async () => {
    dir = mkdtempSync(join(tmpdir(), "reg-"));
    const base = join(dir, "base.webp");
    await figure(base);
    const m = await measure(base, 500, 750);
    expect(m.crown).toBeGreaterThanOrEqual(29);
    expect(m.crown).toBeLessThanOrEqual(31);
    expect(m.feet).toBeGreaterThanOrEqual(668);
    expect(m.feet).toBeLessThanOrEqual(670);
    expect(Math.abs(m.centre - 250)).toBeLessThan(2);
    expect(m.rows[400]).toEqual([200, 299]);
  });
});

describe("registerOutfit", () => {
  it("fits a smaller, shifted render of the same body onto the base", async () => {
    dir = mkdtempSync(join(tmpdir(), "reg-"));
    const base = join(dir, "base.webp");
    const outfit = join(dir, "outfit.webp");
    const out = join(dir, "registered.webp");
    await figure(base);
    await figure(outfit, 0.8, 30, 40, 70, 80); // a wider coat, the same head and boots
    const r = await registerOutfit(base, outfit, out);
    expect(r.accepted).toBe(true);
    expect(r.scale).toBeCloseTo(1.25, 1);
    expect(r.residual).toBeLessThan(RESIDUAL_MAX);
    expect(existsSync(out)).toBe(true);
    const m = await measure(out, 500, 750);
    expect(Math.abs(m.crown - 30)).toBeLessThanOrEqual(2);
    expect(Math.abs(m.feet - 669)).toBeLessThanOrEqual(2);
    expect(Math.abs(m.centre - 250)).toBeLessThan(3);
    const meta = await sharp(out).metadata();
    expect([meta.width, meta.height]).toEqual([500, 750]);
  });

  it("rejects a render whose feet don't line up, and writes nothing", async () => {
    dir = mkdtempSync(join(tmpdir(), "reg-"));
    const base = join(dir, "base.webp");
    const outfit = join(dir, "outfit.webp");
    const out = join(dir, "registered.webp");
    await figure(base);
    await figure(outfit, 1, 0, 0, 110); // boots 40 px wider each side: ~6% of the figure's height
    const r = await registerOutfit(base, outfit, out);
    expect(r.accepted).toBe(false);
    expect(r.residual).toBeGreaterThan(RESIDUAL_MAX);
    expect(existsSync(out)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run test/importArt.test.ts test/registerOutfit.test.ts`
Expected: FAIL (cannot resolve the two scripts).

- [ ] **Step 3: Write the import script**

`scripts/import-art.mjs`:

```js
// Imports a generated render into art/journey: fitted onto the canvas (letterboxed with white,
// never cropped, never enlarged past the canvas), flattened, lossless WebP so the trace is exact.
// Usage: node scripts/import-art.mjs <render> art/journey/<name>.webp <width> <height>
//   base and outfits: 1000 1500   props and energy: 1500 1500
import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

export async function importArt(input, output, width, height) {
  await sharp(input)
    .flatten({ background: "#ffffff" })
    .resize(width, height, { fit: "contain", background: "#ffffff" })
    .webp({ lossless: true })
    .toFile(output);
  return sharp(output).metadata();
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const [input, output, width, height] = process.argv.slice(2);
  if (!input || !output || !width || !height) {
    console.error("usage: node scripts/import-art.mjs <render> <out.webp> <width> <height>");
    process.exit(1);
  }
  const meta = await importArt(input, output, Number(width), Number(height));
  console.log(`${output}: ${meta.width}×${meta.height} ${meta.format}`);
}
```

- [ ] **Step 4: Write the registration script**

`scripts/register-outfit.mjs`:

```js
// Registers an outfit render onto the base pose (vector journey spec §4.4): scales it so the
// crown of the head and the bottom of the feet land on the base's, centres the crown, and
// rejects it when the parts every outfit shares (the feet and the crown) still miss by more
// than 2% of the figure's height. Writes art/journey/outfit-<rank>.webp on the base canvas.
// Usage: node scripts/register-outfit.mjs <render> <rank-id> [art/journey/base.webp]
import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { BACKGROUND, loadIndices } from "./trace-vector.mjs";

/** Misalignment of the shared parts, as a fraction of the figure's height. */
export const RESIDUAL_MAX = 0.02;

/** Per-row art extents, the crown and feet rows, the crown's centre x, and the figure's span. */
export async function measure(input, width, height) {
  const { indices } = await loadIndices(input, { width, height, blur: 0 });
  const rows = new Array(height).fill(null);
  let crown = -1;
  let feet = -1;
  for (let y = 0; y < height; y++) {
    let left = -1;
    let right = -1;
    for (let x = 0; x < width; x++) {
      if (indices[y * width + x] === BACKGROUND) continue;
      if (left < 0) left = x;
      right = x;
    }
    if (left < 0) continue;
    rows[y] = [left, right];
    if (crown < 0) crown = y;
    feet = y;
  }
  const span = feet - crown;
  const top = rows.slice(crown, crown + Math.max(1, Math.round(span * 0.03))).filter(Boolean);
  const centre = top.reduce((sum, [l, r]) => sum + (l + r) / 2, 0) / top.length;
  return { rows, crown, feet, centre, span };
}

/** Places `buffer` on a white canvas at (left, top), clipping whatever falls outside. */
async function place(buffer, width, height, left, top) {
  const meta = await sharp(buffer).metadata();
  const x0 = Math.max(0, -left);
  const y0 = Math.max(0, -top);
  const w = Math.min(meta.width - x0, width - Math.max(0, left));
  const h = Math.min(meta.height - y0, height - Math.max(0, top));
  const cropped = await sharp(buffer)
    .extract({ left: x0, top: y0, width: w, height: h })
    .toBuffer();
  return sharp({ create: { width, height, channels: 3, background: "#ffffff" } })
    .composite([{ input: cropped, left: Math.max(0, left), top: Math.max(0, top) }])
    .webp({ lossless: true })
    .toBuffer();
}

/** Mean edge miss over the feet rows (the bottom 8% of the figure) and the crown centre miss. */
function residualOf(base, fitted) {
  const from = base.feet - Math.round(base.span * 0.08);
  let sum = 0;
  let n = 0;
  for (let y = from; y <= base.feet; y++) {
    const a = base.rows[y];
    const b = fitted.rows[y];
    if (!a || !b) continue;
    sum += (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1])) / 2;
    n++;
  }
  const feetMiss = n ? sum / n : Infinity;
  const crownMiss = Math.abs(base.centre - fitted.centre);
  return Math.max(feetMiss, crownMiss) / base.span;
}

export async function registerOutfit(
  basePath,
  outfitPath,
  outPath,
  { threshold = RESIDUAL_MAX } = {},
) {
  const meta = await sharp(basePath).metadata();
  const { width, height } = meta;
  const base = await measure(basePath, width, height);
  const outfitMeta = await sharp(outfitPath).metadata();
  const raw = await measure(outfitPath, outfitMeta.width, outfitMeta.height);
  const scale = base.span / raw.span;
  const resized = await sharp(outfitPath)
    .flatten({ background: "#ffffff" })
    .resize(Math.round(outfitMeta.width * scale), Math.round(outfitMeta.height * scale), {
      fit: "fill",
    })
    .toBuffer();
  const left = Math.round(base.centre - raw.centre * scale);
  const top = Math.round(base.crown - raw.crown * scale);
  const registered = await place(resized, width, height, left, top);
  const fitted = await measure(registered, width, height);
  const residual = residualOf(base, fitted);
  const accepted = residual <= threshold;
  if (accepted) await sharp(registered).toFile(outPath);
  return { scale, left, top, residual, accepted };
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const [render, rank, base = "art/journey/base.webp"] = process.argv.slice(2);
  if (!render || !rank) {
    console.error("usage: node scripts/register-outfit.mjs <render> <rank-id> [base.webp]");
    process.exit(1);
  }
  const out = `art/journey/outfit-${rank}.webp`;
  const r = await registerOutfit(base, render, out);
  const pct = (r.residual * 100).toFixed(1);
  if (!r.accepted) {
    console.error(
      `rejected: residual ${pct}% > ${RESIDUAL_MAX * 100}% (scale ${r.scale.toFixed(3)}); re-roll it`,
    );
    process.exit(1);
  }
  console.log(`${out}: scale ${r.scale.toFixed(3)}, offset ${r.left},${r.top}, residual ${pct}%`);
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run test/importArt.test.ts test/registerOutfit.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test && pnpm build`
Expected: `0 errors` from check; all tests pass; build completes.

```bash
git add scripts/import-art.mjs scripts/register-outfit.mjs test/importArt.test.ts test/registerOutfit.test.ts
git commit -m "journey: art import and outfit registration (2% residual gate)"
```

### Task 4: The scene builder

**Files:**

- Create: `scripts/build-scene.mjs`
- Test: `test/buildScene.test.ts`

**Interfaces:**

- Consumes: `traceLayers`, `tracePath`, `maskPng`, `loadIndices`, `layerGroup`, `BACKGROUND` (Task 2); the rig shape from Task 1 (passed in as a plain object; the CLI reads `src/data/avatar-rig.json`).
- Produces (exports): `PART_ORDER` (same list as Task 1), `PIVOT_OF_PART` (same map), `sceneBox(rig): { width, height, figureX, propsX, propsSize }`, `partTransform(rig, part, pose): string` (`rotate(deg x y)` or `""`), `energyTransform(rig, scale): string`, `sceneMarkup(art, rig, { visibleRank }): string`, `silhouetteMarkup(d, rig): string`, `stillMarkup(sceneSvg, rig, rankIndex): string`, `buildScene({ artDir, outDir, silhouettePath, rig, trace? }): Promise<{ scene: string; silhouette: string }>`. `art` is `{ outfits: Record<rankId, Layer[]>, props: Record<rankId, Layer[]>, energy: Layer[] }`.

- [ ] **Step 1: Write the failing test**

`test/buildScene.test.ts`:

```ts
import { gzipSync } from "node:zlib";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildScene,
  energyTransform,
  partTransform,
  sceneBox,
  sceneMarkup,
  stillMarkup,
} from "../scripts/build-scene.mjs";

/** A two-rank, two-part rig on a 100×150 canvas. */
const rig = {
  ranks: ["a", "b"],
  canvas: { width: 100, height: 150 },
  anchors: { crown: 10, feet: 140, centre: 50 },
  parts: [
    {
      id: "body",
      polygon: [
        [0, 45],
        [100, 45],
        [100, 150],
        [0, 150],
      ],
    },
    {
      id: "head",
      polygon: [
        [0, 0],
        [100, 0],
        [100, 50],
        [0, 50],
      ],
    },
  ],
  pivots: { neck: [50, 45], hips: [50, 90] },
  poses: { a: { neck: 0, hips: 0 }, b: { neck: -10, hips: 0 } },
};

let dir: string;
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const webp = (path: string, svg: string) =>
  sharp(Buffer.from(svg)).webp({ lossless: true }).toFile(path);

const figure = (ember = false) => `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="150">
  <rect width="100" height="150" fill="#f4f4f0"/>
  <circle cx="50" cy="28" r="18" fill="#101014"/>
  <rect x="30" y="46" width="40" height="94" fill="#1e1e24"/>
  ${ember ? '<rect x="35" y="100" width="30" height="20" fill="#da5c2c"/>' : ""}
</svg>`;

const square = (fill: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150">
  <rect width="150" height="150" fill="#f4f4f0"/><rect x="10" y="90" width="40" height="40" fill="${fill}"/>
</svg>`;

async function artDir() {
  dir = mkdtempSync(join(tmpdir(), "scene-"));
  const art = join(dir, "art");
  mkdirSync(art);
  await webp(join(art, "base.webp"), figure());
  await webp(join(art, "outfit-a.webp"), figure());
  await webp(join(art, "outfit-b.webp"), figure(true));
  await webp(join(art, "props-a.webp"), square("#6e6e78"));
  await webp(join(art, "energy.webp"), square("#7040d2"));
  return art;
}

describe("sceneBox", () => {
  it("derives the scene from the figure canvas: 1.6× wide, figure at 30%, props square at 5%", () => {
    expect(sceneBox(rig)).toEqual({
      width: 160,
      height: 150,
      figureX: 30,
      propsX: 5,
      propsSize: 150,
    });
    expect(sceneBox({ ...rig, canvas: { width: 1000, height: 1500 } })).toEqual({
      width: 1600,
      height: 1500,
      figureX: 300,
      propsX: 50,
      propsSize: 1500,
    });
  });
});

describe("partTransform", () => {
  it("rotates a pivoted part about its pivot and leaves the rest alone", () => {
    expect(partTransform(rig, "head", rig.poses.b)).toBe(' transform="rotate(-10 50 45)"');
    expect(partTransform(rig, "body", rig.poses.b)).toBe("");
  });
});

describe("energyTransform", () => {
  it("scales about the hips in scene coordinates", () => {
    expect(energyTransform(rig, 0.5)).toBe("translate(80 90) scale(0.5) translate(-80 -90)");
  });
});

describe("sceneMarkup", () => {
  const art = {
    outfits: {
      a: [{ part: "head", name: "base", fill: "#0e0e12", d: "M 0 0 L 1 0 L 1 1 Z" }],
      b: [
        { part: "head", name: "base", fill: "#0e0e12", d: "M 0 0 L 1 0 L 1 1 Z" },
        { part: "body", name: "ember", fill: "#da5c2c", d: "M 2 2 L 3 2 L 3 3 Z" },
      ],
    },
    props: { a: [{ name: "base", fill: "#0e0e12", d: "M 5 5 L 6 5 L 6 6 Z" }], b: [] },
    energy: [{ name: "violet", fill: "#7040d2", d: "M 7 7 L 8 7 L 8 8 Z" }],
  };

  it("emits every id of the contract, in draw order, with rank 0 visible", () => {
    const svg = sceneMarkup(art, rig, { visibleRank: 0 });
    expect(svg).toMatch(
      /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 160 150" preserveAspectRatio="xMidYMid meet">/,
    );
    const order = [
      "floor",
      "energy",
      "props",
      "props-a",
      "props-a-fill",
      "props-a-outline",
      "props-b",
      "avatar",
      "part-body",
      "part-body-idle",
      "outfit-a-body",
      "outfit-b-body",
      "part-head",
      "part-head-idle",
      "outfit-a-head",
      "outfit-b-head",
    ];
    let at = -1;
    for (const id of order) {
      const i = svg.indexOf(`id="${id}"`);
      expect(i, id).toBeGreaterThan(at);
      at = i;
    }
    expect(svg).toContain('<g id="outfit-a-head" visibility="visible" opacity="1">');
    expect(svg).toContain('<g id="outfit-b-head" visibility="hidden" opacity="0">');
    expect(svg).toContain('<g id="outfit-a-body" visibility="visible" opacity="1"></g>'); // no layers, same id
    expect(svg).toContain('<g id="props-a" visibility="visible">');
    expect(svg).toContain('<g id="props-b" visibility="hidden">');
    expect(svg).toContain(
      '<path id="props-a-outline" d="M 5 5 L 6 5 L 6 6 Z" fill="none" stroke="#6e6e78" stroke-width="3" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="0" opacity="0"/>',
    );
    expect(svg).toContain('<path id="props-b-outline" d="" ');
    expect(svg).toContain('<g id="part-head" transform="rotate(0 50 45)">');
    expect(svg).toContain('<g id="part-body">');
    expect(svg).toContain('<g id="avatar" transform="translate(30 0)">');
    // progress at the middle of rank 0 of 2 is 0.25: opacity 0.0625, scale 0.625
    expect(svg).toContain(
      '<g id="energy" opacity="0.063" transform="translate(80 90) scale(0.625) translate(-80 -90)"><g transform="translate(5 0)">',
    );
    expect(svg).toContain('<rect id="floor"');
    expect(svg).not.toContain("style=");
  });

  it("gives the ember layers of props a glow class for the idle blink", () => {
    const svg = sceneMarkup(
      { ...art, props: { a: [{ name: "ember", fill: "#da5c2c", d: "M 0 0 Z" }], b: [] } },
      rig,
      {},
    );
    expect(svg).toContain('<g class="glow" fill="#da5c2c"');
  });

  it("can start on another rank, posed", () => {
    const svg = sceneMarkup(art, rig, { visibleRank: 1 });
    expect(svg).toContain('<g id="outfit-b-head" visibility="visible" opacity="1">');
    expect(svg).toContain('<g id="outfit-a-head" visibility="hidden" opacity="0">');
    expect(svg).toContain('<g id="part-head" transform="rotate(-10 50 45)">');
  });
});

describe("stillMarkup", () => {
  it("re-poses a built scene on one rank with the energy at that rank's level", () => {
    const art = { outfits: { a: [], b: [] }, props: { a: [], b: [] }, energy: [] };
    const scene = sceneMarkup(art, rig, { visibleRank: 0 });
    const still = stillMarkup(scene, rig, 1);
    expect(still).toContain('<g id="outfit-b-head" visibility="visible" opacity="1">');
    expect(still).toContain('<g id="outfit-a-head" visibility="hidden" opacity="0">');
    expect(still).toContain('<g id="props-b" visibility="visible">');
    expect(still).toContain('<g id="props-a" visibility="hidden">');
    expect(still).toContain('<g id="part-head" transform="rotate(-10 50 45)">');
    // progress at the middle of rank 1 of 2 is 0.75: opacity 0.5625, scale 0.875
    expect(still).toContain(
      '<g id="energy" opacity="0.563" transform="translate(80 90) scale(0.875) translate(-80 -90)">',
    );
    expect(stillMarkup(still, rig, 0)).toBe(scene);
  });
});

describe("buildScene", () => {
  it("traces the art into scene.svg and the silhouette, tolerating missing props", async () => {
    const art = await artDir();
    const out = join(dir, "public");
    const silhouette = join(dir, "silhouette.svg");
    mkdirSync(out);
    const result = await buildScene({ artDir: art, outDir: out, silhouettePath: silhouette, rig });
    const scene = readFileSync(join(out, "scene.svg"), "utf8");
    expect(scene).toBe(result.scene);
    for (const id of [
      "outfit-a-head",
      "outfit-a-body",
      "outfit-b-head",
      "outfit-b-body",
      "props-a-fill",
      "props-b-fill",
      "energy",
    ]) {
      expect(scene, id).toContain(`id="${id}"`);
    }
    // A part group's content runs up to the next group with an id.
    const groupOf = (id: string) =>
      scene.match(new RegExp(`id="${id}"[^>]*>([\\s\\S]*?)<g id=`))![1]!;
    expect(groupOf("outfit-b-body")).toContain('fill="#da5c2c"');
    expect(groupOf("outfit-a-body")).not.toContain('fill="#da5c2c"');
    expect(scene).toMatch(/id="props-a-outline" d="M/);
    expect(scene).toContain('id="props-b-outline" d=""');
    expect(scene).not.toContain("style=");
    expect(existsSync(silhouette)).toBe(true);
    const sil = readFileSync(silhouette, "utf8");
    expect(sil).toMatch(
      /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 160 150" preserveAspectRatio="xMidYMid meet"><path transform="translate\(30 0\)" fill="#202020" d="M/,
    );
    expect(statSync(silhouette).size).toBeLessThan(4096);
    expect(gzipSync(scene).length).toBeGreaterThan(100);
  }, 30_000);

  it("fails loudly when an outfit is missing", async () => {
    const art = await artDir();
    rmSync(join(art, "outfit-b.webp"));
    await expect(
      buildScene({ artDir: art, outDir: dir, silhouettePath: join(dir, "s.svg"), rig }),
    ).rejects.toThrow(/outfit-b\.webp/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run test/buildScene.test.ts`
Expected: FAIL (cannot resolve `../scripts/build-scene.mjs`).

- [ ] **Step 3: Write the builder**

`scripts/build-scene.mjs`:

```js
// Assembles the journey scene (vector journey spec §4.7) from art/journey/*.webp: every outfit
// traced and cut into the rig's parts, every prop set and the energy traced whole, all written
// as one SVG whose ids are the contract with src/scripts/scene.ts and
// scripts/render-rank-stills.mjs (see the plan's "Scene ids"). Also writes the inline
// silhouette (the base pose as one coarse path) that holds the stage until the scene loads.
// Usage: node scripts/build-scene.mjs   (art/journey → public/journey/scene.svg,
//                                       src/components/journey/silhouette.svg)
import { existsSync, mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import {
  BACKGROUND,
  layerGroup,
  loadIndices,
  maskPng,
  traceLayers,
  tracePath,
} from "./trace-vector.mjs";

const require = createRequire(import.meta.url);

/** Draw order, bottom to top (mirrors src/data/avatarRig.ts). */
export const PART_ORDER = [
  "coat-left",
  "coat-right",
  "legs",
  "arm-left",
  "arm-right",
  "torso",
  "head",
];
export const PIVOT_OF_PART = {
  head: "neck",
  "arm-left": "shoulder-left",
  "arm-right": "shoulder-right",
};
export const OUTLINE = { stroke: "#6e6e78", width: 3 };
/** The silhouette is coarse on purpose: ~3 KB, inlined in every page render. */
export const SILHOUETTE_TRACE = { turdSize: 40, optTolerance: 2.5, decimals: 0 };

/** The scene around the figure canvas: 1.6× as wide, the figure 30% in, props as a square 5% in. */
export function sceneBox(rig) {
  const { width, height } = rig.canvas;
  return {
    width: width * 1.6,
    height,
    figureX: width * 0.3,
    propsX: width * 0.05,
    propsSize: height,
  };
}

const partsOf = (rig) => PART_ORDER.filter((id) => rig.parts.some((p) => p.id === id));

export function partTransform(rig, part, pose) {
  const pivot = PIVOT_OF_PART[part];
  if (!pivot || !rig.pivots[pivot]) return "";
  const [x, y] = rig.pivots[pivot];
  return ` transform="rotate(${pose?.[pivot] ?? 0} ${x} ${y})"`;
}

export function energyTransform(rig, scale) {
  const { figureX } = sceneBox(rig);
  const [hx, hy] = rig.pivots.hips;
  const x = figureX + hx;
  return `translate(${x} ${hy}) scale(${scale}) translate(${-x} ${-hy})`;
}

const round3 = (n) => String(Number(n.toFixed(3)));
/** Progress at the middle of rank `i` of `n`, and the energy that goes with it (spec §3.3). */
export const energyAt = (i, n) => {
  const p = (i + 0.5) / n;
  return { opacity: round3(p * p), scale: round3(0.5 + 0.5 * p) };
};

const groupOf = (layer) => layerGroup(layer, layer.name === "ember" ? ' class="glow"' : "");

export function sceneMarkup(art, rig, { visibleRank = 0 } = {}) {
  const box = sceneBox(rig);
  const parts = partsOf(rig);
  const ranks = rig.ranks;
  const pose = rig.poses[ranks[visibleRank]];
  const state = (i) =>
    i === visibleRank ? 'visibility="visible" opacity="1"' : 'visibility="hidden" opacity="0"';
  const energy = energyAt(visibleRank, ranks.length);

  const floor = `<rect id="floor" x="${box.width * 0.125}" y="${rig.anchors.feet + 4}" width="${box.width * 0.75}" height="4" fill="#202020"/>`;
  const energyGroup = `<g id="energy" opacity="${energy.opacity}" transform="${energyTransform(rig, Number(energy.scale))}"><g transform="translate(${box.propsX} 0)">${(art.energy ?? []).map(groupOf).join("")}</g></g>`;
  const props = ranks
    .map((rank, i) => {
      const layers = art.props[rank] ?? [];
      const outline = layers.find((l) => l.name === "base")?.d ?? "";
      const vis = i === visibleRank ? "visible" : "hidden";
      return `<g id="props-${rank}" visibility="${vis}"><g id="props-${rank}-fill" opacity="1">${layers.map(groupOf).join("")}</g><path id="props-${rank}-outline" d="${outline}" fill="none" stroke="${OUTLINE.stroke}" stroke-width="${OUTLINE.width}" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="0" opacity="0"/></g>`;
    })
    .join("");
  const avatar = parts
    .map((part) => {
      const outfits = ranks
        .map((rank, i) => {
          const layers = (art.outfits[rank] ?? []).filter((l) => l.part === part);
          return `<g id="outfit-${rank}-${part}" ${state(i)}>${layers.map(groupOf).join("")}</g>`;
        })
        .join("");
      return `<g id="part-${part}"${partTransform(rig, part, pose)}><g id="part-${part}-idle">${outfits}</g></g>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${box.width} ${box.height}" preserveAspectRatio="xMidYMid meet">${floor}${energyGroup}<g id="props" transform="translate(${box.propsX} 0)">${props}</g><g id="avatar" transform="translate(${box.figureX} 0)">${avatar}</g></svg>`;
}

export function silhouetteMarkup(d, rig) {
  const box = sceneBox(rig);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${box.width} ${box.height}" preserveAspectRatio="xMidYMid meet"><path transform="translate(${box.figureX} 0)" fill="#202020" d="${d}"/></svg>`;
}

/** Re-poses a built scene on rank `index`: the same edits the runtime makes, as attributes. */
export function stillMarkup(sceneSvg, rig, index) {
  const ranks = rig.ranks;
  const pose = rig.poses[ranks[index]];
  const energy = energyAt(index, ranks.length);
  let svg = sceneSvg;
  const retag = (id, attrs) => {
    svg = svg.replace(new RegExp(`<g id="${id}"[^>]*>`), `<g id="${id}"${attrs}>`);
  };
  ranks.forEach((rank, i) => {
    const state =
      i === index ? ' visibility="visible" opacity="1"' : ' visibility="hidden" opacity="0"';
    for (const part of partsOf(rig)) retag(`outfit-${rank}-${part}`, state);
    retag(`props-${rank}`, ` visibility="${i === index ? "visible" : "hidden"}"`);
  });
  for (const part of partsOf(rig)) retag(`part-${part}`, partTransform(rig, part, pose));
  retag(
    "energy",
    ` opacity="${energy.opacity}" transform="${energyTransform(rig, Number(energy.scale))}"`,
  );
  return svg;
}

async function traceOptional(path, options) {
  if (!existsSync(path)) {
    console.warn(`missing ${path}: emitting its group empty`);
    return [];
  }
  return traceLayers(path, options);
}

export async function buildScene({ artDir, outDir, silhouettePath, rig, trace = {} }) {
  const { width, height } = rig.canvas;
  const { propsSize } = sceneBox(rig);
  const basePath = join(artDir, "base.webp");
  if (!existsSync(basePath)) throw new Error(`missing ${basePath}`);
  const art = { outfits: {}, props: {}, energy: [] };
  for (const rank of rig.ranks) {
    const outfit = join(artDir, `outfit-${rank}.webp`);
    if (!existsSync(outfit)) throw new Error(`missing ${outfit}`);
    art.outfits[rank] = await traceLayers(outfit, { width, height, parts: rig.parts, trace });
    art.props[rank] = await traceOptional(join(artDir, `props-${rank}.webp`), {
      width: propsSize,
      height: propsSize,
      trace,
    });
  }
  art.energy = await traceOptional(join(artDir, "energy.webp"), {
    width: propsSize,
    height: propsSize,
    trace,
  });

  const base = await loadIndices(basePath, { width, height, blur: 0 });
  const mask = await maskPng(base.indices, width, height, (i) => i !== BACKGROUND);
  const silhouette = silhouetteMarkup(mask ? await tracePath(mask, SILHOUETTE_TRACE) : "", rig);
  const scene = sceneMarkup(art, rig, { visibleRank: 0 });

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "scene.svg"), scene);
  writeFileSync(silhouettePath, silhouette);
  return { scene, silhouette };
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const rig = require("../src/data/avatar-rig.json");
  const { scene, silhouette } = await buildScene({
    artDir: "art/journey",
    outDir: "public/journey",
    silhouettePath: "src/components/journey/silhouette.svg",
    rig,
  });
  const kb = (s) => (s.length / 1024).toFixed(0);
  console.log(
    `public/journey/scene.svg: ${kb(scene)} KB, ${(gzipSync(scene).length / 1024).toFixed(0)} KB gz`,
  );
  console.log(`src/components/journey/silhouette.svg: ${(silhouette.length / 1024).toFixed(1)} KB`);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run test/buildScene.test.ts`
Expected: PASS (9 tests). The `stillMarkup(still, rig, 0)` round trip must equal the original scene byte for byte: that is what guarantees the renderer and the builder agree on the attribute order.

- [ ] **Step 5: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test && pnpm build`
Expected: `0 errors` from check; all tests pass; build completes.

```bash
git add scripts/build-scene.mjs test/buildScene.test.ts
git commit -m "journey: the scene builder (rig parts, props, energy, silhouette)"
```

### Task 5: The rank-still renderer

**Files:**

- Create: `scripts/render-rank-stills.mjs`
- Test: `test/renderRankStills.test.ts`

**Interfaces:**

- Consumes: `stillMarkup`, `sceneBox` (Task 4).
- Produces: `STILL = { width: 1920, height: 1080, quality: 82 }`, `wrap16x9(sceneSvg, rig): string` (the scene centred on a carbon 16:9 canvas), `renderRankStills({ scenePath, outDir, rig }): Promise<string[]>` (the written paths, in rank order).

- [ ] **Step 1: Write the failing test**

`test/renderRankStills.test.ts`:

```ts
import { mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { sceneMarkup } from "../scripts/build-scene.mjs";
import { STILL, renderRankStills, wrap16x9 } from "../scripts/render-rank-stills.mjs";

const rig = {
  ranks: ["a", "b"],
  canvas: { width: 100, height: 150 },
  anchors: { crown: 10, feet: 140, centre: 50 },
  parts: [
    {
      id: "head",
      polygon: [
        [0, 0],
        [100, 0],
        [100, 50],
        [0, 50],
      ],
    },
  ],
  pivots: { neck: [50, 45], hips: [50, 90] },
  poses: { a: { neck: 0, hips: 0 }, b: { neck: -10, hips: 0 } },
};
const art = {
  outfits: {
    a: [{ part: "head", name: "base", fill: "#0e0e12", d: "M 20 10 L 80 10 L 80 50 L 20 50 Z" }],
    b: [{ part: "head", name: "ember", fill: "#da5c2c", d: "M 20 10 L 80 10 L 80 50 L 20 50 Z" }],
  },
  props: { a: [], b: [] },
  energy: [],
};

let dir: string;
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("wrap16x9", () => {
  it("nests the scene, centred by height, on a carbon 1920×1080 canvas", () => {
    const wrapped = wrap16x9(sceneMarkup(art, rig), rig);
    expect(wrapped).toMatch(
      /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><rect width="1920" height="1080" fill="#111111"\/><svg x="384" y="0" width="1152" height="1080" viewBox="0 0 160 150"/,
    );
    expect(wrapped).not.toContain("style=");
  });
});

describe("renderRankStills", () => {
  it("writes one 1920×1080 WebP per rank showing that rank", async () => {
    dir = mkdtempSync(join(tmpdir(), "stills-"));
    const scenePath = join(dir, "scene.svg");
    writeFileSync(scenePath, sceneMarkup(art, rig));
    const written = await renderRankStills({ scenePath, outDir: dir, rig });
    expect(written).toEqual([join(dir, "a.webp"), join(dir, "b.webp")]);
    for (const path of written) {
      const meta = await sharp(path).metadata();
      expect([meta.width, meta.height, meta.format]).toEqual([STILL.width, STILL.height, "webp"]);
      expect(statSync(path).size).toBeLessThan(120 * 1024);
    }
    // The head spans scene x 50–110, y 10–50 (rank b's is rotated -10° about (80, 45), which still
    // covers (60, 30)); that point lands at (384 + 60 * 7.2, 30 * 7.2) on the still: ink on a, ember on b.
    const at = async (path: string) =>
      (await sharp(path).extract({ left: 816, top: 216, width: 1, height: 1 }).raw().toBuffer())[0];
    expect(await at(written[0]!)).toBeLessThan(0x20);
    expect(await at(written[1]!)).toBeGreaterThan(0xc0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run test/renderRankStills.test.ts`
Expected: FAIL (cannot resolve `../scripts/render-rank-stills.mjs`).

- [ ] **Step 3: Write the renderer**

`scripts/render-rank-stills.mjs`:

```js
// Renders the reduced-motion timeline's pictures (vector journey spec §6): each rank's settled
// composite (its outfit, props and energy, posed) from public/journey/scene.svg, centred on a
// carbon 16:9 canvas, to src/images/journey/<stage-id>.webp at 1920×1080. astro:assets makes
// the renditions; test/journeyArt.test.ts checks the size and ratio.
// Usage: node scripts/render-rank-stills.mjs
import { readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { sceneBox, stillMarkup } from "./build-scene.mjs";

const require = createRequire(import.meta.url);

export const STILL = { width: 1920, height: 1080, quality: 82 };

/** The scene, kept whole (meet by height), on the carbon canvas. */
export function wrap16x9(sceneSvg, rig) {
  const box = sceneBox(rig);
  const inner = sceneSvg.replace(/^<svg [^>]*>/, "").replace(/<\/svg>$/, "");
  const height = STILL.height;
  const width = Math.round((box.width / box.height) * height);
  const x = Math.round((STILL.width - width) / 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${STILL.width}" height="${STILL.height}" viewBox="0 0 ${STILL.width} ${STILL.height}"><rect width="${STILL.width}" height="${STILL.height}" fill="#111111"/><svg x="${x}" y="0" width="${width}" height="${height}" viewBox="0 0 ${box.width} ${box.height}">${inner}</svg></svg>`;
}

export async function renderRankStills({ scenePath, outDir, rig }) {
  const scene = readFileSync(scenePath, "utf8");
  const written = [];
  for (const [i, rank] of rig.ranks.entries()) {
    const svg = wrap16x9(stillMarkup(scene, rig, i), rig);
    const out = join(outDir, `${rank}.webp`);
    await sharp(Buffer.from(svg), { density: 72 }).webp({ quality: STILL.quality }).toFile(out);
    written.push(out);
  }
  return written;
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const rig = require("../src/data/avatar-rig.json");
  const written = await renderRankStills({
    scenePath: "public/journey/scene.svg",
    outDir: "src/images/journey",
    rig,
  });
  for (const path of written) console.log(path);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run test/renderRankStills.test.ts`
Expected: PASS (2 tests). If a sampled pixel misses, the nested `<svg>` scaled by height 1080/150 = 7.2 puts scene (50, 30) at (384 + 360, 216): check the `x` offset first.

- [ ] **Step 5: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test && pnpm build`
Expected: `0 errors` from check; all tests pass; build completes.

```bash
git add scripts/render-rank-stills.mjs test/renderRankStills.test.ts
git commit -m "journey: the rank-still renderer for the reduced-motion timeline"
```

### Task 6: The scene budget in `pnpm size`

**Files:**

- Modify: `scripts/check-bundle-size.mjs`
- Test: `test/checkBundleSize.test.ts`

**Interfaces:**

- Consumes: nothing new. The clip check stays for now (the clips are retired in Task 14, which removes it); this task adds the scene budget beside it.
- Produces: `pnpm size` reports `Journey scene (gz)` when `dist/client/journey/scene.svg` exists, with a 300 KB budget.

- [ ] **Step 1: Write the failing tests**

Add to `test/checkBundleSize.test.ts`, inside `describe("check-bundle-size")`:

```ts
it("passes a journey scene within 300 KB gzipped, reporting its size", () => {
  const dist = fakeDist({ "fonts/a.woff2": 42_000 });
  // 200 KB of incompressible bytes gzips to about 200 KB: inside the budget.
  mkdirSync(join(dist, "dist/client/journey"), { recursive: true });
  writeFileSync(join(dist, "dist/client/journey/scene.svg"), randomBytes(200 * 1024));
  const res = run(dist);
  expect(res.stdout).toMatch(/ok {3}Journey scene \(gz\): 20\d\.\d KB \(budget 300 KB\)/);
  expect(res.status).toBe(0);
});

it("fails a journey scene over 300 KB gzipped", () => {
  const dist = fakeDist({ "fonts/a.woff2": 42_000 });
  mkdirSync(join(dist, "dist/client/journey"), { recursive: true });
  writeFileSync(join(dist, "dist/client/journey/scene.svg"), randomBytes(320 * 1024));
  const res = run(dist);
  expect(res.stdout).toMatch(/FAIL Journey scene \(gz\)/);
  expect(res.status).toBe(1);
});
```

and add `import { randomBytes } from "node:crypto";` at the top. Also change the existing test "passes clips within their limits" so the fake `journey/` dir holds a `scene.svg` too, and the expectation still reads `ok {3}Journey clips: 2 files` (the clip check must ignore `scene.svg`):

```ts
it("passes clips within their limits, ignoring the scene beside them", () => {
  const dist = fakeDist({ "fonts/a.woff2": 42_000 });
  const res = run(
    withClips(dist, {
      "sysadmin-1280.webm": 600 * 1024,
      "sysadmin-640.mp4": 300 * 1024,
      "scene.svg": 10 * 1024,
    }),
  );
  expect(res.stdout).toMatch(/ok {3}Journey clips: 2 files/);
  expect(res.status).toBe(0);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run test/checkBundleSize.test.ts`
Expected: FAIL: no `Journey scene` line, and the clip check reports `FAIL scene.svg` as "not one of the four encodes".

- [ ] **Step 3: Add the scene budget**

In `scripts/check-bundle-size.mjs`:

- Add `scene: 300 * KB` to `BUDGETS`.
- Before the `rows` loop, add the scene row when the file exists:

```js
const scenePath = "dist/client/journey/scene.svg";
if (existsSync(scenePath)) rows.push(["Journey scene (gz)", gz(scenePath), BUDGETS.scene, 0]);
```

- In the clip block, skip the scene: `const clips = readdirSync(clipDir).filter((f) => f !== "scene.svg");`
- Update the header comment: `// - Journey scene: dist/client/journey/scene.svg gzipped within its budget (vector journey spec §7).`

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run test/checkBundleSize.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test && pnpm build && pnpm size`
Expected: `0 errors` from check; all tests pass; `pnpm size` prints the existing rows (no scene yet) and exits 0.

```bash
git add scripts/check-bundle-size.mjs test/checkBundleSize.test.ts
git commit -m "size: a 300 KB gzipped budget for the journey scene"
```

---

## Phase 2: the art

Tasks 7–9 are **controller tasks**: they need the Higgsfield tools (`generate_image_batch`, `jobs_wait`, `show_generation_by_ids`, `media_upload`) and Marcus's picks, so the controller runs them itself, in this order, and commits after each. Task 10 is a normal subagent task. Every prompt, job id, pick and credit spend goes into `docs/imagery.md` under a new `## Vector journey (2026-09-25)` section, in the same style as the "Journey" section above it (a prompt block, then a table of rank / stage id / job / pick).

Shared style suffix, appended to every prompt in Tasks 7–9 (the palette matches `PALETTE` in `scripts/trace-vector.mjs`, so the trace maps cleanly):

> Flat vector style: solid flat fills only, a limited palette (near-black #0e0e12, charcoal #1e1e24, dark grey #303038, grey #484852, mid grey #6e6e78, skin #e0c4b0 with one hard-edged shadow tone #b49684, steel-grey eyes #96a0aa, burnt orange #da5c2c and deep violet #7040d2 only where named), crisp hard edges, bold simple shapes, minimal detail, hard-edged cel shadows, no outlines inside the silhouette except where shapes overlap. No gradients, no textures, no glow, no soft shading, no noise. Plain flat off-white #f4f4f0 background and nothing else. No text, no logos, no watermark, no frame, no red eyes, no fangs, no face markings. An original character who does not resemble any existing anime or manga character or any real person.

Model: `nano_banana_pro` (the job metadata reports `nano_banana_2`), 2k. If a submission returns a preset recommendation instead of a job, resubmit with `declined_preset_id`. At most 5 jobs per batch. Download each pick with `curl -sL <url> -o <file>` into `$CLAUDE_JOB_DIR/tmp/art/` (never into the repo), then import.

### Task 7: The base pose (controller)

**Files:**

- Create: `art/journey/base.webp`
- Modify: `src/data/avatar-rig.json` (tuned polygons, pivots, anchors), `docs/imagery.md`

- [ ] **Step 1: Generate two variants** (2:3, reference `image_references: [concept A 191aca87-8cd1-4f98-96b6-ed73c931e243]`, 2 credits each):

> The same original character as in the reference image (same face, messy medium-length jet-black hair falling over the forehead, calm narrow steel-grey eyes, lean athletic build), drawn as a geometric flat vector character for a scroll animation, wearing his base layer only: a fitted black long-sleeve technical shirt, dark charcoal tapered trousers, a slim black belt and black combat boots, with no coat, no headset, no energy and no props. Full body, front view, standing in a neutral A-pose: both arms straight and held slightly away from the body, hands open and relaxed, feet shoulder-width apart, so that the head, the torso, each arm and the legs read as separate shapes. Head to toe in frame, centred, with even empty space above the head and below the feet. Calm composed expression. [suffix]

Variant B: the same prompt with "arms held a little further from the body, about twenty degrees" in place of "slightly away from the body".

- [ ] **Step 2: Show Marcus both and take his pick.** Log the prompt, both job ids and the pick in `docs/imagery.md`.

- [ ] **Step 3: Import and measure**

```bash
node scripts/import-art.mjs "$CLAUDE_JOB_DIR/tmp/art/base.png" art/journey/base.webp 1000 1500
node --input-type=module -e "import { measure } from './scripts/register-outfit.mjs'; const m = await measure('art/journey/base.webp', 1000, 1500); console.log({ crown: m.crown, feet: m.feet, centre: Math.round(m.centre), span: m.span })"
```

Put `crown`, `feet` and `centre` into `anchors` in `src/data/avatar-rig.json`.

- [ ] **Step 4: Tune the rig by eye**

```bash
node scripts/preview-rig.mjs art/journey/base.webp "$CLAUDE_JOB_DIR/tmp/rig-preview.png"
```

View the preview. Move the polygons so that: `head` covers the hair and face down to the chin plus 20 px; `torso` covers the shirt from the collar to the belt, reaching 30 px into each upper arm; each arm covers from 30 px above the shoulder to below the fingertips, 30 px into the torso; `legs` covers from the belt to below the boots; `coat-left` and `coat-right` cover the strips beside and below the hips where a long coat's tails would hang (empty on the base; they exist for the S and S+ outfits). Put `neck` at the chin's centre, each shoulder at the arm's joint, `hips` at the belt's centre. Repeat until every part reads right, then run `pnpm vitest run test/avatarRig.test.ts`.

- [ ] **Step 5: Check the trace on the base**

```bash
node scripts/trace-vector.mjs art/journey/base.webp "$CLAUDE_JOB_DIR/tmp/base.svg"
node --input-type=module -e "import sharp from 'sharp'; await sharp('$CLAUDE_JOB_DIR/tmp/base.svg', { density: 96 }).png().toFile('$CLAUDE_JOB_DIR/tmp/base-trace.png')"
```

View `base-trace.png` next to `base.webp`. Accept when the skin, eyes, shirt and trousers are separate clean layers with no speckles; if a colour is missing or blotchy, adjust the matching `PALETTE` entry in `scripts/trace-vector.mjs` toward the render's actual colour (sample it with `sharp(...).extract(...).raw()`) and re-run; keep `test/traceVector.test.ts` green.

- [ ] **Step 6: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test && pnpm build`

```bash
git add art/journey/base.webp src/data/avatar-rig.json docs/imagery.md scripts/trace-vector.mjs
git commit -m "journey art: the base pose, and the rig tuned to it"
```

### Task 8: The seven outfits (controller)

**Files:**

- Create: `art/journey/outfit-<rank-id>.webp` × 7
- Modify: `docs/imagery.md`

- [ ] **Step 1: Upload the base as the reference**: `media_upload` of `art/journey/base.webp` (or the picked PNG); note the media id.

- [ ] **Step 2: Generate two variants per rank** (2:3, `image_references: [base]`, batches of 5 then 5 then 4; ~28 credits). Every prompt is:

> The same character in exactly the same pose, framing, proportions and position on the canvas as the reference image (a flat vector A-pose figure on an off-white background): keep the head, face, hair, hands, legs and boots identical and in the same place. Change only the clothing to: [outfit]. [suffix]

| Rank | Stage id                | Outfit                                                                                                                                                         |
| ---- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E    | `t1-support`            | a plain black hoodie, hood down, worn over the shirt, and a black over-ear headset on his head                                                                 |
| D    | `web-concierge`         | the plain black hoodie with the sleeves pushed up to the elbows, and the headset resting around his neck                                                       |
| C    | `professional-services` | a fitted black zip jacket, zipped up, no hood                                                                                                                  |
| B    | `t3-support`            | a black high-collar zip jacket with the collar standing up                                                                                                     |
| A    | `sysadmin`              | a short black high-collar coat reaching the hips, closed                                                                                                       |
| S    | `linux-engineer`        | a long black high-collar coat reaching mid-calf, closed                                                                                                        |
| S+   | `systems-architect`     | the long black high-collar coat worn open over the shirt, with thin burnt-orange #da5c2c piping at the cuffs, its tails hanging clear of the legs on each side |

- [ ] **Step 3: Register each pick**

```bash
node scripts/register-outfit.mjs "$CLAUDE_JOB_DIR/tmp/art/outfit-<rank-id>.png" <rank-id>
```

Expected: `art/journey/outfit-<rank-id>.webp: scale …, offset …, residual n.n%`. A `rejected: residual …` exit means that render moved the feet or the head: try the other variant, and if both fail, re-roll that rank (2 more credits) with "keep the feet and the head exactly where they are in the reference" added to the prompt. Show Marcus the registered set (a contact sheet made with `sharp` `composite`, or the seven files) and take his picks; log everything.

- [ ] **Step 4: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test && pnpm build`

```bash
git add art/journey/outfit-*.webp docs/imagery.md
git commit -m "journey art: seven outfits registered onto the base pose"
```

### Task 9: The props and the energy (controller)

**Files:**

- Create: `art/journey/props-<rank-id>.webp` × 7, `art/journey/energy.webp`
- Modify: `docs/imagery.md`

- [ ] **Step 1: Generate two variants per set** (1:1, no reference image, batches of 5, 5, 4, 2; ~16 credits). Every prompt is:

> Flat vector illustration of props only, arranged around an empty standing space in the centre of the canvas where a full-body figure will be placed later: leave the middle third of the canvas empty from top to bottom. The props: [props]. [suffix] No people, no figures, no silhouettes.

| Rank | Stage id                | Props                                                                                                                                                                               |
| ---- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E    | `t1-support`            | a low support desk seen from the front along the bottom of the canvas, with a monitor glowing burnt orange at each side, a keyboard and a mug                                       |
| D    | `web-concierge`         | three floating website wireframe panels (thin grey frames with burnt-orange highlight bars) hovering at shoulder height, two on the left and one on the right                       |
| C    | `professional-services` | a glowing burnt-orange data cube floating at the left at hand height, a thin curving path of small orange lights leading away to the right, faint deep-violet wisps low on the left |
| B    | `t3-support`            | a wall of small burnt-orange alert lights in neat rows filling the upper half on both sides, and deep-violet shadows rising from the floor along the bottom                         |
| A    | `sysadmin`              | an open server rack standing at the right with burnt-orange LEDs, and deep-violet smoke curling along the floor                                                                     |
| S    | `linux-engineer`        | a pipeline of floating rectangular modules linked by thin lines, arcing across the top from the left to the right, with two deep-violet shadow hands reaching in from the sides     |
| S+   | `systems-architect`     | rows of tall deep-violet shadow server racks receding into the distance on both sides, their tops dissolving upward like smoke                                                      |

Energy (`energy.webp`): "a full deep-violet #7040d2 aura of shadow energy: wisps and smoke rising around an empty standing space in the centre of the canvas, densest near the floor and fading upward, nothing else. [suffix]".

- [ ] **Step 2: Take Marcus's picks, import, log**

```bash
node scripts/import-art.mjs "$CLAUDE_JOB_DIR/tmp/art/props-<rank-id>.png" art/journey/props-<rank-id>.webp 1500 1500
node scripts/import-art.mjs "$CLAUDE_JOB_DIR/tmp/art/energy.png" art/journey/energy.webp 1500 1500
```

- [ ] **Step 3: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test && pnpm build`

```bash
git add art/journey/props-*.webp art/journey/energy.webp docs/imagery.md
git commit -m "journey art: seven prop sets and the energy"
```

### Task 10: Assemble the scene

**Files:**

- Create: `public/journey/scene.svg`, `src/components/journey/silhouette.svg`
- Test: `test/sceneSvg.test.ts`

**Interfaces:**

- Consumes: `buildScene` (Task 4) through its CLI; `RIG`, `PART_ORDER` (Task 1).
- Produces: the two built files, committed, and a test that pins the contract on the real scene.

- [ ] **Step 1: Write the failing test**

`test/sceneSvg.test.ts`:

```ts
import { readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { PART_ORDER, RIG } from "../src/data/avatarRig";

const scene = readFileSync("public/journey/scene.svg", "utf8");

describe("public/journey/scene.svg", () => {
  it("exposes every outfit's parts, every rank's props and the energy by id", () => {
    for (const rank of RIG.ranks) {
      for (const part of PART_ORDER)
        expect(scene, `${rank}/${part}`).toContain(`id="outfit-${rank}-${part}"`);
      expect(scene).toContain(`id="props-${rank}-fill"`);
      expect(scene).toContain(`id="props-${rank}-outline"`);
    }
    for (const part of PART_ORDER) {
      expect(scene).toContain(`id="part-${part}"`);
      expect(scene).toContain(`id="part-${part}-idle"`);
    }
    expect(scene).toContain('id="energy"');
    expect(scene).toContain('id="avatar"');
  });

  it("starts on rank E, with every other rank hidden", () => {
    expect(scene).toContain(`id="outfit-${RIG.ranks[0]}-head" visibility="visible" opacity="1"`);
    expect(scene).toContain(`id="outfit-${RIG.ranks[1]}-head" visibility="hidden" opacity="0"`);
  });

  it("draws every prop set and every outfit with at least one path", () => {
    for (const rank of RIG.ranks) {
      expect(scene, `props-${rank}`).toMatch(new RegExp(`id="props-${rank}-fill"[^>]*><g `));
      expect(scene, `outfit-${rank}`).toMatch(new RegExp(`id="outfit-${rank}-torso"[^>]*><g `));
    }
  });

  it("uses no style attributes and stays within its budget", () => {
    expect(scene).not.toContain("style=");
    expect(gzipSync(scene).length).toBeLessThanOrEqual(300 * 1024);
  });
});

describe("src/components/journey/silhouette.svg", () => {
  it("is one small path on the scene's viewBox", () => {
    const svg = readFileSync("src/components/journey/silhouette.svg", "utf8");
    expect(svg).toMatch(
      /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 1600 1500" preserveAspectRatio="xMidYMid meet"><path transform="translate\(300 0\)" fill="#202020" d="M/,
    );
    expect(svg.match(/<path/g)).toHaveLength(1);
    expect(statSync("src/components/journey/silhouette.svg").size).toBeLessThanOrEqual(4096);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run test/sceneSvg.test.ts`
Expected: FAIL (ENOENT: `public/journey/scene.svg`).

- [ ] **Step 3: Build the scene**

Run: `node scripts/build-scene.mjs`
Expected: `public/journey/scene.svg: … KB, … KB gz` and the silhouette's size. It takes a few minutes (about 400 potrace runs).

If the gzipped size is over 300 KB: set `TRACE.optTolerance` to `1.0` and `TRACE.decimals` to `0` in `scripts/trace-vector.mjs`, update the numbers in `test/traceVector.test.ts` ("rounds to one decimal" becomes whole numbers: expected `"M 10 21 C 1 0 3 4"`), rebuild and measure again. If it is still over, STOP and report BLOCKED with both sizes: the controller decides on the spec §10 split.

- [ ] **Step 4: Look at it**

```bash
node --input-type=module -e "import sharp from 'sharp'; await sharp('public/journey/scene.svg', { density: 96 }).png().toFile('$CLAUDE_JOB_DIR/tmp/scene-e.png')"
```

View the PNG: rank E's outfit on the figure, E's props around it, the floor line under the boots. Then render rank S+ the same way with `stillMarkup` (`import { stillMarkup } from './scripts/build-scene.mjs'`, index 6) and view it. Put both PNG paths in your report; do not commit them.

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run test/sceneSvg.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test && pnpm build && pnpm size`
Expected: `0 errors` from check; all tests pass; `pnpm size` prints `ok   Journey scene (gz): … KB (budget 300 KB)`. Prettier has no SVG parser, so the two files stay exactly as the builder wrote them (the `stillMarkup` round trip depends on that); if `pnpm lint` ever complains about them, add `*.svg` to `.prettierignore` rather than reformatting.

```bash
git add public/journey/scene.svg src/components/journey/silhouette.svg test/sceneSvg.test.ts scripts/trace-vector.mjs test/traceVector.test.ts
git commit -m "journey: the assembled vector scene and its inline silhouette"
```

---

## Phase 3: the runtime

### Task 11: The scene state (pure)

**Files:**

- Create: `src/scripts/avatar.ts`
- Modify: `src/scripts/journey.ts` (move `stageForProgress` out and re-export it; nothing else yet)
- Test: `test/avatar.test.ts`

**Interfaces:**

- Consumes: `Pose`, `PivotId` from `src/data/avatarRig.ts` (Task 1).
- Produces: `BLEND = 0.3`, `stageForProgress(progress, stages): number` (moved here; `journey.ts` re-exports it so `test/journey.test.ts` keeps working), `sceneState(progress: number, poses: readonly Pose[]): SceneState`, and the types `OutfitState { rank; opacity }`, `PropsState { rank; fill; outline; draw }`, `SceneState { rank; next; t; outfits: OutfitState[]; props: PropsState[]; pose: Pose; energy: { opacity; scale } }`.

- [ ] **Step 1: Write the failing test**

`test/avatar.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Pose } from "../src/data/avatarRig";
import { BLEND, sceneState, stageForProgress } from "../src/scripts/avatar";

const rest: Pose = { neck: 0, "shoulder-left": 0, "shoulder-right": 0, hips: 0 };
const raised: Pose = { neck: -4, "shoulder-left": 0, "shoulder-right": -40, hips: 0 };
const poses: Pose[] = [rest, raised, rest, rest, rest, rest, rest];

/** Progress at fraction `local` of rank `i`'s stretch, for seven ranks. */
const at = (i: number, local: number) => (i + local) / 7;

const finite = (value: unknown): void => {
  if (typeof value === "number") expect(Number.isFinite(value)).toBe(true);
  else if (Array.isArray(value)) value.forEach(finite);
  else if (value && typeof value === "object") Object.values(value).forEach(finite);
};

describe("stageForProgress", () => {
  it("splits progress evenly and clamps bad input", () => {
    expect(stageForProgress(0, 7)).toBe(0);
    expect(stageForProgress(0.15, 7)).toBe(1);
    expect(stageForProgress(1, 7)).toBe(6);
    expect(stageForProgress(-1, 7)).toBe(0);
    expect(stageForProgress(Number.NaN, 7)).toBe(0);
  });
});

describe("sceneState", () => {
  it("is settled on a rank outside the blend: one outfit, its props filled, its pose", () => {
    const s = sceneState(at(3, 0.5), poses);
    expect([s.rank, s.next, s.t]).toEqual([3, 3, 0]);
    expect(s.outfits).toEqual([{ rank: 3, opacity: 1 }]);
    expect(s.props).toEqual([{ rank: 3, fill: 1, outline: 0, draw: 0 }]);
    expect(s.pose).toEqual(rest);
  });

  it("starts blending at the last 30% of a rank's stretch", () => {
    expect(sceneState(at(0, 1 - BLEND - 0.001), poses).t).toBe(0);
    expect(sceneState(at(0, 1 - BLEND + 0.03), poses).t).toBeCloseTo(0.1, 5);
  });

  it("cross-fades the outfits and interpolates the pose halfway through the blend", () => {
    const s = sceneState(at(0, 0.85), poses);
    expect([s.rank, s.next]).toEqual([0, 1]);
    expect(s.t).toBeCloseTo(0.5, 5);
    expect(s.outfits.map((o) => o.rank)).toEqual([0, 1]);
    expect(s.outfits[0]!.opacity).toBeCloseTo(0.5, 5);
    expect(s.outfits[1]!.opacity).toBeCloseTo(0.5, 5);
    expect(s.pose["shoulder-right"]).toBeCloseTo(-20, 5);
    expect(s.pose.neck).toBeCloseTo(-2, 5);
  });

  it("fades the old props out first, draws the new outline in, then fills and drops the outline", () => {
    const half = sceneState(at(0, 0.85), poses).props; // t = 0.5
    expect(half[0]).toEqual({ rank: 0, fill: 0, outline: 0, draw: 0 });
    expect(half[1]!.rank).toBe(1);
    expect(half[1]!.fill).toBeCloseTo(0, 5);
    expect(half[1]!.outline).toBe(1);
    expect(half[1]!.draw).toBeCloseTo(1 - 0.5 / 0.6, 5);

    const late = sceneState(at(0, 0.97), poses).props; // t = 0.9
    expect(late[0]!.fill).toBe(0);
    expect(late[1]!.fill).toBeCloseTo(0.8, 5);
    expect(late[1]!.outline).toBeCloseTo(0.5, 5);
    expect(late[1]!.draw).toBe(0);

    const early = sceneState(at(0, 0.73), poses).props; // t = 0.1
    expect(early[0]!.fill).toBeCloseTo(0.8, 5);
    expect(early[1]!.draw).toBeCloseTo(1 - 0.1 / 0.6, 5);
  });

  it("lands exactly on the next rank when the blend ends", () => {
    const s = sceneState(at(1, 0), poses);
    expect([s.rank, s.next, s.t]).toEqual([1, 1, 0]);
    expect(s.outfits).toEqual([{ rank: 1, opacity: 1 }]);
    expect(s.pose).toEqual(raised);
  });

  it("never blends past the last rank, and clamps progress outside 0–1 or NaN", () => {
    for (const p of [at(6, 0.9), 1, 1.4, 7]) {
      const s = sceneState(p, poses);
      expect([s.rank, s.next, s.t], String(p)).toEqual([6, 6, 0]);
      expect(s.outfits).toEqual([{ rank: 6, opacity: 1 }]);
      finite(s);
    }
    // Anything not finite, and anything below zero, reads as the start.
    for (const p of [-0.2, Number.NaN, Number.POSITIVE_INFINITY]) {
      const s = sceneState(p, poses);
      expect(s.rank, String(p)).toBe(0);
      finite(s);
    }
  });

  it("grows the energy with overall progress", () => {
    expect(sceneState(0, poses).energy).toEqual({ opacity: 0, scale: 0.5 });
    expect(sceneState(0.5, poses).energy).toEqual({ opacity: 0.25, scale: 0.75 });
    expect(sceneState(1, poses).energy).toEqual({ opacity: 1, scale: 1 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run test/avatar.test.ts`
Expected: FAIL (cannot resolve `../src/scripts/avatar`).

- [ ] **Step 3: Write the module**

`src/scripts/avatar.ts`:

```ts
// Maps scroll progress through the journey to the scene's state (vector journey spec §5): the
// settled rank, the arriving rank and how far the blend between them has run, and from those
// every live outfit's opacity, every live prop set's fill and outline, the interpolated pose and
// the energy. Pure, so it is unit-tested; src/scripts/scene.ts writes it to the SVG.
import type { Pose } from "../data/avatarRig";

/** The last 30% of each rank's stretch blends into the next rank (spec §3.2). */
export const BLEND = 0.3;

export interface OutfitState {
  rank: number;
  opacity: number;
}

export interface PropsState {
  rank: number;
  /** The fills' opacity. */
  fill: number;
  /** The outline's opacity. */
  outline: number;
  /** The outline's stroke-dashoffset: 1 is undrawn, 0 fully drawn. */
  draw: number;
}

export interface SceneState {
  rank: number;
  next: number;
  /** 0 until the last 30% of a rank's stretch, then 0 → 1. */
  t: number;
  outfits: OutfitState[];
  props: PropsState[];
  pose: Pose;
  energy: { opacity: number; scale: number };
}

export function stageForProgress(progress: number, stages: number): number {
  if (!Number.isFinite(progress) || progress <= 0) return 0;
  return Math.min(stages - 1, Math.floor(progress * stages));
}

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);
const smooth = (t: number): number => t * t * (3 - 2 * t);

const lerpPose = (a: Pose, b: Pose, t: number): Pose =>
  Object.fromEntries(
    (Object.keys(a) as (keyof Pose)[]).map((k) => [k, a[k] + (b[k] - a[k]) * t]),
  ) as Pose;

export function sceneState(progress: number, poses: readonly Pose[]): SceneState {
  const stages = poses.length;
  const p = Number.isFinite(progress) ? clamp01(progress) : 0;
  const rank = stageForProgress(p, stages);
  const local = Math.min(1, p * stages - rank);
  const blending = rank < stages - 1 && local > 1 - BLEND;
  const t = blending ? (local - (1 - BLEND)) / BLEND : 0;
  const next = blending ? rank + 1 : rank;
  const s = smooth(t);
  const outfits: OutfitState[] = blending
    ? [
        { rank, opacity: 1 - s },
        { rank: next, opacity: s },
      ]
    : [{ rank, opacity: 1 }];
  // The old props fade over the first half; the new outline draws over 60%, the fills come in
  // over the second half, and the outline leaves over the last fifth.
  const props: PropsState[] = blending
    ? [
        { rank, fill: 1 - clamp01(t / 0.5), outline: 0, draw: 0 },
        {
          rank: next,
          fill: clamp01((t - 0.5) / 0.5),
          outline: t < 0.8 ? 1 : 1 - (t - 0.8) / 0.2,
          draw: 1 - clamp01(t / 0.6),
        },
      ]
    : [{ rank, fill: 1, outline: 0, draw: 0 }];
  const pose = blending ? lerpPose(poses[rank]!, poses[next]!, s) : { ...poses[rank]! };
  return { rank, next, t, outfits, props, pose, energy: { opacity: p * p, scale: 0.5 + 0.5 * p } };
}
```

In `src/scripts/journey.ts`, delete the `stageForProgress` function and add, under the imports:

```ts
import { stageForProgress } from "./avatar";

export { stageForProgress };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run test/avatar.test.ts test/journey.test.ts`
Expected: PASS (the new file's 8 tests, and `test/journey.test.ts` unchanged).

- [ ] **Step 5: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test && pnpm build`
Expected: `0 errors` from check; all tests pass; build completes.

```bash
git add src/scripts/avatar.ts src/scripts/journey.ts test/avatar.test.ts
git commit -m "journey: the scene state (rank, blend, props sequence, pose, energy)"
```

### Task 12: Applying a state to the scene (DOM)

**Files:**

- Create: `src/scripts/scene.ts`
- Test: `test/scene.test.ts`

**Interfaces:**

- Consumes: `SceneState` (Task 11); `RIG`, `PART_ORDER`, `PIVOT_OF_PART`, `Rig`, `PartId` (Task 1).
- Produces: `Attr { setAttribute(name: string, value: string): void }`, `SceneRefs { parts; outfits; props; energy }`, `bindScene(byId: (id: string) => Attr | null, rig?: Rig): SceneRefs | null`, `applyState(refs: SceneRefs, state: SceneState, rig?: Rig): void`, `FIGURE_X = 0.3` (the figure's x in the scene as a fraction of the canvas width; mirrors `sceneBox` in `scripts/build-scene.mjs`).

- [ ] **Step 1: Write the failing test**

`test/scene.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { PART_ORDER, RIG } from "../src/data/avatarRig";
import { sceneState } from "../src/scripts/avatar";
import { applyState, bindScene, type Attr } from "../src/scripts/scene";

/** A fake SVG: every id the builder emits, recording the attributes written to it. */
function fakeScene(missing: string[] = []) {
  const els = new Map<string, Attr & { attrs: Record<string, string> }>();
  const add = (id: string) => {
    const attrs: Record<string, string> = {};
    els.set(id, { attrs, setAttribute: (n, v) => void (attrs[n] = v) });
  };
  add("energy");
  for (const part of PART_ORDER) {
    add(`part-${part}`);
    for (const rank of RIG.ranks) add(`outfit-${rank}-${part}`);
  }
  for (const rank of RIG.ranks) for (const s of ["", "-fill", "-outline"]) add(`props-${rank}${s}`);
  for (const id of missing) els.delete(id);
  return { els, byId: (id: string) => els.get(id) ?? null };
}

const poses = RIG.ranks.map((r) => RIG.poses[r]!);
const attrs = (scene: ReturnType<typeof fakeScene>, id: string) => scene.els.get(id)!.attrs;

describe("bindScene", () => {
  it("binds every part, outfit and prop set by id", () => {
    const refs = bindScene(fakeScene().byId)!;
    expect(Object.keys(refs.parts).sort()).toEqual([...PART_ORDER].sort());
    expect(refs.outfits).toHaveLength(RIG.ranks.length);
    expect(Object.keys(refs.outfits[0]!).sort()).toEqual([...PART_ORDER].sort());
    expect(refs.props).toHaveLength(RIG.ranks.length);
  });

  it("refuses a scene missing the energy or a rank's props, so nothing half-binds", () => {
    expect(bindScene(fakeScene(["energy"]).byId)).toBeNull();
    expect(bindScene(fakeScene(["props-sysadmin-outline"]).byId)).toBeNull();
  });

  it("tolerates a missing part group (the outfit lacks it) by skipping it", () => {
    const refs = bindScene(fakeScene(["outfit-t1-support-coat-left"]).byId)!;
    expect(refs.outfits[0]!["coat-left"]).toBeUndefined();
    expect(refs.outfits[1]!["coat-left"]).toBeDefined();
  });
});

describe("applyState", () => {
  it("writes a settled rank: its outfit and props visible, the rest hidden, the pose applied", () => {
    const scene = fakeScene();
    const refs = bindScene(scene.byId)!;
    applyState(refs, sceneState(4.5 / 7, poses)); // sysadmin, settled
    expect(attrs(scene, "outfit-sysadmin-head")).toEqual({
      visibility: "visible",
      opacity: "1.000",
    });
    expect(attrs(scene, "outfit-t1-support-head")).toEqual({
      visibility: "hidden",
      opacity: "0.000",
    });
    expect(attrs(scene, "props-sysadmin")).toEqual({ visibility: "visible" });
    expect(attrs(scene, "props-sysadmin-fill")).toEqual({ opacity: "1.000" });
    expect(attrs(scene, "props-sysadmin-outline")).toEqual({
      opacity: "0.000",
      "stroke-dashoffset": "0.000",
    });
    expect(attrs(scene, "props-t3-support")).toEqual({ visibility: "hidden" });
    const [sx, sy] = RIG.pivots["shoulder-right"];
    expect(attrs(scene, "part-arm-right").transform).toBe(
      `rotate(${RIG.poses.sysadmin!["shoulder-right"].toFixed(3)} ${sx} ${sy})`,
    );
    expect(attrs(scene, "part-legs").transform).toBeUndefined();
  });

  it("writes a blend: both ranks live with their opacities and the outline mid-draw", () => {
    const scene = fakeScene();
    const refs = bindScene(scene.byId)!;
    applyState(refs, sceneState(0.85 / 7, poses)); // t = 0.5 between E and D
    expect(attrs(scene, "outfit-t1-support-torso")).toEqual({
      visibility: "visible",
      opacity: "0.500",
    });
    expect(attrs(scene, "outfit-web-concierge-torso")).toEqual({
      visibility: "visible",
      opacity: "0.500",
    });
    expect(attrs(scene, "outfit-professional-services-torso")).toEqual({
      visibility: "hidden",
      opacity: "0.000",
    });
    expect(attrs(scene, "props-web-concierge-outline")).toEqual({
      opacity: "1.000",
      "stroke-dashoffset": "0.167",
    });
    expect(attrs(scene, "props-t1-support-fill")).toEqual({ opacity: "0.000" });
  });

  it("scales the energy about the hips in scene coordinates", () => {
    const scene = fakeScene();
    applyState(bindScene(scene.byId)!, sceneState(1, poses));
    const [hx, hy] = RIG.pivots.hips;
    const x = hx + RIG.canvas.width * 0.3;
    expect(attrs(scene, "energy")).toEqual({
      opacity: "1.000",
      transform: `translate(${x} ${hy}) scale(1.000) translate(${-x} ${-hy})`,
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run test/scene.test.ts`
Expected: FAIL (cannot resolve `../src/scripts/scene`).

- [ ] **Step 3: Write the module**

`src/scripts/scene.ts`:

```ts
// Binds the fetched scene's groups by id and writes a SceneState to them as SVG attributes
// (vector journey spec §5): rotate() on the pivoted parts, visibility and opacity on the live
// outfits and prop sets, stroke-dashoffset on an arriving outline, opacity and scale on the
// energy. Attributes only, never style, for the CSP. The ids are the builder's contract
// (scripts/build-scene.mjs).
import { PART_ORDER, PIVOT_OF_PART, RIG, type PartId, type Rig } from "../data/avatarRig";
import type { SceneState } from "./avatar";

/** Anything with setAttribute: an SVG element, or a fake in tests. */
export interface Attr {
  setAttribute(name: string, value: string): void;
}

export interface SceneRefs {
  parts: Partial<Record<PartId, Attr>>;
  /** By rank index, then part. A part an outfit lacks is absent. */
  outfits: Partial<Record<PartId, Attr>>[];
  props: { group: Attr; fill: Attr; outline: Attr }[];
  energy: Attr;
}

/** The figure's x in the scene, as a fraction of the canvas width (sceneBox in build-scene.mjs). */
export const FIGURE_X = 0.3;

export function bindScene(byId: (id: string) => Attr | null, rig: Rig = RIG): SceneRefs | null {
  const energy = byId("energy");
  if (!energy) return null;
  const parts: Partial<Record<PartId, Attr>> = {};
  for (const part of PART_ORDER) {
    const el = byId(`part-${part}`);
    if (el) parts[part] = el;
  }
  const outfits = rig.ranks.map((rank) => {
    const outfit: Partial<Record<PartId, Attr>> = {};
    for (const part of PART_ORDER) {
      const el = byId(`outfit-${rank}-${part}`);
      if (el) outfit[part] = el;
    }
    return outfit;
  });
  const props: SceneRefs["props"] = [];
  for (const rank of rig.ranks) {
    const group = byId(`props-${rank}`);
    const fill = byId(`props-${rank}-fill`);
    const outline = byId(`props-${rank}-outline`);
    if (!group || !fill || !outline) return null;
    props.push({ group, fill, outline });
  }
  return { parts, outfits, props, energy };
}

const f = (n: number): string => n.toFixed(3);

export function applyState(refs: SceneRefs, state: SceneState, rig: Rig = RIG): void {
  for (const part of PART_ORDER) {
    const pivot = PIVOT_OF_PART[part];
    const el = refs.parts[part];
    if (!pivot || !el) continue;
    const [x, y] = rig.pivots[pivot];
    el.setAttribute("transform", `rotate(${f(state.pose[pivot])} ${x} ${y})`);
  }
  const outfits = new Map(state.outfits.map((o) => [o.rank, o.opacity]));
  refs.outfits.forEach((outfit, rank) => {
    const opacity = outfits.get(rank);
    for (const el of Object.values(outfit)) {
      el.setAttribute("visibility", opacity === undefined ? "hidden" : "visible");
      el.setAttribute("opacity", f(opacity ?? 0));
    }
  });
  const props = new Map(state.props.map((p) => [p.rank, p]));
  refs.props.forEach((el, rank) => {
    const p = props.get(rank);
    el.group.setAttribute("visibility", p ? "visible" : "hidden");
    if (!p) return;
    el.fill.setAttribute("opacity", f(p.fill));
    el.outline.setAttribute("opacity", f(p.outline));
    el.outline.setAttribute("stroke-dashoffset", f(p.draw));
  });
  const [hx, hy] = rig.pivots.hips;
  const x = hx + rig.canvas.width * FIGURE_X;
  refs.energy.setAttribute("opacity", f(state.energy.opacity));
  refs.energy.setAttribute(
    "transform",
    `translate(${x} ${hy}) scale(${f(state.energy.scale)}) translate(${-x} ${-hy})`,
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run test/scene.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test && pnpm build`
Expected: `0 errors` from check; all tests pass; build completes.

```bash
git add src/scripts/scene.ts test/scene.test.ts
git commit -m "journey: binding the scene and writing its state as attributes"
```

### Task 13: The stage and the loader

**Files:**

- Modify: `src/components/journey/Journey.astro`, `src/scripts/journey.ts`
- Test: `test/ui/Journey.test.ts`, `test/journey.test.ts`

**Interfaces:**

- Consumes: `sceneState`, `stageForProgress`, `SceneState` (Task 11); `bindScene`, `applyState`, `SceneRefs` (Task 12); `RIG` (Task 1); `src/components/journey/silhouette.svg` (Task 10).
- Produces: `SCENE_URL = "/journey/scene.svg"`, `isSceneDocument(doc): boolean` (exported from `journey.ts`), the stage markup `<div class="journey__scene" data-scene>` holding the inline silhouette, and the CSS idle animations. The clip markup, `clipSources` and the priming runtime go in Task 14; this task removes only what the new stage replaces in `Journey.astro` and `journey.ts`.

- [ ] **Step 1: Write the failing tests**

In `test/ui/Journey.test.ts`, replace the test "gives every stage a layer with a lazy poster and a silent, unloaded looping clip" with:

```ts
it("holds the stage with the inline silhouette and no clip markup", async () => {
  const html = await render(Journey);
  const stage = html.match(/<div class="journey__scene"[^>]*data-scene[^>]*>[\s\S]*?<\/div>/)?.[0];
  expect(stage).toBeDefined();
  expect(stage).toContain('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1500"');
  expect(stage).toMatch(/<path transform="translate\(300 0\)" fill="#202020" d="M/);
  expect(html).not.toContain("<video");
  expect(html).not.toContain("journey__poster");
  expect(html).not.toContain("data-src");
  expect(html).not.toContain("style=");
});
```

and drop the `clipSources` import. In `test/journey.test.ts`, replace the `neighbours` block with:

```ts
describe("isSceneDocument", () => {
  const doc = (nodeName: string | null, hasAvatar: boolean) => ({
    documentElement: nodeName === null ? null : { nodeName },
    getElementById: (id: string) => (hasAvatar && id === "avatar" ? {} : null),
  });

  it("accepts an SVG document that carries the avatar", () => {
    expect(isSceneDocument(doc("svg", true))).toBe(true);
  });

  it("rejects an HTML error page, a parser error and an SVG without the avatar", () => {
    expect(isSceneDocument(doc("html", false))).toBe(false);
    expect(isSceneDocument(doc("parsererror", false))).toBe(false);
    expect(isSceneDocument(doc("svg", false))).toBe(false);
    expect(isSceneDocument(doc(null, true))).toBe(false);
  });
});
```

with the import changed to `import { isSceneDocument, stageForProgress } from "../src/scripts/journey";`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run test/ui/Journey.test.ts test/journey.test.ts`
Expected: FAIL (`isSceneDocument` is not exported; the stage markup is not there).

- [ ] **Step 3: Rewrite the stage in `Journey.astro`**

Frontmatter: replace the header comment's second sentence onward with

```
// Scroll-driven career journey (spec §7; vector journey spec). A tall track with a pinned,
// full-width stage: as the visitor scrolls, the stage advances through the seven ranks and the
// vector scene (public/journey/scene.svg) ranks the character up with it. Until the scene loads,
// and if it never does, the inline silhouette holds the stage. scripts/journey.ts maps scroll
// progress to the active rank and the scene's state; CSS switches the cards and runs the idle
// life on the scene's inner groups.
```

then keep the accessibility paragraph and the `bleed` note. Replace `import { Picture } from "astro:assets";` with `import silhouette from "./silhouette.svg?raw";` and `import { clipSources, stageArt } from "../../data/journeyArt";` with nothing (this component no longer reads the art; the timeline still does).

Replace the whole `<div class="journey__media">…</div>` block with:

```astro
<div class="journey__media">
  <div class="journey__scene" data-scene set:html={silhouette} />
</div>
```

In `<style>`, replace the `/* ---------- Clips ---------- */` section (from that comment through the `.journey__clip.is-playing .journey__video` rule) with:

```css
/* ---------- Scene ---------- */
.journey__media {
  position: relative;
  min-height: 0;
  overflow: hidden;
  background: var(--color-carbon);
}

.journey__scene {
  position: absolute;
  inset: 0;
}

.journey__scene :global(svg) {
  display: block;
  width: 100%;
  height: 100%;
}

/* Idle life (vector journey spec §3.3): CSS on the inner groups; the scroll writes transforms
     on the outer ones, so the two never fight. fill-box keeps each origin on the group itself. */
.journey__scene :global(#part-torso-idle) {
  transform-box: fill-box;
  transform-origin: 50% 100%;
  animation: breathe 4s ease-in-out infinite;
}

.journey__scene :global(#part-head-idle) {
  transform-box: fill-box;
  transform-origin: 50% 100%;
  animation: sway 5s ease-in-out infinite;
}

.journey__scene :global(.glow) {
  animation: glow 2.4s ease-in-out infinite alternate;
}

@keyframes breathe {
  50% {
    transform: scaleY(1.01);
  }
}

@keyframes sway {
  50% {
    transform: rotate(1.5deg);
  }
}

@keyframes glow {
  to {
    opacity: 0.55;
  }
}
```

Update the `CLAUDE.md`-style comment above the 60rem block that says "From 60rem the clip fills the stage" to "From 60rem the scene fills the stage".

- [ ] **Step 4: Rewrite `src/scripts/journey.ts`**

```ts
// Maps scroll progress through the journey track to the active career stage and drives the vector
// scene (vector journey spec §5). Motion's scroll() tracks the journey element; the cards, the
// rail and data-activity switch by class as before. The scene is fetched once, the first time
// the journey is on screen (past the window's bottom 15%) and the page has scrolled at all, so
// nothing loads with the page on any window; until then, and if the fetch fails, the inline
// silhouette holds the stage. Each frame the scene state is written as SVG attributes
// (src/scripts/scene.ts); the idle life is CSS on the scene's inner groups.
import { scroll } from "motion";
import { RIG } from "../data/avatarRig";
import { sceneState, stageForProgress } from "./avatar";
import { applyState, bindScene, type SceneRefs } from "./scene";

export { stageForProgress };

export const SCENE_URL = "/journey/scene.svg";

/** A scene is an SVG document carrying the avatar; a 404 page or a parser error is not. */
export function isSceneDocument(doc: {
  documentElement: { nodeName: string } | null;
  getElementById(id: string): unknown;
}): boolean {
  return doc.documentElement?.nodeName === "svg" && doc.getElementById("avatar") != null;
}

export function initJourney(): void {
  const root = document.querySelector<HTMLElement>("[data-journey]");
  if (!root) return;
  if (!matchMedia("(prefers-reduced-motion: no-preference)").matches) return;

  const cards = [...root.querySelectorAll<HTMLElement>("[data-card]")];
  const nodes = [...root.querySelectorAll<HTMLElement>("[data-node]")];
  const stage = root.querySelector<HTMLElement>("[data-scene]");
  const poses = RIG.ranks.map((rank) => RIG.poses[rank]!);
  let current = 0;
  let onScreen = false;
  let requested = false;
  let refs: SceneRefs | null = null;
  let last = sceneState(0, poses);

  const load = async () => {
    if (requested || !stage) return;
    requested = true;
    try {
      const response = await fetch(SCENE_URL);
      if (!response.ok) return;
      const doc = new DOMParser().parseFromString(await response.text(), "image/svg+xml");
      if (!isSceneDocument(doc)) return;
      const svg = document.importNode(doc.documentElement, true);
      const bound = bindScene((id) => svg.querySelector(`#${id}`));
      if (!bound) return;
      // Painted at the visitor's current progress, never at rank E, however late it arrives.
      applyState(bound, last);
      stage.replaceChildren(svg);
      refs = bound;
    } catch {
      // The silhouette stays; the cards and the rail still work.
    }
  };

  const maybeLoad = () => {
    if (onScreen && scrollY > 0) void load();
  };

  const show = (index: number) => {
    if (index === current) return;
    current = index;
    root.dataset.activity = cards[index]!.dataset.activity;
    cards.forEach((card, i) => card.classList.toggle("is-active", i === index));
    nodes.forEach((node, i) => {
      node.classList.toggle("is-reached", i <= index);
      node.classList.toggle("is-current", i === index);
    });
  };

  // Ignores the window's bottom 15%: a strip of journey peeking up at load on a tall screen loads nothing.
  new IntersectionObserver(
    (entries) => {
      // The newest entry is the current state: a busy main thread can deliver an enter and a leave together.
      onScreen = entries[entries.length - 1]!.isIntersecting;
      maybeLoad();
    },
    { rootMargin: "0px 0px -15% 0px" },
  ).observe(root);

  // Listens for the page's whole life: stopping on pagehide froze the journey after a
  // back/forward-cache restore.
  scroll(
    (progress: number) => {
      // CSSOM writes are allowed under the CSP (only inline style attributes are blocked).
      root.style.setProperty("--progress", progress.toFixed(4));
      show(stageForProgress(progress, cards.length));
      last = sceneState(progress, poses);
      if (refs) applyState(refs, last);
      maybeLoad();
    },
    { target: root, offset: ["start start", "end end"] },
  );
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run test/ui/Journey.test.ts test/journey.test.ts`
Expected: PASS. (`test/journeyArt.test.ts` and `test/ui/Journey.test.ts`'s other tests are untouched and still pass; the clip-related e2e tests fail until Task 14, which is expected: do not run `pnpm test:e2e` for this task's gate.)

- [ ] **Step 6: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test && pnpm build`
Expected: `0 errors` from check; all unit tests pass; build completes (the `?raw` import of the silhouette is a Vite feature; if `pnpm check` flags the import's type, add `/// <reference types="vite/client" />` at the top of `src/env.d.ts`, or create that file with only that line if it does not exist).

```bash
git add src/components/journey/Journey.astro src/scripts/journey.ts test/ui/Journey.test.ts test/journey.test.ts
git add src/env.d.ts 2>/dev/null || true   # only if you created or changed it
git commit -m "journey: the vector stage, its loader and the idle life"
```

### Task 14: Retire the clips; the scene's e2e

**Files:**

- Delete: `public/journey/*.webm`, `public/journey/*.mp4` (28 files), `scripts/encode-clip.mjs`, `scripts/clip-variants.mjs`, `test/encodeClip.test.ts`
- Modify: `src/data/journeyArt.ts`, `scripts/check-bundle-size.mjs`, `test/journeyArt.test.ts`, `test/checkBundleSize.test.ts`, `e2e/journey.spec.ts`, `e2e/stills.spec.ts`, `e2e/visual.spec.ts`

**Interfaces:**

- Consumes: `SCENE_URL` behaviour from Task 13 (the scene is requested only once the journey is on screen and the page has scrolled), the scene ids (Task 4), `stageArt` (unchanged).
- Produces: `journeyArt.ts` exports only `StageArt` and `stageArt`; `pnpm size` fails on any file in `dist/client/journey` other than `scene.svg`; the e2e suite describes the scene.

- [ ] **Step 1: Write the failing tests**

`test/journeyArt.test.ts`: delete the two clip tests ("lists a clip's four encodes…" and "has every encode in public/journey…"), the `CLIP_VARIANTS`, `clipSources`, `existsSync`/`statSync` imports and the `WEBM`/`MP4` constants. Add:

```ts
it("exports no clip sources any more", async () => {
  const art = await import("../src/data/journeyArt");
  expect(Object.keys(art).sort()).toEqual(["stageArt"]);
});
```

`test/checkBundleSize.test.ts`: delete the three clip tests ("passes clips within their limits…", "fails a clip over its limit…", "fails a file in journey/ that is not one of the four encodes") and the `withClips` helper. Add:

```ts
it("fails a stray file in journey/ (only the scene belongs there)", () => {
  const dist = fakeDist({ "fonts/a.woff2": 42_000 });
  mkdirSync(join(dist, "dist/client/journey"), { recursive: true });
  writeFileSync(join(dist, "dist/client/journey/sysadmin-640.mp4"), Buffer.alloc(10, 1));
  const res = run(dist);
  expect(res.stdout).toContain("FAIL stray journey file: sysadmin-640.mp4");
  expect(res.status).toBe(1);
});
```

`e2e/journey.spec.ts`: replace `trackArt` and `playing`, and the whole `journey clips` describe, with the block below; in the `reduced motion` describe rename "never requests a clip, even scrolled to the end" to "never requests the scene, even scrolled to the end" with `expect(art.scene).toBe(false)`; in the `without JavaScript` describe add `const art = trackArt(page);` before `page.goto` and `expect(art.scene).toBe(false);` at the end of its test.

```ts
/** Records whether the scene (/journey/scene.svg) and which stills (/_astro/<id>.…) the page requests. */
function trackArt(page: Page) {
  const stills = new Set<string>();
  const art = { scene: false, stills };
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("/journey/scene.svg")) art.scene = true;
    for (const id of STAGE_IDS) if (url.includes(`/_astro/${id}.`)) stills.add(id);
  });
  return art;
}

/** The visibility attribute of an id inside the stage's scene. */
const visibility = (page: Page, id: string) =>
  page.locator(`[data-scene] #${id}`).getAttribute("visibility");

test.describe("journey scene", () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name === "reduced-motion", "covered below");
  });

  // At the project and Lighthouse sizes the journey starts 31–91 px below the fold; on a 2560×1300
  // window it is on screen at load. Either way the scene waits for the first scroll.
  test("fetches nothing before the journey reaches the screen, then the scene once", async ({
    page,
  }) => {
    const art = trackArt(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(art.scene).toBe(false);
    expect([...art.stills]).toEqual([]);
    await expect(page.locator("[data-scene] svg path")).toHaveCount(1); // the silhouette
    await scrollToStage(page, 0);
    await expect(page.locator("[data-scene] #avatar")).toHaveCount(1);
    expect(art.scene).toBe(true);
    expect([...art.stills]).toEqual([]);
  });

  test("on tall desktop windows, the page still loads nothing of the journey", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "desktop windows");
    for (const size of [
      { width: 1920, height: 1080 },
      { width: 2560, height: 1300 },
    ]) {
      await page.setViewportSize(size);
      const art = trackArt(page);
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      expect(art.scene, `${size.width}×${size.height}`).toBe(false);
      expect([...art.stills], `${size.width}×${size.height}`).toEqual([]);
    }
  });

  test("shows each rank's outfit and props as you scroll, and hides the others", async ({
    page,
  }) => {
    await page.goto("/");
    for (const i of [0, 3, 6]) {
      await scrollToStage(page, i);
      await expect(page.locator("[data-journey]")).toHaveAttribute("data-activity", ORDER[i]![0]);
      const id = STAGE_IDS[i]!;
      await expect.poll(() => visibility(page, `outfit-${id}-torso`)).toBe("visible");
      await expect.poll(() => visibility(page, `props-${id}`)).toBe("visible");
      for (const other of STAGE_IDS.filter((_, j) => Math.abs(j - i) > 1)) {
        expect(await visibility(page, `outfit-${other}-torso`), other).toBe("hidden");
        expect(await visibility(page, `props-${other}`), other).toBe("hidden");
      }
      await expect(page.locator(`[data-scene] #outfit-${id}-torso`)).toHaveAttribute(
        "opacity",
        "1.000",
      );
    }
  });

  test("a failed scene fetch leaves the silhouette and the cards, with no errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.route("**/journey/scene.svg", (route) =>
      route.fulfill({
        status: 404,
        contentType: "text/html",
        body: "<!doctype html><title>nope</title>",
      }),
    );
    await page.goto("/");
    await scrollToStage(page, 2);
    await expect(page.locator("[data-journey]")).toHaveAttribute("data-activity", "migration");
    await expect(page.locator(".journey__card.is-active h3")).toHaveText(
      "Professional Services Engineer",
    );
    await expect(page.locator("[data-scene] svg path")).toHaveCount(1);
    await expect(page.locator("[data-scene] #avatar")).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("a scene that arrives late paints the rank the visitor is on", async ({ page }) => {
    await page.route("**/journey/scene.svg", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });
    await page.goto("/");
    await scrollToStage(page, 4);
    await expect(page.locator("[data-journey]")).toHaveAttribute("data-activity", "rack");
    await expect(page.locator("[data-scene] #avatar")).toHaveCount(1, { timeout: 10_000 });
    expect(await visibility(page, "outfit-sysadmin-torso")).toBe("visible");
    expect(await visibility(page, "outfit-t1-support-torso")).toBe("hidden");
  });

  test("keeps the scene under the CSP: no inline styles, attributes only", async ({ page }) => {
    await page.goto("/");
    await scrollToStage(page, 1);
    await expect(page.locator("[data-scene] #avatar")).toHaveCount(1);
    expect(await page.locator("[data-scene] [style]").count()).toBe(0);
    await expect(page.locator("[data-scene] #part-arm-right")).toHaveAttribute(
      "transform",
      /^rotate\(/,
    );
  });
});
```

Also in the `animated journey` describe, rename "from 60rem, the clip fills the full-width stage…" to "from 60rem, the scene fills the full-width stage…" and "below 60rem, the rail, the clip and the card stack…" to "below 60rem, the rail, the scene and the card stack…" (their bodies are unchanged).

`e2e/stills.spec.ts`: remove `.journey__poster source, .journey__poster img` from the selector on line 15 and the word "the journey's posters" from the comment on line 3.

`e2e/visual.spec.ts`: in both journey tests replace the `expect.poll` on `[data-clip].is-active img` with

```ts
await expect(page.locator("[data-scene] #avatar")).toHaveCount(1);
await expect(page.locator("[data-scene] #outfit-t3-support-torso")).toHaveAttribute(
  "opacity",
  "1.000",
);
```

(`outfit-t1-support-torso` in the rank E test). Keep the `addInitScript` in `beforeEach` (the stubbed `setInterval` still freezes the htop drift and the pulses; `play()` no longer matters). The `animations: "disabled"` option already freezes the idle CSS animations at their first keyframe.

- [ ] **Step 2: Run the unit tests to verify they fail**

Run: `pnpm vitest run test/journeyArt.test.ts test/checkBundleSize.test.ts`
Expected: FAIL (`clipSources` still exported; no `stray journey file` line).

- [ ] **Step 3: Retire the clips**

```bash
git rm -q public/journey/*.webm public/journey/*.mp4 scripts/encode-clip.mjs scripts/clip-variants.mjs test/encodeClip.test.ts
```

`src/data/journeyArt.ts`: delete everything from `export interface ClipSource` to the end, and change the header comment to:

```ts
// The journey's art per career stage: the rank's picture for the reduced-motion timeline (a
// composite rendered from the vector scene by scripts/render-rank-stills.mjs) and what it shows.
// Keyed by CareerStage.id. The animated stage draws public/journey/scene.svg instead.
```

`scripts/check-bundle-size.mjs`: remove the `CLIP_VARIANTS` import and the whole clip block, and put in its place:

```js
const journeyDir = "dist/client/journey";
if (existsSync(journeyDir)) {
  for (const name of readdirSync(journeyDir).filter((f) => f !== "scene.svg")) {
    console.log(`FAIL stray journey file: ${name}`);
    failed = true;
  }
}
```

Update the header comment's journey line to `// - Journey: only scene.svg may live in dist/client/journey, gzipped within its budget (vector journey spec §7).`

- [ ] **Step 4: Run the unit tests and the build**

Run: `pnpm vitest run test/journeyArt.test.ts test/checkBundleSize.test.ts && pnpm build && pnpm size`
Expected: PASS; `pnpm size` prints the scene row and no clip row, exit 0.

- [ ] **Step 5: Run the journey, stills and home e2e**

Run: `pnpm test:e2e e2e/journey.spec.ts e2e/stills.spec.ts e2e/home.spec.ts e2e/layout.spec.ts`
Expected: 0 failed. If "shows each rank's outfit…" flakes on `props-<id>` visibility right after a scroll, the blend from the previous rank is still running: `scrollToStage` lands at the middle of a rank, where `t` is 0, so a failure here is a real bug, not timing.

- [ ] **Step 6: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test && pnpm build`
Expected: `0 errors` from check; all tests pass; build completes.

```bash
git add -A public/journey scripts test src/data/journeyArt.ts e2e
git commit -m "journey: retire the clips; the scene's e2e (load gate, ranks, failure, late arrival)"
```

---

## Phase 4: the composites and the wrap-up

### Task 15: The timeline composites

**Files:**

- Modify: `src/images/journey/<stage-id>.webp` × 7 (overwritten by the renderer), `src/data/journeyArt.ts` (the subjects)
- Test: `test/journeyArt.test.ts` (unchanged assertions: every still ≥ 1920 wide and 16:9), `test/ui/JourneyTimeline.test.ts` (unchanged)

**Interfaces:**

- Consumes: `scripts/render-rank-stills.mjs` (Task 5) through its CLI; `public/journey/scene.svg` (Task 10).
- Produces: the seven composites the timeline serves through `Still`, and subjects that describe them.

- [ ] **Step 1: Write the failing test**

Add to `test/journeyArt.test.ts`:

```ts
it("describes each rank's picture as the flat vector composite it now is", () => {
  for (const stage of career) {
    expect(stageArt[stage.id]!.subject, stage.id).toMatch(/^a flat vector /);
    expect(stageArt[stage.id]!.still.height, stage.id).toBe(1080);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run test/journeyArt.test.ts`
Expected: FAIL (the subjects start with "an anime…"/"the same engineer…", and the stills are 2752×1548).

- [ ] **Step 3: Render the composites and rewrite the subjects**

Run: `node scripts/render-rank-stills.mjs`
Expected: seven paths under `src/images/journey/`, each 1920×1080. View `src/images/journey/sysadmin.webp` and confirm it shows the figure in the short coat beside the rack, centred on carbon.

In `src/data/journeyArt.ts`, replace the seven `subject` strings:

| Stage id                | subject                                                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `t1-support`            | `a flat vector engineer in a black hoodie and headset standing at a support desk between two orange-lit monitors`                  |
| `web-concierge`         | `a flat vector engineer in a hoodie, sleeves pushed up, one hand raised to floating website wireframe panels`                      |
| `professional-services` | `a flat vector engineer in a black zip jacket holding out a glowing orange data cube beside a path of small lights`                |
| `t3-support`            | `a flat vector engineer in a high-collar jacket standing calm before a wall of orange alert lights, violet shadows at his feet`    |
| `sysadmin`              | `a flat vector engineer in a short black coat beside an open server rack, violet smoke along the floor`                            |
| `linux-engineer`        | `a flat vector engineer in a long black coat conducting a pipeline of floating modules while violet shadow hands reach in`         |
| `systems-architect`     | `a flat vector engineer in a long open coat with orange cuffs before rows of violet shadow server racks, a violet aura around him` |

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run test/journeyArt.test.ts test/ui/JourneyTimeline.test.ts`
Expected: PASS.

- [ ] **Step 5: Check the renditions' size**

Run: `pnpm build && node -e "const fs=require('fs');for(const f of fs.readdirSync('dist/client/_astro').filter(f=>/^(t1-support|web-concierge|professional-services|t3-support|sysadmin|linux-engineer|systems-architect)\./.test(f))){const kb=fs.statSync('dist/client/_astro/'+f).size/1024;console.log((kb>120?'OVER ':'ok   ')+f+' '+kb.toFixed(0)+' KB')}"`
Expected: every rendition `ok` (flat art at quality 60 is far under 120 KB). An `OVER` line means `STILL.quality` in `scripts/render-rank-stills.mjs` should come down to 76; re-render and re-check.

- [ ] **Step 6: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test && pnpm build && pnpm test:e2e e2e/journey.spec.ts e2e/stills.spec.ts`
Expected: `0 errors` from check; all tests pass; 0 e2e failures.

```bash
git add src/images/journey src/data/journeyArt.ts test/journeyArt.test.ts
git commit -m "journey: the timeline's pictures are composites rendered from the scene"
```

### Task 16: Docs

**Files:**

- Modify: `CLAUDE.md`, `docs/superpowers/specs/2026-09-25-vector-journey-design.md`, `docs/superpowers/specs/2026-09-24-hero-journey-redesign-design.md`, `docs/decisions/0003-colour-exceptions.md`, `docs/imagery.md`

- [ ] **Step 1: `CLAUDE.md`**

- In the rebuild status block at the top, after the "Hero and journey redesign done" paragraph, add: `> **Vector journey done.** Spec: docs/superpowers/specs/2026-09-25-vector-journey-design.md; plan: docs/superpowers/plans/2026-09-25-vector-journey.md. The journey's clips are replaced by one traced-and-rigged SVG scene that ranks the character up with the scroll.`
- "Where things live": add `- `art/journey/`holds the registered flat-vector sources (lossless WebP) the scene is built from;`scripts/build-scene.mjs`traces them into`public/journey/scene.svg` and the inline silhouette.`
- Design brief, "Imagery": change "and the journey's clips (`seedance_2_0`)" to "and, for the journey, flat-vector renders traced into `public/journey/scene.svg`", and "and the journey's posters, which are raw `<Picture>` layers in `Journey.astro` under the clips (same alt rule, no scrim)" to "and the journey's timeline pictures, composites rendered from the scene by `scripts/render-rank-stills.mjs`".
- Replace the whole "Journey (`src/components/journey/`)" bullet and its sub-bullets with:

```
- Journey (`src/components/journey/`):
  - `Journey.astro` holds the pinned, full-width stage (in `Section`'s `bleed` slot): one `[data-scene]` box carrying the inline silhouette until `scripts/journey.ts` fetches `public/journey/scene.svg` (only once the journey is on screen and the page has scrolled). `src/scripts/avatar.ts` maps scroll progress to the scene state (rank, blend, props sequence, pose, energy; pure, unit-tested); `src/scripts/scene.ts` writes it as SVG attributes by id. Idle life is CSS on the scene's `#part-*-idle` groups.
  - The art pipeline is pnpm only: `scripts/import-art.mjs` → `scripts/register-outfit.mjs` (2% residual gate) → `scripts/build-scene.mjs` (`sharp` + `potrace`, palette in `scripts/trace-vector.mjs`, rig in `src/data/avatar-rig.json`) → `scripts/render-rank-stills.mjs` for the timeline's pictures. `pnpm size` checks the scene (≤ 300 KB gz) and rejects any other file in `dist/client/journey`.
  - Switch stages with visibility/opacity, never `display`, or the layout shifts.
```

- Budgets: change "the journey's clips and stills load only once the journey is on screen (none at page load)" to "the journey's scene and stills load only once the journey is on screen and the page has scrolled (none at page load, on any window size); `scene.svg` ≤ 300 KB gz".
- The motion rule: change `- Animate only `transform`and`opacity`.` to `- Animate only `transform`and`opacity`, plus `stroke-dashoffset` for vector outline draw-ins (the journey's props).`

- [ ] **Step 2: The specs and the ADR**

- `docs/superpowers/specs/2026-09-25-vector-journey-design.md`: `**Status:** Draft for review` → `**Status:** Implemented (2026-09-2x)` with today's date.
- `docs/superpowers/specs/2026-09-24-hero-journey-redesign-design.md`: under `### 7.3` (or the first heading of §7.3), add the amendment note in the spec's own convention: `> **Superseded 2026-09-2x:** §7.3–§7.5 (the clips and their delivery) are replaced by `2026-09-25-vector-journey-design.md`: one traced-and-rigged SVG scene instead of seven clips. §7.1, §7.2 and §6.3 stand.`
- ADR 0003, the "Journey art" row: "The journey's Higgsfield stills and clips are anime illustration" → "The journey's art (Higgsfield flat-vector renders traced into one SVG scene, and the timeline composites rendered from it) is anime illustration".

- [ ] **Step 3: `docs/imagery.md`**

At the end of the "Vector journey" section the controller started in Tasks 7–9, add a "Retired" paragraph: the seven `seedance_2_0` clips (Step 3 above) and the seven `nano_banana_pro` stage stills (Step 2) are no longer served; their prompts and job ids stay here as history; the timeline's pictures are now rendered from `public/journey/scene.svg`.

- [ ] **Step 4: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test && pnpm build`
Expected: `0 errors` from check; all tests pass; build completes.

```bash
git add CLAUDE.md docs
git commit -m "docs: the vector journey is implemented; the clips are history"
```

### Controller wrap-up (after the final review)

Not a subagent task. The controller:

1. Runs `pnpm build && pnpm test:e2e` (the full non-visual suite) and `pnpm size`.
2. Regenerates the visual baselines with `pnpm test:visual --update-snapshots=all`, reviews the new images (the journey baselines show rank E and rank B settled on the scene), and commits them.
3. Checks the browser at 390, 430, 768 and 1440 px with screenshots: the character ranks up E → S+, outfits cross-fade without a jump, props draw in and out, the energy grows, the idle motion runs; and records the frame rate while scrubbing on a phone-sized viewport with Chrome's performance panel (no long frames over 32 ms during a slow scrub).
4. Runs Lighthouse (`pnpm build && npx -y @lhci/cli@0.15.1 autorun --config=lighthouse/lighthouserc.cjs --upload.target=filesystem --upload.outputDir=$CLAUDE_JOB_DIR/tmp/lhci`) and reads the page weight of `/` at load.
5. Appends the Build Log entry to `~/vaults/personal/Projects/evilist.io.md`.
6. Presents the screenshots to Marcus for merge approval (superpowers:finishing-a-development-branch).

---

## Self-review

- **Spec coverage.** §2 decisions: clips replaced (Task 14), one scene (Tasks 4, 13), traced and rigged (Tasks 2, 4), outfits kept (Task 8), pnpm-only tracing (Task 2), IO-gated loading with the silhouette (Task 13), reduced motion composites (Task 15). §3.1 stage: Task 13. §3.2 ranks, outfits, props, energy: Tasks 8, 9, 11. §3.3 motion: cross-fade, pose, draw-ins, energy (Task 11); idle CSS (Task 13); the CLAUDE.md rule (Task 16). §4 pipeline steps 1–8: Tasks 7, 8, 9, 3, 2, 1, 4, and the imagery log in Tasks 7–9 and 16. §5 runtime: Tasks 11–14. §6: Tasks 5 and 15. §7 tests and budgets: unit (Tasks 1–6, 10–12), component (Task 13), e2e (Task 14), baselines and the browser check (wrap-up), budgets (Tasks 6, 10, 15). §8 phases: the four phases above. §10 risks: registration (Task 3), trace noise (Task 7 step 5), weight (Task 10 step 3), frame rate (wrap-up step 3), seams (the overlapping masks in Task 1 and the draw order in Task 4).
- **One refinement of the spec.** §4.7 names the avatar's groups `#avatar > #outfit-<rank> > #part-<name>`. This plan nests part first (`#avatar > #part-<part> > #part-<part>-idle > #outfit-<rank>-<part>`), so each pivot rotation and each idle animation is written once per part instead of once per live outfit, and the draw order stays a property of the part. The ids are an implementation contract; the behaviour §3.3 asks for is unchanged.
- **Placeholders.** None: every step carries its content; Marcus's picks are the only open inputs, and they are inputs by design (spec §8).
- **Type consistency.** `Layer = { part?, name, fill, d }` is produced by Task 2 and consumed by Tasks 4 and 5; `SceneState` by Task 11, consumed by Tasks 12 and 13; `Rig`/`Pose` by Task 1, consumed by Tasks 4, 5, 11, 12, 13 (the scripts read the JSON directly; the field names match `Rig`); `bindScene(byId)` takes a lookup function so Task 12 tests it without a DOM and Task 13 passes `svg.querySelector`. `FIGURE_X = 0.3` in `scene.ts` mirrors `sceneBox` in `build-scene.mjs`; `energyAt` in the builder and `energy` in `sceneState` use the same formulas (p², 0.5 + 0.5p).
- **Review Focus.** 1 → Task 11 ("never blends past the last rank, and clamps…"). 2 → Task 13 (`isSceneDocument`) and Task 14 ("a failed scene fetch…"). 3 → Task 14 ("a scene that arrives late…"), backed by `applyState(bound, last)` before the swap in Task 13. 4 → Task 4 ("no layers, same id") and Task 12 ("tolerates a missing part group"). 5 → Task 3 ("rejects a render whose feet don't line up, and writes nothing") and the CLI's non-zero exit.
