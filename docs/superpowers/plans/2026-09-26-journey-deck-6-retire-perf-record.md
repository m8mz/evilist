# Journey Card Deck, Plan 6: Retire, Perf, Record Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Re-scoped 2026-09-26.** Marcus's review of the deck became Plan 5 (`2026-09-26-journey-deck-5-review.md`: the drive, the aura, the floating cards, the tear); this plan runs after it. Of the tasks below, the halo plane, the smoke gate and the fog scaling (Task 4) and the tuning session (Task 6) moved into Plan 5 and are void here; the rest stand (retire, perf, lazy bodies and readiness, e2e, the record) and get their anchors re-checked against the tree Plan 5 leaves before this plan is dispatched.
>
> **Plan 5 parked:** `intro.floorMs` and `pull.handoffStart` params (dead, no consumer; drop and restate pose fixtures); swipes from `presented` step (watch for two-swipe collapse in the first half of transitions); `aura.fadeTo` tune row inert until remount (tuning decision: clamp or re-bake); square dilate on aura (test and regenerate if changed); E–A aura fetches (gate once Task 5 frees stage lines); detector sensitivity to fast motion; FROZEN constant reuse in e2e; imagery.md aura masking history completion.
>
> **Re-anchored 2026-09-27** against the tree Plan 5 left (head `4670bbf`, 508 unit tests, e2e 383, visual 26). Task 1 and Task 2 stand with small corrections carried in their dispatches (the last commit holding the pipeline is `4670bbf`; the vector spec's Superseded line names Plan 6; the deck data test also asserts `deckAura`; the perf script scrolls the track into view before it waits for `data-deck-ready`, because the deck mounts only when the journey is on screen). Task 3 stands and absorbs two parked items (the E–A aura fetches gated on kind; the faded glow/aura textures re-baked when `aura.fadeFrom`/`aura.fadeTo` change, with the panel's relayout hook covering them). Task 4 is re-scoped below to Plan 5's leftovers (the dead params, quick double swipes, an eased aura, the disc dilate, the panel rows whose params still exist) and regenerates the S/S+ baselines itself. Task 5 drops its item 4 (the frozen mid-transition frame's vram landed in Plan 5) and gains the two-swipe case. Task 6 is void (the tuning session ran in Plan 5; Marcus tunes from the panel). Task 7's record describes Plan 5's outcome (the drive, silhouettes from cutouts, one render band per moving card, no halo sprite). Line caps as Plan 5 left them: stage ≤ 640 (615), effects ≤ 500 (470), index ≤ 390 (382), textures ≤ 320 (308), pose ≤ 400 (397), cards ≤ 260 (236).

**Goal:** Finish the deck: delete the vector-journey pipeline the deck replaced, add `pnpm perf:deck`, close the memory and readiness items deferred from Plans 2–4, and bring ADR 0004, the spec, CLAUDE.md, the imagery record and the Build Log up to date.

**Architecture:** Five kinds of work, kept in separate tasks so each has its own reviewer. (1) A deletion task that removes the scene pipeline, its tests, its dependency and its size-gate rows, and makes the timeline use the deck's portraits unconditionally. (2) A measurement script that drives the production build in Chromium, scrolls the track at a fixed speed cold and warm, and prints frame-time percentiles and the texture estimate, with its arithmetic in a tiny unit-tested module. (3) Memory and readiness in the stage: body textures painted when a card comes within one rank of the active one (spec §9), `data-deck-ready` after the assets settle (spec §9), a `data-deck-mode` attribute, and a relayout hook for the panel. (4) Energy fixes: smoke only while the energetic card is landing or presented (spec §5), the glow halo as a plane in the card's group instead of a billboard behind it, the fog radius scaled with the card, a pending rank for quick double swipes, and the panel rows the tuning session needs. (5) E2E for all of it, then the tuning session, then the record.

**Tech Stack:** Astro 7, TypeScript 6 strict, Three.js 0.186.1, vitest 5, Playwright 1.63, pnpm 12.

