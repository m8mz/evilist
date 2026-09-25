# Hero, journey and content redesign

- **Status:** Implemented (2026-09-25)
- **Date:** 2026-09-24
- **Decider:** Marcus Hancock-Gaillard
- **Amends:** `2026-09-24-axiom-design-system-design.md` §3.2, §3.5, §5, §6.1, §6.1a, §6.2,
  §6.4, §8.2, §9 (listed per section below). Everything not named here stays as that spec says.

## 1. Purpose

The Axiom redesign made the site read as a terminal. This pass makes the terminal part of the
page instead of an exhibit on it, and gives the site more personality and more substance:

- The hero becomes a split terminal: the htop running behind the copy on the left, a live network
  of Marcus's stack on the right, and the portrait tilting slightly with the cursor.
- The header carries Marcus's own `evil_logo.webp` and spans the full width.
- The journey becomes a full-width anime sequence (Higgsfield stills animated into loops): an
  original dark anti-hero who ranks up from E to S+, in the Jujutsu Kaisen / Solo Leveling register.
- The rack still becomes a parallax band; the topology diagram goes.
- The roles carry the detail from Marcus's public LinkedIn that the site left out.

Audience and goals are unchanged: employers first, clients second.

## 2. Decisions (made in the brainstorm, do not re-litigate)

