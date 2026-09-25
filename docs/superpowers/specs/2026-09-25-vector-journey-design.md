# The vector journey

- **Status:** Implemented (2026-09-25)
- **Date:** 2026-09-25
- **Decider:** Marcus Hancock-Gaillard
- **Replaces:** `2026-09-24-hero-journey-redesign-design.md` §7.3–§7.5 (the Higgsfield clips and their
  delivery). §7.1 (layout), §7.2 (the character) and §6.3 (cards) stay. Everything not named here
  stays as that spec says.

## 1. Purpose

The journey became seven painted anime loops. Marcus wants the section built from vectors instead,
so that the character himself and everything around him animate with the scroll: one continuous
scene in which he ranks up from E to S+ while you scroll through his career.

Audience and goals are unchanged: employers first, clients second.

## 2. Decisions (made in the brainstorm, do not re-litigate)

| Question            | Decision                                                                                                                                |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Clips               | Replaced. The vector scene is the journey; the clips, their encodes and their runtime are retired.                                      |
| Scroll concept      | **A. One continuous scene:** one character on stage the whole time, morphing between ranks as the scroll scrubs.                        |
| Production          | **1. Traced and rigged Higgsfield art:** flat-vector generations of the character, traced to layered SVG, cut into rig parts.           |
| Spike               | Done 2026-09-25 (4 credits): a flat-vector figure traced to a 10-layer SVG of 36 KB gz with the ember and violet accents intact.        |
| Outfit              | **Progression kept:** his outfit ranks up with him (hoodie at E → the open long coat at S+).                                            |
| Tracing             | In the repo, pnpm only: sharp + the `potrace` npm package (pure JS). No Python, no Homebrew dependency.                                 |
| Loading             | The scene loads only when the journey reaches the screen (the gate Phase 3 built); a 3 KB inline silhouette holds the stage until then. |
| Reduced motion / JS | The static timeline, with each rank's static vector composite as its picture.                                                           |

## 3. The scene

### 3.1 Stage

The pinned, full-width stage, the rank rail and the cards stay exactly as built in hero v2 Phase 3
(the `bleed` slot, the card on the left from 60rem, rail / scene / card rows below 60rem, the
short-desktop rules). The clip layers and posters go. The scene takes their place: one character,
full body, centred horizontally, about 70% of the scene area's height, standing on a flat floor line
over the carbon stage (no gradients, no blur, no glow: flat shapes only, per the design brief).

### 3.2 Rank by rank

One scroll position drives everything. Each rank owns 1/7 of the track (`stageForProgress` is
unchanged); for the last 30% of each rank's stretch the scene blends into the next rank.

| Rank | Outfit                                     | Props that draw in around him                       | Violet energy              |
| ---- | ------------------------------------------ | --------------------------------------------------- | -------------------------- |
| E    | black hoodie, headset on                   | a desk and two ember-glowing monitors               | none                       |
| D    | hoodie, sleeves pushed up, headset on neck | floating website wireframe panels                   | none                       |
| C    | fitted black zip jacket                    | a glowing data cube and a path of light             | faint wisps at one hand    |
| B    | black high-collar zip jacket               | a wall of ember alert lights                        | shadows rising at his feet |
| A    | short black high-collar coat               | an open server rack                                 | smoke round his legs       |
| S    | long black high-collar coat, closed        | a pipeline of floating modules, violet shadow hands | hands reaching in          |
| S+   | long coat open, ember piping at the cuffs  | an army of violet shadow server racks behind him    | full aura                  |

One outfit per rank (seven), rather than five plus overlays: S and S+ differ in silhouette (the coat
closed vs open), and D's pushed-up sleeves and neck headset align more reliably as a whole outfit than
as overlays. It costs ~8 credits more than the estimate in the brainstorm.

### 3.3 Motion

- **Outfits** cross-fade part by part (opacity) while the body stays exactly in place: his body is one
  registered pose, so a rank change never makes him jump.
- **Pose** comes from the rig, not the art: every outfit is generated in the same neutral A-pose, and
  per-rank keyframes rotate the arms at the shoulder pivots (D's hand raised to the wireframe, S
  conducting the pipeline, S+ arms loose, coat tails swaying), interpolated through the blend.
