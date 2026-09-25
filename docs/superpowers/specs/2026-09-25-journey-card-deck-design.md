# Journey card deck — design

- **Date:** 2026-09-25
- **Status:** Approved in brainstorm, pending Marcus's review of this file
- **Supersedes:** `2026-09-25-vector-journey-design.md` (the traced SVG scene) and the journey
  parts of `2026-09-24-hero-journey-redesign-design.md`
- **Decisions this creates:** ADR 0004 (Three.js, lighting, glow and smoke inside the journey)

## 1. Goal

Replace the journey's full-bleed scroll scene with a deck of seven player cards, one per rank E → S+.
The cards stand as a rack of card backs; scrolling pulls the card for the current rank out of the
rack, flips it face-up and presents it with its stats. The S card glows, the S+ card's power leaks
out as violet smoke that the card cannot contain. Visitors can also jump to a rank directly.

This is meant to be the most memorable thing on the site. The audience is still employers first,
clients second, so every card's text is the resume: title, org, dates, tenure, a one-line summary,
the skills of that stage and one quote.

Inspiration Marcus supplied: Sung Jin-Woo's seven power levels (weakest → the System → rapid growth
→ awakening → S-rank → full power → final form), which map one-to-one onto the seven career stages;
the Union Arena trading-card layout (cost badge, name plate, ability box, BP stat, set number,
filigree frame); and the seven-panel eyes-progression image. The character is original (see §9).

## 2. Decisions made in the brainstorm

| Topic         | Decision                                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Character     | A new original character, more detailed than the traced one. Never a likeness of any existing character.                  |
| Eye ramp      | Violet only: brown → grey glint → steel → violet rim → violet iris → glowing violet → white-violet breaking out. No blue. |
| Card layout   | Portrait window on top, System-style status window below. The quote sits in the portrait window, right-aligned.           |
| Desktop stage | "The shelf": a rack of card backs on the left, the presented card on the right, in a 78 % column.                         |
| Phone stage   | "Deck behind": the card takes the stage; the next card peeks in edge-on from the right, played cards exit left.           |
| At rest       | Racked cards show their backs. Text exists only on a presented card, and prints in on landing.                            |
| 3D            | Card thickness, hover tilt, layered depth and a back face during the flip are all in.                                     |
| Renderer      | Full Three.js: cards are lit meshes, faces are painted textures. Three.js is now allowed inside the journey (ADR 0004).   |
| Energy        | Violet smoke that seeps from the card edges, not point particles. Breathes at S, unleashed at S+.                         |
| `acquired`    | The stage's skills as listed in career.ts, capped at eight with a "+N" tag.                                               |
| Quotes        | A new `log` field per stage, drafted by Claude from the highlights (§4), approved by Marcus.                              |
| Old scene     | Retired fully: sources, scripts, modules and tests deleted; git history keeps them.                                       |

## 3. Structure and components

The section keeps its place on the home page between Work and About.

- `src/pages/index.astro`: the `Section` keeps its `~/journey` `Prompt`, the h2 "From E-rank to S+
  rank" and the lede in the content column. The stage no longer uses the `bleed` slot; it renders
  inside a `.deck` column that is `width: 78%; margin-inline: auto` from 60rem and the full content
  width below.
- `src/components/journey/Journey.astro` renders the stage:
  - `[data-deck]`, the pinned sticky box (height `7 × 70dvh + 100dvh` track, as today), containing
    the `<canvas data-deck-gl>` host, a CSS-painted placeholder rack (seven 1 px iron slivers) that
    shows until the stage script mounts, the rank rail and the counter.
  - The rail: an `<ol>` of seven `<button>`s, each wrapping a `RankChip sm`, with `aria-pressed` on
    the presented rank and a line that fills in ember with `--progress`. Clicking or pressing Enter
    scrolls the page to that rank's position in the track (`scrollTo` with smooth behaviour; instant
    under reduced motion).
  - The counter: `06 / 07`, `aria-hidden`; the accessible state lives in the twin below.
  - The accessible twin: a visually hidden `<ol>` of the seven cards with their full text (the same
    fields the canvas paints), and a visually hidden `<p aria-live="polite">` that announces
    "Rank S, Linux Engineer, Caris Life Sciences" when the presented card changes.