**Spec:** `docs/superpowers/specs/2026-09-25-journey-card-deck-design.md`: §5 (States: smoke on Presented), §7 (gestures), §8 (energy), §9 (textures painted lazily; `data-deck-ready` after all textures and portraits; state attributes), §11 (`scripts/deck-perf.mjs`; budgets), §12 (tests), §14 (the record: ADR 0004, CLAUDE.md, "Deleted in Phase 6", the vector spec's Superseded line, the Build Log), §15 item 6.

## Global Constraints

- pnpm only; every commit GPG-signed (stop if signing fails; never `--no-gpg-sign`); no Co-Authored-By or AI attribution anywhere. One branch: `journey-card-deck`. After the plan lands: local main fast-forwarded, the branch pushed, GitHub's main untouched.
- CSP: no inline `style=`, no `is:inline`. No `any`, no non-null assertions in new code. No hex literals outside the palette allow list. `src/fetch.ts` never created.
- Budgets: initial JS ≤ 100 KB gz; deck chunk ≤ 170 KB; bloom ≤ 40 KB; textures ≤ 80 MB desktop / 40 MB phone; frame time p95 ≤ 16.7 ms and no frame over 50 ms through a scripted scroll on the dev Mac (`pnpm perf:deck`, local only).
- Line caps: `deck-stage.ts` ≤ 640, `deck-effects.ts` ≤ 500, `index.ts` ≤ 390, `deck-textures.ts` ≤ 320, `scripts/deck-perf.mjs` ≤ 160, `scripts/check-bundle-size.mjs` ≤ 190.
- Deletions are `git rm`; nothing is left half-referenced: `pnpm check && pnpm test && pnpm build && pnpm size` prove it in the same commit.
- `minimumReleaseAge` and `allowBuilds` in `pnpm-workspace.yaml` unchanged; removing `potrace` changes only `package.json` and `pnpm-lock.yaml`.
- Every gate: `pnpm format && pnpm lint && pnpm check && pnpm test`; tasks that touch the stage, the page script or the build add `pnpm build && pnpm size && pnpm test:e2e`; the plan's last tasks add `pnpm test:visual` (baselines regenerate only in Task 6, after the tuning values land).
- The tuning session (Task 6) is the controller's and Marcus's; subagents never guess a tuning value.

## Review Focus

1. **A visitor scrolling fast from E to S+ sees a card body, never a blank face.** With bodies painted lazily, a card must have its texture before it is pulled. Pinned in Task 3 (unit: the "wanted" predicate covers the active card and both neighbours; the stage paints on the first frame a card is wanted) and Task 5 (e2e: at every rank stop `data-deck-vram` has grown since E and the presented card's `data-deck-slots` never names a placeholder).
2. **A deep link to S+ shows smoke only once the card has landed, not a trail during the pull.** Pinned in Task 4 (unit: the smoke predicate is false for `pulling` and `leaving`) and Task 5 (visual: the S and S+ baselines regenerate after tuning and are inspected).
3. **The halo follows the card's tilt and is never hidden behind the rack.** Pinned in Task 4 (the halo is a child of the card group at a fixed small setback; a unit test on the pure setback is gone because the setback is a constant) and the controller's browser check.
4. **Deleting the pipeline leaves no dangling import, script, budget row or doc line.** Pinned in Task 1 (the gate's `check`, `test`, `build`, `size` in one commit; a grep test in `test/retired.test.ts` that the deleted paths are absent and no file under `src/`, `scripts/`, `test/`, `e2e/` names them).
5. **The perf script's numbers mean what they say.** Pinned in Task 2 (unit tests on the percentile and long-frame arithmetic with known inputs; the script prints its scroll speed and frame count so a run can be judged).

## Deviations from the spec (ruled here)

- `scripts/trace-mark.mjs` and `test/traceMark.test.ts` go with the tracer they import; the devil mark's SVG is committed and `docs/imagery.md` names the last commit that held the tracer. `scripts/import-still.mjs`, `scripts/preview-rig.mjs`, `test/{importArt,registerOutfit,traceVector,importStill}.test.ts`, `src/data/avatarRig.ts` and `src/images/journey/*.webp` join the deletion list: they exist only for the pipeline the spec deletes.
- The glow "sprite" becomes a plane in the card's group (spec §8 says sprite; the look is the same radial, now tilting with the card and never behind the rack).
- The fog radius params keep their world-unit values at a 260 px card and scale with the card's width (`proportion`), like the glow scale; the spec's numbers were written for the desktop card.
- `data-deck-mode` (`desktop` | `phone`) joins the state attributes.
- The panel gains a relayout hook (`deck:relayout` event on the track) so `camera.fov` and `layout.*` sliders act live.

## File structure

| File                                                                                                                                                                                                                                                                                                                                                                                                           | Role                                                                                                                    | Task |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---- |
| Deleted: `public/journey/scene.svg`, `art/journey/**`, `scripts/{import-art,register-outfit,build-scene,trace-vector,render-rank-stills,import-still,preview-rig,trace-mark}.mjs`, `src/data/{avatar-rig.json,avatarRig.ts,journeyArt.ts}`, `src/images/journey/*.webp`, `test/{avatarRig,buildScene,journeyArt,renderRankStills,sceneSvg,importArt,registerOutfit,traceVector,importStill,traceMark}.test.ts` | The vector pipeline.                                                                                                    | 1    |
| `src/components/journey/JourneyTimeline.astro`, `src/data/deckImages.ts`, `test/ui/JourneyTimeline.test.ts`, `test/deck.test.ts` (or the data test that exists)                                                                                                                                                                                                                                                | Deck portraits unconditionally; every rank must have one.                                                               | 1    |
| `scripts/check-bundle-size.mjs`, `test/checkBundleSize.test.ts`                                                                                                                                                                                                                                                                                                                                                | Scene row and stray-file rule go; `dist/client/journey` must not exist.                                                 | 1    |
| `package.json`, `pnpm-lock.yaml`                                                                                                                                                                                                                                                                                                                                                                               | `potrace` removed.                                                                                                      | 1    |
| `test/retired.test.ts` (new)                                                                                                                                                                                                                                                                                                                                                                                   | The deleted paths stay deleted and unreferenced.                                                                        | 1    |
| `scripts/deck-perf-stats.mjs` (new), `test/deckPerfStats.test.ts` (new), `scripts/deck-perf.mjs` (new), `package.json` (`perf:deck`)                                                                                                                                                                                                                                                                           | Frame-time measurement.                                                                                                 | 2    |
| `src/scripts/deck/deck-textures.ts`, `deck-cards.ts`, `deck-stage.ts`, `deck-pose.ts` or `deck-energy.ts` (the `bodyWanted` predicate), `index.ts`, `deck-tune.ts`, tests                                                                                                                                                                                                                                      | Lazy bodies, ready after assets, `data-deck-mode`, the relayout hook.                                                   | 3    |
| `src/scripts/deck/deck-energy.ts`, `deck-smoke-sprites.ts`, `deck-effects.ts`, `index.ts`, `deck-tune.ts`, `deck-params.ts`, tests                                                                                                                                                                                                                                                                             | Smoke gate, the halo plane, fog scaled with the card, pending rank, panel rows.                                         | 4    |
| `e2e/journey.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                          | Breakpoint crossing, the handoff-frame vram, GL-object counting on re-mount, lazy-body vram growth, ready after assets. | 5    |
| `src/scripts/deck/deck-params.ts`, the six journey baselines                                                                                                                                                                                                                                                                                                                                                   | The tuning session's values and the regenerated baselines.                                                              | 6    |
| `docs/decisions/0004-three-js-in-the-journey.md`, `docs/decisions/000{2,3}-*.md`, the deck spec, `docs/superpowers/specs/2026-09-25-vector-journey-design.md`, `docs/imagery.md`, `CLAUDE.md`, this plan                                                                                                                                                                                                       | The record.                                                                                                             | 7    |

## Interfaces

```ts
// deck-energy.ts (Task 3 and 4 additions)
export function bodyWanted(index: number, active: number, pull: number): boolean; // |index − active| ≤ 1 or pull > 0
export function smokeActive(phase: CardPhase): boolean;                        // "landing" | "presented"
export function fogFor(kind, energy, kick, cardWPx, params?): FogLevel;         // radius now × proportion(cardWPx)

// deck-textures.ts (Task 3)
placeholder(): Texture;            // one shared 4 × 4 carbon texture, sRGB, no mipmaps, counted once
hasBody(index: number): boolean;   // painted yet?

// deck-cards.ts (Task 3)
CardMeshes gains `bodyMat: MeshPhysicalMaterial` (or the type `laminated` returns), so the stage can assign the painted map.

// deck-stage.ts (Task 3)
StageState gains `mode: DeckMode`; the track dispatches/receives `deck:relayout`.

// scripts/deck-perf-stats.mjs (Task 2)
export function percentile(sortedMs: number[], p: number): number;
export function frameStats(timestamps: number[]): { frames: number; p50: number; p95: number; long: number; max: number };
```

---

### Task 1: Retire the vector pipeline

**Files:** as the File structure table's first five rows.

- [ ] **Step 1: Failing tests first.**
  1. `test/retired.test.ts` (new):
     ```ts
     import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
     import { join } from "node:path";
     import { describe, expect, it } from "vitest";

     const GONE = [
       "public/journey/scene.svg",
       "art/journey",
       "scripts/import-art.mjs",
       "scripts/register-outfit.mjs",
       "scripts/build-scene.mjs",
       "scripts/trace-vector.mjs",
       "scripts/trace-mark.mjs",
       "scripts/render-rank-stills.mjs",
       "scripts/import-still.mjs",
       "scripts/preview-rig.mjs",
       "src/data/avatar-rig.json",
       "src/data/avatarRig.ts",
       "src/data/journeyArt.ts",
       "src/images/journey",
     ];
     const NAMES =
       /scene\.svg|art\/journey|build-scene|trace-vector|trace-mark|render-rank-stills|import-still|import-art|register-outfit|preview-rig|avatar-rig|avatarRig|journeyArt|stageArt|potrace/;

     function walk(dir: string, out: string[] = []): string[] {
       for (const name of readdirSync(dir)) {
         const p = join(dir, name);
         if (statSync(p).isDirectory()) walk(p, out);
         else out.push(p);
       }
       return out;
     }

     describe("the vector journey pipeline stays retired (deck spec §14)", () => {
       it("keeps every deleted path deleted", () => {
         for (const p of GONE) expect(existsSync(p), p).toBe(false);
       });
       it("names none of it from code, scripts, tests or e2e", () => {
         const files = ["src", "scripts", "test", "e2e"].flatMap((d) => walk(d));
         for (const f of files) {
           if (f === "test/retired.test.ts") continue;
           expect(readFileSync(f, "utf8")).not.toMatch(NAMES);
         }
       });
       it("no longer depends on potrace", () => {
         const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
           devDependencies?: Record<string, string>;
           dependencies?: Record<string, string>;
         };
         expect(pkg.devDependencies?.potrace).toBeUndefined();
         expect(pkg.dependencies?.potrace).toBeUndefined();
       });
     });
     ```
  2. `test/ui/JourneyTimeline.test.ts`: replace the two `stageArt` assertions with `deckArtById[id]!.subject` unconditionally; drop the `stageArt` import; rename the last test "uses the deck portrait and its subject for every rank".
  3. The deck data test (find it: the one asserting every rank has outfit, eyes, expression, posture, alt and a band, from Plan 1): add `it("has a portrait and a glow mask for every rank", …)` asserting `deckPortrait(id)` and `deckGlow(id)` are defined for every `career` id.
  4. `test/checkBundleSize.test.ts`: delete the `withScene` helper and its call sites (the fakes no longer write `dist/client/journey/scene.svg`); the "stray journey file" test becomes "fails when dist/client/journey exists at all" (a fake dist with `dist/client/journey/anything.svg` fails with `FAIL journey directory should not exist`); the row-name tests no longer expect a "Journey scene" row.
- [ ] **Step 2: Run** `pnpm vitest run test/retired.test.ts test/ui/JourneyTimeline.test.ts test/checkBundleSize.test.ts` and see them fail for the right reasons (paths exist; names present; the scene row).
- [ ] **Step 3: Delete.** `git rm -r` every path in `GONE` plus the ten test files in the File structure table (`test/{avatarRig,buildScene,journeyArt,renderRankStills,sceneSvg,importArt,registerOutfit,traceVector,importStill,traceMark}.test.ts`). Then:
  - `JourneyTimeline.astro`: `const portrait = deckPortrait(stage.id); if (!portrait) throw new Error(\`No deck portrait for ${stage.id}\`); const still = portrait; const subject = deckArtById[stage.id]!.subject;`(a missing portrait is a build error now that the art is complete); drop the`stageArt` import.
  - `src/data/deckImages.ts`: the header comment loses "the timeline keeps the old still" and says a missing file fails the build in the timeline and paints the placeholder in the stage.
  - `scripts/check-bundle-size.mjs`: remove `BUDGETS.scene`, the scene row block and the comment lines that mention the scene; the stray-file block becomes `if (existsSync(journeyDir)) { console.log("FAIL journey directory should not exist: dist/client/journey"); failed = true; }`.
  - `package.json`: remove `potrace` from devDependencies; run `pnpm install` (lockfile updates; no network beyond the lockfile prune should be needed).
  - Docs in this task: `CLAUDE.md` lines that mention `art/journey`, `build-scene.mjs`, `scene.svg`, `render-rank-stills.mjs`, `import-still.mjs`, the "Journey scene" budget and "until Phase 6" (read them; rewrite the imagery bullet to name only `import-portrait.mjs` and `src/images/deck/`; the budgets bullet loses the scene line; the `pnpm size` bullet loses "and the journey scene"); `docs/superpowers/specs/2026-09-25-vector-journey-design.md` status line → `**Status:** Superseded 2026-09-26 by the journey card deck (docs/superpowers/specs/2026-09-25-journey-card-deck-design.md); the pipeline was deleted in its Plan 5.`; `docs/imagery.md`: under the two retired headings add one line each: "Its tools and sources were deleted on 2026-09-26; the last commit that holds them is `057ea73`." and, under the devil mark's entry (find it), "The tracer (`scripts/trace-mark.mjs`) was deleted with the vector pipeline; the committed SVG is the artefact."
- [ ] **Step 4: Gate** `pnpm format && pnpm lint && pnpm check && pnpm test && pnpm build && pnpm size && pnpm test:e2e` (the size output must show no scene row and no FAIL; `dist/client/journey` must not exist after the build: `ls dist/client/journey` fails).
- [ ] **Step 5: Commit** (one commit; the lockfile included):

```bash
git add -A
git commit -m "journey: the vector pipeline retires, the timeline uses the deck's portraits, potrace goes"
```

(`git add -A` is right here because the deletions are the point; confirm with `git status` that nothing unexpected is staged, especially no `.env` or `dist/`.)

---

### Task 2: `pnpm perf:deck`

**Files:** Create `scripts/deck-perf-stats.mjs`, `test/deckPerfStats.test.ts`, `scripts/deck-perf.mjs`; Modify `package.json` (`"perf:deck": "node scripts/deck-perf.mjs"`), `CLAUDE.md` Commands (one bullet).

- [ ] **Step 1: Failing tests** (`test/deckPerfStats.test.ts`):

```ts
import { describe, expect, it } from "vitest";
import { frameStats, percentile } from "../scripts/deck-perf-stats.mjs";

describe("percentile", () => {
  it("interpolates over a sorted list", () => {
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(percentile([1, 2, 3, 4], 0.95)).toBeCloseTo(3.85, 6);
    expect(percentile([7], 0.5)).toBe(7);
    expect(percentile([], 0.5)).toBe(0);
  });
});

describe("frameStats", () => {
  it("turns rAF timestamps into frame durations and reports p50, p95, long frames and the max", () => {
    const t = [0, 16, 32, 48, 120, 136]; // one 72 ms frame
    const s = frameStats(t);
    expect(s.frames).toBe(5);
    expect(s.p50).toBe(16);
    expect(s.long).toBe(1);
    expect(s.max).toBe(72);
    expect(s.p95).toBeGreaterThan(16);
  });
  it("needs at least two timestamps", () => {
    expect(frameStats([5])).toEqual({ frames: 0, p50: 0, p95: 0, long: 0, max: 0 });
  });
});
```

- [ ] **Step 2: The stats module** (`scripts/deck-perf-stats.mjs`):

```js
// Frame-time arithmetic for scripts/deck-perf.mjs (deck spec §11), kept pure so vitest can pin it.

/** Linear-interpolated percentile over an ascending list; 0 for an empty list. */
export function percentile(sortedMs, p) {
  if (sortedMs.length === 0) return 0;
  const pos = (sortedMs.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const w = pos - lo;
  return sortedMs[lo] * (1 - w) + sortedMs[hi] * w;
}

export const LONG_FRAME_MS = 50;

/** From requestAnimationFrame timestamps to durations: p50, p95, long frames (> 50 ms) and the max. */
export function frameStats(timestamps) {
  if (timestamps.length < 2) return { frames: 0, p50: 0, p95: 0, long: 0, max: 0 };
  const d = [];
  for (let i = 1; i < timestamps.length; i++) d.push(timestamps[i] - timestamps[i - 1]);
  const sorted = [...d].sort((a, b) => a - b);
  return {
    frames: d.length,
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    long: d.filter((x) => x > LONG_FRAME_MS).length,
    max: sorted[sorted.length - 1],
  };
}
```

- [ ] **Step 3: The script** (`scripts/deck-perf.mjs`), mirroring `scripts/build-og.mjs`'s server launch (read it for the exact spawn/poll pattern):

```js
// pnpm perf:deck (deck spec §11): scrolls the journey track at a fixed speed through the production
// build, twice (cold, then warm), and prints frame-time percentiles, long frames and the texture
// estimate. Local only: CI has no GPU worth measuring. Headed by default so the real GPU renders;
// --headless for a quick smoke run. Exit 1 when p95 > 16.7 ms or any frame > 50 ms on the warm pass.
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";
import { frameStats, LONG_FRAME_MS } from "./deck-perf-stats.mjs";

const PORT = 4395;
const SPEED_PX_S = 900; // a brisk read of the journey: about 8 s end to end at 1440 × 900
const HEADLESS = process.argv.includes("--headless");
const P95_BUDGET_MS = 16.7;

const server = spawn("node", ["./dist/server/entry.mjs"], {
  env: {
    ...process.env,
    HOST: "127.0.0.1",
    PORT: String(PORT),
    SENDGRID_API_KEY: "unused",
    CONTACT_DRY_RUN: "true",
  },
  stdio: "ignore",
});
try {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/healthz`);
      if (r.ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  const browser = await chromium.launch({ headless: HEADLESS });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "networkidle" });

  /** Scrolls the track top to bottom at SPEED_PX_S from inside the page, collecting rAF timestamps. */
  const pass = async (label) => {
    const result = await page.evaluate(
      ({ speed }) =>
        new Promise((resolve) => {
          const el = document.querySelector("[data-deck]");
          const top = el.getBoundingClientRect().top + scrollY - 64;
          const end = top + el.offsetHeight - innerHeight + 64;
          scrollTo({ top, behavior: "instant" });
          const stamps = [];
          let last = performance.now();
          let y = top;
          const tick = (now) => {
            stamps.push(now);
            y += ((now - last) / 1000) * speed;
            last = now;
            scrollTo({ top: Math.min(y, end), behavior: "instant" });
            if (y < end) requestAnimationFrame(tick);
            else
              resolve({
                stamps,
                vram: el.dataset.deckVram ?? "?",
                tier: el.dataset.deckTier ?? "?",
              });
          };
          requestAnimationFrame(tick);
        }),
      { speed: SPEED_PX_S },
    );
    const s = frameStats(result.stamps);
    console.log(
      `${label}: ${s.frames} frames at ${SPEED_PX_S} px/s · p50 ${s.p50.toFixed(1)} ms · p95 ${s.p95.toFixed(1)} ms · max ${s.max.toFixed(1)} ms · ${s.long} over ${LONG_FRAME_MS} ms · vram ${result.vram} MB · tier ${result.tier}`,
    );
    return s;
  };
  await page.waitForSelector("[data-deck][data-deck-ready]", { timeout: 20000 });
  await pass("cold");
  await page.waitForTimeout(1000);
  const warm = await pass("warm");
  await browser.close();
  const over = warm.p95 > P95_BUDGET_MS || warm.long > 0;
  console.log(
    over
      ? `over budget: p95 ≤ ${P95_BUDGET_MS} ms and no long frames on the warm pass`
      : "within budget",
  );
  process.exitCode = over ? 1 : 0;
} finally {
  server.kill("SIGTERM");
}
```

The header offset `64` is `HEADER_PX`; the script cannot import from `e2e/constants.ts` (TypeScript) so it repeats the number with a comment. Before `waitForSelector("[data-deck][data-deck-ready]")`, scroll the track's top into view (the deck mounts only once the journey is on screen, so `data-deck-ready` never appears at the top of the page) and wait for `data-deck-phase` to read `presented` at E, then run the two passes; check the spawned server is still alive after the port answers, and exit 2 on a harness failure so it is distinct from an over-budget exit 1. Add to `package.json` scripts: `"perf:deck": "node scripts/deck-perf.mjs"`. CLAUDE.md Commands: `- \`pnpm perf:deck\` scrolls the journey through the production build in Chromium (headed; \`--headless\` for a smoke run) and prints p50, p95, long frames and \`data-deck-vram\`; local only, after \`pnpm build\`.`

