# Axiom Phase 2 — Home Page and Journey Avatar — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle every home-page section and the 404 on the Axiom primitives, replace the journey's chibi likeness with the original dark-rival avatar, add the topology diagram, and delete `RankBadge`.

**Architecture:** Each section component is rewritten on the Phase 1 primitives (`Section`, `Panel`, `Prompt`, `Tag`, `KeyValue`, `RankChip`, `Button`, `TerminalFrame`, `ArrowField`). The journey's mechanics (pinned stage, `scripts/journey.ts`, timeline fallback) are untouched; only its markup and CSS change. The scene SVG loses every hard-coded colour and gets the new avatar in the same body geometry, so all seven stage props still fit. A `test/migration.test.ts` guard keeps every restyled file off the retired token aliases that Phase 4 will delete.

**Tech Stack:** Astro 7, Tailwind 4 tokens, vitest 5 + Astro Container API (`test/render.ts`), Playwright 1.63, Motion (unchanged).

**Spec:** `docs/superpowers/specs/2026-09-24-axiom-design-system-design.md` — §6.1–6.5, §6.7, §7.5, §8.1 (topology), §6.2 (journey, including the 2026-09-24 avatar amendment) and the Phase 2 row of §10.

## Global Constraints

- Everything in Phase 1's Global Constraints still holds: tokens only, ember only where spec §3.2 lists it (now including the avatar's eyes), void text on ember fills, no text below 4.5:1 on void/carbon/graphite, 2px radius, no shadows/gradients/blur/glow, animate only `transform`/`opacity`/`pathLength`, respect `prefers-reduced-motion`, no inline `style=`, no `is:inline`, pnpm only, signed commits, no AI attribution.
- **Before every commit run `pnpm check && pnpm test && pnpm build`** and read the result. (Phase 1 lost a type error by running only the unit tests.)
- Every file this phase touches ends up with **no retired token names** (the `:root` aliases in `src/styles/tokens.css`). Replace each alias with the token it points to, so nothing changes visually, unless a step gives a different value. `test/migration.test.ts` enforces it.
- **Dim states never use opacity on text.** A dimmed chip or label switches to ash text and an iron border, so it still passes 4.5:1.
- The avatar is an **original** character: never a clan crest, a Sharingan/tomoe pattern, Sukuna's four-eye or marking layout, whisker stripes, or any existing character's signature mark. The hero portrait stays the real photo, with `loading="eager"` and `fetchpriority="high"`.
- Keep these selectors working (e2e depends on them): `[data-journey]`, `[data-card]`, `[data-node]`, `.journey__card.is-active h3`, `.journey-fallback .timeline`, `.timeline__title`, the first `#journey [role=img]` labelled `Rank E`, `#contact a[href="/contact"]`, the "Skip the career journey" link, `.site-header`, `.site-footer`.
- Copy that must not change: every string in `src/data/*.ts`, the section headings and ledes in `src/pages/index.astro`, the CTA copy. Only the About paragraph and the 404 copy change, as given below.

## Review Focus

1. **On a phone, the active journey card (now a padded `Panel`) pushes past the bottom of the pinned stage** at some rank, cutting off the text. Expectation: the whole card is on screen at every stage. Pinned by `e2e/journey.spec.ts` "keeps the active card inside the viewport at every stage" (Task 2).
2. **The hero portrait loses its LCP hints or intrinsic size inside `TerminalFrame`**, slowing LCP or shifting layout. Pinned by `e2e/home.spec.ts` "keeps the portrait's LCP hints and intrinsic size" (Task 1).
3. **The topology pulse keeps moving for someone who asked for reduced motion.** Pinned by `e2e/home.spec.ts` "moves the pulse only when motion is allowed" (Task 5).
4. **A restyled file keeps using a retired alias**, so Phase 4's alias deletion silently breaks it. Pinned by `test/migration.test.ts` (Tasks 1–8).
5. **The rewritten 404 stops returning 404 or loses `noindex`**, so crawlers index error pages. Pinned by `e2e/pages.spec.ts` "404 shows a terminal session and a way home" (Task 8).

---

### Task 1: Branch check, migration guard, `ArrowField` width, hero

**Files:**

- Create: `test/migration.test.ts`, `e2e/home.spec.ts`
- Modify: `src/components/ui/ArrowField.astro` (add `cols` prop), `test/ui/ArrowField.test.ts`
- Modify: `src/components/home/Hero.astro` (replace whole file)

**Interfaces:**

- Produces: `MIGRATED` array in `test/migration.test.ts`; every later task appends its files to it. `ArrowField` gains `cols?: number` (default 40).
- Consumes: `Prompt`, `KeyValue`, `RankChip`, `TerminalFrame`, `Button`, `ArrowField` from Phase 1.

- [ ] **Step 1: Confirm the branch**

Run: `git branch --show-current && git log --oneline -3`
Expected: `feat/axiom-2-home`, with the CLAUDE.md commit on top of `main`.

- [ ] **Step 2: Write the migration guard (fails on the hero)**

Create `test/migration.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Retired "manga" token names, read from the :root alias block in tokens.css. Phase 4 deletes
// that block; every file a phase restyles must already be off these names.
const tokensCss = readFileSync("src/styles/tokens.css", "utf8");
const aliasBlock = tokensCss.slice(tokensCss.indexOf(":root {"));
const RETIRED = new Set([...aliasBlock.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));

/** Files already on the Axiom tokens. Each Phase 2–4 task appends the files it restyles. */
const MIGRATED = [
  "src/components/layout/Header.astro",
  "src/components/layout/Footer.astro",
  "src/components/layout/SkipLink.astro",
  "src/components/ui/ArrowField.astro",
  "src/components/ui/Button.astro",
  "src/components/ui/KeyValue.astro",
  "src/components/ui/LogBars.astro",
  "src/components/ui/Panel.astro",
  "src/components/ui/Prompt.astro",
  "src/components/ui/RankChip.astro",
  "src/components/ui/Section.astro",
  "src/components/ui/Tag.astro",
  "src/components/ui/TerminalFrame.astro",
  "src/components/home/Hero.astro",
];

describe("token migration", () => {
  it("knows the retired names", () => {
    expect(RETIRED.has("--color-washi")).toBe(true);
    expect(RETIRED.has("--color-ember")).toBe(false);
  });

  it.each(MIGRATED)("%s uses no retired token names", (file) => {
    const used = [...readFileSync(file, "utf8").matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]);
    expect(used.filter((name) => RETIRED.has(name))).toEqual([]);
  });
});
```

- [ ] **Step 3: Add the failing `cols` test**

Append to the `describe` in `test/ui/ArrowField.test.ts`:

```ts
it("draws as many arrows per row as `cols` asks for", async () => {
  const html = await render(ArrowField, { props: { rows: 2, cols: 5 } });
  const strip = html.match(/<pre class="arrows__strip[^"]*"[^>]*>([\s\S]*?)<\/pre>/)?.[1] ?? "";
  expect(strip.split("\n")[0]?.match(/&gt;/g)).toHaveLength(5);
});
```

- [ ] **Step 4: Write the failing hero e2e**

Create `e2e/home.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test.describe("hero", () => {
  test("introduces Marcus with a prompt, facts and two actions", async ({ page }) => {
    await page.goto("/");
    const hero = page.locator(".hero");
    await expect(hero.locator(".prompt__path")).toHaveText("marcus");
    await expect(hero.locator(".prompt__cursor")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Marcus Hancock-Gaillard");
    await expect(hero.locator(".hero__role")).toHaveText("Sr. Systems Architect · Mesa, Arizona");
    await expect(hero.locator(".kv__key")).toHaveText([
      "years:",
      "datacenters:",
      "uptime:",
      "compliance:",
    ]);
    await expect(hero.locator(".kv__value").first()).toHaveText(/^\d+$/);
    await expect(page.getByRole("link", { name: "See the journey" })).toHaveAttribute(
      "href",
      "#journey",
    );
    await expect(page.getByRole("link", { name: "Read the resume" })).toHaveAttribute(
      "href",
      "/resume",
    );
  });

  test("frames the portrait as a terminal window with the S-rank chip", async ({ page }) => {
    await page.goto("/");
    const frame = page.locator(".hero .term");
    await expect(frame.locator(".term__title")).toHaveText("marcus@evilist:~");
    await expect(frame.getByRole("img", { name: "S-rank: Sr. Systems Architect" })).toHaveCount(1);
    await expect(page.locator(".hero .seal")).toHaveCount(0);
  });

  test("keeps the portrait's LCP hints and intrinsic size", async ({ page }) => {
    await page.goto("/");
    const img = page.locator(".hero img");
    await expect(img).toHaveAttribute("loading", "eager");
    await expect(img).toHaveAttribute("fetchpriority", "high");
    await expect(img).toHaveAttribute("width", /^\d+$/);
    await expect(img).toHaveAttribute("height", /^\d+$/);
  });
});
```