- `src/components/journey/JourneyTimeline.astro` stays as the no-JS, no-WebGL and reduced-motion
  view, with the seven portraits (`Still`, alt "Illustration: …") in place of the rank stills, and
  gains the `log` quote under each entry.
- `RankChip.astro` is unchanged.

Deleted: the `[data-scene]` box, the inline silhouette, the stacked `Panel case` cards and the rank
rail's scene coupling.

## 4. Data

`src/data/career.ts`:

- `CareerStage` gains `log: string`: one line, first person or terse, under 80 characters, drawn
  from that stage's highlights. Draft values (Marcus edits freely):

  | Rank | `log`                                                               |
  | ---- | ------------------------------------------------------------------- |
  | E    | Traced lost mail through Splunk on live customer servers.           |
  | D    | Turned non-technical customers into confident site owners.          |
  | C    | Moved websites and mailboxes between servers, providers and brands. |
  | B    | Closed the cases the other tiers couldn't.                          |
  | A    | Kept a fleet of customer servers patched, hardened and running.     |
  | S    | Replaced manual server setup with repeatable automation.            |
  | S+   | 99.99 % uptime, two datacenters, BGP failover.                      |

- New helpers, unit-tested: `tenure(stage, now)` → "3 months", "19 months", "4 years, 10 months"
  (months under 24 stay in months); `setNumber(stage)` → `EVL-06/07`; `acquired(stage, cap = 8)` →
  the first `cap` skills plus `"+N"` when more remain.
- `activity` and `printHighlights` stay (the resume and JSON-LD still use them).

The resume PDF fingerprint covers career.ts, so adding `log` means `pnpm build:pdf` and committing
the PDF (the PDF does not print `log`).

## 5. The card

Aspect 5:7. Painted size 520 × 728 CSS px at 1×, rendered at the device pixel ratio (capped, §10).

**Face**