| Question                  | Decision                                                                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Hero backdrop             | htop screen fills the left pane at ~22% opacity; a stack network fills the right pane; a 1px iron tmux-style divider between. |
| htop band                 | Removed from the home page, with its caption. The social card keeps the framed htop.                                          |
| Arrow field               | Removed (`ArrowField.astro` and its test deleted).                                                                            |
| Network rendering         | Build-time SVG with a fixed seed + a small vanilla TS class-toggler. Opacity cross-fades only.                                |
| Portrait tilt             | ±3.5° (evilist.co's values), spring-smoothed, driven by the cursor anywhere in the hero. Fine pointers only. No glow.         |
| Rotating title            | Large, directly under the name; 4 s fade-and-slide; Forward Deployed Engineer added.                                          |
| Hero facts                | Removed. The pitch says "a decade".                                                                                           |
| Logo                      | `src/images/evil_logo.webp` in its original yellow: the one place yellow appears, as an image, never a token.                 |
| Journey medium            | One Higgsfield loop per rank (7 clips), video on every device, lazy-loaded.                                                   |
| Journey character         | Fully original (not a likeness of Marcus or of any existing character).                                                       |
| Journey colour            | Violet shadow energy on top of dark + ember, growing with rank. Violet lives only in the art, never in UI tokens.             |
| Rank ladder               | E, D, C, B, A, S, S+ (no E+; Marcus, 2026-09-24). Every role after T1 moves up one; the current role is S+ (§6.4).            |
| Rack parallax             | Motion `scroll()` (works in every browser), transform only.                                                                   |
| Resume length             | `/resume` shows every highlight; the PDF prints a curated subset and stays exactly two pages.                                 |
| LinkedIn technology names | Publishable (Marcus's own public profile). Still no customers, hostnames, IPs or partner names.                               |
| Execution                 | Three branches, three approvals (§10).                                                                                        |

## 3. Header (amends Axiom §5)

- **Full width.** `.site-header__inner` drops `.wrap`; padding-inline is `var(--gutter)`. Logo
  flush left, links flush right, at every width.
- **Height** 56 → 64px. A new token `--header-h: 4rem` in `tokens.css` replaces every hard-coded
  `3.5rem` header offset (the journey's `--header`, any `scroll-padding-top`).
- **Logo.** `evil_logo.webp` (1037×252, transparent) through `astro:assets` `<Image>`, rendered
  52px tall (≈214px wide) from 45rem and 48px tall (≈198px) below, so its lettering reads at ~15px (Marcus, 2026-09-24), with 1× and 2× widths. It is
  decorative inside the link (`alt=""`); the link keeps `aria-label="evilist, Marcus
Hancock-Gaillard, home"`. No filter, no recolour.
- **Links** 15 → 18px (`--text-heading-sm`), gap `clamp(1.5rem, 1rem + 2vw, 2.5rem)`. Colours,
  hover and `aria-current` underline unchanged. The mobile menu (< 45rem) is unchanged.

> **Amended 2026-09-25** (Marcus, in chat): the logo splits into two lossless crops of
> `evil_logo.webp` — `logo-lettering.webp` at 1.5× (27px tall from the breakpoint, 25px below) and
> `logo-devil.webp` at the old size (50px tall from the breakpoint, 46px below), side by side with
> a 0.25rem gap, lettering first. The nav gains a fifth item (`/home`, linking `/`) and reads as
> root paths, each label prefixed with an `aria-hidden` `/`. The wider brand mark plus the fifth
> item no longer fit one row with any margin at 45rem, so the mobile-menu breakpoint moves to
> 56rem (measured: at 50rem the row is squeezed to its CSS-enforced minimum gap with nothing to
> spare; at 56rem it clears that minimum by ~75px).

## 4. Hero (replaces Axiom §6.1 and §6.1a)

### 4.1 Layout

- The hero is full bleed and split into two **panes**: the terminal pane (left) and the network
  pane (right), separated by a 1px iron vertical rule, like a tmux split. The copy and portrait
  stay in the centred `.wrap` grid on top of the panes.
- From 60rem the grid is `minmax(0, 1.2fr) minmax(0, 1fr)`. The divider runs through the middle of
  the grid gap, so it sits at roughly 50–55% of the viewport and no copy ever crosses it (the
  surname alone is ~576px at hero size). The panes extend from that line to the viewport edges and
  through the hero's full height; the hero clips them.
- Below 60rem the hero stacks: the terminal pane sits behind the copy block, the network pane
  behind the portrait block, and the divider becomes a horizontal 1px iron rule between them.
- Both panes are `aria-hidden` and `pointer-events: none` (the network listens on the hero, §4.4).

### 4.2 Terminal pane

- The htop **screen** (meters, process table, F-key bar) is extracted from `Htop.astro` into
  `HtopScreen.astro`. `Htop.astro` becomes `TerminalFrame` + `HtopScreen` + caption and is used by
  `og-card.astro` only. The hero uses `HtopScreen` bare: no window chrome, no caption.
- In the pane the screen is anchored top-left at 13px. The snapshot grows to 24 processes (generic
  system daemons) so the table fills the pane; overflow is clipped, and the F-key bar is pinned to
  the pane's bottom row.
- The whole layer sits at ~22% opacity (a single `--hero-backdrop-opacity` custom property, tuned
  in the browser: visible at a glance, never competing with the copy). The copy keeps its normal
  colours on top; with the backdrop that dim, every text colour keeps its 4.5:1.
- `scripts/htop.ts` keeps drifting the numbers while the hero is on screen; reduced motion freezes
  them (unchanged behaviour).

### 4.3 Copy

In order:

1. `Prompt path="marcus" cursor` (unchanged).
2. `<h1>` name (unchanged).
3. **Rotating title** (§4.5), weight 400, paper, `font-size: clamp(1.375rem, 1rem + 1.6vw,
2.25rem)`: the longest title (25 characters) fits one line at 390px and in the desktop copy column.
4. **Location** `Mesa, Arizona`, fog, body size, on its own line.
5. **Pitch** (`heroPitch(decadePhrase(yearsOfExperience()))` from `site.ts`), fog, max 34rem.
   Today it reads:
   > A decade in Linux infrastructure. Today I run the platform behind hundreds of banking
   > websites at 99.99%: security, compliance, failover and the automation, end to end. And I
   > build the tooling in Go and Python.
6. Buttons unchanged: `See the journey →` (primary, `#journey`), `Read the resume →` (ghost).

The `KeyValue` facts are removed. `site.description` (meta) keeps its current wording.

**"A decade".** `decadePhrase(years)` in `career.ts` returns `"${years} years"` below 10,
`"a decade"` at 10 and `"over a decade"` from 11. It is used in three places, capitalised where it
starts a sentence:

- the hero pitch: `heroPitch(phrase)` in `site.ts` returns the text above;
- the journey lede: "A decade, seven ranks: from answering support calls to architecting two
  datacenters.";
- About: "A decade later I…" (was "{years} years later I…").

`site.pitch` keeps its current text, because the resume summary already opens with
"{years} years in infrastructure…" and then quotes it; the resume keeps the exact number.

### 4.4 Network pane

- **Data** `src/data/network.ts`: 24 labelled nodes from the real stack — Linux, HAProxy, Podman,
  Ansible, Go, Python, Proxmox, Ceph, BGP, WireGuard, Wazuh, PostgreSQL, MariaDB, Grafana,
  Prometheus, Kubernetes, Docker, Jenkins, Nginx, Bash, Django, Keepalived, FreeIPA, GitHub
  Actions — plus 30 unlabelled filler nodes.
- **Layout** `src/scripts/network.ts` (shared by server and client, like `htop.ts`): a seeded PRNG
  places nodes in a fixed viewBox with a minimum spacing; each node links to its 2–3 nearest
  neighbours, plus any links needed to make the graph connected. Same seed, same picture: every
  visit and every visual baseline is identical.
- **Render** `StackNetwork.astro`, an inline SVG sized to the pane (`preserveAspectRatio`
  slice). At rest: 2px steel dots, 1px iron edges, labels hidden. Each node and edge has an ember
  twin at opacity 0; lighting is an opacity cross-fade of the twin, nothing else.
- **Hover** (`scripts/stack-network.ts`, pointer events on the hero, rAF-throttled): the labelled
  node nearest the cursor within 120 CSS px lights (`is-lit`: ember twin to 1, label to 1, in
  ash, 12–15px on screen; labels are hidden below 60rem, where the scaled-down SVG would make
  them unreadable), with its edges and direct neighbours. After ~120ms the next hop lights at ~45%
  (`is-echo`). Moving away fades everything over ~600ms, so sweeping the cursor leaves a trail and
  the pattern keeps changing.
- **Idle and touch.** While the hero is on screen, the tab is visible and the pointer has been
  still for 3 s, a random labelled node fires the same lit → echo → fade sequence every ~2.5 s.
- **Reduced motion:** no idle pulses and no transitions; hover still lights nodes, instantly.
- **Without JS:** the static constellation.
- The SVG never takes clicks; the hero's buttons stay fully usable.

### 4.5 Rotating title

- `site.titles` in `site.ts`, in order: Sr. Systems Architect, Forward Deployed Engineer, Systems
  Engineer, Linux Engineer, Site Reliability Engineer, Platform Engineer, DevOps Engineer,
  Infrastructure Engineer, Automation Specialist, Security Engineer, Cloud Engineer, Backend
  Developer. `site.role` stays "Sr. Systems Architect" and equals `titles[0]`.
- Markup: `<p class="hero__title">` holding a visually hidden `site.role` for assistive tech and
  an `aria-hidden` span that shows `titles[0]` server-side.
- Motion: the old site's `fade-slide` keyframes (0% opacity 0, translateY 1rem → 10% in place →
  90% in place → 100% opacity 0, translateY −1rem), 4 s ease-in-out infinite, only under
  `(prefers-reduced-motion: no-preference)`. `scripts/title-rotator.ts` swaps the text on each
  `animationiteration`.
- The line has a fixed one-line height and `white-space: nowrap`: no layout shift, ever.
- Reduced motion or no JS: "Sr. Systems Architect", still.

### 4.6 Portrait tilt

- The portrait figure keeps `TerminalFrame` (`marcus@evilist:~`, S `RankChip`) and the photo.
  Its parent gets `perspective: 900px`; the whole frame tilts.
- `scripts/tilt.ts`: on `pointermove` over the hero, the offset of the cursor from the portrait's
  centre, divided by the hero's width and height and clamped to x, y ∈ [−0.5, 0.5], maps to
  `rotateY = −7° · x` and `rotateX = −7° · y` (±3.5°, the same direction as evilist.co). Motion
  springs the values;
  `pointerleave` on the hero springs back to 0. Transform only.
- Only under `(hover: hover) and (pointer: fine)` and `(prefers-reduced-motion: no-preference)`.
- No glow spotlight (evilist.co has one; the Axiom brief forbids glow).

## 5. Work and the rack band (amends Axiom §6.4)

- `Topology.astro`, its test, and the topology row in `Work.astro` are deleted, with the caption.
- **Rack band** `ParallaxBand.astro`, placed on the home page directly after the Work section and
  outside any `.wrap`: full bleed, 1px iron rules top and bottom, height
  `clamp(18rem, 55svh, 34rem)`, overflow hidden.
- Inside, `rack.webp` via `<Picture>` (AVIF/WebP, widths 800/1200/1600/2000 at quality 60, lazy,
  `alt="Illustration: a colocation rack row at night, fully populated and lit by orange status
lights"`), `object-fit: cover`, 124% of the band's height, plus the 20% carbon scrim that
  `Still` uses. (Amended in the Phase 2 plan: a 2400 px rendition measures 183 KB AVIF / 195 KB
  WebP at quality 60 and only fits the 120 KB per-still cap at quality 40; 2000 px measures 97 /
  91 KB.) `sizes="(orientation: portrait) 200vw, 100vw"`, because on portrait screens cover
  scales the wide image to 1.6–2.6× the viewport's width.
- `scripts/parallax.ts`: Motion `scroll()` with the band as target and offset
  `["start end", "end start"]` maps progress 0 → 1 to a shift of −12% → +12% of the band's
  height (the image's own overhang, so an edge never shows).
- The band draws its top rule; the section after it supplies the bottom one (its own top rule), so
  no rule doubles and the band styles nothing outside itself.
- Reduced motion: no script; the image sits centred and still. No text on the band.

## 6. Content from LinkedIn (amends Axiom §9.2)

### 6.1 Career data (`src/data/career.ts`)

Highlights stay ordered strongest first. A new field `printHighlights: number` says how many the
PDF prints (BankSITE: 5, Caris: 3, Systems Administrator: 2, others: 2; at 3 the PDF runs to three
pages). Additions (ranks as in §6.4):

- **S+ · BankSITE**, after the current five:
  - Design and run the full stack across two physical datacenters and the cloud: virtualization,
    networking, containers and security, from planning to hands-on operations
  - Manage the infrastructure and its configuration as code, cutting downtime and tightening
    security
  - Lead strategic technical projects and align technology with business goals
- **S · Caris Life Sciences** (the current three stay first):
  - Administered HPC systems for research workloads
  - Ran monitoring with Nagios, Sensu, Zabbix and Wazuh
  - Ran disk and tape backups (Backup Exec, Veeam) and wrote the disaster-recovery plans
  - Administered VMware and Nutanix virtualization, SAN storage, and Samba and NFS shares
  - Hardened and patched servers; managed access through Active Directory
  - Supported Confluence, Jira, GitLab, Bitbucket, Mirth Connect, JBoss, GlassFish, MySQL,
    MariaDB, PostgreSQL, the ELK stack, LAMP and Node
  - skills gain: Bash, Python, Perl, HPC, VMware, Nutanix, Veeam, Nagios, Zabbix, Active Directory
- **A · Systems Administrator**:
  - Hardened servers with ModSecurity and OWASP rules, iptables, CSF and firewalld, and ClamAV
    with in-house definitions and scan containers
  - Identified and mitigated DDoS attacks; cleaned up spam and malware; kept servers PCI compliant
  - Trained Tier 3 and junior admins in Shell, Python, Perl, JavaScript and PHP, and wrote the
    training material
  - Supported Tier 1–3 teams in the US, the Philippines and India
  - Migrated bare-metal VPS containers to cPanel servers; built software from source; diagnosed
    dedicated hosts over IPMI
  - the existing "Wrote Bash tooling…" becomes "Wrote automation in Bash, Perl, PHP, JavaScript
    and Python"
  - skills gain: ModSecurity, CSF, ClamAV, IPMI
- **D · Web Concierge**: summary names Website Builder alongside WordPress, Joomla, Drupal and
  Weebly; highlights gain "Managed 40–60 clients on my own schedule" and "Helped start the WP Live
  department in the Tempe office, focused on WordPress".

### 6.2 Skills (`src/data/skills.ts`)

Folded into the existing domains: Virtualization and storage + VMware, Nutanix, Veeam; Network
and security + ModSecurity, CSF and firewalld, Active Directory (with FreeIPA and LDAP);
Observability + Nagios, Zabbix; Automation and code + Perl.

### 6.3 Where it shows

- `/resume`: every highlight. Highlights at index ≥ `printHighlights` carry `no-print`. The PDF is
  regenerated (`pnpm build:pdf`) and must stay exactly two pages; if the skills additions push it
  over, `printHighlights` is lowered, never the web content.
- Journey cards: summary plus up to 3 highlights from 60rem, 1 below. Built in Phase 3 with the
  new card (§7.1), since that phase replaces the card's layout; until then the card keeps its one
  highlight.
- JSON-LD and the PDF read the same data, as today.

### 6.4 Rank ladder (Marcus, 2026-09-24)

The ladder is E, D, C, B, A, S, S+: E+ is gone and S+ sits above S. Every role after T1 moves up
one.

| Role                                                | Was | Now |
| --------------------------------------------------- | --- | --- |
| T1 Tech Support                                     | E   | E   |
| Web Concierge (WP Live)                             | E+  | D   |
| Professional Services Engineer                      | D   | C   |
| T3 Tech Support                                     | C   | B   |
| Systems Administrator                               | B   | A   |
| Linux Engineer                                      | A   | S   |
| Sr. Systems Architect and Director of IT Operations | S   | S+  |

- `RankLabel` in `career.ts` is the one list of ranks; `RankChip` takes its type from it.
- Only S+, the current role, carries the accent (the chip's `rank-chip--top` modifier, formerly
  `rank-chip--s`). S is paper on graphite like every other rank.
- The hero's chip reads S+ (label "S+ rank: Sr. Systems Architect"); the journey's h2 becomes
  "From E-rank to S+ rank"; the headings of the "Ten years" note follow the new labels.
- Stage ids, `rank` numbers (1–7), order and activities are unchanged.

## 7. Journey (replaces Axiom §6.2 avatar and scene; amends §8.2)

### 7.1 Layout

- The `~/journey` prompt, h2 "From E-rank to S+ rank" and the lede stay in the centred column. The
  pinned stage breaks out to full viewport width, through a `bleed` slot on `Section` (100vw would
  overflow by the scrollbar's width on Windows). Scroll mechanics (`scripts/journey.ts`,
  `stageForProgress`, track height), the rank rail, the skip link and the `JourneyTimeline`
  fallback are unchanged.
- **From 60rem:** the active rank's clip fills the stage (`object-fit: cover`); the rail runs
  across the top inside the gutter; the active card sits on the left, max 30rem, on the `Panel
case`'s own solid graphite surface, one step above the carbon band (no blur, no gradient, no
  transparency).
- **Below 60rem:** grid rows rail / clip / card. The clip takes the remaining height, cover-cropped
  around the centred character; the card sits under it, whole.
- Clips and cards switch together: opacity cross-fade over 320ms, visibility for hidden layers,
  never `display`.

### 7.2 The character

Original, never a likeness of Marcus or of any existing character.

- Modern shōnen TV anime (the Jujutsu Kaisen / Solo Leveling look): crisp line art, cel shading,
  dramatic rim light, dark palette.
- A young man, lean and athletic (defined, not bulky), messy medium-length black hair, calm cool
  grey eyes. Dark, mysterious, composed.
- Never: red eyes, glowing red, fangs, face markings, scars, a blindfold, or any existing
  character's signature marks, crests or outfits.
- Colour: ember from the scene's own lights, plus violet shadow energy that grows with rank (none
  at E; faint wisps at C; violet smoke at his feet at A; a full shadow army shaped like server racks
  at S+).
- Outfit ranks up too: black hoodie and headset at E → long black high-collar coat with ember
  piping at the cuffs at S+.

### 7.3 Shots (16:9, character centred so a portrait crop keeps him)

| Rank | Activity     | Scene                                                                                   |
| ---- | ------------ | --------------------------------------------------------------------------------------- |
| E    | `headset`    | Night support desk, headset on, monitors glowing ember with no readable content.        |
| D    | `wordpress`  | Shaping an abstract website wireframe of floating blocks above a laptop.                |
| C    | `migration`  | Carrying a glowing data cube along a light path between two server towers.              |
| B    | `escalation` | Standing firm before a wall of ember alert lights, shadows rising at his feet.          |
| A    | `rack`       | Cold aisle, one hand on an open rack, violet smoke curling around him.                  |
| S    | `pipeline`   | Directing a pipeline of floating modules while shadow hands assemble them.              |
| S+   | `datacenter` | Between two datacenter halls, coat moving, a violet shadow army of server racks behind. |

Clip motion: small and loopable only — hair and coat, energy swirling, LEDs blinking, a slight
camera push that returns. No cuts, no large actions. No audio.

### 7.4 Generation (Higgsfield; each step waits for Marcus's pick)

1. **Character sheet:** 3 concepts (front, three-quarter, full body) with `nano_banana_pro` at 2k
   (~6 credits). Marcus picks one.
2. **Stage stills:** 7 stages × 2 variants, 16:9, 2k, with the chosen sheet as the reference image
   (~28 credits, batches of ≤ 5). Marcus picks seven.
3. **Clips:** `seedance_2_0`, 5 s, 1080p, `generate_audio: false`, the stage still as both
   `start_image` and `end_image` so the loop closes. The S+ clip runs first as a pilot to check
   loop quality and the actual credit cost; the other six are quoted before they run.

Every prompt, job ID, pick and credit spend goes into `docs/imagery.md` (a new "Journey" section
with its own style suffix; the monochrome photographic suffixes do not apply to it).

### 7.5 Delivery

- `scripts/encode-clip.mjs <source.mp4> <stage-id>` writes, via ffmpeg, 24 fps, no audio track:
  - `public/journey/<id>-1280.webm` (AV1, ≤ 700 KB) and `<id>-1280.mp4` (H.264, ≤ 1.1 MB)
  - `public/journey/<id>-640.webm` (AV1, ≤ 250 KB) and `<id>-640.mp4` (H.264, ≤ 400 KB)
- Stills: `scripts/import-still.mjs` → `src/images/journey/<id>.webp`, served through `<Picture>`
  as a lazy poster layer under each video (not the `poster` attribute, which loads eagerly). The
  poster stays `display: none` until its layer is primed (lazy images under `display: none` never
  load); that gates loading and never switches stages. `src/data/journeyArt.ts` maps each stage
  to its still, its alt subject and `clipSources`.
- Markup per stage: `<video muted loop playsinline preload="none" disablepictureinpicture
disableremoteplayback>` with `<source data-src media="(min-width: 48rem)">` pairs (webm, then
  mp4) for 1280 and a default pair for 640. A helper `clipSources(stageId)` builds the list.
- `scripts/journey.ts` gains:
  - an `IntersectionObserver` with no margin (amended in the Phase 3 plan: the journey starts only
    48–580 px below the fold at every tested viewport, so a one-viewport margin or native lazy
    loading would fetch it with the page and break `/`'s 600 KB budget). Its root margin ignores
    the window's bottom 15%, and until the stage pins only the active rank is primed (on 1920×1080
    and taller windows the journey's top edge is on screen at load; priming a neighbour there cost
    ~350 KB). Once the journey is on screen it primes the active rank and its neighbours: shows
    their posters, copies `data-src` →
    `src` and calls `load()` once. Nothing is fetched on page load, and a jump to the last rank
    loads at most four ranks;
  - on stage change: pause the old clip, `play()` the new one (a rejected promise leaves the still
    showing), fade the video in once it is playing;
  - pause every clip when the journey leaves the viewport;
  - no `pagehide` stop, which froze the journey after a back/forward-cache restore.
- Reduced motion or no JS: `JourneyTimeline`, now with each rank's still beside its entry (lazy).
  While the animated journey shows, the visually hidden timeline's stills are `display: none`, so
  they never load behind it.
- `JourneyScene.astro` (the SVG character and props) is deleted. `CareerStage.activity` stays; it
  names each stage's shot.

## 8. Rules that change

- **Ember** (amends Axiom §3.2 item 4): add "the hero network's lit nodes, edges and echoes";
  drop "the topology pulse dot" and the journey SVG scene items (deleted). "The S rank chip"
  becomes "the S+ rank chip" (§6.4).
- **Colour exceptions** (new ADR `docs/decisions/0003-colour-exceptions.md`): yellow only in the
  logo image; violet only inside the journey art. Neither becomes a token; `test/tokens.test.ts`
  and the migration test stay as they are.
- **Imagery** (amends Axiom §8.2): the journey art is anime illustration with violet energy, not
  a monochrome photograph. The `Still` component and its rules stay for the rig and rack.
- **Motion** (amends Axiom §3.5): `ArrowField` drift removed. Added: title rotation, portrait
  tilt, network lighting, rack parallax, clip playback. All transform/opacity only, all honour
  reduced motion.
- `CLAUDE.md` design brief and "Where things live" updated to match (logo, header height, ember
  list, journey art, removed components).

## 9. Testing and budgets

- **Unit (vitest, test first):** `decadePhrase` at 9/10/11; `heroPitch` opens with the
  capitalised phrase; `site.titles` includes Forward
  Deployed Engineer, has no duplicates, every entry ≤ 25 characters, `titles[0] === site.role`;
  the network layout is deterministic, in bounds, connected and has 24 labelled nodes; the tilt
  mapping clamps to ±3.5°; `clipSources` returns four sources in webm-before-mp4 order; career data
  keeps its public-safety checks and every `printHighlights` ≤ its highlight count.
- **Component (Container API):** header renders the logo `img`; hero has no facts, the rotating
  title markup and the hidden static role; `HtopScreen` renders in both the hero and `Htop`; Work
  has no topology; `ParallaxBand` renders the picture and alt; resume marks extra highlights
  `no-print`; `JourneyTimeline` renders a still per stage.
- **E2E (Playwright, production build on 4399):** the title changes within ~5 s and stays put
  under reduced motion; hovering the network lights a node; no `/journey/` request before
  scrolling near the journey; the active clip plays and the others are paused; the CSP header is on
  every sitemap URL; no console errors.
- **Visual baselines** regenerated per phase with the existing freeze (`setInterval` stubbed,
  `animations: "disabled"`, no pointer), which holds the htop, title, tilt, pulses and clips still, and
  shown to Marcus.
- **Budgets:** `/` ≤ 600 KB transferred and ≤ 100 KB JS (clips load only near the journey); the
  new scripts add ~4 KB (Motion is already loaded). `pnpm size` gains a clip check against §7.5's
  per-file limits. Lighthouse thresholds unchanged (perf ≥ 0.9, a11y 1, CLS ≤ 0.05).
- **Resume PDF** regenerated; `test/resumePdf.test.ts` still demands two pages. The social card is
  regenerated only if the `Htop` split changes its fingerprint.
- **Browser check** at 390, 430, 768 and 1440px with screenshots before each phase is called done.

## 10. Phases and acceptance

| Phase | Branch                  | Scope                                                            | Acceptance                                                                                                                                                                              |
| ----- | ----------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | `feat/hero-v2`          | §3, §4, §8 (ember, ADR 0003, motion), docs                       | Header and hero as specified at all four widths; htop band, facts and arrow field gone; unit, component and e2e tests green; `/` within budget; baselines regenerated.                  |
| 2     | `feat/content-parallax` | §5, §6                                                           | Ranks run E → S+ everywhere; topology gone; rack band parallaxes and stays still under reduced motion; `/resume` shows every highlight; PDF two pages and fresh; baselines regenerated. |
| 3     | `feat/journey-anime`    | §7, §6.3 journey cards, §8 (imagery), remaining `CLAUDE.md` edit | Seven picked stills and clips, encoded within limits; journey full width; lazy loading and playback verified; `JourneyScene` gone; imagery log complete; baselines updated.             |

Step 1 of §7.4 (the character sheet) may run during Phase 1, since Marcus's picks take calendar
time; nothing from it lands in the repo until Phase 3.

Each phase: `pnpm check && pnpm test && pnpm build`, `pnpm test:e2e`, browser screenshots,
GPG-signed commits with no AI attribution, a Build Log entry in the vault, and Marcus's approval
before merge and before the next phase.

## 11. Out of scope

- Deployment (rebuild Phase 7 is on hold).
- The social card's design, `/now`, Notes and Contact.
- A likeness of Marcus in the journey; audio in the clips.
- Any new colour token.

## 12. Risks

- **Character consistency across seven stills.** Mitigation: the chosen character sheet as the
  reference image for every stage, two variants per stage, targeted re-rolls.
- **Loop seams.** Same start and end frame usually closes the loop; the S+ pilot proves it
  before the other six run.
- **Repo weight.** About 10 MB of clips in git. Acceptable for a personal site; revisit (LFS or
  object storage) only if clips are regenerated often.
- **Autoplay blocked** (iOS Low Power Mode, data saver): the still stays; nothing breaks.
- **Legibility over the terminal.** The backdrop opacity is one custom property, tuned in the
  browser at all four widths.
- **Hero crowding at 60–72rem.** The name, the long title and the portrait share the row; the
  grid ratio and title clamp are checked at 960px and 1152px as well as the four standard widths.
- **Header height change** moves sticky and anchor offsets; the `--header-h` token covers them,
  and the journey e2e checks the pinned stage.