- [ ] **Step 4: Run** `pnpm vitest run test/deckPerfStats.test.ts` (pass), then `pnpm build && pnpm perf:deck --headless` once and paste its two lines into the report (headless numbers are indicative only; the controller runs it headed).
- [ ] **Step 5: Gate and commit**

```bash
pnpm format && pnpm lint && pnpm check && pnpm test
git add scripts/deck-perf-stats.mjs scripts/deck-perf.mjs test/deckPerfStats.test.ts package.json CLAUDE.md
git commit -m "perf: pnpm perf:deck scrolls the deck and prints its frame times"
```

---

### Task 3: Bodies painted when wanted, ready after the assets, the mode attribute, the panel's relayout hook

**Files:** Modify `src/scripts/deck/deck-energy.ts` (`bodyWanted`), `test/deckEnergy.test.ts`, `deck-textures.ts` (`placeholder()`, `hasBody()`), `test/deckTextures.test.ts` (if it exists; else the textures are covered through the stage), `deck-cards.ts` (`bodyMat` on `CardMeshes`; placeholder map at build), `deck-stage.ts` (paint on demand; ready after assets; `mode` in state; the `deck:relayout` listener), `index.ts` (`data-deck-mode`, `fallback()`), `deck-tune.ts` (dispatch `deck:relayout` for `camera.*` and `layout.*` rows).