- Frame: 1 px iron border; a plotted-trace inner frame 6 px in, slate, with steel corner brackets
  top-left and bottom-right (the reference's filigree, drawn as circuit traces).
- Portrait window: the top 52 % (520 × 378 at 1×, an 11:8 box). The portrait (§9, rendered 3:2)
  fills it with cover fitting anchored top-centre, void background. Over it:
  - `RankChip` top-left. S+ uses the top variant (ember fill, void text). S carries a violet 1 px
    border (allowed by ADR 0004 only here); every other rank is the normal chip.
  - The quote: right-aligned, italic, fog `#b4b4b4`, 10/14 px at 1×, max width 42 % of the card,
    from 48 px down, with a 0 0 8px void text shadow so it reads over the art. The portrait is
    composed with its right third clear (§9), so the quote never covers the face.
  - Name plate at the window's bottom-left: title (14 px paper) and org · dates (10 px fog).
- Status window: the bottom 48 %, carbon. Lines prefixed with an ember `$` and an ash key:
  1. `$ on_arrival` — the stage summary, wrapped.
  2. `$ acquired` — up to eight `Tag`s and "+N".
  3. `$ tenure` — from `tenure()`.
  4. Footer: `EVL-0n/07` left, the rank glyph right, steel.
- Eyes: an emissive map (violet `#7040d2`, intensity per rank from the ramp) so they light under
  any lighting once the card lands.

**Back**

Carbon `#0e0e0e`, the same trace frame in `#2a2a2a`, the devil crop of `evil_logo.webp` traced to
one slate `#3a3a3a` path centred at 84 px, and "EVILIST · JOURNEY" letter-spaced in slate at the
bottom. Monochrome by design: the yellow logo stays a header-only exception (ADR 0003).

**Edges**

A 6 px slab, `#1b1b1b`, roughness 0.6, so a racked card is a real edge and the flip has a side.

**Layers and depth**

Face art, frame, status text and the chip are painted into one texture, but the chip and the frame
are also drawn as thin separate planes 0.04 and 0.014 world units in front of the face so tilt
gives parallax.

**States**

| State     | Face                                                                                          |
| --------- | --------------------------------------------------------------------------------------------- |
| Racked    | Back only visible. No text, eyes unlit.                                                       |
| Pulling   | Flipping back → face; the face texture is the "0 lines" paint (frame, art, chip, no text).    |
| Landing   | Eyes fade up over 500 ms; lines 1–5 (name plate, on_arrival, acquired, tenure, footer) appear |
|           | one every 110 ms, the last with a blinking ember cursor for as long as the card is presented. |
| Presented | Full sheet. S: glow. S+: glow and smoke, growing with progress through the rank.              |
| Leaving   | Text drops to "0 lines" in one step as the flip starts; eyes fade down.                       |

Textures are painted per card per line-count (0–5) and cached, so the print-in costs at most six
paints per card, once.

## 6. Motion

**Pose model** (`deck-pose.ts`, pure). Input: progress `p ∈ [0, 1]` over the whole track, rank count
`N = 7`, layout (`desktop` | `phone`), pointer tilt. Output per card: position, rotation, scale,
`pull ∈ [0, 1]`, `landed`, plus stage-level `active`, `within`, `energy` and `kind` (`S` | `S+` |
`null`).

- `f = p × N`, `active = min(N − 1, ⌊f⌋)`, `within = f − active`.
- Handoff `k = clamp((within − 0.7) / 0.3)` when `active < N − 1`, else 0: the last rank never
  returns to the rack.
- `pull(active) = 1 − ease(k)`, `pull(active + 1) = ease(k)`, everything else 0. `ease` is cubic
  in-out; rotation uses a back-ease with overshoot 1.3.
- Desktop rack pose: slot `x = 60 + i × 40` px (in stage px), `rotY = 103°` (back toward the
  viewer, seen edge-on with a hint of back), `z = 0`.
- Desktop presented pose: `x = 470`, `y = 40`, `z = 60`, `rotY = 0`. Between them: `x, y` on the
  cubic ease, `z = 60 · 1.6 · sin(π·pull) + 60·pull` (the lift toward the camera), `rotY = 103° ×
(1 − backEase(pull))`, `scale = 1 + 0.06·sin(π·pull)`.
- Phone rack pose ("deck behind"): the next card at `x = stage right edge − 30`, `rotY = −80°`;
  played cards exit to `x = −stage width`, `rotY = 70°`, opacity 0.5. Presented: centred, `z = 40`.
- Tilt: presented card only, `rotX ∈ ±8°`, `rotY ∈ ±10°` from the pointer's offset over the stage
  (desktop) or `deviceorientation` beta/gamma (phones, only after a user gesture, never requesting
  permission on iOS unless the visitor taps the card).
- Stage px map to world units at 100 px per unit with the camera set so the stage's height is
  exactly the viewport of the sticky box.

The camera, lights and world scale are re-derived on resize.

**Scroll binding.** Motion's `scroll()` over the track (`offset: ["start start", "end end"]`) sets
`p` and `--progress`, as today. The stage mounts only when the journey box is on screen
(`IntersectionObserver`, `rootMargin: 0 0 -15% 0`) and the page has scrolled at least once.

**Render loop.** `requestAnimationFrame` runs while any `pull` is strictly between 0 and 1, while
`energy > 0`, while the tilt is changing, or while a print-in is in progress. Otherwise the stage
renders once per pose change. The loop is cancelled when the box leaves the viewport or the tab is
hidden.

## 7. Energy and light

- Lights: ambient 0.35; a white key from upper-left (intensity 2.2); a violet rim `#9080ff` from
  the right-rear (0.8); a violet point light `#7040d2` in front of the presented card, intensity
  `energy × 16` at S and `energy × 55` at S+. Materials: face roughness 0.38, metalness 0.18.
- `energy`: 0 for E–A. S: 0.3 while presented, `0.15 × pull` while pulling. S+: `0.25 + 0.75 ×
min(1, within / 0.7)` while presented.
- Smoke: up to 140 sprite billboards from a pool, each a procedurally painted 256 px puff (nine soft
  blobs), violet `#7040d2` with a quarter of them `#9d86d8`, normal blending, `depthWrite` off.
  Emitted from the top edge (half) and the two side edges; rise and spread; scale grows
  `0.35–0.7 → +0.4–1.0` over life; opacity `sin(π·t)` up to 0.10–0.22; life 140–290 frames.
  Emission rate per frame: S `0.35`; S+ `1.2 + 4 × energy`; both scaled by a device tier. S+ puffs
  travel `1 + 1.5 × energy` faster sideways, which is what carries them out of the column.
- Glow: S and S+ only, as a soft additive sprite behind the card (scale 4.2 at S; `7 + 9 × energy`
  at S+) plus the violet point light. No CSS box-shadow anywhere.
- Nothing outside the stage reacts. Smoke is clipped by the section, not by the column.

## 8. Rendering architecture

Files in `src/scripts/journey/`:

| File            | Role                                                                                                  | Tests                                        |
| --------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `deck-pose.ts`  | Pure pose model (§6). No DOM, no Three.                                                               | `test/deckPose.test.ts`                      |
| `deck-paint.ts` | Paints face (per line count), back and eye mask into `OffscreenCanvas`/`HTMLCanvasElement` from data. | `test/deckPaint.test.ts` (fake 2D ctx)       |
| `deck-stage.ts` | The Three.js scene: meshes, materials, lights, smoke pool, tilt, loop, resize, context loss.          | e2e + visual                                 |
| `index.ts`      | Mount logic: observer, scroll binding, lazy `import("./deck-stage")`, rail, aria-live, fallbacks.     | `test/journey.test.ts` (existing, rewritten) |

- Three.js is a normal dependency (`three`, pinned; respects `minimumReleaseAge`). It is imported
  only inside `deck-stage.ts`, which is itself a dynamic import from `index.ts`, so Vite emits it
  as a separate chunk that never sits in the home page's initial graph. No CDN: zero third-party
  requests stays.
- Imports are limited to what we use (`WebGLRenderer`, `Scene`, `PerspectiveCamera`, `BoxGeometry`,
  `MeshStandardMaterial`, `Sprite`, lights, `CanvasTexture`, `Color`), which tree-shakes to
  roughly 120–150 KB gz.
- Fonts: the face painter waits for `document.fonts.load('400 14px "JetBrains Mono"')` before the
  first paint so the texture uses the site's face, not a fallback.
- Portraits load as `Image`s from `/journey/portraits/<rank>@{1x,2x}.webp` when the stage mounts,
  and paint into the face textures as they arrive; a card can land before its portrait is in, in
  which case the window shows the void field and the eyes, and the portrait fades in when ready.
- Fallbacks: no WebGL, `webglcontextlost` without restore within 2 s, or any exception during mount
  swaps the stage for `JourneyTimeline` (it is rendered in the page under `hidden` and shown by
  toggling a `data-deck-fallback` attribute; visibility only, never `display`, so nothing shifts).
  Reduced motion never mounts the stage.
- A11y: the twin list and aria-live paragraph (§3); the rail buttons are the only interactive
  elements and are keyboard-focusable; the canvas is `aria-hidden`.

## 9. The character and the Higgsfield pipeline

**Bible** (goes verbatim, with the ladder row, into every prompt):

> An original man in his late twenties, lean athletic build, warm mid-tone skin, messy medium-length
> jet-black hair with a fixed left part that falls over the right side of the forehead, narrow eyes
> under straight dark brows, a small pale scar through the outer right eyebrow, calm composed
> expression. He always wears a small matte-black terminal-cursor pendant on a thin cord, and every
> outfit has one ember-orange (#da5c2c) stitched seam or cable detail. Anime illustration with clean
> line art, flat cel shading with one hard shadow tone, a limited palette of near-black, charcoal,
> grey, skin, ember orange and deep violet (#7040d2) only where named. Plain black (#000000)
> background and nothing else. No text, no logos, no watermark, no frame. No red eyes, no fangs, no
> face markings, no weapons, no shadow soldiers, not Sung Jin-Woo, no Solo Leveling costume. He does
> not resemble any existing anime or manga character or any real person.

**Ladder** (one visible change per rank; the eye row is the violet ramp):

| Rank | Outfit                                                              | Eyes                                             |
| ---- | ------------------------------------------------------------------- | ------------------------------------------------ |
| E    | Grey hoodie, headset around the neck, company lanyard               | Wide, warm brown, no glow                        |
| D    | Dark company polo, no headset, sleeves pushed up                    | Slightly narrower, a cold grey glint             |
| C    | Black shirt, laptop-bag strap across the chest                      | Steel grey, alert                                |
| B    | Rolled sleeves, a coiled patch cable over one shoulder              | Steel grey with a faint violet rim on the iris   |
| A    | Fitted black technical shirt, rack keys on a carabiner              | Violet iris, no glow                             |
| S    | Dark technical coat, closed to the collar                           | Violet iris, glowing                             |
| S+   | The coat open, violet energy visible inside it and at the shoulders | White-violet, the glow breaking past the eyelids |

**Framing for all seven:** 3:2 landscape, bust portrait, eye line at 40 % of the height, shoulders
cut by the bottom edge, the character centred in the left two-thirds so the right third stays clear
for the quote, front-facing with a slight three-quarter turn to the left, one key light from the
upper left. Same camera, same distance.

**Workflow** (all through the connected Higgsfield MCP; at most five jobs per batch; each batch is
shown to Marcus before the next):

1. `character-sheet` workflow, anime/2D preset, from the bible: a turnaround (front, three-quarter,
   profile) and an expression row. Iterate until Marcus approves the face. Record the job IDs.
2. Register the approved sheet as a Higgsfield Character, and pass it as the identity reference on
   every later job.
3. Seven portraits with `nano_banana_pro` at 4K in two batches (E–D–C–B, then A–S–S+), prompt =
   bible + ladder row + framing. Marcus picks per rank; re-rolls stay within the five-job cap.
4. Card back mark: trace the devil crop of `evil_logo.webp` to one path with the existing
   `potrace` dependency (a one-off script run, output committed as `src/images/devil-mark.svg`).
   No render.

**Import.** `scripts/import-still.mjs` gains a `--sizes 520,1040` option that writes the 1× and 2×
WebP renditions (the card window is 520 px wide at 1×) (quality 82, metadata stripped) to `public/journey/portraits/<rank>@1x.webp` and
`@2x.webp`. Each file must be under 120 KB. Prompts, job IDs and picks go in `docs/imagery.md`
under a new "Card deck" section; the old journey-art sections stay for history and are marked
retired.

## 10. Budgets and performance

| Budget                        | Value                                                          | Enforced by                                                  |
| ----------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| Initial JS on `/`             | ≤ 100 KB gz (unchanged)                                        | `pnpm size`                                                  |
| Deck chunk (Three.js + stage) | ≤ 200 KB gz, not in the initial graph                          | `pnpm size` (new row)                                        |
| Motion                        | ≤ 30 KB gz (unchanged)                                         | `pnpm size`                                                  |
| Portraits                     | 14 files, each ≤ 120 KB, nothing else in `dist/client/journey` | `pnpm size` (replaces the scene row and the stray-file rule) |
| Third-party requests          | 0                                                              | e2e                                                          |
| Home page weight at load      | ≤ 600 KB (unchanged; the deck loads later)                     | Lighthouse CI                                                |
| Frame rate                    | No dropped frames during a pull on a mid-range phone           | manual, per the workflow's browser check                     |

Performance rules: pixel ratio capped at 2 on desktop and 1.5 on phones; the smoke rate and pool
halve on `navigator.hardwareConcurrency ≤ 4` or `deviceMemory ≤ 4`; textures are 2× the card's CSS
size at most; the loop is on-demand outside motion (§6); the renderer is disposed when the journey
leaves the viewport for more than 30 s and re-created on return.

## 11. Tests

- **Unit**
  - `deckPose`: pull curve endpoints, the 70 % handoff window, the last rank never returns, phone vs
    desktop poses, clamped progress, energy per rank, tilt limits.
  - `deckPaint`: every stage paints at every line count without throwing; the quote wraps within
    42 % width; eight tags then "+N"; the S+ chip is the top variant; nothing paints outside the
    canvas.
  - `career`: `log` present and under 80 characters for every stage; `tenure`, `setNumber`,
    `acquired`.
  - `checkBundleSize`: the new rows and the portraits allow-list.
- **Component**: `Journey` renders seven hidden cards with title, org, dates, tenure, summary,
  skills and log; seven rail buttons; the aria-live paragraph; the fallback timeline is present and
  hidden. `JourneyTimeline` shows the portraits and quotes.
- **E2E** (`e2e/journey.spec.ts`, rewritten): no `three` chunk is requested before scrolling and it
  is after; the rail jumps to S+ and the counter and aria-live update; keyboard reaches the rail;
  reduced motion shows the timeline and requests no chunk; `--progress` reaches 1 at the track end;
  the CSP header still holds on `/`.
- **Visual**: baselines at E, S and S+ with the smoke seeded and frozen (`data-deck-freeze` attribute
  read by the stage in test builds sets a fixed RNG seed and stops the loop after one frame).

## 12. Security and CSP

No inline scripts or styles. Three.js is built without `eval`; the CSP is unchanged. Canvas textures
are same-origin images. `deviceorientation` is only listened to after a tap, and never triggers the
iOS permission prompt uninvited. No new env vars.

## 13. The record

- **ADR 0004 — Three.js, lighting, glow and smoke inside the journey.** Amends 0002 (motion,
  elevation, imagery) and 0003 (violet). Decisions: Three.js is allowed only for the journey deck and
  must load lazily outside the initial JS; WebGL lighting is allowed on the deck's meshes; glow is
  allowed on the S and S+ cards only, as light and additive sprites, never CSS; violet smoke is
  allowed from the S and S+ cards only; the S RankChip may carry a violet border inside the deck. UI
  outside the section keeps ADR 0002 exactly.
- **CLAUDE.md**: the design brief lines "no shadows, gradients, blur or glow" and "no Three.js" get
  "(except the journey deck, ADR 0004)"; the Journey bullets and the art-pipeline bullet are
  rewritten for the deck; the `pnpm size` line changes; the budgets list gains the deck chunk.
- **Deleted**: `public/journey/scene.svg`, `art/journey/`, `scripts/{import-art,register-outfit,
build-scene,trace-vector,render-rank-stills}.mjs`, `src/scripts/{journey,avatar,scene}.ts`,
  `src/components/journey/silhouette.svg`, `src/data/avatar-rig.json`, the rank stills, and
  `test/{avatar,avatarRig,buildScene,journeyArt,renderRankStills,scene,sceneSvg}.test.ts`.
  `2026-09-25-vector-journey-design.md` gets a "Superseded" status line pointing here.
- **Build Log** in `~/vaults/personal/Projects/evilist.io.md` after each phase.

## 14. Phases

1. **Character.** Sheet → Character → seven portraits → import → `docs/imagery.md`. Gate: Marcus
   approves the sheet and each batch.
2. **Data, paint and pose.** `log`, helpers, `deck-pose.ts`, `deck-paint.ts`, tests, PDF rebuild.
3. **Stage, desktop.** `deck-stage.ts`, `index.ts`, `Journey.astro`, the rail, the twin, lazy
   loading, budgets in `pnpm size`. Gate: browser check at 1440.
4. **Phone, tilt, fallbacks.** The "deck behind" layout, orientation tilt, context-loss and no-WebGL
   swaps, reduced motion, device tiers. Gate: browser check at 390, 430, 768.
5. **Retire and record.** Delete the scene pipeline, ADR 0004, CLAUDE.md, timeline portraits, visual
   baselines, Build Log.

Each phase gets Marcus's approval before it starts, per the project workflow.

## 15. Out of scope

- Changing the section's heading, lede or place on the page.
- Any other use of Three.js, glow or violet on the site.
- Sound.
- A card for future roles; the deck is exactly the seven stages in career.ts.
