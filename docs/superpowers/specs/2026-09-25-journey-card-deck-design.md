# Journey card deck — design

- **Date:** 2026-09-25 (revised the same day after Marcus's deep review)
- **Status:** Approved in brainstorm, pending Marcus's review of this revision
- **Supersedes:** `2026-09-25-vector-journey-design.md` (the traced SVG scene) and the journey
  parts of `2026-09-24-hero-journey-redesign-design.md`
- **Decisions this creates:** ADR 0004 (Three.js, lighting, bloom, glow and smoke inside the
  journey)

## 1. Goal

Replace the journey's full-bleed scroll scene with a deck of seven player cards, one per rank
E → S+. The cards stand as a rack of card backs. Scrolling pulls the card for the current rank out
of the rack, flips it face-up and presents it with its stats, printed in like a shell. The S card
glows. The S+ card's power leaks out as violet smoke that the card cannot contain. Visitors can also
jump to any rank from the rail, by clicking a racked card, or by swiping on a phone.

This is the site's main attraction, so it has to be the best thing on it. The audience is still
employers first, clients second, so every card's text is the resume: title, org, dates, tenure, a
one-line summary, the skills of that stage, an XP bar and one quote. The text is real HTML for
readers and machines (the timeline under the stage) and painted pixels for the eye (the canvas).

Inspiration Marcus supplied: Sung Jin-Woo's seven power levels (weakest → the System → rapid growth
→ awakening → S-rank → full power → final form), which map one-to-one onto the seven career stages;
the Union Arena trading-card layout (cost badge, name plate, ability box, BP stat, set number,
filigree frame); and the seven-panel eyes-progression image. The character is original (§10).

## 2. Decisions

From the brainstorm:

| Topic         | Decision                                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Character     | A new original character, more detailed than the traced one. Never a likeness of any existing character.                  |
| Eye ramp      | Violet only: brown → grey glint → steel → violet rim → violet iris → glowing violet → white-violet breaking out. No blue. |
| Card layout   | Portrait window on top, System-style status window below. The quote sits in the portrait window, right-aligned.           |
| Desktop stage | "The shelf": a rack of card backs on the left, the presented card on the right, in a centred column.                      |
| Phone stage   | "Deck behind": the card takes the stage; the next card peeks in edge-on from the right, played cards exit left.           |
| At rest       | Racked cards show their backs. Text exists only on a presented card, and prints in on landing.                            |
| 3D            | Card thickness, hover tilt, layered depth and a back face during the flip are all in.                                     |
| Renderer      | Full Three.js: cards are lit meshes with painted layers. Three.js is allowed inside the journey (ADR 0004).               |
| Energy        | Violet smoke that seeps from the card edges, not point particles. Breathes at S, unleashed at S+.                         |
| `acquired`    | The stage's skills as listed in career.ts, capped at eight with a "+N" tag.                                               |
| Quotes        | A new `log` field per stage, drafted by Claude from the highlights (§4), approved by Marcus.                              |
| Old scene     | Retired fully: sources, scripts, modules and tests deleted; git history keeps them.                                       |

From the review round (all approved):

| Topic           | Decision                                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| Entrance        | A one-time intro: the rack deals in, then E pulls itself out. Skipped on deep links and under reduced motion.     |
| Feel            | Damped scroll progress, damped tilt, idle float on the presented card, a camera parallax on desktop.              |
| Navigation      | Rail (keyboard and screen readers), racked cards clickable with a hover lift, horizontal swipe on phones.         |
| Finale          | A landing flare at S+ (and a smaller one at S). Racked S and S+ backs carry a pulsing violet seam from the start. |
| Material        | Laminated card: exact palette through an emissive recipe, clearcoat highlight, dark-studio environment map.       |
| Layers          | Four parallax layers: body (with portrait), frame, text, chip, plus a glow-mask plane.                            |
| Bloom           | Selective bloom on the high tier only, in its own lazy chunk. Phones use additive sprites instead.                |
| Fog             | A noise-driven fog plane behind the deck under the smoke puffs, masked around the S and S+ card.                  |
| Grounding       | A soft contact shadow under the presented card.                                                                   |
| Card content    | A `$ status --rank n` header line and an `$ xp` bar join the status window.                                       |
| Section         | The journey section's tone becomes `void`; the lede ends with "Scroll, or pick a rank."                           |
| Column          | The deck column is `min(78%, 1200px)` wide on desktop.                                                            |
| Accessible twin | The timeline is the twin: visually hidden while the stage runs, visible as the fallback. One list, one source.    |
| Loading         | The deck chunk prefetches after the first scroll; portraits load only once the journey is on screen.              |
| Determinism     | Tenure and XP use a build-time date; tests and visual baselines freeze time and the RNG.                          |
| Tooling         | A dev-only tuning panel, a local perf script, state attributes for Playwright, a placeholder portrait.            |

## 3. Page and components

The section keeps its place on the home page between Work and About.

- `src/pages/index.astro`: the `Section` becomes `tone="void"` so violet reads on true black. It
  keeps its `~/journey` `Prompt` and the h2 "From E-rank to S+ rank". The lede becomes
  "{decade}, seven ranks: from answering support calls to architecting two datacenters. Scroll, or
  pick a rank." `Journey` goes back into the `bleed` slot, because the canvas must span the full
  section width for the smoke to leave the column; the deck's _layout_ is computed inside the column
  (§6).