- [ ] **Step 1: Failing unit tests.** In `test/deckEnergy.test.ts`:

```ts
describe("bodyWanted", () => {
  it("wants the active card, its neighbours and any card being pulled", () => {
    expect(bodyWanted(3, 3, 0)).toBe(true);
    expect(bodyWanted(2, 3, 0)).toBe(true);
    expect(bodyWanted(4, 3, 0)).toBe(true);
    expect(bodyWanted(5, 3, 0)).toBe(false);
    expect(bodyWanted(6, 3, 0.2)).toBe(true);
    expect(bodyWanted(0, 6, 0)).toBe(false);
  });
});
```

and in `deck-energy.ts`: `export const bodyWanted = (index: number, active: number, pull: number): boolean => Math.abs(index - active) <= 1 || pull > 0;` with a JSDoc citing spec §9 ("painted lazily when the card comes within one rank of the active one").

- [ ] **Step 2: Textures.** In `DeckTextures` add `placeholder(): Texture` (created once: a 4 × 4 canvas filled with `COLORS.carbon`, `colorSpace = SRGBColorSpace`, `generateMipmaps = false`, counted once in `estimateBytes`, disposed with the rest) and `hasBody(index)` (true once `body(index)` has painted). Keep `body(index)` as it is.
- [ ] **Step 3: Cards.** In `buildCards`, `laminated(textures.placeholder(), envMap, energetic, params)` instead of `textures.body(i)`; return `bodyMat` in `CardMeshes`. Read `laminated` to see every slot it fills from the map (`map`, and `emissiveMap` if the emissive recipe uses it): the stage must later assign the painted texture to the same slots. Because the placeholder and the body share `colorSpace` and presence, swapping the texture object recompiles nothing (Three's program key depends on the map's presence and channel, not its identity); state this in a comment.
- [ ] **Step 4: Stage.** In `frame()`, after the pose is computed and before the effects update: for each card `i` with `!textures.hasBody(i) && bodyWanted(i, pose.active, pose.cards[i]?.pull ?? 0)`, assign `meshes[i].bodyMat.map = textures.body(i)` (and the other slot(s)); no `needsUpdate` is required for a texture swap; `requestRender()` is implicit (we are in a frame). Under `freeze`, paint every wanted card before the single frame (the same rule applies; the frozen frame at a rank stop wants three cards). The `ready` promise in live mode now resolves on the first frame rendered after `assets` has settled (keep the freeze behaviour; keep `assetsSettled` semantics; a `let assetsReady = false; void assets.then(() => { assetsReady = true; requestRender(); })` and `readyDone = readyDone || assetsReady` in the place `ready` resolves). `StageState` gains `mode: DeckMode` (from `layout.mode`), emitted with the rest. Add `stage.addEventListener("deck:relayout", scheduleRelayout)` (the stage element; remove in `dispose`). Spec §9's "textures capped at 1040 × 1456" and the 10 % hysteresis are unchanged.
- [ ] **Step 4b: Two Plan 5 leftovers in the same files.** (1) The stage fetches an aura image only for cards whose kind shows one (`kinds[i]` is `"s"` or `"splus"`, as the effects already gate the plane); the E–A `data-aura` URLs stay in the DOM but are never requested (an e2e in Task 5 pins it). (2) The faded glow and aura textures are baked when their images load; make the effects re-bake them when `aura.fadeFrom` or `aura.fadeTo` differ from the values they were baked with (compare per frame, repaint the seven canvases at most once per change), and clamp `fadeTo` to at least `fadeFrom + 0.02` where `paintMaskFaded` is called, so the panel's ranges can never invert the fade; add a params test that `aura.fadeFrom < aura.fadeTo`.
- [ ] **Step 5: Page script and panel.** `index.ts`: `track.dataset.deckMode = state.mode;` in `onState`; `delete track.dataset.deckMode` in `fallback()`. `deck-tune.ts`: in the row's `input` handler, after `write(path, …)`, `if (path.startsWith("camera.") || path.startsWith("layout.")) track.querySelector(".journey__stage")?.dispatchEvent(new Event("deck:relayout"));` (the aura fade rows need no event: the effects notice the change per frame).
- [ ] **Step 6: Gate** `pnpm format && pnpm lint && pnpm check && pnpm test && pnpm build && pnpm size && pnpm test:e2e` (the vram values in the e2e drop at E: the existing assertions are ceilings, so they hold; `pnpm test:visual` twice: the frozen frames at E, S and S+ paint the three wanted bodies, so the baselines must be unchanged; if a frame differs, stop and report NEEDS_CONTEXT with the diff path).
- [ ] **Step 7: Commit**