- [ ] **Step 5: Run everything new and watch it fail**

Run: `pnpm vitest run test/migration.test.ts test/ui/ArrowField.test.ts`
Expected: FAIL — `src/components/home/Hero.astro uses no retired token names` (it uses `--color-seam`, `--text-lg`, `--text-sm`, `--color-hanko`), and the `cols` test (5 expected, 40 found).

Run: `pnpm build && pnpm exec playwright test e2e/home.spec.ts --project=desktop`
Expected: FAIL — no `.prompt__path` in the hero, no `.term`, and the old seal is present.

- [ ] **Step 6: Add `cols` to `ArrowField`**

In `src/components/ui/ArrowField.astro` replace:

```astro
interface Props {
  rows?: number;
  class?: string;
}

const { rows = 8, class: className } = Astro.props;
const COLS = 40;
const strip = Array.from(
  { length: rows },
  (_, r) => `${" ".repeat(r % 4)}${"> ".repeat(COLS).trimEnd()}`,
).join("\n");
```

with:

```astro
interface Props {
  rows?: number;
  /** Arrows per row. One strip must be at least as wide as the area it fills, or a gap shows. */
  cols?: number;
  class?: string;
}

const { rows = 8, cols = 40, class: className } = Astro.props;
const strip = Array.from(
  { length: rows },
  (_, r) => `${" ".repeat(r % 4)}${"> ".repeat(cols).trimEnd()}`,
).join("\n");
```

- [ ] **Step 7: Replace `src/components/home/Hero.astro`**

```astro
---
// Hero: a terminal prompt, the name, the pitch, two actions and the facts as key: value rows.
// The portrait sits in a terminal window with the S-rank chip in its title bar.
import { Image } from "astro:assets";
import ArrowField from "../ui/ArrowField.astro";
import Button from "../ui/Button.astro";
import KeyValue from "../ui/KeyValue.astro";
import Prompt from "../ui/Prompt.astro";
import RankChip from "../ui/RankChip.astro";
import TerminalFrame from "../ui/TerminalFrame.astro";
import authorPic from "../../images/author-pic.webp";
import { site } from "../../data/site";
import { yearsOfExperience } from "../../data/career";

const facts = [
  { key: "years", value: String(yearsOfExperience()) },
  { key: "datacenters", value: "2" },
  { key: "uptime", value: "99.99%" },
  { key: "compliance", value: "PCI-DSS, HIPAA" },
];
---

<section class="hero" aria-labelledby="hero-title">
  <ArrowField rows={16} cols={80} class="hero__arrows" />
  <div class="wrap hero__grid">
    <div class="hero__copy">
      <Prompt path="marcus" cursor />
      <h1 id="hero-title" class="hero__name">
        {site.name}
      </h1>
      <p class="hero__role">
        {site.role} · {site.location}
      </p>
      <p class="hero__pitch">{site.pitch}</p>
      <div class="hero__actions">
        <Button href="#journey">See the journey</Button>
        <Button href="/resume" variant="ghost">
          Read the resume
        </Button>
      </div>
      <KeyValue rows={facts} class="hero__facts" />
    </div>

    <figure class="hero__portrait">
      <TerminalFrame title="marcus@evilist:~">
        <RankChip slot="aside" rank="S" size="sm" label="S-rank: Sr. Systems Architect" />
        <Image
          src={authorPic}
          alt={`Portrait of ${site.name}`}
          widths={[320, 480, 720]}
          sizes="(min-width: 60rem) 26rem, 90vw"
          loading="eager"
          fetchpriority="high"
          class="hero__photo"
        />
      </TerminalFrame>
    </figure>
  </div>
</section>

<style>
  .hero {
    position: relative;
    overflow: hidden;
    padding-block: clamp(3rem, 2rem + 6vw, 7rem) var(--section-y);
  }

  /* The > texture fills the negative space: the right side on desktop, the lower half on phones.
     cols={80} makes one strip ~1150 px wide, wider than the right 55% of a 1920 px screen. */
  .hero :global(.hero__arrows) {
    inset: 0 0 0 45%;
  }

  @media (max-width: 59.99rem) {
    .hero :global(.hero__arrows) {
      inset: 55% 0 0 0;
    }
  }

  .hero__grid {
    position: relative;
    display: grid;
    gap: clamp(2.5rem, 2rem + 3vw, 4rem);
    align-items: center;
  }

  @media (min-width: 60rem) {
    .hero__grid {
      grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
    }
  }

  .hero__name {
    margin-top: 1rem;
    font-size: var(--text-hero);
    line-height: 1.1;
    max-width: 16ch;
  }

  .hero__role {
    margin-top: 0.75rem;
    color: var(--color-fog);
  }

  .hero__pitch {
    margin-top: 1.5rem;
    max-width: 34rem;
    color: var(--color-fog);
  }

  .hero__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-top: 2rem;
  }

  .hero :global(.hero__facts) {
    margin-top: 2rem;
  }

  .hero__portrait {
    justify-self: center;
    width: min(26rem, 100%);
  }

  .hero :global(.hero__photo) {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    filter: saturate(0.85);
  }
</style>
```

- [ ] **Step 8: Record the arrow placement in the spec**

The spec says the arrows sit "behind the copy column". Axiom puts them in the hero's negative space, and a glyph texture behind 15 px body text hurts legibility, so this plan places them right of the copy on desktop and in the lower half on phones. In spec §6.1, replace `- \`ArrowField\` behind the copy column, clipped by the section.`with`- \`ArrowField\` fills the hero's negative space, clipped by the section: the right side (behind the portrait frame) from 60rem, the lower half on phones. Never behind body copy.`

- [ ] **Step 9: Run the tests and watch them pass**

Run: `pnpm vitest run test/migration.test.ts test/ui/ArrowField.test.ts`
Expected: PASS.

Run: `pnpm build && pnpm exec playwright test e2e/home.spec.ts`
Expected: PASS on every project (3 tests each).

- [ ] **Step 10: Gate and commit**

Run: `pnpm check && pnpm test && pnpm build && pnpm exec prettier --check src test e2e docs`
Expected: all green.

```bash
git add test/migration.test.ts e2e/home.spec.ts src/components/ui/ArrowField.astro \
  test/ui/ArrowField.test.ts src/components/home/Hero.astro \
  docs/superpowers/specs/2026-09-24-axiom-design-system-design.md
git commit -m "feat: terminal hero with a framed portrait, facts and arrow texture"
```

---

### Task 2: Journey rail, cards and timeline on `RankChip`; delete `RankBadge`

**Files:**

- Modify: `src/components/journey/Journey.astro` (markup + styles), `src/components/journey/JourneyTimeline.astro` (replace whole file)
- Create: `test/ui/Journey.test.ts`, `test/ui/JourneyTimeline.test.ts`
- Modify: `e2e/journey.spec.ts` (one new test), `test/migration.test.ts` (append two files)
- Delete: `src/components/ui/RankBadge.astro`
- Modify: `CLAUDE.md` (drop the `RankBadge` note), spec §6.2 rail line

**Interfaces:**

- Consumes: `RankChip` (`rank`, `size`, default label `Rank <rank>`), `Panel` (`variant="case"`, forwards `data-*`), `Tag`, `formatRange(start, end)` from `src/data/career.ts`.
- Produces: journey cards are `Panel` divs with classes `panel panel--case journey__card`; nothing else consumes them outside this file and the e2e.

- [ ] **Step 1: Write the failing component tests**

`test/ui/JourneyTimeline.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import JourneyTimeline from "../../src/components/journey/JourneyTimeline.astro";
import { career } from "../../src/data/career";
import { render } from "../render";