- `src/components/journey/Journey.astro` renders:
  - `.journey[data-deck]`, the track: `height: calc(7 × 70dvh + 100dvh − var(--header-h))` while
    the deck is active, `auto` in fallback. It carries the state attributes (§9).
  - `.journey__stage`, the sticky box at `top: var(--header-h)`, `height: calc(100dvh −
var(--header-h))`, containing:
    - `<canvas data-deck-gl aria-hidden="true">`, full bleed, `position: absolute; inset: 0`.
    - `.journey__column`, the centred layout column (`width: min(78%, 1200px)` from 60rem; the
      content width below). It holds no visible boxes of its own; it exists so the layout function
      and the rail share one measure.
    - The rail: an `<ol role="toolbar" aria-label="Ranks">` of seven `<button>`s, each wrapping a
      `RankChip sm`, with `aria-pressed` on the presented rank, an accessible name "Rank S, Linux
      Engineer", roving `tabindex` with ← → Home End, and a line that fills in ember with
      `--progress`. Activation scrolls the page to that rank's position in the track (`scrollTo`,
      smooth; instant under reduced motion). The presented chip gets a 200 ms scale pulse when it
      changes.
    - The counter `06 / 07` and the hint `↓ scroll or pick a rank`, both `aria-hidden`. The hint
      fades in after the intro and fades out after the first user-driven rank change or 8 s.
    - A visually hidden `<p aria-live="polite">` that announces "Rank S, Linux Engineer, Caris Life
      Sciences" when the presented card changes.
    - Before the stage mounts (`data-deck-state="loading"`) the box shows only the rail and the
      floor line. There is no CSS placeholder rack: the intro's deal-in is the entrance. The chips
      start at opacity 0 and fade in with the deal-in; when the intro is skipped they are visible at
      once.
  - `JourneyTimeline` after the track, as the accessible twin and the fallback.
- `src/components/journey/JourneyTimeline.astro` lists the seven ranks with everything the card
  paints: RankChip, title, org, dates, tenure, summary, the `acquired` skills, the XP percentage,
  the `log` quote, and the portrait through `Still` from `src/images/journey/<rank>.webp` (subject
  from `src/data/deck.ts`, so the alt starts "Illustration:"). While the deck is active (`[data-deck-active]` on the section) it is visually
  hidden with the `sr-only` pattern (clip, 1 px, absolute), which reads to assistive tech and takes
  no layout. In fallback it is the visible journey. Under `(scripting: enabled) and
(prefers-reduced-motion: no-preference)` the page ships with the deck active; the script flips to
  fallback when the tier check fails (§8) or on an unrecoverable context loss. That flip changes
  layout (the track collapses), which is acceptable because it happens at script start, before the
  visitor reaches the section; the "visibility only" rule still governs every switch that can happen
  while the section is pinned.
- `RankChip.astro` is unchanged.

Deleted: the `[data-scene]` box, the inline silhouette, the stacked `Panel case` cards, the rail's
scene coupling.

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

- New helpers, unit-tested with a fixed `now`:
  - `stageMonths(stage, now)`: whole months from `start` to `end` (or `now`).
  - `tenure(stage, now)` → "3 months", "19 months", "4 years, 10 months" (under 24 months stays in
    months).
  - `xp(stage, now)` → cumulative months through this stage over the total of all stages, 0–1.
    Gaps between stages don't count, so S+ is always 1.
  - `setNumber(stage)` → `EVL-06/07`.
  - `acquired(stage, cap = 8)` → the first `cap` skills plus `"+N"` when more remain.
- `now` is the build date: `index.astro` writes it as `data-now="2026-09-25"` on the section, and
  the twin, the painter and the tests all read that value, so a texture painted in a browser in
  December still matches the build. `?deck-freeze` (§12) overrides it.
- `activity` and `printHighlights` stay (the resume and JSON-LD still use them).

`src/data/deck.ts` (new): the per-rank art record used by the timeline's alt text, the placeholder
painter and `docs/imagery.md`: `outfit`, `eyes`, `expression`, `posture`, `alt`, and the glow-mask
coverage band (§10).

`src/scripts/deck/deck-params.ts` (new): every tunable constant in this document (damping, curve
overshoot, lift, float amplitudes, smoke, fog, lights, bloom, clearcoat, camera) with the values
below as defaults. The tuning panel (§9) edits this object live; the final values are committed here.

The resume PDF fingerprint covers career.ts, so adding `log` means `pnpm build:pdf` and committing
the PDF (the PDF does not print `log` or XP).

## 5. The card

Aspect 5:7, corner radius 2 px (0.02 world units), thickness 6 px (0.06). Sizes come from the layout
function (§6); textures are painted at the on-screen size times the pixel ratio (§9).

