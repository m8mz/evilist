# Axiom design system for evilist.io

- **Status:** Draft for review
- **Date:** 2026-09-24
- **Decider:** Marcus Hancock-Gaillard
- **Supersedes:** the "manga panel at night, stamped with a hanko seal" design brief (Phase 2 of the rebuild plan)

## 1. Purpose

Replace the site's visual system with one derived from the Axiom style reference
(<https://styles.refero.design/style/c809190a-035c-458d-87ed-4758807dd84e>): a
terminal-grade dark interface where every glyph is monospaced, every surface is
near-black, and one warm accent does all the chromatic work. The Devin reference
(<https://styles.refero.design/style/e9a1c1e1-2c35-47c0-864f-d1e9fea57579>) is
secondary: large, tightly-tracked headlines and dark bento panels.

The site's purpose does not change: employers first, clients second. What changes is
the register — from anime title card to engineer's terminal — and one addition: a
compact view of Marcus's world outside work (his rig, games, anime, lifting) so the
site reads as a person, not a resume.

Everything else stays: Astro 7 structure, `career.ts`/`site.ts` data, the
scroll-driven E→S journey, the resume and PDF, Notes, the hardened contact action, CSP,
JS budgets, zero third-party requests, self-hosting.

## 2. Decisions (made in the brainstorm, do not re-litigate)

| Question         | Decision                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| "AI-powered"     | Built with AI; no runtime AI feature. Zero third-party requests stands.                                                        |
| Reskin depth     | Full transplant. Diagonal cuts, speed lines, hanko seal, gold and the Three.js aura go. Rank E→S stays as a feature.           |
| Accent           | Ember orange `#da5c2c`, per Axiom. Crimson retired except in the favicon/OG mark.                                              |
| Type             | JetBrains Mono everywhere, weights 400/700, Fontsource provider. No proportional fallback for content.                         |
| Personal content | One home section (`~/off-the-clock`) plus a `/now` page, both from `src/data/now.ts`.                                          |
| Imagery          | SVG in code for anything diagrammatic or animated; Higgsfield stills (`nano_banana_pro`) in three places. Real portrait stays. |
| Execution        | Primitives first, then sections. Four branches, four approvals (§10).                                                          |

## 3. Tokens (`src/styles/tokens.css`, Tailwind 4 `@theme`)

### 3.1 Colour

| Token              | Value     | Role                                                     |
| ------------------ | --------- | -------------------------------------------------------- |
| `--color-void`     | `#000000` | Page background, header, terminal canvas                 |
| `--color-carbon`   | `#111111` | Primary surface, hero canvas, footer, code blocks        |
| `--color-graphite` | `#191919` | Elevated panels, case cards                              |
| `--color-iron`     | `#202020` | Hairline borders, dividers                               |
| `--color-slate`    | `#3a3a3a` | Muted borders, icon strokes, arrow-field glyphs          |
| `--color-steel`    | `#606060` | Tertiary text, tags, inactive labels, `~/` prompt prefix |
| `--color-ash`      | `#7e7e7e` | Annotations, helper text                                 |
| `--color-fog`      | `#b4b4b4` | Secondary text, pitch, metadata                          |
| `--color-paper`    | `#eeeeee` | Primary text, headings, nav, wordmark                    |
| `--color-ember`    | `#da5c2c` | The one accent (§3.2)                                    |

Measured contrast: ember on void **5.55:1** (passes AA for text); paper on an ember
fill **3.3:1** (fails AA at body size). Therefore **filled controls carry void text**,
a deliberate deviation from Axiom for the Lighthouse accessibility gate. Paper on
void is 17.4:1; fog on void 9.0:1; steel on void 3.1:1 (large/decorative only).

Elevation is expressed only by stepping surfaces (`void → carbon → graphite → iron`).
No `box-shadow`, no gradients, no `filter: blur()`, no glow.

### 3.2 Where ember may appear

1. Primary button fill (`Button` primary).
2. The blinking cursor in `Prompt`.
3. The 2px left border on `Panel case` (work items, notes, journey stage cards).
4. `LogBars` bars, the topology pulse dot, and LEDs inside the journey SVG scene.
5. Links on hover, `:focus-visible` outline, `::selection` background.

Nowhere else: not headings, not icons, not borders, not status, not the rank chips
other than S.

### 3.3 Type

| Token               | Size                                   | Line height | Use                                                                   |
| ------------------- | -------------------------------------- | ----------- | --------------------------------------------------------------------- |
| `--text-caption`    | 12px                                   | 1.5         | tags, annotations, chrome labels                                      |
| `--text-body`       | 15px                                   | 1.7         | all prose and UI text (Axiom uses 14px; raised for long-form reading) |
| `--text-heading-sm` | 18px                                   | 1.56        | card titles                                                           |
| `--text-heading`    | 20px                                   | 1.4         | h3                                                                    |
| `--text-heading-lg` | 24px                                   | 1.33        | h2                                                                    |
| `--text-display`    | 32px                                   | 1.25        | page titles                                                           |
| `--text-hero`       | `clamp(2rem, 1.2rem + 3.5vw, 3.75rem)` | 1.1         | the name in the hero                                                  |

Letter spacing 0 everywhere. Headings are weight 400: hierarchy comes from size, not
weight. 700 is reserved for emphasis, the wordmark and primary button labels.

Font: JetBrains Mono, provider `fontProviders.fontsource()`, weights `[400, 700]`,
`subsets: ["latin"]`, `fallbacks: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"]`,
`cssVariable: "--font-mono"`. `--font-display` and `--font-body` both resolve to it so
existing component CSS keeps working during the migration. Font bytes ≤ 120 KB
(checked from `dist/` in Phase 1). Dela Gothic One and Zen Kaku Gothic New are removed.

### 3.4 Shape and space

- Radius: 2px on every container, card, button and input. 9999px only on badges under
  32px (the terminal-chrome dots).
- Spacing: 8px base. `--section-y: clamp(4rem, 2.5rem + 4vw, 6rem)`; panel padding 24px
  (mobile) / 32px; element gap 16px; page max-width 72rem (`.wrap` unchanged).
- `--cut` is deleted. Sections are separated by a 1px iron rule and a `Prompt` eyebrow.

### 3.5 Motion

Unchanged rules: animate only `transform`, `opacity`, `pathLength`; every animation
respects `prefers-reduced-motion`; JS-only states behind `@media (scripting: enabled)`.

Signature micro-motions, each ≤ 1 s and CSS-only:

- `Prompt` cursor blink (`opacity` steps, 1 s cycle; static block under reduced motion).
- `ArrowField` drift (`transform: translateX` on a duplicated strip, 40 s linear loop;
  static under reduced motion).
- `LogBars` stream-in (`transform: scaleY` from 0, staggered 30 ms, on `inView` via
  the existing `motion` import; rendered at full height without JS or under reduced
  motion).

Removed: the Three.js hero aura (`HeroAura.astro`, `scripts/hero-aura.ts`,
`scripts/hero-aura-scene.ts`, the `three` dependency and its budget line). The system
forbids glow, and dropping it removes 170 KB of lazy JS.

## 4. Primitives (`src/components/ui/`)

| Component       | Replaces             | Contract                                                                                                                                                                                                                           |
| --------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Section`       | `Section` (cut/tone) | Props `id`, `tone: "void" \| "carbon"`, `prompt?: string`. Renders a 1px iron top rule, a `Prompt` eyebrow when `prompt` is set, then the slot. No cuts.                                                                           |
| `Panel`         | `Panel`              | Props `variant: "default" \| "case"`. Graphite surface, 1px iron border, 2px radius, 24/32 padding. `case` adds a 2px ember left border.                                                                                           |
| `Button`        | `Button` (angled)    | Props `href`, `variant: "primary" \| "ghost"`. Primary: ember fill, void text, 700, `→` appended. Ghost: transparent, 1px slate border, paper text, `→` appended. Hover changes colour only.                                       |
| `RankChip`      | `RankBadge`          | Props `rank: "E" \| "E+" \| "D" \| "C" \| "B" \| "A" \| "S"`, `size: "sm" \| "md"`, `label?`. Renders `[ S ]` in mono on graphite with a 1px slate border. S only: ember fill, void text. `aria-label` from `label` or `"Rank S"`. |
| `Prompt`        | —                    | Props `path`, `cursor?: boolean`. `<p>` with `~/` in steel, `path` in paper, optional blinking block cursor in ember. Used as every section eyebrow.                                                                               |
| `ArrowField`    | `SpeedLines`         | Decorative `aria-hidden` block of repeated `>` glyphs in slate, 12px, laid out on a diagonal by CSS; drifts slowly. Contained by the parent's `overflow: hidden`.                                                                  |
| `LogBars`       | —                    | Props `values: number[]` (0–1), `label`. Inline SVG of 4px-wide ember bars, 2px gaps, heights from `values`. `role="img"` with `aria-label`.                                                                                       |
| `Tag`           | —                    | Uppercase 12px steel text, no fill, no border.                                                                                                                                                                                     |
| `KeyValue`      | —                    | Props `rows: { key: string; value: string \| { href: string; label: string } }[]`. `<dl>` rendered as `key: value` mono rows; keys in steel, values in paper; link values get `→`.                                                 |
| `TerminalFrame` | —                    | Wraps a slot in a terminal window: carbon chrome bar (three 8px slate dots, a title in 12px fog, an optional right-hand slot), 1px iron border, 2px radius. Used for the hero portrait and the 404.                                |

Deleted: `SpeedLines.astro`, `SealInkFilter.astro`, `RankBadge.astro` (after every
usage moves to `RankChip`).

## 5. Layout shell

- **Header**: 56px void bar, 1px iron bottom rule. Wordmark is text: `~evilist` with
  `~` in steel and `evilist` in paper 700 (the webp logo is dropped from the header; it
  remains the favicon and the OG mark). Nav: Resume · Now · Notes · Contact, 14px,
  `aria-current="page"` shown as a 1px paper underline. Mobile menu keeps
  `scripts/menu.ts` behaviour (button with `aria-expanded`, Escape and outside-click
  close); the panel is a carbon sheet.
- **Footer**: carbon strip, links as `→ github`, `→ linkedin`, `→ discord` (hidden when
  `PUBLIC_DISCORD_INVITE_URL` is unset), `→ rss`; line "self-hosted on Linux behind
  HAProxy · built with Astro"; © year.
- **SkipLink**: unchanged.
- **Global** (`global.css`): body 15px/1.7 mono on void; `color-scheme: dark`; links
  paper with a 1px underline, ember on hover; `:focus-visible` 2px ember outline, 3px
  offset; `::selection` ember/void; `theme-color` meta `#000000`.

## 6. Home page (`src/pages/index.astro`)

Order: Hero → Journey → Skills → Work → About → Off the clock → CTA.

### 6.1 Hero

Two columns from 60rem (copy 1.35fr, portrait 1fr), stacked below.

- Copy: `Prompt path="marcus"` with cursor; `<h1>` name at `--text-hero`, 400, paper;
  role line `Sr. Systems Architect · Mesa, Arizona` in fog; pitch in fog at body size,
  max 34rem; buttons `See the journey →` (primary, `#journey`) and `Read the resume →`
  (ghost, `/resume`); `KeyValue` facts: `years: 10`, `datacenters: 2`,
  `uptime: 99.99%`, `compliance: PCI-DSS, HIPAA` (years from `yearsOfExperience()`).
- Portrait: `TerminalFrame` titled `marcus@evilist:~` with `RankChip rank="S" size="sm"`
  in the chrome's right slot; inside, the existing `author-pic.webp` via `astro:assets`
  (`loading="eager"`, `fetchpriority="high"`, `filter: saturate(0.85)`), square, 2px
  radius.
- `ArrowField` behind the copy column, clipped by the section.
- No aura, no speed lines, no stamped seal.

### 6.2 Journey

Mechanics untouched: pinned stage, `scripts/journey.ts` scroll mapping,
`JourneyTimeline` fallback for no-JS and reduced motion, skip link. Restyle:

- Rail: 1px iron track; nodes are `RankChip size="sm"`; the progress fill is ember.
- Stage cards: `Panel variant="case"`; `Tag` for the date range; `RankChip size="md"`;
  title, org, summary, first highlight unchanged.
- `JourneyScene.astro`: recolour classes only. Metal, hoodie, skin, floor, buildings
  in `carbon → slate → fog` steps; grid and dashes in iron/slate; LEDs, the pulse dot
  and the parcel tape are the only ember. The chibi keeps its geometry.
- Section prompt `~/journey`; the h2 "From E-rank to S-rank" and lede stay.

### 6.3 Skills

Prompt `~/stack`. Eight domains from `skills.ts` as a grid (1 col < 40rem, 2 cols
< 64rem, 4 cols above) of `Panel`s: `Tag` = domain name, items as a plain list. No
badges, no colour.

### 6.4 Work

Prompt `~/built`. Two rows:

1. Three `Panel variant="case"` cards from `work.ts`: title (18px), summary, outcome in
   fog, `KeyValue` `stack:` row. Shared repos under them as `→ dotfiles` style links.
2. A side-by-side of the **topology diagram** (§8.1) and the **rack still** (§8.2),
   stacking below 60rem.

### 6.5 About

Prompt `~/how-i-work`. The three existing paragraphs unchanged. The fourth becomes:
"Outside work I lift for my health, not for a platform, and I watch a lot of anime.
Solo Leveling is why the ranks on this site are letters."

### 6.6 Off the clock (new, `src/components/home/OffTheClock.astro`)

Prompt `~/off-the-clock`. One `Panel` with three columns (stacked below 48rem), each
headed by a `Tag` and a 16px slate icon (§8.1):

- `rig` — `KeyValue` from `now.rig`.
- `playing` — list from `now.playing`.
- `watching` — list from `now.watching`.

Below the columns: `training: lifting, for health` with `LogBars` (`values` from
`now.training.weeks`, an illustrative 12-week array with no numbers shown) and a
`→ /now` link.

### 6.7 CTA

Prompt `~/contact`. Copy and buttons unchanged; Discord line unchanged.

## 7. Other pages

### 7.1 `/now` (new, `src/pages/now.astro`, prerendered)

Prompt `~/now`; h1 "Now"; `updated: 2026-09` from `now.updated`. The rig still (§8.2)
full-width under the heading with the prompt overlaid on its left third. Then the
three columns from §6.6 at full length plus `training`, `learning`, `building` rows
from `now.ts`. Nav item `Now` between Resume and Notes. Title "Now · Marcus
Hancock-Gaillard"; description "What Marcus is running, playing, watching and
building right now."

### 7.2 Resume

Same data and sections. `RankChip` per role, `KeyValue` for org/dates, 1px iron
dividers. `print.css` overrides to paper background, void text, JetBrains Mono, no
chips filled. `pnpm build:pdf` regenerated and the PDF committed (the staleness test
requires it).

### 7.3 Notes

List: `Panel variant="case"` rows with title, description, `Tag` per tag, `KeyValue`
`date` and `read` rows. Body: 15px/1.7 mono in a 68ch measure; headings 400; code
blocks on carbon with a 1px iron border and 2px radius; inline code on graphite.

### 7.4 Contact

Recruiter/client tabs become a chip pair styled like `RankChip` (selected = 1px paper
border, paper text; unselected = slate border, fog text). Inputs: carbon, 1px iron
border, 2px radius, ember focus ring. Submit: primary `Button`. `scripts/contact-form.ts`,
`actions/contact.ts`, honeypot, time-trap, rate limit and CSRF check unchanged.

### 7.5 404

A `TerminalFrame` titled `bash` containing:

```
$ cd /the-page-you-wanted
bash: cd: /the-page-you-wanted: No such file or directory
$ cd ~
```

with `→ home` as a ghost button.

### 7.6 SEO

`public/og-default.png` regenerated (§8.2 shot 3 plus overlaid name and role, built
once and committed). JSON-LD, sitemap, RSS unchanged. `<meta name="theme-color">` →
`#000000`.

## 8. Imagery

### 8.1 SVG in code

All SVG uses palette tokens via classes (no inline `style=`), animates only
`transform`/`opacity`, and is `aria-hidden` unless it carries information.

- `ArrowField`, `LogBars`: §4.
- `JourneyScene` recolour: §6.2.
- **Topology diagram** (`src/components/home/Topology.astro`): two datacenter blocks
  labelled `primary` and `dr`, a BGP link between them, an `haproxy` block in front,
  `internet` at the top. Slate 1.5px strokes, 12px mono labels in fog, one ember dot
  travelling the BGP link on a 6 s `offset-path` loop (static under reduced motion).
  `role="img"`, `aria-label="Two datacenters with BGP failover behind HAProxy"`.
  Target ≤ 4 KB.
- **Icon set** (`src/components/ui/Icon.astro`, prop `name`): `tower`, `controller`,
  `play`, `dumbbell`, `arrow`. 16×16, 1.5px slate strokes, round caps. Decorative.

### 8.2 Higgsfield stills

Model `nano_banana_pro` (Google Nano Banana Pro via Higgsfield MCP), 2K, 2 credits per
image. Three variants per shot are generated in one `generate_image_batch`, Marcus
picks one per shot, the rest are discarded. Budget ≈ 18 credits of the 3,010 balance.
Each generation run is quoted and approved in chat before it is submitted.

Files are committed to `src/images/` and served through `astro:assets` as AVIF/WebP
at 800/1200/1600 widths, ≤ 120 KB per rendition, `loading="lazy"`, never in the LCP
path. CSS treatment on every still: 1px iron border, 2px radius, and a 20% carbon
scrim overlay so the three shots sit at one brightness. Prompts and the chosen job IDs
are recorded in `docs/imagery.md` so a regeneration is repeatable.

Shared prompt suffix, appended to each prompt:

> Photographic, near-monochrome palette of pure black, charcoal and soft grey. Exactly
> one light source: a warm burnt-orange glow (#da5c2c) from a single LED strip; no
> other colour anywhere, no RGB rainbow lighting, no blue. Shallow depth of field,
> 35mm lens, f/2, ISO 800 grain, slight vignette. No text, no logos, no brand marks, no
> people, no hands, no screens showing content. Matte surfaces, no lens flare, no
> bloom, no glow halos.

**Shot 1 — rig (`/now` header), 21:9**

> A custom-built gaming PC in a dual-chamber ATX tower with a tempered-glass side
> panel, photographed at night on a dark wooden desk. Through the glass: a large
> three-fan graphics card mounted horizontally, a tower air cooler, clean black braided
> cable runs, and a single horizontal orange LED strip along the bottom edge of the
> chamber. The tower sits in the right two-thirds of the frame; the left third is empty
> dark desk fading to black for text overlay. Camera slightly below the case's
> midline, three-quarter angle.

**Shot 2 — rack (`~/built`), 16:9**

> A single colocation server rack seen from the cold aisle at night, door open. Two
> matching 1U load balancers at eye level with a neat row of small orange link LEDs,
> a bundle of black patch cables dressed in vertical managers, blank panels above and
> below, a fibre patch panel with yellow-free, grey cables. The rack frame is matte
> black; the raised floor tiles are dark grey. Everything outside the rack falls to
> black. Camera at eye level, centred, slight downward tilt.

**Shot 3 — OG background, 16:9 (cropped to 1200×630 in build)**

> An extreme close-up of a dark matte monitor showing a black terminal window: only a
> thin grey window border, a single blinking orange block cursor at the top left, and
> a faint grey `>` arrow texture receding to the right. The screen fills the frame edge
> to edge with a very slight curvature and subpixel texture visible on close
> inspection. Nothing else on screen.

`soul_2` (Soul 2.0, ~1 credit) is reserved for an optional later editorial re-shoot of
the portrait using `author-pic.webp` as the reference image. It is not part of this
work; the real photo ships.

## 9. Data and code changes

### 9.1 `src/data/now.ts` (new)

```ts
export interface NowData {
  updated: string; // yyyy-mm
  rig: { key: string; value: string }[];
  playing: string[];
  watching: string[];
  learning: string[];
  building: string[];
  training: { line: string; weeks: number[] }; // weeks: 12 values in [0, 1]
}
export const now: NowData;
```

Initial values:

- `updated: "2026-09"`
- `rig`: `work: MacBook Pro (M2)` — Marcus confirms Pro or Max before Phase 3 and the
  value is updated then; `cpu: AMD Ryzen 7 7800X3D`; `gpu: XFX Speedster MERC310 Radeon
RX 7900 XTX, 24 GB`; `board: ASUS TUF Gaming B650E-E WiFi`;
  `case: Montech King 95 Pro, dual chamber`.
- `playing`: Call of Duty; World of Warcraft; League of Legends; Old School RuneScape;
  "Steam co-op with friends".
- `watching`: Naruto; Solo Leveling; Demon Slayer.
- `learning`, `building`: seeded with "this site (Astro 7, self-hosted behind HAProxy)"
  and "Go tooling for infrastructure"; Marcus edits freely.
- `training`: `{ line: "lifting, for health", weeks: [0.6, 0.8, 0.8, 1, 0.6, 0.8, 1, 0.8, 0.4, 0.8, 1, 0.8] }`
  (illustrative shape only; it is a texture, not a log). No lift numbers, no
  bodyweight. Basketball is dropped everywhere.

`test/now.test.ts`: `updated` matches `/^\d{4}-(0[1-9]|1[0-2])$/`; every list is
non-empty with unique entries; `training.weeks.length === 12` and every value is in
`[0, 1]`.

### 9.2 Other data

- `site.ts`: `nav` gains `{ href: "/now", label: "Now" }` after Resume.
- `career.ts`, `skills.ts`, `work.ts`: unchanged.

### 9.3 Removed

`three`, `@types/three`, `HeroAura.astro`, `scripts/hero-aura.ts`,
`scripts/hero-aura-scene.ts`, `SpeedLines.astro`, `SealInkFilter.astro`,
`RankBadge.astro`, the Dela Gothic One and Zen Kaku Gothic New font entries, the Three
budget line in `scripts/check-bundle-size.ts` and `lighthouse/budget.json`, and any e2e
assertion that expects the aura canvas.

### 9.4 Documentation

- `docs/decisions/0002-axiom-design-system.md`: records the switch, the accent and
  type choices, the accessibility deviation (void text on ember), the removal of
  Three.js, and the imagery policy.
- `docs/imagery.md`: prompts, model, settings, chosen job IDs, file names.
- `CLAUDE.md`: the "Design brief" section is rewritten to describe this system
  (palette, ember rules, type, radius, no shadows/gradients/glow, the primitives, the
  imagery policy, `now.ts`). The CSP, journey and Playwright gotchas stay.
- Vault: a dated Build Log entry in `~/vaults/personal/Projects/evilist.io.md` after
  each phase.

## 10. Phases and acceptance

One branch and one approval per phase. Before every commit: `pnpm check && pnpm test
&& pnpm build`. Before a phase is called done: browser check at 390, 430, 768 and
1440 px with screenshots; e2e green; `pnpm size` within budget.

| Phase | Branch                | Scope                                                                                     | Acceptance                                                                                                                                                                                                      |
| ----- | --------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | `feat/axiom-1-system` | §3, §4, §5; delete §9.3 items except `RankBadge` (still used until Phase 2).              | Every page renders in the new skin with old section internals; fonts ≤ 120 KB from `dist/`; `three` absent from `dist/client`; contrast tests pass; `pnpm size` initial-JS number drops; baselines regenerated. |
| 2     | `feat/axiom-2-home`   | §6.1–6.5, §6.7, §7.5, §8.1 topology + journey recolour; delete `RankBadge`.               | Journey e2e unchanged and green; no `RankBadge` import remains; Lighthouse local a11y 100, perf ≥ 95; baselines regenerated.                                                                                    |
| 3     | `feat/axiom-3-now`    | §9.1, §6.6, §7.1, §8.1 icons, §8.2 stills (quoted and approved before each run), §7.6 OG. | `/now` and the home block render from `now.ts`; `test/now.test.ts` green; image renditions ≤ 120 KB; no still in the LCP path; nav shows Now; baselines regenerated.                                            |
| 4     | `feat/axiom-4-polish` | §7.2–7.4, PDF regeneration, §9.4 docs, ADR, CLAUDE.md, vault log, final baselines.        | `test/resumePdf.test.ts` green; all Playwright projects green; Lighthouse CI config unchanged and green; Marcus sign-off.                                                                                       |

## 11. Out of scope

- Any runtime AI feature (chat, search, generation).
- A light theme.
- Steam/PSN/Xbox handles or any gaming account links.
- Lift numbers, bodyweight, or training logs.
- A Soul 2.0 portrait re-shoot.
- linux.engineering, analytics, or infrastructure changes (Phase 7 of the rebuild plan
  proceeds independently).

## 12. Risks

- **Mono prose readability**: mitigated by 15px/1.7 and a 68ch measure; if the Notes
  body still reads poorly at 390 px, raise body to 16px rather than adding a second
  font.
- **Ember fill legibility**: void text on ember is 5.55:1; do not "fix" it back to paper.
- **Visual baselines churn**: regenerate once per phase, never mid-phase.
- **Higgsfield output drift**: prompts and job IDs are recorded; a still that needs
  text or a brand mark is out of policy and is rejected, not retouched.
- **Removing Three.js** contradicts rebuild-plan Phase 5; the ADR records why.
- **Model choice for execution**: the rebuild plan specifies Opus 5.5 in auto mode for
  implementation phases; the planning session ran on Fable 5.1. Marcus chooses before
  Phase 1 starts.