- **Props** draw their outlines in (a stroke copy of each prop's traced silhouette, `pathLength="1"`,
  `stroke-dashoffset` 1 → 0), then fill in (opacity), then fade out as the next rank's props arrive.
- **Energy** grows continuously with overall progress (the energy groups' scale and opacity), on top of
  each rank's own energy props.
- **Idle life** runs on its own so he's never frozen: breathing (the torso scales ≈1%), a hair sway
  (±1.5°), blinking LEDs and monitor glow (opacity). CSS keyframes on inner `<g>`s; scroll transforms
  on outer `<g>`s (the SVG rule in `CLAUDE.md`).
- All motion is transform and opacity, plus `stroke-dashoffset` for the prop draw-ins. `CLAUDE.md`'s
  rule ("Animate only `transform` and `opacity`") gains: "and `stroke-dashoffset` for vector outline
  draw-ins".

## 4. The art pipeline

1. **Base pose.** One flat-vector base body (reference: concept A `191aca87…` and the spike figure
   `c19c4ce3…`): front view, neutral A-pose, arms slightly out, a fitted black base layer, on a plain
   off-white 2:3 canvas with head and feet at fixed positions. Two variants; Marcus picks one.
2. **Outfits.** Seven outfits (§3.2) in the base pose, the base as the reference image, "same pose,
   same framing, same body, change only the outfit". Two variants each (~28 credits); Marcus picks
   seven.
3. **Props.** Seven prop sets plus the energy pieces (§3.2), flat vector, each on a plain background
   (~16 credits for two variants each); Marcus picks.
4. **Registration.** `scripts/register-outfit.mjs` fits each outfit onto the base (scale + offset from
   the head and feet silhouettes) and rejects any whose residual misalignment is over 2% of the figure
   height; those are re-rolled.
5. **Tracing.** `scripts/trace-vector.mjs` (sharp + `potrace`, dev dependencies):
   - a light blur, then every pixel mapped to the nearest colour of a palette sampled from the art;
     near-white is background;
   - a solid silhouette base plus one layer per colour (hides hairline seams);
   - speckle removal and rounded coordinates; no `style` attributes (CSP), fills as attributes.
6. **Rigging.** `src/data/avatarRig.ts` defines part masks (polygons on the base canvas: `head`,
   `torso`, `arm-left`, `arm-right`, `legs`, `coat-left`, `coat-right`) and pivots (neck, shoulders,
   hips). The tracer cuts every colour layer of every outfit by these masks, so each outfit comes out
   as the same named parts; parts an outfit lacks (a hoodie has no coat tails) are empty groups.
7. **Assembly.** `scripts/build-scene.mjs` writes `public/journey/scene.svg`: the rig
   (`#avatar > #outfit-<rank> > #part-<name>`), the props (`#props-<rank>`), the energy groups and the
   backdrop; and `src/components/journey/silhouette.svg` (the base pose as one path, ~3 KB, inlined).
8. **Log.** Every prompt, job, pick and credit spend goes into `docs/imagery.md` (a "Vector journey"
   section).

The colours inside the scene are art (literal fills from the traced palette), like any image: the
token rules are for UI, and violet stays inside the journey art (ADR 0003).

## 5. Runtime

- **Loading.** `scripts/journey.ts` keeps its IntersectionObserver gate (no margin at the top, the
  window's bottom 15% ignored, nothing at page load on any window size). On first entry it fetches
  `/journey/scene.svg`, parses it with `DOMParser`, and imports the root into the stage in place of the
  inline silhouette. CSP-safe: no inline script, no style attributes, same-origin fetch. A failed fetch
  leaves the silhouette and the cards; nothing breaks.
- **State.** `src/scripts/avatar.ts` (pure, unit-tested) maps scroll progress to a scene state:
  `{ rank, next, t }` (t is 0 until the last 30% of a rank's stretch, then 0 → 1), and from it each
  part's opacity per outfit, each pivot's rotation, each prop set's draw and fill, and the energy
  level.
- **Applying it.** The existing Motion `scroll()` callback applies the state through the CSSOM each
  frame (`transform`, `opacity`, `stroke-dashoffset` on elements, by id). Only the current and next
  ranks' outfits and props are visible; the rest are `visibility: hidden`.
- **Cards and rail** keep their current behaviour.
- **Retired:** the clip layers, `clipSources`, the priming/settle/playback runtime, `public/journey/*`
  clips, `scripts/encode-clip.mjs`, `scripts/clip-variants.mjs` and the clip check in
  `scripts/check-bundle-size.mjs` (replaced by the scene check below). The imagery log keeps their
  history.

## 6. Reduced motion and no JS

`JourneyTimeline` keeps its layout; each entry's picture becomes that rank's static composite (outfit,
props and energy at the rank's settled state), rendered from the scene SVG to WebP by
`scripts/render-rank-stills.mjs` (sharp) into `src/images/journey/<stage-id>.webp`, served through
`Still`, lazy. The Higgsfield stills they replace stay in the imagery log.

## 7. Testing and budgets

- **Unit (vitest, test first):** the scene state at rank boundaries, inside the blend, at the first and
  last rank and for progress below 0 or above 1; part and pivot interpolation; every outfit in
  `scene.svg` exposes the same part ids; no `style=` attribute anywhere in `scene.svg`; the tracer's
  palette mapping and background detection on a synthetic image.
- **Component (Container API):** the stage renders the inline silhouette and no clip markup; the
  timeline renders a still per rank.
- **E2E (production build):** no `scene.svg` request at page load on the project sizes, 1920×1080 and
  2560×1300; the scene loads when the journey reaches the screen and replaces the silhouette; at each
  rank the right outfit and props are visible and the others hidden; under reduced motion or without
  JS, no scene request and the timeline shows its pictures; the CSP header and no console errors.
- **Visual baselines:** ranks E, B and S+ (scene settled), and the reduced-motion timeline.
- **Budgets:** `scene.svg` ≤ 300 KB gzipped (`pnpm size`); `/` at load unchanged (≤ 600 KB; the scene
  never loads with the page); each timeline still rendition ≤ 120 KB; initial JS ≤ 100 KB gz (the
  runtime adds a few KB; Motion is already loaded). Lighthouse thresholds unchanged.
- **Browser check** at 390, 430, 768 and 1440 px, including a mid-range phone's frame rate while
  scrubbing (no dropped frames visible).

## 8. Phases and acceptance

One branch, `feat/vector-journey`, one plan. The art steps wait on Marcus's picks.

1. Pipeline scripts and the rig config (no art yet): tracer, registration, scene builder, rank-still
   renderer, with tests.
2. Art: base pose → outfits → props, each step picked by Marcus; traced, registered, rigged, assembled.
3. Runtime: the scene loader, `avatar.ts`, the stage markup, idle motion; the clips retired.
4. Timeline composites, tests, budgets, visual baselines, `CLAUDE.md`, the build log.

Acceptance: the character ranks up E → S+ as you scroll at all four widths, outfits cross-fade without
a jump, props draw in and out, energy grows, idle motion runs; nothing journey-related loads with the
page; reduced motion shows the static composites; every test and budget green; Marcus approves the
screenshots.

## 9. Out of scope

Sound; clicking or dragging the character; a mobile-specific simplified scene (only if the frame-rate
check fails); changing the rail, cards or copy.

## 10. Risks

- **Outfit alignment across generations.** Mitigation: the base as the reference, registration with a
  2% threshold, targeted re-rolls.
- **Trace noise** (blotches between near greys, fringes on the energy). Mitigation: the blur, the
  sampled palette and speckle removal, tuned on the base before the outfits run.
- **Weight.** If `scene.svg` exceeds 300 KB gz, split it per rank pair and fetch ahead of the scroll.
- **Frame rate.** ~100 groups updated per frame, but only two ranks live at a time; measured on a
  mid-range phone before calling it done.
- **Rig seams** at the shoulders when arms rotate. Mitigation: overlapping masks at pivots, the torso
  drawn above the upper arm edge.