**Face, as five layers** (z offsets in world units above the slab's front):

| Layer     | z      | Content                                                                                                                                                                                                                                                                                | Material                                                                                          |
| --------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| body      | 0      | Carbon face, the void portrait field with the portrait cover-fitted (anchored top-centre) into the top 52 %, a scrim from transparent to 70 % void over the window's bottom 30 % (so the name plate reads over shoulders), the window divider, the status window's carbon, the footer. | Laminated (§8): exact colours plus clearcoat.                                                     |
| glow mask | +0.002 | The portrait's violet-keyed mask (§10): eyes from B up, the coat's energy at S+.                                                                                                                                                                                                       | Unlit, additive, the mask as `alphaMap`, colour from the eye ramp, opacity animated; bloom layer. |
| frame     | +0.014 | 1 px iron outer border, the plotted-trace inner frame 6 px in (slate), steel corner brackets top-left and bottom-right.                                                                                                                                                                | Unlit, transparent. Shared texture.                                                               |
| text      | +0.026 | Name plate, quote, status lines. Empty when not presented.                                                                                                                                                                                                                             | Unlit, transparent. One texture per slot.                                                         |
| chip      | +0.04  | The RankChip. S+: the top variant (ember fill, void text). S: paper text with a violet 1 px border. Others: standard.                                                                                                                                                                  | Unlit, transparent. One tiny texture per rank.                                                    |

Text content and type (sizes at 1×, JetBrains Mono, weights 400 only):

- Portrait window: the chip top-left at 12 px inset. The quote right-aligned from 48 px down, italic
  10/14 px, fog `#b4b4b4`, max width 42 % of the card, `0 0 8px` void shadow. The name plate at the
  window's bottom-left: title 14 px paper, org · dates 10 px fog.
- Status window, each line prefixed by an ember `$` and an ash key:
  1. `~/journey $ status --rank 6` (the header; ash, 9 px; the `$` ember)
  2. `$ on_arrival` — the stage summary, wrapped, fog 10 px
  3. `$ acquired` — up to eight tags and "+N": 9 px ash text in 1 px slate boxes
  4. `$ xp` — ten glyphs, `▮` filled in ember and `▯` empty in slate, then the percentage in ash
  5. `$ tenure` — paper 10 px
  6. Footer: `EVL-0n/07` left, the rank glyph right, steel 9 px

**Back**

Carbon `#0e0e0e`, the trace frame in `#2a2a2a`, the devil mark (the devil crop of `evil_logo.webp`
traced once to one path, committed as `src/images/devil-mark.svg`) in slate `#3a3a3a` at 84 px,
"EVILIST · JOURNEY" letter-spaced in slate at the bottom. Monochrome by design: the yellow logo stays
a header-only exception (ADR 0003). One shared texture, laminated like the face.

S and S+ backs add a **seam**: a 1.5 px violet rounded-rectangle outline 6 px in, additive, on the
bloom layer, pulsing on a 3.2 s sine. S: opacity 0.10–0.25. S+: 0.20–0.50, phase-shifted by half a
period from S. It is the first thing that tells the visitor the last card is different.

**Edges**

`#1b1b1b`, roughness 0.6, metalness 0.2, lit normally. The slab is a `RoundedBoxGeometry`.

**States**

| State     | Face                                                                                                                                                                                                                                                            |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Racked    | Back only. Seam pulsing on S and S+. Hover lifts the card (§7).                                                                                                                                                                                                 |
| Pulling   | Flipping back → face; the text layer is empty; the glow mask is at 0.                                                                                                                                                                                           |
| Landing   | Glow mask fades to 1 over 500 ms. Six status lines and the name plate print in one every 90 ms (name plate, header, on_arrival, acquired, xp, tenure, footer), the last with a blinking ember cursor for as long as the card is presented. S and S+ flare (§8). |
| Presented | Full sheet, idle float, tilt. S: glow, light smoke. S+: glow, smoke and fog growing with progress through the rank.                                                                                                                                             |
| Leaving   | The text layer clears in one step as the flip starts; the glow mask fades out over 200 ms.                                                                                                                                                                      |

## 6. Layout

`deck-layout.ts` (pure) maps the stage and column sizes to card size and anchor points, in CSS px;
the pose model works in these px and the stage converts to world units at 100 px per unit.

Inputs: `stageW`, `stageH` (the sticky box), `columnLeft`, `columnW`, `mode` (`desktop` from 60rem,
else `phone`). Reserved: `railH = 88` at the bottom, `pad = 24`.

- `cardH = clamp(320, 0.62 × stageH, 560)`, then reduced so the composition fits: on desktop
  `cardW ≤ columnW / 2.36` (see below), on phones `cardW ≤ stageW − 2 × pad`. `cardW = cardH × 5 / 7`.
- Desktop: `slotGap = 0.14 × cardW`; rack projected width `rackW = 6 × slotGap + 0.22 × cardW`
  (a back at 103° projects to 0.22 of its width); `gap = 0.30 × cardW`; composition width
  `rackW + gap + cardW = 2.36 × cardW` when `slotGap` and `gap` are expressed in `cardW`. The
  composition is centred in the column: `rackX0 = columnLeft + (columnW − composition) / 2`,
  `presentedX = rackX0 + rackW + gap`.
- Vertical, both modes: the presented card is centred in the area above the rail, so its bottom
  edge is `baseY = (stageH − railH) / 2 + cardH / 2`. Racked cards stand 30 px lower, on the floor
  line at `baseY + 30`, which is drawn 8 px below their bottom edge. The presented card therefore
  hovers 30 px above the floor, and its `z` lift (§7) carries it toward the camera on top of that.
- Phone: presented card centred horizontally. The next card's near edge sits 24 px inside the
  stage's right edge at `rotY = −80°`, so a 0.17 × cardW sliver of its back shows. Played cards exit
  to centre `x = −0.6 × cardW` at `rotY = 70°`, opacity 0.5.
- Camera: `fov = 26°` (tunable), centred on the stage, distance chosen so the visible height at
  `z = 0` equals `stageH` px. Desktop adds a pointer parallax (§7).

Re-run on resize (debounced 150 ms) and on orientation change; textures repaint when the card's
on-screen size changes by more than 10 %.

## 7. Motion

**Progress.** Motion's `scroll()` over the track (`offset: ["start start", "end end"]`) supplies the
target progress and `--progress` for the rail line. The stage keeps a smoothed progress:
`p += (target − p) × (1 − e^(−dt/τ))`, `τ = 90 ms`, snapped when within 0.0005. Everything below
reads the smoothed `p`. A rail jump therefore riffles the deck rather than teleporting it.

**Pose model** (`deck-pose.ts`, pure). Inputs: `p`, `N = 7`, the layout, the tilt vector, the intro
state, the clock. Output per card: position, rotation, scale, `pull ∈ [0, 1]`, `landed`, `hoverLift`;
per stage: `active`, `within`, `energy`, `kind` (`S` | `S+` | null), `phase`.

- `f = p × N`, `active = min(N − 1, ⌊f⌋)`, `within = f − active`.
- Handoff `k = clamp((within − 0.7) / 0.3)` when `active < N − 1`, else 0. The last rank never
  returns to the rack, and E never returns at the top.
- `pull(active) = 1 − ease(k)`, `pull(active + 1) = ease(k)`, all others 0. `ease` is cubic in-out.
- Rack pose: slot position, `rotY = 103°`, `z = 0`. Presented pose: `presentedX/Y`, `z = 60 px`,
  `rotY = 0`. Between: `x, y` on the cubic ease; `z = 60 × 1.6 × sin(π·pull) + 60·pull` (the lift
  toward the camera); `rotY = 103° × (1 − backEase(pull))` with overshoot 1.3, so the card swings
  a few degrees past flat and settles; `scale = 1 + 0.06 × sin(π·pull)`.
- `landed = pull > 0.985`. `phase` per card: `racked`, `pulling`, `landing` (first 700 ms after
  landing), `presented`, `leaving`.
- Idle float, presented card only, amplitude fading in over 1.5 s after landing:
  `y += 4 px × sin(2πt / 4.2 s)`, `rotZ += 0.6° × sin(2πt / 6.1 s)`, `rotY += 1.2° × sin(2πt / 5.3
s)`, `rotX += 0.8° × sin(2πt / 4.7 s)`. The smoke origin and the contact shadow follow the floated
  position.
- Tilt, presented card only: target `rotX ∈ ±8°`, `rotY ∈ ±10°` from the pointer's offset over the
  stage (desktop) or from `deviceorientation` beta/gamma (phones, §7 gestures), smoothed with
  `τ = 120 ms`, released to 0 on leave.
- Hover lift, racked cards on desktop: `z += 6 px`, `y += 3 px` over 150 ms in, 250 ms out.

**Intro.** When the stage mounts with `p < 0.5 / N`, no `deck-freeze`, and the intro has not played
this page load: the intro state runs on the clock and overrides the scroll poses.

1. Deal-in: card `i` starts at `x = slotX − 2.2 × cardW` and eases to its slot over 420 ms (cubic
   out), staggered 55 ms; the floor line scales in from the left over 500 ms; the rail chips fade in
   with the same stagger (CSS).
2. Hold 200 ms.
3. E pulls itself out over 700 ms along the normal pull curve (`pull = ease(t)`), lands, prints in.
4. Done: the scroll model owns the deck. Its pose at `p ≈ 0` equals the intro's end state, so there
   is no jump.

If `p` passes `0.5 / N` during the intro, the clock runs at 4× until the intro finishes. Deep links
(`p ≥ 0.5 / N` at mount) and reduced motion skip it.

**Gestures**

- Desktop: pointer move drives tilt (presented) and hover lift (racked, by raycast, throttled to
  frames; cursor `pointer` over a racked card). Click on a racked card = jump to that rank, as the
  rail does. The camera follows the pointer by `±0.15` units on x and y, smoothed `τ = 200 ms`,
  looking at the stage centre.
- Phone: a horizontal swipe on the stage (`|dx| > 40 px` and `|dx| > 2 × |dy|`, judged at pointer
  up) moves one rank forward or back; vertical movement is left to the page. A tap on the peeking
  next card moves forward. `deviceorientation` tilt starts only after a tap on the presented card;
  on iOS that tap calls `DeviceOrientationEvent.requestPermission()` once, and a denial ends the
  matter silently. No camera parallax.

**Scroll binding and mounting.** `index.ts` observes the journey box (`IntersectionObserver`,
`rootMargin: 0 0 -15% 0`). The deck chunk is prefetched (`import()`, no mount) in an idle callback
after the first `scroll` event, together with the E portrait at the current pixel ratio. The stage
mounts when the box intersects, or immediately when it is already in view at load (deep links).

**Render loop.** Continuous `requestAnimationFrame` while the box intersects the viewport and the tab
is visible, because the seams, float and smoke are always alive. Paused otherwise; the renderer is
disposed after 30 s out of view and re-created on return (textures survive in a cache). The mid tier
renders every frame at the lower pixel ratio; it never skips frames, because a skipped frame is a
visible stutter during a pull.

## 8. Energy, light and material

**Colour management.** The site's palette must survive the renderer exactly. So: `toneMapping =
NoToneMapping`, `outputColorSpace = SRGBColorSpace`, every painted texture tagged sRGB. Face and back
use the **laminated recipe**: `MeshPhysicalMaterial` with `color = #000000`, `emissive = #ffffff`,
`emissiveMap = the painted texture`, no `map`, `metalness = 0`, `roughness = 0.35`,
`clearcoat = 0.6`, `clearcoatRoughness = 0.25`, `envMapIntensity = 0.5`.
Emissive passes the painted colours through untouched; the clearcoat and environment add the
highlight on top, so a tilt sweeps a soft reflection across the card without changing its colours.
Frame, text and chip layers are `MeshBasicMaterial` (unlit, transparent). S and S+ faces add
`sheen = 1`, `sheenColor = #7040d2`, `sheenRoughness = 0.5`: a violet velvet rim as the card turns.

**Environment.** A procedurally painted equirectangular canvas (near-black, one soft white bar
upper-left matching the key light, one dim violet bar right) run through `PMREMGenerator`. It is
assigned to the card materials, not to `scene.environment`.

**Lights.** Ambient 0.35 white. Key: directional white 2.2 from upper-left (the same direction the
portraits are lit from). Rim: directional `#9080ff` 0.8 from right-rear. Energy: a `#7040d2` point
light 1.6 units in front of the energetic card, intensity `energy × 16` at S and `energy × 55` at
S+, breathing ±15 % on a 3 s sine. The lights shape the slabs, edges and clearcoat only; the painted
colours are emissive.

**Energy value.** 0 for E–A. S: 0.3 while presented, `0.15 × pull` while pulling. S+: `0.25 +
0.75 × min(1, within / 0.7)` while presented, `0.15 × pull` while pulling. During the S → S+
handoff both cards are energetic; the stage-level `energy`, `kind` and the light's position follow
the card with the larger `pull`.

**Landing flare.** On `landing` of S+: the point light runs at 3× for 400 ms (ease-out back to
base), 30 puffs burst at once, the fog strength gets +0.5 decaying over 600 ms, the glow sprite
scales ×1.4 and settles. S gets a smaller flare: 1.6×, 12 puffs, no fog kick.

**Glow.** The glow-mask plane (per card) and a soft additive violet sprite behind the energetic card
(scale in world units `4.2 × k` at S and `(7 + 9 × energy) × k` at S+, where `k = cardW / 260 px`
keeps the demo's proportions at any card size). Both sit on the bloom layer.

**Smoke (puffs).** A pool of 140 sprites (70 on the mid tier), each a procedurally painted 256 px
puff (nine overlapping soft blobs, three texture variants), `#7040d2` with a quarter `#9d86d8`,
normal blending, `depthWrite` off, `z` spread from −0.3 to +0.35 so some pass in front of the card.
Emission from the top edge (half) and the two side edges (a quarter each). Rise and drift; scale
grows from 0.35–0.7 by 0.4–1.0 over life; opacity `sin(π·t)` up to 0.10–0.22 scaled by energy; life
140–290 frames; slow rotation. Rate per frame: S `0.35`; S+ `1.2 + 4 × energy`. S+ puffs travel
`1 + 1.5 × energy` faster sideways, which carries them out of the column across the section.

**Fog (far field).** One full-stage plane at `z = −0.5` with a `ShaderMaterial`: three-octave value
noise scrolled upward over time, masked by a radial falloff around the energetic card's centre with
radius `1.0` units at S and `1.2 + 2.4 × energy` at S+, colour `#7040d2`, alpha `strength × noise`
with strength `0.10` at S and `0.35 × energy` at S+, additive. Uniforms: time, centre, radius,
strength, aspect. About sixty lines of GLSL; no textures.

**Contact shadow.** A radial black sprite squashed to `1.15 × cardW` by `0.35 × cardW`, opacity 0.55
at the centre, on the floor line under the presented card and under a pulling card, following x; its
opacity falls with the lift (`× (1 − 0.5 × z / z_max)`). Racked cards cast none.

**Bloom.** High tier only, in `deck-bloom.ts` (a second lazy chunk): `EffectComposer` with a
selective pass rendering only bloom-layer objects (glow masks, seams, glow sprites) through
`UnrealBloomPass(strength 0.9, radius 0.6, threshold 0)` at half resolution, composited additively
over the base render (the official selective-bloom pattern). Text never blooms because it is not on
the layer. Mid tier: no composer; the same objects render additively with 1.6× opacity so the eyes
and seams still read as lit.

**Tiers** (decided once at script start; a missing `deviceMemory` or `hardwareConcurrency` counts
as passing, since Safari and Firefox don't report them):

| Tier | Condition                                                                               | Result                                                            |
| ---- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| none | reduced motion, `saveData`, no WebGL2, `hardwareConcurrency ≤ 2`, or `deviceMemory ≤ 2` | Timeline. The stage never mounts, no chunk is fetched.            |
| mid  | coarse pointer, or `hardwareConcurrency ≤ 4`, or `deviceMemory ≤ 4`                     | Pixel ratio ≤ 1.5, pool 70, fog on, no bloom, no camera parallax. |
| high | everything else                                                                         | Pixel ratio ≤ 2, pool 140, fog, bloom, camera parallax.           |

Every number in this section is a starting value; Phase 6 tunes them with Marcus through the panel.

## 9. Rendering architecture

Files in `src/scripts/deck/` (a new directory, so it never collides with the old
`src/scripts/journey.ts` while both exist):

| File             | Role                                                                                                                         | Tests                               |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `deck-params.ts` | Tunable constants with defaults (§4).                                                                                        | type-checked                        |
| `deck-layout.ts` | Pure layout function (§6).                                                                                                   | `test/deckLayout.test.ts`           |
| `deck-pose.ts`   | Pure pose model, intro and phases (§7). No DOM, no Three.                                                                    | `test/deckPose.test.ts`             |
| `deck-paint.ts`  | Paints body, text, frame, chip, back textures and the placeholder portrait into canvases from data.                          | `test/deckPaint.test.ts` (fake ctx) |
| `deck-stage.ts`  | The Three.js scene: slabs, layers, materials, environment, lights, smoke, fog, shadow, gestures, loop, resize, context loss. | e2e + visual                        |
| `deck-bloom.ts`  | The composer and selective bloom pass; high tier only.                                                                       | visual                              |
| `deck-tune.ts`   | Dev-only tuning panel (`import.meta.env.DEV && location.search.includes("tune")`).                                           | none (dev only)                     |
| `index.ts`       | Tier check, observer, prefetch, scroll binding, rail, gestures' page side, aria-live, state attributes, fallbacks.           | `test/journey.test.ts` (rewritten)  |

- **Chunks.** `three` is a normal pinned dependency. `deck-stage.ts` is a dynamic import from
  `index.ts`; `deck-bloom.ts` is a dynamic import from `deck-stage.ts` on the high tier. Neither is
  in the home page's initial graph. Imports name only what is used (`WebGLRenderer`, `Scene`,
  `PerspectiveCamera`, `Group`, `Mesh`, `PlaneGeometry`, `MeshPhysicalMaterial`,
  `MeshStandardMaterial`, `MeshBasicMaterial`, `ShaderMaterial`, `Sprite`, `SpriteMaterial`, the
  three lights, `CanvasTexture`, `PMREMGenerator`, `Color`, `Layers`, `Raycaster`, `Vector2/3`;
  from `three/addons`: `RoundedBoxGeometry`, and in the bloom chunk `EffectComposer`, `RenderPass`,
  `ShaderPass`, `UnrealBloomPass`, `OutputPass`).
- **Textures and memory.** Sizes follow the on-screen card times the pixel ratio, capped at
  1040 × 1456. Body: one per card, RGBA with mipmaps and anisotropy 8, painted lazily when the card
  comes within one rank of the active one. Text: one per _slot_
  (presented, incoming), repainted in place during the print-in, never per card. Frame and back:
  one each, shared. Chip: one per rank, 160 × 56. Glow mask: one per card, single channel
  (`RedFormat`), at the 1× portrait size. Smoke: three 256² alpha textures. Environment: one 256
  PMREM. Estimated total on a 1440 × 900 high-tier display: about 60 MB; the ceiling is 80 MB on
  desktop and 40 MB on phones, and the stage reports its estimate on `data-deck-vram`. Textures are
  disposed with the renderer after 30 s out of view and repainted from the cached canvases on return.
- **Fonts.** The painter awaits `document.fonts.load()` for 400 normal and 400 italic JetBrains Mono
  before its first paint, using the family name the Fonts API registers (`--font-jetbrains`).
- **Portraits.** One source per rank, `src/images/journey/<rank>.webp`, plus its mask
  `<rank>-glow.webp` (§10). `Journey.astro` asks astro:assets (`getImage`) for a 400 and an 800 px
  WebP rendition of each portrait and for the mask, and writes the hashed URLs on the rail's buttons
  as `data-portrait-1x`, `data-portrait-2x` and `data-glow`; the stage picks the rendition for its
  pixel ratio. The same sources feed the timeline's `Still`, so there is one copy of the art and the
  URLs are cache-busted. The E portrait prefetches with the chunk; the rest load in rank order once
  the stage mounts, decoded with `img.decode()`, `fetchPriority: "low"`. A card can land before its
  portrait is in: the body paints the placeholder (§10) and repaints when the image arrives,
  cross-fading the body texture over 300 ms.
- **State attributes** on `[data-deck]`, updated on change (energy rounded to 0.05):
  `data-deck-state` (`loading` | `intro` | `scroll` | `fallback`), `data-deck-rank` (`E`…`S+`),
  `data-deck-phase` (`racked` | `pulling` | `landing` | `presented` | `leaving`), `data-deck-energy`,
  `data-deck-tier`, `data-deck-vram`, and `data-deck-ready` once the first frame after all textures
  and portraits is rendered.
- **Freeze.** With `?deck-freeze=<iso-date>` in the URL: the clock is fixed at that date, the RNG is
  seeded, the intro is skipped, smoothing is off, and the loop renders one frame after
  `data-deck-ready` and stops. It works in every build, because e2e and the visual baselines run
  against the production build; a visitor who adds it by hand only gets a still deck.
- **Fallbacks.** Tier `none`, `webglcontextlost` without a restore within 2 s, a `webglcontextcreationerror`,
  or any exception during mount set `data-deck-fallback` on the section: the track collapses, the
  canvas is removed, the timeline shows. Reduced motion never mounts the stage.
- **A11y.** The timeline is the readable content; the rail is the only interactive surface for
  keyboard and assistive tech; the canvas is `aria-hidden`; the aria-live paragraph announces rank
  changes; nothing flashes faster than the single 400 ms flare.
- **Tuning panel.** `deck-tune.ts` mounts a small panel with range inputs bound to `deck-params`, a
  live FPS and VRAM readout, and a "copy JSON" button. It is imported only under
  `import.meta.env.DEV`, so it is tree-shaken out of production.

## 10. The character and the Higgsfield pipeline

**Bible** (goes verbatim, with the ladder row and the framing, into every prompt):

> An original man in his late twenties, lean athletic build, warm mid-tone skin (#d2a679, hard
> shadow #a67c52), messy medium-length jet-black hair (#0e0e12) with a fixed left part that falls
> over the right side of the forehead, narrow eyes under straight dark brows, a small pale scar
> through the outer right eyebrow. He always wears a small matte-black terminal-cursor pendant on a
> thin cord, and every outfit has one ember-orange (#da5c2c) stitched seam or cable detail. Anime
> illustration with clean line art, flat cel shading with one hard shadow tone, a limited palette of
> near-black, charcoal, grey, the skin tones, ember orange and deep violet (#7040d2) only where named.
> Plain black (#000000) background and nothing else. No text, no logos, no watermark, no frame. No
> red eyes, no fangs, no face markings, no weapons, no shadow soldiers, not Sung Jin-Woo, no Solo
> Leveling costume. He does not resemble any existing anime or manga character or any real person.

**Ladder** (one visible change per rank; the arc lives in the face and the posture as much as the
coat):

| Rank | Outfit                                                              | Eyes                                                    | Expression                    | Posture                               |
| ---- | ------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------- | ------------------------------------- |
| E    | Grey hoodie, headset around the neck, company lanyard               | Wide, warm brown `#6b4a2f`, no glow                     | Open, eager, a little anxious | Shoulders slightly forward            |
| D    | Dark company polo, no headset, sleeves pushed up                    | Slightly narrower, a cold grey glint `#7a8088`          | Focused, the start of a smile | Upright                               |
| C    | Black shirt, laptop-bag strap across the chest                      | Steel grey `#96a0aa`, alert                             | Determined                    | Head a touch down, eyes up            |
| B    | Rolled sleeves, a coiled patch cable over one shoulder              | Steel grey with a faint violet rim on the iris          | Tired but sharp               | Jaw set                               |
| A    | Fitted black technical shirt, rack keys on a carabiner              | Violet iris `#7040d2`, no glow                          | Quiet confidence              | Squared shoulders                     |
| S    | Dark technical coat, closed to the collar                           | Violet iris, glowing `#9d7cf0`                          | Calm authority                | Chin level, slight three-quarter turn |
| S+   | The coat open, violet energy visible inside it and at the shoulders | White-violet `#e6ddff`, the glow breaking past the lids | Serene, unbothered            | Chin slightly up, energy rising       |

**Framing for all seven:** 3:2 landscape, bust portrait, eye line at 40 % of the height, shoulders
cut by the bottom edge, the character centred in the left two-thirds so the right third stays clear
for the quote, front-facing with a slight three-quarter turn to the left, one key light from the
upper left (the stage's key light matches it). Same camera, same distance, every time.

**Workflow** (all through the connected Higgsfield MCP; at most five jobs per batch; each batch is
shown to Marcus before the next):

1. `character-sheet` workflow, anime/2D preset, from the bible: a turnaround (front, three-quarter,
   profile) and an expression row. Iterate until Marcus approves the face. Record the job IDs.
2. Identity lock: register the approved sheet as a Higgsfield Character if the MCP offers it; if
   not, pass the sheet as reference images on every later job, which is how the current art was kept
   consistent.
3. Seven portraits with `nano_banana_pro` at 4K in two batches (E–D–C–B, then A–S–S+); prompt =
   bible + ladder row + framing. Marcus picks per rank; re-rolls stay within the five-job cap.
4. The devil mark is traced once from `evil_logo.webp` with `potrace` in Phase 2 and committed as
   `src/images/devil-mark.svg`; no render.

**Import.** `scripts/import-portrait.mjs <file> <rank>` (sharp): writes
`src/images/journey/<rank>.webp` (1600 wide, quality 82, metadata stripped; astro:assets makes the
400 and 800 px renditions and the timeline's sizes from it) and `src/images/journey/<rank>-glow.webp`
(400 wide, greyscale): a mask from keying violet (hue 250–285°, saturation > 0.35, value > 0.25),
blurred 3 px. It prints the mask coverage and fails when it is outside the rank's band in
`src/data/deck.ts` (starting bands: E–C 0–0.05 %, B 0.05–0.5 %, A 0.1–1 %, S 0.3–2 %, S+ 1–8 %;
adjusted after the first batch). Prompts, job IDs and picks go in `docs/imagery.md` under a new
"Card deck" section; the old journey-art sections stay for history and are marked retired.

**Placeholder.** Until a rank's portrait exists, `deck-paint.ts` paints a procedural silhouette
(head and shoulders in `#0d0d0d` on a faint violet field, two eye ellipses whose colour follows the
ramp) so the deck builds, tests and demos without art. Missing sources are skipped by
`Journey.astro` (no data attributes for that rank) until Phase 6, when all seven become required.

## 11. Budgets and performance

| Budget                          | Value                                                                                 | Enforced by                                                                                                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Initial JS on `/`               | ≤ 100 KB gz (unchanged)                                                               | `pnpm size`                                                                                                                                                                                              |
| Deck chunk (Three.js + stage)   | ≤ 170 KB gz, not in the initial graph                                                 | `pnpm size` (new row)                                                                                                                                                                                    |
| Bloom chunk                     | ≤ 40 KB gz, not in the initial graph                                                  | `pnpm size` (new row)                                                                                                                                                                                    |
| Motion                          | ≤ 30 KB gz (unchanged)                                                                | `pnpm size`                                                                                                                                                                                              |
| Portraits                       | Served renditions: 800 px ≤ 120 KB, 400 px ≤ 40 KB, mask ≤ 10 KB, for all seven ranks | `pnpm size` reads the `data-portrait-*`/`data-glow` URLs from `dist/client/index.html` and measures those files (replaces the scene row and the stray-file rule; `dist/client/journey` no longer exists) |
| GPU textures                    | ≤ 80 MB desktop, ≤ 40 MB phone (estimate on `data-deck-vram`)                         | `pnpm perf:deck`, e2e reads the attribute                                                                                                                                                                |
| Third-party requests            | 0                                                                                     | e2e                                                                                                                                                                                                      |
| Home page weight at load        | ≤ 600 KB (unchanged; the deck loads later)                                            | Lighthouse CI                                                                                                                                                                                            |
| Frame time                      | p95 ≤ 16.7 ms through a scripted scroll on the dev Mac; no long frames > 50 ms        | `pnpm perf:deck` (local, not CI)                                                                                                                                                                         |
| Frame rate on a mid-range phone | No dropped frames during a pull                                                       | manual, per the workflow's browser check                                                                                                                                                                 |

Rules: pixel ratio capped by tier; smoke pool and fog by tier; textures capped at 1040 × 1456;
continuous loop only while visible; renderer disposed after 30 s out of view; `powerPreference:
"high-performance"`; `premultipliedAlpha` on; no shadow maps (the contact shadow is a sprite).

`scripts/deck-perf.mjs` (`pnpm perf:deck`): launches headed Chromium with Playwright against the
production build, scrolls the track at a fixed speed twice (cold and warm), collects frame timestamps
from `requestAnimationFrame` in the page, and prints p50, p95, the count of frames over 50 ms, and
`data-deck-vram`. Local only; CI has no GPU worth measuring.

## 12. Tests

- **Unit**
  - `deckLayout`: card size clamps, the composition fits the column at 1024, 1440 and 2560, the
    phone anchors at 390 and 430, floor and presented positions.
  - `deckPose`: pull curve endpoints, the 70 % handoff window, E never returns at the top and S+
    never at the end, phone vs desktop poses, clamped progress, energy per rank, tilt limits, float
    amplitudes, the intro's timeline and its fast-forward, phases.
  - `deckPaint`: every stage paints at every line count without throwing; the quote wraps within
    42 % width; eight tags then "+N"; the XP glyph count; the S+ chip is the top variant and the S
    chip's border is violet; the placeholder paints for every rank; nothing paints outside the
    canvas.
  - `career`: `log` present and under 80 characters for every stage; `stageMonths`, `tenure`, `xp`
    (S+ is 1), `setNumber`, `acquired`, all with a fixed `now`.
  - `deck` data: every rank has outfit, eyes, expression, posture, alt starting "Illustration:", and
    a coverage band.
  - `importPortrait`: the violet key on a synthetic image yields the expected coverage; the band
    check fails outside it.
  - `checkBundleSize`: the new rows, the portrait renditions found through the built page's data
    attributes, the chunk-not-initial assertion.
- **Component**: `Journey` renders the canvas host, seven rail buttons with names and roving
  tabindex, the counter, the aria-live paragraph, `data-now`; `JourneyTimeline` renders seven entries
  with title, org, dates, tenure, summary, skills, XP, log and a portrait `Still` with "Illustration:"
  alt; `sr-only` only under `[data-deck-active]`.
- **E2E** (`e2e/journey.spec.ts`, rewritten): no `three` chunk is requested before the first scroll
  and it is after; the stage reaches `data-deck-ready` and `data-deck-state="scroll"`; with
  `?deck-freeze` the rail jumps to S+ and `data-deck-rank`, the counter and aria-live update; ← →
  move the rail's focus; clicking the stage where the B card sits jumps to B; a horizontal swipe on
  a 390 viewport moves one rank; reduced motion shows the timeline and requests no chunk; a forced
  context loss (`WEBGL_lose_context`) swaps to the timeline; `data-deck-vram` is under the ceiling;
  `--progress` reaches 1 at the track end; the CSP header still holds on `/`; zero third-party
  requests.
- **Visual**: baselines at E, S and S+ on 1440 and 390 with `?deck-freeze=2026-09-25`.

## 13. Security and CSP

No inline scripts or styles. Three.js is built without `eval`; the CSP is unchanged. Canvas textures
are same-origin images, so `getImageData` works and the canvas is never tainted. `deviceorientation`
is only listened to after a tap and never prompts uninvited. No new env vars. The tuning panel is
compiled out of production builds; `?deck-freeze` stays, and only stills the deck.

## 14. The record

- **ADR 0004 — Three.js, lighting, bloom, glow and smoke inside the journey.** Amends 0002 (motion,
  elevation, imagery, budgets) and 0003 (violet). Decisions: Three.js is allowed only for the
  journey deck and must load lazily outside the initial JS (the chunk may prefetch after the first
  scroll); WebGL lighting, an environment reflection and selective bloom are allowed on the deck's
  meshes; glow is allowed on the S and S+ cards only, as light, bloom and additive sprites, never CSS;
  violet smoke and fog are allowed from the S and S+ cards only and may cross the column inside the
  section; the S RankChip may carry a violet border inside the deck; the journey section is `void`.
  UI outside the section keeps ADR 0002 exactly.
- **CLAUDE.md**: the design brief lines "no shadows, gradients, blur or glow", "Animate only
  `transform` and `opacity`" and "no Three.js" get "(except the journey deck, ADR 0004)"; the Journey
  bullets describe the deck, its files under `src/scripts/deck/`, tiers, `?deck-freeze` and `?tune`;
  the imagery bullet and the art-pipeline paragraph are rewritten for `import-portrait.mjs` and
  `src/images/journey/`; the `pnpm size` line and the budgets list change (deck and bloom chunks,
  portrait renditions, no scene); the loading rule becomes "the deck chunk may prefetch after the
  first scroll; portraits load only once the journey is on screen"; `pnpm perf:deck` joins the
  commands.
- **Deleted in Phase 3**, when `Journey.astro` switches to the deck: `src/scripts/{journey,avatar,
scene}.ts`, `src/components/journey/silhouette.svg`, `test/{avatar,scene}.test.ts` (the old
  `test/journey.test.ts` is rewritten).
- **Deleted in Phase 6**: `public/journey/scene.svg`, `art/journey/`, `scripts/{import-art,
register-outfit,build-scene,trace-vector,render-rank-stills}.mjs`, `src/data/avatar-rig.json`, the
  rank stills, `test/{avatarRig,buildScene,journeyArt,renderRankStills,sceneSvg}.test.ts`, the
  `potrace` dependency (the mark was traced in Phase 2). `2026-09-25-vector-journey-design.md` gets a
  "Superseded" status line pointing here.
- **Build Log** in `~/vaults/personal/Projects/evilist.io.md` after each phase.

## 15. Phases

1. **Character.** Sheet → identity lock → seven portraits → `import-portrait.mjs` →
   `docs/imagery.md`. Gate: Marcus approves the sheet and each batch. Runs alongside 2–4; the
   placeholder keeps them unblocked.
2. **Data, paint, pose, layout.** `log`, the helpers, `src/data/deck.ts`, `deck-params.ts`,
   `deck-layout.ts`, `deck-pose.ts`, `deck-paint.ts` with the placeholder, the devil mark, unit
   tests, PDF rebuild.
3. **Stage, desktop.** Renderer and colour management, materials and environment, slabs and layers,
   intro, smoothing, float, hover and click, camera parallax, rail and hint, prefetch and mount, the
   twin, fallbacks, state attributes, the tuning panel; `Journey.astro` switches to the deck and the
   old scene modules go (§14). Gate: browser check at 1440.
4. **Energy.** Glow masks, seams, smoke, fog, flares, contact shadow, `deck-bloom.ts`, tiers. Gate:
   browser check at 1440.
5. **Phone.** The "deck behind" layout, swipe, tap, orientation tilt, tier behaviour. Gate: browser
   check at 390, 430 and 768.
6. **Tune, retire, record.** A tuning session with Marcus through the panel, values committed to
   `deck-params.ts`; `pnpm perf:deck`; delete the scene pipeline; `pnpm size` rows; ADR 0004;
   CLAUDE.md; timeline portraits; visual baselines; `docs/imagery.md`; Build Log.

Each phase gets Marcus's approval before it starts, per the project workflow. Every phase ends with
`pnpm check && pnpm lint && pnpm test && pnpm build`, and phases 3–6 with the browser check.

## 16. Out of scope

- Changing the section's heading or its place on the page.
- Any other use of Three.js, bloom, glow or violet on the site.
- Sound.
- A card for future roles; the deck is exactly the seven stages in career.ts.
- A reduced-motion version of the deck (those visitors get the timeline). Could be revisited later.
- Rendering the S+ card as the social card. A good follow-up once the portraits exist.