```bash
git add src/scripts/deck/deck-energy.ts src/scripts/deck/deck-textures.ts src/scripts/deck/deck-cards.ts src/scripts/deck/deck-stage.ts src/scripts/deck/index.ts src/scripts/deck/deck-tune.ts test/deckEnergy.test.ts
git commit -m "deck: bodies paint when a card is within a rank, ready waits for the assets, the mode is an attribute, the panel can relayout"
```

---

### Task 4: Plan 5's leftovers — the dead params, quick double swipes, an eased aura, the disc dilate, the panel rows

> Re-scoped 2026-09-27. The smoke gate, the halo and the fog scaling landed in Plan 5 (the halo is gone: the aura plane replaced it). What remains are the items Plan 5 parked.

**Files:** Modify `src/scripts/deck/deck-params.ts` (drop `intro.floorMs` and `pull.handoffStart`; add `aura.tauMs`), `test/deckParams.test.ts` (the pins), `test/deckPose.test.ts` (fixtures restated), `src/scripts/deck/index.ts` (pending rank), `src/scripts/deck/deck-energy.ts` (`easeToward`), `test/deckEnergy.test.ts`, `src/scripts/deck/deck-effects.ts` (the eased aura), `scripts/aura-mask.mjs` (disc dilate), `test/auraMask.test.ts`, `src/images/deck/*-aura.webp` (regenerated), `src/scripts/deck/deck-tune.ts` (rows; `ROWS` exported), `test/deckTune.test.ts` (new), the S/S+ and mid-transition baselines if they change.