describe("JourneyTimeline", () => {
  it("shows one terminal rank chip per stage, in order", async () => {
    const html = await render(JourneyTimeline);
    const labels = [...html.matchAll(/class="rank-chip[^"]*"[^>]*aria-label="([^"]+)"/g)].map(
      (m) => m[1],
    );
    expect(labels).toEqual(career.map((s) => `Rank ${s.rankLabel}`));
    expect(html).not.toContain("seal");
  });

  it("tags each stage with its date range", async () => {
    const html = await render(JourneyTimeline);
    expect(html.match(/class="tag timeline__dates/g)).toHaveLength(career.length);
  });
});
```

`test/ui/Journey.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import Journey from "../../src/components/journey/Journey.astro";
import { career } from "../../src/data/career";
import { render } from "../render";

describe("Journey", () => {
  it("puts a rank chip on every rail node", async () => {
    const html = await render(Journey);
    const nodes = html.match(/<li class="journey__node[^>]*>[\s\S]*?<\/li>/g) ?? [];
    expect(nodes).toHaveLength(career.length);
    for (const node of nodes) expect(node).toContain('class="rank-chip');
  });

  it("renders every stage card as a case panel with a rank chip and a date tag", async () => {
    const html = await render(Journey);
    expect(html.match(/class="panel panel--case journey__card/g)).toHaveLength(career.length);
    expect(html.match(/class="journey__card-head/g)).toHaveLength(career.length);
    expect(html).not.toContain("seal");
  });
});
```

Append to `MIGRATED` in `test/migration.test.ts`:

```ts
  "src/components/journey/Journey.astro",
  "src/components/journey/JourneyTimeline.astro",
```

Add this test inside `test.describe("animated journey", …)` in `e2e/journey.spec.ts`, after "scrolling back up rewinds the journey":

```ts
test("keeps the active card inside the viewport at every stage", async ({ page }, info) => {
  test.skip(!["iphone-15", "pixel-7"].includes(info.project.name), "phone heights only");
  await page.goto("/");
  const viewport = page.viewportSize()!.height;
  for (const [i, [activity]] of ORDER.entries()) {
    await scrollToStage(page, i);
    await expect(page.locator("[data-journey]")).toHaveAttribute("data-activity", activity);
    const box = (await page.locator(".journey__card.is-active").boundingBox())!;
    expect(box.y + box.height, `stage ${i}`).toBeLessThanOrEqual(viewport);
  }
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run test/ui/Journey.test.ts test/ui/JourneyTimeline.test.ts test/migration.test.ts`
Expected: FAIL — the chips are `seal`s, there is no `panel--case`, no `timeline__dates` tag, and both files use retired names.

The new e2e is a guard: it may already pass on the current cards. Run it now so the "after" run has a baseline:
`pnpm build && pnpm exec playwright test e2e/journey.spec.ts --project=iphone-15 --project=pixel-7`
Expected: PASS or FAIL; record which in the ledger.

- [ ] **Step 3: Replace `src/components/journey/JourneyTimeline.astro`**

```astro
---
// Static career timeline: the no-JS and reduced-motion version of the journey, and what search
// engines and screen readers read.
import RankChip from "../ui/RankChip.astro";
import Tag from "../ui/Tag.astro";
import { career, formatRange } from "../../data/career";
---

<ol class="timeline">
  {career.map((stage) => (
    <li class="timeline__stage" data-stage={stage.id}>
      <RankChip rank={stage.rankLabel} size="md" />
      <div class="timeline__body">
        <h3 class="timeline__title">{stage.title}</h3>
        <p class="timeline__meta">{stage.org}</p>
        <Tag class="timeline__dates">{formatRange(stage.start, stage.end)}</Tag>
        <p class="timeline__summary">{stage.summary}</p>
      </div>
    </li>
  ))}
</ol>

<style>
  .timeline {
    position: relative;
    display: grid;
    gap: 2.25rem;
    margin-top: 2.5rem;
    padding: 0;
    list-style: none;
  }

  /* The rail the chips sit on (slate: iron disappears on the carbon band). */
  .timeline::before {
    content: "";
    position: absolute;
    left: 2.5rem;
    top: 1rem;
    bottom: 1rem;
    width: 1px;
    background: var(--color-slate);
  }

  .timeline__stage {
    position: relative;
    display: grid;
    grid-template-columns: 5rem minmax(0, 1fr);
    gap: 1.25rem;
    align-items: start;
  }

  /* Positioned so the chip paints over the rail line. */
  .timeline__stage :global(.rank-chip) {
    position: relative;
    justify-self: center;
  }

  .timeline__title {
    font-size: var(--text-heading);
  }

  .timeline__meta {
    margin-top: 0.25rem;
    color: var(--color-ash);
    font-size: var(--text-caption);
    font-weight: 700;
  }

  .timeline__summary {
    margin-top: 0.5rem;
  }
</style>
```

- [ ] **Step 4: Update the markup in `src/components/journey/Journey.astro`**

Replace the import `import RankBadge from "../ui/RankBadge.astro";` with:

```astro
import Panel from "../ui/Panel.astro"; import RankChip from "../ui/RankChip.astro"; import Tag from
"../ui/Tag.astro";
```

In the rail, replace `<RankBadge rank={stage.rankLabel} size="sm" />` with `<RankChip rank={stage.rankLabel} size="sm" />`.

Replace the whole `{career.map((stage, i) => ( <article …> … </article> ))}` block inside `.journey__cards` with:

```astro
{career.map((stage, i) => (
  <Panel
    variant="case"
    class:list={["journey__card", { "is-active": i === 0 }]}
    data-card
    data-activity={stage.activity}
  >
    <div class="journey__card-head">
      <RankChip rank={stage.rankLabel} size="md" />
      <Tag>{formatRange(stage.start, stage.end)}</Tag>
    </div>
    <h3>{stage.shortTitle ?? stage.title}</h3>
    <p class="journey__meta">{stage.org}</p>
    <p>{stage.summary}</p>
    <p class="journey__highlight">{stage.highlights[0]}</p>
  </Panel>
))}
```

- [ ] **Step 5: Update the styles in `src/components/journey/Journey.astro`**

In `.journey { … }` change `--header: 4rem;` to `--header: 3.5rem;` (the Phase 1 header is 56 px).

Replace everything from `/* ---------- Progress rail ---------- */` up to (not including) `/* ---------- Scene ---------- */` with:

```css
/* ---------- Progress rail ---------- */
.journey__rail {
  position: relative;
  display: flex;
  justify-content: space-between;
  padding: 0;
  list-style: none;
}

.journey__node {
  position: relative;
  z-index: 1;
  transition: transform 240ms ease-out;
}

.journey__node.is-current {
  transform: scale(1.12);
}

/* Not reached yet: dimmed by colour, not opacity, so the chip text still passes 4.5:1. */
.journey__node:not(.is-reached) :global(.rank-chip) {
  border-color: var(--color-iron);
  background: var(--color-graphite);
  color: var(--color-ash);
}

/* Seven chips must fit a 390 px phone. */
@media (max-width: 39.99rem) {
  .journey__node :global(.rank-chip) {
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
```

Replace everything from `/* ---------- Cards ---------- */` up to (not including) `@keyframes card-in` with:

```css
/* ---------- Cards ---------- */
.journey__cards {
  display: grid;
}

/* All cards share one grid cell, so the area is always as tall as the tallest card and
     switching stages never shifts the layout. Inactive cards are hidden with visibility.
     The cards are Panel components, so the class is reached with :global. */
.journey__cards :global(.journey__card) {
  grid-area: 1 / 1;
  display: grid;
  align-content: start;
  gap: 0.5rem;
  visibility: hidden;
  opacity: 0;
}

.journey__cards :global(.journey__card.is-active) {
  visibility: visible;
  opacity: 1;
  animation: card-in 320ms ease-out both;
}

.journey__card-head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.journey__cards h3 {
  margin-top: 0.25rem;
  font-size: var(--text-heading-lg);
}

.journey__meta {
  color: var(--color-ash);
  font-size: var(--text-caption);
  font-weight: 700;
}

.journey__highlight {
  color: var(--color-fog);
}

@media (max-width: 59.99rem) {
  .journey__cards p:not(.journey__meta) {
    font-size: var(--text-caption);
  }

  .journey__highlight {
    display: none;
  }
}
```

- [ ] **Step 6: Delete `RankBadge` and its notes**

```bash
git rm src/components/ui/RankBadge.astro
grep -rn "RankBadge\|\.seal\b\|seal-" src test e2e --include='*.astro' --include='*.ts'
```

Expected: no matches in `src`; `e2e/home.spec.ts` keeps its `.hero .seal` count-0 assertion (that is intended).

In `CLAUDE.md`, in the `src/components/ui/` bullet, delete the sentence `` `RankBadge` is legacy until Phase 2 removes it.``

In the spec §6.2, change `- Rail: 1px iron track; nodes are \`RankChip size="sm"\`; the progress fill is ember.`to`- Rail: 1px slate track (iron disappears on the carbon band); nodes are \`RankChip size="sm"\`, dimmed by colour (ash text, iron border) until reached; the progress fill is ember.`

- [ ] **Step 7: Run the tests and watch them pass**

Run: `pnpm vitest run test/ui/Journey.test.ts test/ui/JourneyTimeline.test.ts test/migration.test.ts`
Expected: PASS.

Run: `pnpm build && pnpm exec playwright test e2e/journey.spec.ts e2e/pages.spec.ts e2e/layout.spec.ts`
Expected: PASS on every project, including the new card-in-viewport test on iphone-15 and pixel-7 and the no-overflow test at 393 px.

- [ ] **Step 8: Gate and commit**

Run: `pnpm check && pnpm test && pnpm build && pnpm exec prettier --check src test e2e CLAUDE.md docs`
Expected: all green.

```bash
git add -A src/components/journey src/components/ui/RankBadge.astro test/ui/Journey.test.ts \
  test/ui/JourneyTimeline.test.ts test/migration.test.ts e2e/journey.spec.ts CLAUDE.md \
  docs/superpowers/specs/2026-09-24-axiom-design-system-design.md
git commit -m "feat: journey rail, cards and timeline on RankChip; remove RankBadge"
```

---

### Task 3: Journey scene palette and the dark-rival avatar

**Files:**

- Modify: `src/components/journey/JourneyScene.astro` (top comment, the `hero-chibi` group, the rack LED classes, the palette CSS, the `blink` keyframes)
- Create: `test/journeyScene.test.ts`
- Modify: `test/migration.test.ts` (append one file)

**Interfaces:**

- Consumes: nothing new. The avatar keeps the old body geometry: head circle `cx=200 cy=148 r=58`, ears at x 144/256, body `x=156 y=196 w=88 h=86`, arms, legs and shoes unchanged, so every stage prop (the headset band over the head, the boom mic at 186,190) still fits.
- Produces: avatar parts marked `data-part="hair" | "eyes" | "marks"`.

- [ ] **Step 1: Write the failing test**

`test/journeyScene.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import JourneyScene from "../src/components/journey/JourneyScene.astro";
import { render } from "./render";

const source = readFileSync("src/components/journey/JourneyScene.astro", "utf8");
const markup = source.slice(0, source.indexOf("<style>"));
const style = source.slice(source.indexOf("<style>"), source.indexOf("</style>"));

describe("JourneyScene palette", () => {
  it("uses only design tokens, no hard-coded colours", () => {
    expect(style.match(/#[0-9a-f]{3,8}\b/gi)).toBeNull();
  });

  it("animates only transform and opacity in its keyframes", () => {
    const frames = [...style.matchAll(/@keyframes [\w-]+ \{([\s\S]*?)\n {2}\}/g)].map((m) => m[1]);
    expect(frames.length).toBeGreaterThan(0);
    const props = new Set(frames.flatMap((f) => [...f.matchAll(/([a-z-]+):/g)].map((m) => m[1])));
    expect([...props].sort()).toEqual(["opacity", "transform"]);
  });

  it("styles every colour class the markup uses", () => {
    const used = new Set([...markup.matchAll(/\bc-[a-z-]+/g)].map((m) => m[0]));
    const styled = new Set([...style.matchAll(/\.(c-[a-z-]+)/g)].map((m) => m[1]));
    expect([...used].filter((c) => !styled.has(c))).toEqual([]);
  });
});

describe("JourneyScene avatar", () => {
  it("draws the original dark-rival avatar instead of the old likeness", async () => {
    const html = await render(JourneyScene);
    for (const part of ["hair", "eyes", "marks"]) expect(html).toContain(`data-part="${part}"`);
    expect(html.match(/class="c-iris"/g)).toHaveLength(2);
    for (const old of ["c-scarf", "c-stubble", "c-zip", "c-hoodie"]) {
      expect(html).not.toContain(old);
    }
  });
});
```

Append to `MIGRATED` in `test/migration.test.ts`: `"src/components/journey/JourneyScene.astro",`

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run test/journeyScene.test.ts test/migration.test.ts`
Expected: FAIL — hex colours in the style block (`#8a5a3c`, `#1b1512`, …), `fill` inside `@keyframes blink`, no `data-part`, and the scene uses retired names (`--color-washi`, `--color-hanko`, …).

- [ ] **Step 3: Update the top comment**

Replace the first two comment lines:

```astro
// The journey scene: a chibi Marcus plus one prop group per career stage. The root element's //
data-activity attribute (set by scripts/journey.ts) decides which props are on stage.
```

with:

```astro
// The journey scene: an original dark-rival avatar (spec §6.2; not a likeness of anyone, and no //
existing character's marks) plus one prop group per career stage. The root element's //
data-activity attribute (set by scripts/journey.ts) decides which props are on stage.
```

- [ ] **Step 4: Replace the character**

Replace the whole block from `<!-- ============ The character ============ -->` through the closing `</g>` of `<g class="hero-chibi">` with:

```astro
<!-- ============ The character ============ -->
<g class="hero-chibi">
  <!-- hair, back: spikes swept up and back -->
  <path
    d="M148 134 L136 108 L150 102 L144 70 L172 88 L184 46 L204 80 L234 40 L232 84 L272 60 L252 104 L290 98 L256 134 Z"
    class="c-hair"
    data-part="hair"
  ></path>
  <!-- legs -->
  <rect x="178" y="272" width="18" height="56" rx="8" class="c-pants"></rect>
  <rect x="204" y="272" width="18" height="56" rx="8" class="c-pants"></rect>
  <rect x="170" y="320" width="30" height="12" rx="6" class="c-shoe"></rect>
  <rect x="200" y="320" width="30" height="12" rx="6" class="c-shoe"></rect>
  <!-- arms (behind body) -->
  <rect x="140" y="212" width="20" height="62" rx="10" class="c-coat arm arm--l"></rect>
  <rect x="240" y="212" width="20" height="62" rx="10" class="c-coat arm arm--r"></rect>
  <circle cx="150" cy="276" r="11" class="c-skin"></circle>
  <circle cx="250" cy="276" r="11" class="c-skin"></circle>
  <!-- long coat with an open V, and a high collar behind the jaw -->
  <rect x="156" y="196" width="88" height="86" rx="20" class="c-coat"></rect>
  <path d="M180 198 L200 250 L220 198 Z" class="c-coat-v"></path>
  <path d="M200 250 V282" class="c-seam"></path>
  <path
    d="M152 216 L162 172 L186 194 L200 204 L214 194 L238 172 L248 216 Z"
    class="c-collar"
  ></path>
  <path d="M162 172 L186 194 M238 172 L214 194" class="c-collar-line"></path>
  <!-- head -->
  <circle cx="144" cy="152" r="11" class="c-skin"></circle>
  <circle cx="256" cy="152" r="11" class="c-skin"></circle>
  <circle cx="200" cy="148" r="58" class="c-skin"></circle>
  <!-- hair, front: jagged fringe, long face-framing bangs, two highlight strands -->
  <g data-part="hair">
    <path
      d="M144 134 Q146 90 200 86 Q254 90 256 134 L242 118 L234 140 L222 120 L210 138 L200 118 L188 140 L178 120 L166 138 L158 118 Z"
      class="c-hair"
    ></path>
    <path d="M150 116 L140 194 L156 176 L162 132 Z" class="c-hair"></path>
    <path d="M250 116 L260 194 L244 176 L238 132 Z" class="c-hair"></path>
    <path d="M176 96 L166 118 M214 94 L226 118" class="c-hair-strand"></path>
  </g>
  <!-- face: sharp brows, slit-pupil ember eyes, original under-eye marks, a fanged smirk -->
  <path d="M168 141 L191 148 M232 141 L209 148" class="c-brow"></path>
  <g data-part="eyes">
    <path d="M166 156 Q178 147 193 153 Q186 164 172 163 Z" class="c-eye"></path>
    <path d="M234 156 Q222 147 207 153 Q214 164 228 163 Z" class="c-eye"></path>
    <ellipse cx="182" cy="156.5" rx="5" ry="5.6" class="c-iris"></ellipse>
    <ellipse cx="218" cy="156.5" rx="5" ry="5.6" class="c-iris"></ellipse>
    <ellipse cx="182" cy="156.5" rx="1.4" ry="4.2" class="c-pupil"></ellipse>
    <ellipse cx="218" cy="156.5" rx="1.4" ry="4.2" class="c-pupil"></ellipse>
    <circle cx="184.5" cy="154" r="1.3" class="c-glint"></circle>
    <circle cx="220.5" cy="154" r="1.3" class="c-glint"></circle>
  </g>
  <path
    d="M163 166 Q177 173 192 166 M168 169 L163 182 M237 166 Q223 173 208 166 M232 169 L237 182"
    class="c-mark"
    data-part="marks"
  ></path>
  <path d="M188 183 Q200 190 214 180" class="c-mouth"></path>
  <path d="M206 186.4 L209 193 L211.5 185" class="c-fang"></path>
</g>
```

- [ ] **Step 5: Light the rack LEDs with the accent class**

In the rack prop, change:

```astro
<circle cx="80" cy="11" r="3.5" class:list={["c-led", "blink", `blink--${u % 4}`]} />
```

to:

```astro
<circle cx="80" cy="11" r="3.5" class:list={["c-led", "c-led--on", "blink", `blink--${u % 4}`]} />
```

(The old `blink` keyframes coloured them by animating `fill`; Step 7 removes that.)

- [ ] **Step 6: Replace the palette CSS**

Replace everything from `  /* Palette (from tokens) */` up to (not including) `  /* Stage switching: only the active stage's props are shown. */` with:

```css
/* Palette: tokens only. The avatar is an original dark-rival character (spec §6.2). */
.c-shadow {
  fill: var(--color-void);
  opacity: 0.6;
}
.c-floor {
  stroke: var(--color-slate);
  stroke-width: 2;
}

/* Avatar */
.c-skin {
  fill: var(--color-paper);
}
.c-hair {
  fill: var(--color-void);
  stroke: var(--color-steel);
  stroke-width: 2.5;
  stroke-linejoin: round;
}
.c-hair-strand {
  fill: none;
  stroke: var(--color-iron);
  stroke-width: 3;
  stroke-linecap: round;
}
.c-brow {
  fill: none;
  stroke: var(--color-void);
  stroke-width: 5;
  stroke-linecap: round;
}
.c-eye,
.c-pupil {
  fill: var(--color-void);
}
.c-iris {
  fill: var(--color-ember);
}
.c-glint {
  fill: var(--color-paper);
}
.c-mark {
  fill: none;
  stroke: var(--color-void);
  stroke-width: 4;
  stroke-linecap: round;
}
.c-mouth {
  fill: none;
  stroke: var(--color-void);
  stroke-width: 3;
  stroke-linecap: round;
}
.c-fang {
  fill: var(--color-paper);
  stroke: var(--color-void);
  stroke-width: 1.4;
  stroke-linejoin: round;
}
.c-coat,
.c-pants {
  fill: var(--color-slate);
}
.c-coat-v,
.c-shoe {
  fill: var(--color-void);
}
.c-seam {
  fill: none;
  stroke: var(--color-void);
  stroke-width: 3;
}
.c-collar {
  fill: var(--color-steel);
}
.c-collar-line {
  fill: none;
  stroke: var(--color-void);
  stroke-width: 2;
}

/* Props */
.c-metal {
  fill: var(--color-slate);
}
.c-night {
  fill: var(--color-void);
}
.c-slot,
.c-unit,
.c-led {
  fill: var(--color-steel);
}
.c-led--on {
  fill: var(--color-ember);
}
.c-paper {
  fill: var(--color-fog);
}
.c-tape {
  fill: none;
  stroke: var(--color-ember);
  stroke-width: 3;
  stroke-linecap: round;
}
.c-cal {
  fill: none;
  stroke: var(--color-steel);
  stroke-width: 3;
  stroke-linecap: round;
}
.c-dash {
  fill: none;
  stroke: var(--color-slate);
  stroke-width: 2;
  stroke-dasharray: 6 8;
}
.c-band,
.c-boom {
  fill: none;
  stroke: var(--color-fog);
  stroke-width: 6;
  stroke-linecap: round;
}
.c-boom {
  stroke-width: 4;
}
.c-cup,
.c-mic {
  fill: var(--color-fog);
}
.c-handset {
  fill: none;
  stroke: var(--color-fog);
  stroke-width: 10;
  stroke-linecap: round;
}
.c-ring {
  fill: none;
  stroke: var(--color-fog);
  stroke-width: 4;
  stroke-linecap: round;
}
.c-block,
.c-gear {
  fill: var(--color-ash);
}
.c-accent-fill {
  fill: var(--color-steel);
}
.c-ringmark {
  fill: none;
  stroke: var(--color-steel);
  stroke-width: 3;
}
.c-shield {
  fill: var(--color-slate);
  stroke: var(--color-fog);
  stroke-width: 4;
}
.c-check {
  fill: none;
  stroke: var(--color-paper);
  stroke-width: 6;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.c-bang {
  fill: var(--color-carbon);
  font-family: var(--font-mono);
  font-size: 26px;
}
.c-belt {
  stroke: var(--color-ash);
  stroke-width: 4;
  stroke-linecap: round;
}
.c-grid {
  stroke: var(--color-slate);
  stroke-width: 1;
}
.c-building {
  fill: var(--color-slate);
  stroke: var(--color-fog);
  stroke-width: 2;
}
.c-window {
  stroke: var(--color-ash);
  stroke-width: 3;
  stroke-linecap: round;
}
.c-link {
  fill: none;
  stroke: var(--color-steel);
  stroke-width: 3;
  stroke-dasharray: 5 6;
}
.c-pulse {
  fill: var(--color-ember);
}
.c-label {
  fill: var(--color-fog);
  font-family: var(--font-mono);
  font-size: 22px;
}
.c-blueline {
  stroke: var(--color-steel);
  stroke-width: 2;
}
```

- [ ] **Step 7: Make `blink` animate opacity only**

Replace:

```css
@keyframes blink {
  0%,
  100% {
    opacity: 1;
    fill: var(--color-hanko-hot);
  }
  50% {
    opacity: 0.35;
  }
}
```

with:

```css
@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}
```

- [ ] **Step 8: Run the tests and watch them pass**

Run: `pnpm vitest run test/journeyScene.test.ts test/migration.test.ts test/tokens.test.ts`
Expected: PASS.

- [ ] **Step 9: Look at it**

Run: `pnpm build`, start `HOST=127.0.0.1 PORT=4396 CONTACT_DRY_RUN=true SENDGRID_API_KEY=unused node ./dist/server/entry.mjs` in the background, and capture the journey at stages 0 (headset), 3 (escalation), 4 (rack) and 6 (datacenter) at 1440×900 and 393×659 with Playwright (scroll with the `scrollToStage` maths from `e2e/journey.spec.ts`). Read each image and check:

- the avatar matches option C in `scratchpad/avatar/avatars.png` (bangs, swept spikes, ember slit eyes, under-eye marks, fang, high collar)
- the headset band and cups sit on the hair at stage 0, and the boom mic reaches the mouth
- the rack LEDs are ember and blink; the servers, buildings and shield read against the carbon band
- no element has disappeared (a missing colour class would render black on near-black)
  Stop the server afterwards.

- [ ] **Step 10: Gate and commit**

Run: `pnpm check && pnpm test && pnpm build && pnpm exec prettier --check src test`
Expected: all green.

```bash
git add src/components/journey/JourneyScene.astro test/journeyScene.test.ts test/migration.test.ts
git commit -m "feat: token-only journey scene with an original dark-rival avatar"
```

---

### Task 4: Skills as a grid of panels

**Files:**

- Modify: `src/components/home/Skills.astro` (replace whole file)
- Create: `test/ui/Skills.test.ts`
- Modify: `test/migration.test.ts` (append one file)

**Interfaces:**

- Consumes: `Panel`, `Tag`, `skillDomains` from `src/data/skills.ts` (`{ name: string; items: string[] }[]`).

- [ ] **Step 1: Write the failing test**

`test/ui/Skills.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import Skills from "../../src/components/home/Skills.astro";
import { skillDomains } from "../../src/data/skills";
import { render } from "../render";

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

describe("Skills", () => {
  it("renders one panel per domain, headed by the domain as a tag", async () => {
    const html = await render(Skills);
    expect(html.match(/class="panel skills__panel/g)).toHaveLength(skillDomains.length);
    for (const domain of skillDomains) {
      expect(html).toMatch(new RegExp(`class="tag[^"]*"[^>]*>${escapeRegExp(domain.name)}<`));
    }
    expect(html).not.toContain("<dl");
  });

  it("lists every tool as its own item", async () => {
    const html = await render(Skills);
    for (const item of skillDomains.flatMap((d) => d.items)) {
      expect(html).toMatch(new RegExp(`<li[^>]*>${escapeRegExp(item)}</li>`));
    }
  });
});
```

Append to `MIGRATED`: `"src/components/home/Skills.astro",`

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run test/ui/Skills.test.ts test/migration.test.ts`
Expected: FAIL — no panels (it is a `<dl>` today), items are one comma-joined string, and the file uses `--color-seam`.

- [ ] **Step 3: Replace `src/components/home/Skills.astro`**

```astro
---
// Eight domains as a grid of panels: the domain as a tag, the tools as a plain list.
import Panel from "../ui/Panel.astro";
import Tag from "../ui/Tag.astro";
import { skillDomains } from "../../data/skills";
---

<ul class="skills">
  {skillDomains.map((domain) => (
    <li>
      <Panel class="skills__panel">
        <h3 class="skills__name">
          <Tag>{domain.name}</Tag>
        </h3>
        <ul class="skills__items">
          {domain.items.map((item) => (
            <li>{item}</li>
          ))}
        </ul>
      </Panel>
    </li>
  ))}
</ul>

<style>
  .skills {
    display: grid;
    gap: 1rem;
    margin-top: 2rem;
    padding: 0;
    list-style: none;
  }

  @media (min-width: 40rem) {
    .skills {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (min-width: 64rem) {
    .skills {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  .skills :global(.skills__panel) {
    height: 100%;
  }

  .skills__name {
    font-size: var(--text-caption);
    line-height: 1.5;
  }

  .skills__items {
    display: grid;
    gap: 0.25rem;
    margin-top: 0.75rem;
    padding: 0;
    list-style: none;
  }
</style>
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `pnpm vitest run test/ui/Skills.test.ts test/migration.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run: `pnpm check && pnpm test && pnpm build && pnpm exec prettier --check src test`
Expected: all green.

```bash
git add src/components/home/Skills.astro test/ui/Skills.test.ts test/migration.test.ts
git commit -m "feat: skills as a grid of tagged panels"
```

---

### Task 5: Topology diagram

**Files:**

- Create: `src/components/home/Topology.astro`, `test/ui/Topology.test.ts`
- Modify: `e2e/home.spec.ts` (append a describe block), `test/migration.test.ts` (append one file)

**Interfaces:**

- Produces: `Topology` (no props). Root `<svg class="topo" role="img" aria-label="Two datacenters with BGP failover behind HAProxy">`; the moving dot is `.topo__pulse`. Task 6 places it.

- [ ] **Step 1: Write the failing tests**

`test/ui/Topology.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import Topology from "../../src/components/home/Topology.astro";
import { render } from "../render";

describe("Topology", () => {
  it("is one labelled image of the edge and both datacenters", async () => {
    const html = await render(Topology);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Two datacenters with BGP failover behind HAProxy"');
    for (const label of ["internet", "haproxy", "primary", "dr", "bgp"]) {
      expect(html).toMatch(new RegExp(`class="topo__label"[^>]*>${label}<`));
    }
    expect(html.match(/class="topo__pulse"/g)).toHaveLength(1);
  });

  it("stays small: under 4 KB of markup", async () => {
    expect((await render(Topology)).length).toBeLessThan(4096);
  });
});
```

Append to `e2e/home.spec.ts`:

```ts
test.describe("infrastructure diagram", () => {
  test("describes the topology to assistive tech", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("img", { name: "Two datacenters with BGP failover behind HAProxy" }),
    ).toBeVisible();
  });

  test("moves the pulse only when motion is allowed", async ({ page }, info) => {
    await page.goto("/");
    const name = await page
      .locator(".topo__pulse")
      .evaluate((el) => getComputedStyle(el).animationName);
    if (info.project.name === "reduced-motion") expect(name).toBe("none");
    else expect(name).not.toBe("none");
  });
});
```

Append to `MIGRATED`: `"src/components/home/Topology.astro",`

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run test/ui/Topology.test.ts`
Expected: FAIL — cannot resolve `Topology.astro`. (The e2e and migration entries fail too until Task 6 places the diagram; they are run there.)

- [ ] **Step 3: Create `src/components/home/Topology.astro`**

```astro
---
// The shape of the infrastructure Marcus runs: internet → HAProxy → two datacenters joined by a
// BGP link. One ember pulse crosses the link and back (translateX only; frozen with reduced
// motion). Public-safe detail only: no hostnames, vendors or customers.
---

<svg
  class="topo"
  viewBox="0 0 480 220"
  role="img"
  aria-label="Two datacenters with BGP failover behind HAProxy"
>
  <text x="240" y="16" text-anchor="middle" class="topo__label">
    internet
  </text>
  <path d="M240 24 V50" class="topo__line"></path>
  <rect x="170" y="50" width="140" height="36" rx="2" class="topo__box"></rect>
  <text x="240" y="73" text-anchor="middle" class="topo__label">
    haproxy
  </text>
  <path d="M240 86 V110 H110 V140 M240 110 H370 V140" class="topo__line"></path>
  <rect x="40" y="140" width="140" height="56" rx="2" class="topo__box"></rect>
  <text x="110" y="173" text-anchor="middle" class="topo__label">
    primary
  </text>
  <rect x="300" y="140" width="140" height="56" rx="2" class="topo__box"></rect>
  <text x="370" y="173" text-anchor="middle" class="topo__label">
    dr
  </text>
  <path d="M180 168 H300" class="topo__link"></path>
  <text x="240" y="160" text-anchor="middle" class="topo__label">
    bgp
  </text>
  <circle cx="180" cy="168" r="4" class="topo__pulse"></circle>
</svg>

<style>
  .topo {
    width: 100%;
    max-width: 36rem;
    height: auto;
  }

  .topo__box {
    fill: var(--color-graphite);
    stroke: var(--color-slate);
    stroke-width: 1.5;
  }

  .topo__line {
    fill: none;
    stroke: var(--color-slate);
    stroke-width: 1.5;
  }

  .topo__link {
    fill: none;
    stroke: var(--color-steel);
    stroke-width: 1.5;
    stroke-dasharray: 4 4;
  }

  .topo__label {
    fill: var(--color-fog);
    font-family: var(--font-mono);
    font-size: 12px;
  }

  .topo__pulse {
    fill: var(--color-ember);
  }

  /* 3 s each way = the spec's 6 s loop. In SVG, CSS px in a transform are user units. */
  @media (prefers-reduced-motion: no-preference) {
    .topo__pulse {
      animation: topo-pulse 3s ease-in-out infinite alternate;
    }
  }

  @keyframes topo-pulse {
    to {
      transform: translateX(120px);
    }
  }
</style>
```

- [ ] **Step 4: Run the unit tests and watch them pass**

Run: `pnpm vitest run test/ui/Topology.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run: `pnpm check && pnpm test && pnpm build && pnpm exec prettier --check src test e2e`
Expected: all green (the migration entry passes: the file uses new tokens only).

```bash
git add src/components/home/Topology.astro test/ui/Topology.test.ts e2e/home.spec.ts test/migration.test.ts
git commit -m "feat: topology diagram with a translate-only BGP pulse"
```

---

### Task 6: Work as case panels, shared repos and the topology row

**Files:**

- Modify: `src/components/home/Work.astro` (replace whole file)
- Create: `test/ui/Work.test.ts`
- Modify: `test/migration.test.ts` (append one file)

**Interfaces:**

- Consumes: `Panel` (`variant="case"`), `KeyValue` (`rows`), `Topology` (Task 5), `work` and `sharedRepos` from `src/data/work.ts`.
- Produces: `.work__infra` grid row with the topology in the first column. Phase 3 adds the rack still in the second column.

- [ ] **Step 1: Write the failing test**

`test/ui/Work.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import Work from "../../src/components/home/Work.astro";
import { sharedRepos, work } from "../../src/data/work";
import { render } from "../render";

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

describe("Work", () => {
  it("renders every case as a case panel with its stack as a key: value row", async () => {
    const html = await render(Work);
    expect(html.match(/class="panel panel--case work__card/g)).toHaveLength(work.length);
    for (const item of work) expect(html).toContain(item.title);
    expect(html.match(/>stack:</g)).toHaveLength(work.length);
  });

  it("links each shared repo with a hidden arrow, as rel=me", async () => {
    const html = await render(Work);
    for (const repo of sharedRepos) {
      expect(html).toMatch(
        new RegExp(
          `href="${escapeRegExp(repo.href)}" rel="me noopener" target="_blank"[^>]*><span aria-hidden="true"[^>]*>→ </span>${repo.name}</a>`,
        ),
      );
    }
  });

  it("shows the topology diagram", async () => {
    expect(await render(Work)).toContain(
      'aria-label="Two datacenters with BGP failover behind HAProxy"',
    );
  });
});
```

Append to `MIGRATED`: `"src/components/home/Work.astro",`

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run test/ui/Work.test.ts test/migration.test.ts`
Expected: FAIL — no case panels, no `stack:` row, no arrows, no topology, and the file uses `--color-hanko`, `--text-xl`, `--text-sm`, `--text-lg`.

- [ ] **Step 3: Replace `src/components/home/Work.astro`**

```astro
---
// What Marcus has built: three case cards, the repos he shares, and the topology he runs.
import KeyValue from "../ui/KeyValue.astro";
import Panel from "../ui/Panel.astro";
import Topology from "./Topology.astro";
import { sharedRepos, work } from "../../data/work";
---

<div class="work">
  {work.map((item) => (
    <Panel variant="case" class="work__card">
      <h3 class="work__title">{item.title}</h3>
      <p class="work__summary">{item.summary}</p>
      <p class="work__outcome">{item.outcome}</p>
      <KeyValue rows={[{ key: "stack", value: item.stack.join(", ") }]} class="work__stack" />
    </Panel>
  ))}
</div>

<div class="shared">
  <h3 class="shared__title">Shared on GitHub</h3>
  <ul>
    {sharedRepos.map((repo) => (
      <li>
        <a href={repo.href} rel="me noopener" target="_blank">
          <span aria-hidden="true">→ </span>
          {repo.name}
        </a>
        <span class="shared__desc">{repo.description}</span>
      </li>
    ))}
  </ul>
</div>

<div class="work__infra">
  <figure class="work__topology">
    <Topology />
    <figcaption class="work__caption">two datacenters, BGP failover, HAProxy in front</figcaption>
  </figure>
</div>

<style>
  .work {
    display: grid;
    gap: 1rem;
    margin-top: 2rem;
  }

  @media (min-width: 64rem) {
    .work {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  .work__title {
    font-size: var(--text-heading-sm);
  }

  .work__summary {
    margin-top: 0.75rem;
  }

  .work__outcome {
    margin-top: 0.75rem;
    color: var(--color-fog);
  }

  .work :global(.work__stack) {
    margin-top: 1rem;
    font-size: var(--text-caption);
  }

  .shared {
    margin-top: 2.5rem;
  }

  .shared__title {
    font-size: var(--text-heading-sm);
  }

  .shared ul {
    display: grid;
    gap: 0.5rem;
    margin-top: 0.75rem;
    padding: 0;
    list-style: none;
  }

  .shared li {
    display: flex;
    flex-wrap: wrap;
    gap: 0 0.75rem;
    align-items: baseline;
  }

  .shared a {
    text-decoration: none;
  }

  .shared__desc {
    color: var(--color-fog);
  }

  .work__infra {
    display: grid;
    gap: 1.5rem;
    margin-top: 3rem;
  }

  @media (min-width: 60rem) {
    .work__infra {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      align-items: center;
    }
  }

  .work__caption {
    margin-top: 0.75rem;
    color: var(--color-ash);
    font-size: var(--text-caption);
  }
</style>
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `pnpm vitest run test/ui/Work.test.ts test/migration.test.ts`
Expected: PASS.

Run: `pnpm build && pnpm exec playwright test e2e/home.spec.ts e2e/pages.spec.ts e2e/layout.spec.ts`
Expected: PASS on every project, including "moves the pulse only when motion is allowed" (`none` under reduced-motion, `topo-pulse` elsewhere) and no overflow at 393 px.

- [ ] **Step 5: Gate and commit**

Run: `pnpm check && pnpm test && pnpm build && pnpm exec prettier --check src test e2e`
Expected: all green.

```bash
git add src/components/home/Work.astro test/ui/Work.test.ts test/migration.test.ts
git commit -m "feat: work as case panels with shared repos and the topology row"
```

---

### Task 7: About copy, CTA and page ledes off the aliases

**Files:**

- Modify: `src/components/home/About.astro`, `src/components/home/CTA.astro`, `src/pages/index.astro`
- Create: `test/ui/About.test.ts`
- Modify: `test/migration.test.ts` (append three files)

**Interfaces:**

- None. Visual output of CTA and the ledes is unchanged (aliases replaced by their targets).

- [ ] **Step 1: Write the failing test**

`test/ui/About.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import About from "../../src/components/home/About.astro";
import { render } from "../render";

describe("About", () => {
  it("says Marcus lifts for his health, and no longer mentions basketball", async () => {
    const html = await render(About);
    expect(html).toContain("Outside work I lift for my health, not for a platform");
    expect(html).toContain("Solo Leveling is why the ranks on this site are letters.");
    expect(html).not.toMatch(/basketball/i);
  });
});
```

Append to `MIGRATED`:

```ts
  "src/components/home/About.astro",
  "src/components/home/CTA.astro",
  "src/pages/index.astro",
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run test/ui/About.test.ts test/migration.test.ts`
Expected: FAIL — the old sentence mentions basketball, and all three files use `--text-lg` (About also `--text-base`).

- [ ] **Step 3: Edit `src/components/home/About.astro`**

Replace the `about__personal` paragraph with:

```astro
<p class="about__personal">
  Outside work I lift for my health, not for a platform, and I watch a lot of anime. Solo Leveling
  is why the ranks on this site are letters.
</p>
```

In its `<style>`, change `font-size: var(--text-lg);` to `font-size: var(--text-heading-sm);` and `font-size: var(--text-base);` to `font-size: var(--text-body);`.

- [ ] **Step 4: Edit `src/components/home/CTA.astro` and `src/pages/index.astro`**

In both files change every `font-size: var(--text-lg);` to `font-size: var(--text-heading-sm);`.

- [ ] **Step 5: Run the tests and watch them pass**

Run: `pnpm vitest run test/ui/About.test.ts test/migration.test.ts`
Expected: PASS.

- [ ] **Step 6: Gate and commit**

Run: `pnpm check && pnpm test && pnpm build && pnpm exec prettier --check src test`
Expected: all green.

```bash
git add src/components/home/About.astro src/components/home/CTA.astro src/pages/index.astro \
  test/ui/About.test.ts test/migration.test.ts
git commit -m "feat: about copy for lifting and anime; home ledes on the new tokens"
```

---

### Task 8: 404 as a terminal session

**Files:**

- Modify: `src/pages/404.astro` (replace whole file), `e2e/pages.spec.ts` (one new test)
- Modify: `test/migration.test.ts` (append one file)

**Interfaces:**

- Consumes: `TerminalFrame` (`title`), `Button` (`variant="ghost"`), `Section`.

- [ ] **Step 1: Write the failing test**

Append to `e2e/pages.spec.ts`:

```ts
test("404 shows a terminal session and a way home", async ({ page }) => {
  const res = await page.goto("/definitely-missing");
  expect(res?.status()).toBe(404);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("This page doesn't exist");
  await expect(page.locator(".term__title")).toHaveText("bash");
  await expect(page.locator(".term")).toContainText("No such file or directory");
  await expect(page.getByRole("link", { name: "home", exact: true })).toHaveAttribute("href", "/");
});
```

Append to `MIGRATED`: `"src/pages/404.astro",`

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run test/migration.test.ts` → FAIL (`--text-3xl`).
Run: `pnpm build && pnpm exec playwright test e2e/pages.spec.ts --project=desktop` → FAIL (no `.term`).

- [ ] **Step 3: Replace `src/pages/404.astro`**

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import Section from "../components/ui/Section.astro";
import Button from "../components/ui/Button.astro";
import TerminalFrame from "../components/ui/TerminalFrame.astro";
---

<BaseLayout title="Page not found" index={false}>
  <Section>
    <h1 class="page-title">This page doesn't exist</h1>
    <TerminalFrame title="bash" class="nf__term">
      <pre class="nf__log"><span class="nf__prompt">$</span> cd /the-page-you-wanted
bash: cd: /the-page-you-wanted: No such file or directory
<span class="nf__prompt">$</span> cd ~</pre>
    </TerminalFrame>
    <p class="actions">
      <Button href="/" variant="ghost">
        home
      </Button>
    </p>
  </Section>
</BaseLayout>

<style>
  .page-title {
    font-size: var(--text-display);
    margin-bottom: 1.5rem;
  }

  :global(.nf__term) {
    max-width: 40rem;
  }

  .nf__log {
    margin: 0;
    padding: 1rem 1.25rem;
    overflow-x: auto;
    color: var(--color-fog);
    font: inherit;
    font-size: var(--text-caption);
    line-height: 1.7;
    white-space: pre;
  }

  .nf__prompt {
    color: var(--color-ash);
  }

  .actions {
    margin-top: 2rem;
  }
</style>
```

(If Prettier reflows the `<pre>`, keep its three text lines exactly as above: Prettier preserves `<pre>` content, only the opening tag's attributes may move.)

- [ ] **Step 4: Run the tests and watch them pass**

Run: `pnpm vitest run test/migration.test.ts` → PASS.
Run: `pnpm build && pnpm exec playwright test e2e/pages.spec.ts e2e/smoke.spec.ts` → PASS on every project.

- [ ] **Step 5: Gate and commit**

Run: `pnpm check && pnpm test && pnpm build && pnpm exec prettier --check src test e2e`
Expected: all green.

```bash
git add src/pages/404.astro e2e/pages.spec.ts test/migration.test.ts
git commit -m "feat: 404 as a terminal session"
```

---

### Task 9: Phase verification, baselines, screenshots, docs

**Files:**

- Modify: `e2e/visual.spec.ts` (one new baseline), `e2e/__screenshots__/**` (regenerated)
- Modify: `CLAUDE.md` (status line)
- Modify: `~/vaults/personal/Projects/evilist.io.md` (Build Log; outside the repo)

- [ ] **Step 1: Full gate**

Run: `pnpm lint && pnpm check && pnpm test && pnpm build && pnpm size`
Expected: all green; initial JS on `/` still ≈ 7 KB (this phase adds no scripts); fonts unchanged.

- [ ] **Step 2: E2E**

Run: `pnpm test:e2e`
Expected: green across desktop, iphone-15, pixel-7, ipad and reduced-motion.

- [ ] **Step 3: Add the avatar baseline and regenerate all baselines**

Add inside `test.describe("visual regression @visual", …)` in `e2e/visual.spec.ts`, after "journey mid-way (rank C)":

```ts
test("journey start (rank E, headset)", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>("[data-journey]")!;
    const top = el.getBoundingClientRect().top + scrollY - 56;
    scrollTo(0, top + (el.offsetHeight - innerHeight + 56) * (0.5 / 7));
  });
  await expect(page.locator("[data-journey]")).toHaveAttribute("data-activity", "headset");
  await expect(page).toHaveScreenshot("journey-rank-e.png", {
    animations: "disabled",
    maxDiffPixelRatio: 0.01,
    threshold: 0.02,
  });
});
```

Run: `pnpm test:visual --update-snapshots`, then read `home`, `journey-rank-e` and `journey-rank-c` for desktop and iphone-15, and `not-found` for desktop. Confirm: the hero shows the prompt, the name, the facts rows and the framed portrait with the S chip; the avatar is option C and wears the headset correctly; the rail chips are `[ E ]`…`[ S ]` with the unreached ones dimmed by colour; the 404 is a terminal window.

Run: `pnpm test:visual`
Expected: 16 passed.

- [ ] **Step 4: Browser check at the four widths**

Serve the build on 4396 (never 4321). In claude-in-chrome, open `http://127.0.0.1:4396/` and check at the widths the window allows (it may be locked; see CLAUDE.md). Capture exact 390×844, 430×932, 768×1024 and 1440×900 with Playwright Chromium: `/` top, `#journey` at stages 0/3/6, `#skills`, `#work` (topology), and `/definitely-missing`. For each: no horizontal overflow, no console errors, focus rings ember, the seven rail chips fit at 390. Record the results in the ledger. Stop the server.

- [ ] **Step 5: Lighthouse**

```bash
pnpm build && npx -y @lhci/cli@0.15.1 autorun --config=lighthouse/lighthouserc.cjs --upload.target=filesystem --upload.outputDir=/tmp/lhci
```

Expected: accessibility 1.0 and SEO 1.0 on all four URLs; performance ≥ 0.95 locally (spec §10 Phase 2; CI asserts 0.9 because shared runners are noisy); CLS ≤ 0.05; third-party 0. A contrast failure is a defect to fix (test first), not a threshold to relax.

- [ ] **Step 6: Docs**

In `CLAUDE.md`, change `Phase 1 (tokens, primitives, shell) is merged. Phases 2 (home), 3 (\`/now\`, imagery) and 4 (resume/notes/contact, PDF, ADR) come next`to`Phases 1 (tokens, primitives, shell) and 2 (home, journey avatar, topology) are done. Phases 3 (\`/now\`, imagery) and 4 (resume/notes/contact, PDF, ADR) come next`.

Append to `~/vaults/personal/Projects/evilist.io.md` under `## Build Log (2026)`:

```markdown
### 2026-09-24 — Axiom redesign, Phase 2 done (home page and journey avatar)

- **Decided:** the journey chibi is no longer a likeness of Marcus but an original dark-rival character (Marcus picked "option C": long bangs and swept-back spikes, ember slit eyes, under-eye marks, a fanged smirk, a high-collared coat). No existing character's crests or marks. The hero keeps the real photo.
- **Shipped:** terminal hero (prompt, facts as key: value rows, portrait in a terminal window with the S chip, arrow texture); journey rail, cards and timeline on rank chips; a token-only journey scene; skills as tagged panels; work as case panels with shared repos and a topology diagram (translate-only BGP pulse); About copy (lifting for health, anime; basketball dropped); a terminal-style 404. `RankBadge` deleted. A migration test keeps restyled files off the old token aliases.
- **Checks:** Lighthouse, e2e, visual baselines (now 16, including the avatar at rank E) — record the actual numbers here.
- **Next:** Phase 3 (`/now` page, off-the-clock block, Higgsfield images), Phase 4 (resume, notes, contact, PDF, ADR, alias removal).
```

Replace "record the actual numbers here" with the real Lighthouse scores and test counts before saving.

- [ ] **Step 7: Commit and stop for approval**

Run: `pnpm check && pnpm test && pnpm build && pnpm exec prettier --check .`

```bash
git add e2e/visual.spec.ts e2e/__screenshots__ CLAUDE.md
git commit -m "test: visual baselines for the Axiom home page and avatar"
git log --oneline main..HEAD
```

Report to Marcus: the commit list, the Lighthouse scores, the test counts and the screenshots. Do not merge or push; Marcus approves Phase 2 before Phase 3's plan is written.