- [ ] **Step 1: The dead params.** Delete `intro.floorMs` and `pull.handoffStart` from `DeckParams` and `DECK_PARAMS`, and their pins in `test/deckParams.test.ts`. `test/deckPose.test.ts` still builds its `Pulls` through a `pullsAt`/`HANDOFF` adapter that mimics the retired scroll fraction: restate those fixtures as `transition(from, to, k)` (a `Pulls` with `pull[from] = 1 − easeInOutCubic(k)`, `pull[to] = easeInOutCubic(k)`, `active = k < 0.5 ? from : to`, `within = 0`, `fromWithin = 0`) and `settled(rank, within)`. The expected numbers in those tests do not change; only how the inputs are written.
- [ ] **Step 2: Quick double swipes.** In `index.ts`, `let pendingRank: number | null = null;` a swipe or a peeking-card tap computes its target from `pendingRank ?? presented`, clamps it to `[0, count − 1]`, sets `pendingRank` to it and calls `jump`; `onState` clears `pendingRank` when the reported rank equals it. Two swipes inside one transition's first half then move two ranks. Unit-test the pure part if it is extracted (a `nextRank(presented, pending, dir, count)` in `deck-gestures.ts` is the natural home); Task 5 pins it end-to-end on the Pixel.
- [ ] **Step 3: An eased aura.** Plan 5's final review measured the S+ aura stepping about 0.3 in one frame at the landing blend. Add `aura.tauMs: 120` to the params and a pure `easeToward(applied, target, dtMs, tauMs): number` in `deck-energy.ts` (`applied + (target − applied) × (1 − exp(−dtMs / tauMs))`, `tauMs ≤ 0` returns `target`). The effects keep each aura plane's applied opacity and ease it toward `auraOpacity(...) × gain` every frame; under `freeze` the applied value is the target (the stills stay deterministic). Tests: `easeToward` at dt = τ moves 63.2 % of the way; a 60 Hz sweep through the S→S+ and S+→S handoffs and an A→S+ jump (the real `stepDrive`/`pullsForDrive`/`energyFor`/`auraOpacity` chain plus `easeToward`) changes the applied aura by less than 0.05 per frame.
- [ ] **Step 4: The disc dilate.** `dilate` in `scripts/aura-mask.mjs` is a square dilation (diagonals get √2 × the rim) while its doc says disc. Make it a disc (`dx² + dy² ≤ r²`, one pass over the figure's boundary pixels or a stamped disc), test it (a lone pixel dilated by 4 lights the 4-neighbour at distance 4 and not the diagonal at distance 4√2), run `node scripts/aura-mask.mjs --all`, and check the committed-mask test's bounds still hold (the means fall slightly).
- [ ] **Step 5: The panel rows.** Export `ROWS` from `deck-tune.ts` and append rows for leaves that exist in `deck-params.ts` today: `["aura τ (ms)", "aura.tauMs", 0, 600, 10]`, `["light ambient", "light.ambient", 0, 1, 0.01]`, `["light key", "light.key", 0, 5, 0.05]`, `["light rim", "light.rim", 0, 3, 0.05]`, `["fog strength S", "fog.strengthS", 0, 0.5, 0.01]`, `["fog radius S", "fog.radiusS", 0, 4, 0.05]`, `["fog radius S+ base", "fog.radiusSPlusBase", 0, 4, 0.05]`, `["smoke opacity min", "smoke.opacityMin", 0, 0.5, 0.01]`, `["smoke burst S", "smoke.burstS", 0, 60, 1]`, `["smoke burst S+", "smoke.burstSPlus", 0, 120, 1]`, `["orientation gain", "gestures.orientationGain", 0, 2, 0.05]`, `["seam S max", "seam.sMax", 0, 1, 0.01]`, `["clearcoat", "material.clearcoat", 0, 1, 0.05]`, `["env intensity", "material.envMapIntensity", 0, 2, 0.05]`, `["card max height", "layout.cardHMax", 320, 800, 10]`, `["energy pulling", "energy.pulling", 0, 0.5, 0.01]`. Material rows act on the next material refresh (say so in a comment beside them). New `test/deckTune.test.ts`: every `ROWS` path resolves to a finite number in `DECK_PARAMS`, `min < max`, `step > 0`, and the default lies within `[min, max]`.
- [ ] **Step 6: Gate** `pnpm format && pnpm lint && pnpm check && pnpm test && pnpm build && pnpm size && pnpm test:e2e && pnpm test:visual`. E must not change. If the disc dilate or the eased aura moves the S, S+ or mid-transition baselines, regenerate those (`pnpm test:visual --update-snapshots`, then once plain), look at each new PNG, and commit them in this task (Task 6 is void).
- [ ] **Step 7: Commit**

```bash
git add src/scripts/deck/deck-params.ts src/scripts/deck/deck-energy.ts src/scripts/deck/deck-effects.ts src/scripts/deck/index.ts src/scripts/deck/deck-gestures.ts src/scripts/deck/deck-tune.ts scripts/aura-mask.mjs src/images/deck test/deckParams.test.ts test/deckPose.test.ts test/deckEnergy.test.ts test/deckGestures.test.ts test/auraMask.test.ts test/deckTune.test.ts e2e/__screenshots__
git commit -m "deck: the dead params go, quick swipes queue, the aura eases, the dilate is a disc, the panel reaches every tunable"
```

---

### Task 5: E2E for Plans 5's changes and the leaks

**Files:** Modify `e2e/journey.spec.ts`.

- [ ] **Step 1: Tests** (desktop project unless noted):
  1. **The breakpoint crossing:** at 1440 wide, `data-deck-mode` is "desktop"; `page.setViewportSize({ width: 900, height: 900 })`, wait for `data-deck-mode` "phone" (the debounce is 150 ms; `expect` polls), `data-deck-ready` stays; back to 1440 → "desktop"; no page error.
  2. **Bodies paint when wanted:** on `/`, at rank E read `data-deck-vram` (settled); at rank A (index 4) it is larger; at the end of S+ larger still and ≤ 80; a fast rail jump from E to S+ (`page.click` on the S+ rail button) lands with `data-deck-phase` "presented" and no page error.
  3. **Ready waits for the assets:** collect requests; after `data-deck-ready` appears on `/` at rank E, every `data-portrait-*` URL the rail's first button carries has been requested (the E portrait at least; assert the presented rank's rendition is in the request list).
  4. **Only S and S+ fetch an aura** (Task 3's gate): collect requests on `/` through E → A; no `-aura` URL is requested; at S one is.
  5. **Two quick swipes move two ranks** (`pixel-7`, Task 4's pending rank): from C, two `touchDrag` swipes 250 ms apart; the recorded ranks are `["B", "A"]` and the deck settles at A.
  6. **GL objects on re-mount:** `addInitScript` that wraps `WebGL2RenderingContext.prototype.createTexture/deleteTexture/createBuffer/deleteBuffer/createFramebuffer/deleteFramebuffer/createRenderbuffer/deleteRenderbuffer/createProgram/deleteProgram` to keep live counts on `window.__gl` (`{ textures, buffers, framebuffers, renderbuffers, programs }`); mount at S+ on high (the existing re-mount test's flow), read the counts, scroll away 31 s (`data-deck-ready` gone), assert every live count is ≤ its pre-mount value (the page's other WebGL use is nil; the counts should return to 0 or the pre-mount baseline), re-mount and assert the counts equal the first mount's within ±2.
  7. Phone (`pixel-7`): at the end of S+ `data-deck-vram` ≤ 40 still holds with the lazy bodies (should drop); record the number.
  8. The frozen URL at the mid-transition test reuses the `FROZEN` constant (Plan 5 parked it).
- [ ] **Step 2: Run** the desktop and pixel-7 projects while iterating, then the full `pnpm build && pnpm test:e2e`. Do not edit `src/`; a failure that needs a code change is NEEDS_CONTEXT with the observed values.
- [ ] **Step 3: Commit**

```bash
git add e2e/journey.spec.ts
git commit -m "e2e: the breakpoint crossing, lazy bodies, ready after assets, the aura fetch gate, double swipes, GL objects across a re-mount"
```

---

### Task 6: The tuning session — void (2026-09-27)

The session ran in Plan 5 (its Task 7): the panel under `?tune` carries rows for the drive, the aura, the fade band, the glow gain, the bloom, the fog and the smoke, and the baselines were regenerated there. Marcus tunes from the panel on his own time and sends the JSON; the values land as a values-only commit outside this plan. The protocol below is kept for that occasion and is not dispatched.

Protocol:

1. The controller builds the branch and runs the dev server from the worktree on port 4396 (`pnpm dev --port 4396`), so `http://localhost:4396/?tune` shows the panel; Marcus opens it on his Mac (and, optionally, `http://<mac-ip>:4396/?tune` on his phone for the phone knobs) and tunes. Decisions on the table, each with the controller's candidate: the S halo (`glow.scaleS` 4.2 → about 6.5), the S+ point light (`light.pointSPlus` 55 → about 20; `LIGHT_AHEAD` is a constant, so only the intensity moves), the fog on phones (now scaled with the card: check `fog.strengthSPlus`/`radiusSPlusRamp` at 390), the smoke pool at S+ (`smoke.rateSPlusBase/Ramp` against the 140 pool; or shorter lives, a constant), the orientation gain (0.5), the contact shadow (keep / drop with `shadow.opacity 0` / a sheen, which would be a Plan 6 item), the two-tier glow gain (keep or revert to mid only, a constant), the bloom (0.45 / 0.5 / 0.5) and the coat's brightness at S+, the peeking card's violet back at S on phones.
2. Marcus clicks "copy JSON" and pastes it; the controller diffs against the defaults, applies the changed values to `deck-params.ts` with a comment naming the session date, pins any changed default the params test asserts, and regenerates the six baselines (`pnpm build && pnpm test:visual --update-snapshots`, then twice plain).
3. The controller records the session (values, reasons) in this plan's Execution notes.
4. Gate: `pnpm format && pnpm lint && pnpm check && pnpm test && pnpm build && pnpm size && pnpm test:e2e && pnpm test:visual`. Commit: `deck: the tuning session's values and the baselines that show them`.

If Marcus prefers to choose from screenshots, the controller renders A/B/C frames per knob at 1440 and 390 with the tuning script and he picks.

---

### Task 7: The record

**Files:** Modify `docs/decisions/0004-three-js-in-the-journey.md` (an "Implementation notes (2026-09-27)" section: the bloom is one half-resolution glow pass added over the canvas, not a composer mix; the smoke is a pool of additive sprites; the drive selects the rank from the scroll with hysteresis and plays one fixed-duration transition; the aura is a violet plane per S/S+ card masked by a band around a matted silhouette (`art/deck/`), not a sprite; a moving card and its overlays share one render band in the transparent list; the text slots paint on CPU canvases; the track's span is in `lvh`; the touch gestures and `deviceorientation` after a tap; the glow gain on both tiers; `pnpm tear:deck` and `pnpm perf:deck` as the local tools), `docs/decisions/0002-*.md` and `0003-*.md` (an `**Amended by:** [0004](…)` line under their status), the deck spec (status line: "All phases implemented 2026-09-27"; §9's memory estimate re-measured after lazy bodies at 1440 × 900 dpr 2 and 2560 × 1440 dpr 2 from the e2e/perf numbers; §14's "Deleted in Phase 6" gains "(done 2026-09-27)"; §11's perf row gains "(`pnpm perf:deck`, measured <p50/p95> on the dev Mac)"), `CLAUDE.md` (banner: "**Journey card deck done**" already reads so after Plan 5 — its last clause becomes "Next is rebuild Phase 7 (container, HAProxy, VPS runbook, release pipeline), on hold until Marcus says development is done"; the Journey bullets already current; `pnpm perf:deck` in Commands from Task 2; the budgets list's texture line unchanged), `docs/imagery.md` (the retired sections' deletion lines from Task 1 are already there; add nothing about tuning values), this plan (Execution notes).

- [ ] **Step 1: Edits** as listed, with the Edit tool after `pnpm format` reflows.
- [ ] **Step 2: Full gate** `pnpm format && pnpm lint && pnpm check && pnpm test && pnpm build && pnpm size && pnpm test:e2e && pnpm test:visual`.
- [ ] **Step 3: Commit** `docs: the deck is done — ADR 0004's implementation notes, the spec's status, CLAUDE.md and the imagery record`.
- [ ] **Step 4: Hand back.** The controller runs `pnpm perf:deck` headed (the numbers go into the spec and the Build Log), the browser check at 1440 and 390 (screenshots for Marcus), writes the Build Log, fast-forwards local main, pushes the branch.

## Self-review

- **Spec coverage.** §15 item 6: tuning (Task 6), `perf:deck` (Task 2), delete the pipeline (Task 1), size rows (Task 1), ADR 0004 (Task 7), CLAUDE.md (Tasks 1, 2, 7), timeline portraits (Task 1), visual baselines (Task 6), `docs/imagery.md` (Tasks 1, 7), Build Log (controller). §9 lazy bodies and ready after assets (Task 3). §5 smoke on Presented (Task 4). §14 deletions plus the vector spec's Superseded line (Task 1). Deferred items from Plans 2–4: lazy bodies, ready gating, fov from the panel, smoke while pulling, the halo's depth edge, the fog on phones, the smoke pool (tuning), the S+ hotspot (tuning), the 2560 handoff frame, GL-object counting, the breakpoint crossing, double swipes, `data-deck-mode`, the contact shadow and the two-tier gain (Marcus, Task 6). Not in this plan: the `svh` question and the iOS prompt (a real device), the steel footer (the card's footer is steel per spec; the DOM counter is ash by design), the mid gain on bloom failure (moot since the gain is universal).
- **Placeholders.** None; every code step carries its code or exact edit; Task 6 is a protocol by design.
- **Type consistency.** `bodyWanted(index, active, pull)`, `smokeActive(phase)`, `fogFor(kind, energy, kick, cardWPx, params?)`, `frameStats`/`percentile`, `CardMeshes.bodyMat`, `StageState.mode`, `data-deck-mode`, the `deck:relayout` event on `.journey__stage`.
- **Review Focus.** 1 → Tasks 3 and 5; 2 → Tasks 4 and 6; 3 → Task 4 and the browser check; 4 → Task 1; 5 → Task 2.
- **Risk.** Task 1's staging must be inspected (it excludes `docs/superpowers/plans/`). Task 3's texture swap without `needsUpdate` relies on Three's program key ignoring texture identity; the reviewer confirms against `WebGLPrograms.js`. Task 4's eased aura must stay deterministic under `?deck-freeze` (the applied value equals the target there) or the stills drift. Task 4's disc dilate moves the S/S+ baselines slightly; they regenerate in that task and are inspected.

## Execution notes (2026-09-27)

Executed by subagent-driven development on `journey-card-deck` from the plan commit `85ed5e6`, cut short at Marcus's request after Task 4. Commits: `0035d84` Task 1 (the pipeline retired: 45 files deleted, `potrace` pruned, the timeline on the deck's portraits, the size gate's scene row gone; reviewed, no findings); `b7bc1e8` Task 2 (`pnpm perf:deck`, port 4395, exit 2 for harness failure; reviewed, no findings); `0856d1b` Task 3 (bodies paint when wanted — `bodyWanted(index, active, pull, to)` also wants the transition target's neighbours, the emissive map is the slot `laminated` fills; `ready` after the assets; `data-deck-mode`; `deck:relayout` with a live fov; auras fetched for S and S+ only; the faded textures re-bake when the fade band moves, `fadeTo` clamped above `fadeFrom`; vram at E 22.9 → 18.0 MB on desktop, 28.1 → 18.7 on the Pixel; textures cap raised to 340); `1e80e5d` Task 4 (`intro.floorMs` and `pull.handoffStart` gone, pose fixtures restated as transitions; quick swipes queue through a pending rank; the aura eases with `aura.tauMs` 120 — the worst per-frame step is now 0.063, not the 0.05 asked, because `energyFor`'s landing factor is ten times steeper over the last tenth of the pull; the dilate is a disc and the seven masks regenerated; sixteen more panel rows with a test that every row resolves); `415516a` (Task 3's review found the desktop deal-in showing unpainted fronts for a few frames — desktop now paints every body during the intro).

**Not done, on purpose:** Task 5 (the breakpoint, lazy-body, aura-fetch, double-swipe and GL-object e2e), Task 7's ADR 0004 implementation notes, the whole-branch review and the headed `pnpm perf:deck` run. Also parked: Task 3's minors (a sliver of E's front on desktop stages under about 480 px tall after a deep mount; stale e2e comments at journey.spec.ts:61–63 and around the re-mount vram test; the placeholder's filter untested); the aura's 0.063 step (a longer τ or a gentler landing factor); the tear harness's single-block flags on clean frames; smoke hidden behind a moving card. Marcus tests the branch himself and tunes from `?tune`.
