# Axiom Phase 3 — `/now`, Off the Clock and the Stills — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Marcus's off-the-clock world (rig, games, anime, lifting) as a home-page block and a `/now` page driven by one data file, add the line-icon set, generate and ship three Higgsfield stills, and replace the social preview with a 1200×630 card.

**Architecture:** `src/data/now.ts` is the single source; `NowColumns` renders its three columns for both the home block (`OffTheClock`) and `/now`. A `Still` primitive serves every generated image as AVIF/WebP at three widths with the border, scrim and an honest "Illustration:" alt. The social card is an internal, noindexed `/og-card/` route rendered once to `public/og-default.png` by a Playwright script, the same way the resume PDF is built.

**Tech Stack:** Astro 7 (`astro:assets` `<Picture>`), vitest 5 + Container API, Playwright 1.63, sharp 0.35 (already a dependency), Higgsfield MCP (`nano_banana_pro`).

**Spec:** `docs/superpowers/specs/2026-09-24-axiom-design-system-design.md` — §6.6, §7.1, §7.6, §8.1 (icon set), §8.2, §9.1 and the Phase 3 row of §10.

## Global Constraints

- Everything in Phase 1 and 2's Global Constraints still holds (tokens only, ember only where §3.2 lists it, void text on ember fills, text ≥ 4.5:1 on void/carbon/graphite, 2px radius, no shadows/gradients/blur/glow, animate only `transform`/`opacity`/`pathLength`, reduced motion, no inline `style=`, no `is:inline`, pnpm only, signed commits, no AI attribution).
- **Before every commit run `pnpm check && pnpm test && pnpm build`** and read the result.
- Every file this phase creates or restyles goes on the `MIGRATED` list in `test/migration.test.ts` (no retired token names).
- `src/data/now.ts` is the only place the rig, games, anime, learning, building and training text lives. The work laptop is **MacBook Pro (M2 Max)** (Marcus confirmed 2026-09-24).
- **No lift numbers, no bodyweight, no basketball**, anywhere.
- **Stills are AI illustrations.** Their alt text always begins `Illustration:` (the `Still` component writes that prefix) and never claims to show Marcus's own hardware or any employer's datacenter. No brand marks, logos, people or readable text in any still.
- **Higgsfield spending and downloads stop for Marcus.** Quote the credits and wait for a yes before any generation; ask before downloading, naming each file, its source host and size. Never retry a failed or timed-out generation without checking its job first.
- **Spec edits:** the spec is Prettier-wrapped, so a sentence a step quotes may span two lines there. Match on the words, edit, then run `pnpm exec prettier --write` on the spec.
- Editing `src/data/site.ts` (the nav) makes the resume PDF stale: run `pnpm build:pdf` and commit `public/marcus-hancock-gaillard-resume.pdf` and `scripts/resume-pdf.source-sha256`.

## Review Focus

1. **A still rendition is heavier than 120 KB**, or a phone downloads the 1600 px file, making `/` and `/now` slow on mobile. Pinned by `e2e/stills.spec.ts` "serves every still rendition under 120 KB" (Tasks 5–6).
2. **The `/now` header still hurts that page's LCP or shifts layout** (lazy-loaded above the fold, or no intrinsic size). Pinned by `e2e/pages.spec.ts` "/now leads with the rig still as its eager hero" (Task 6) and `/now/` in Lighthouse CI.
3. **The fourth nav item wraps the header or goes missing from the phone menu.** Pinned by `e2e/layout.spec.ts` "the nav shows Now and keeps one row from tablet up" (Task 6).
4. **The `/og-card/` helper page leaks into search** (sitemap entry, indexable). Pinned by `e2e/pages.spec.ts` "the social card's source page stays out of search" (Task 7).
5. **Social previews break**: the card is missing, the wrong size, or pages still point at the old square portrait. Pinned by `test/ogCard.test.ts` and `e2e/pages.spec.ts` "every page shares the 1200×630 social card" (Task 7).

---

### Task 1: `src/data/now.ts`

**Files:**

- Create: `src/data/now.ts`, `test/now.test.ts`

**Interfaces:**

- Produces: `export interface NowData` and `export const now: NowData` (shape below). Tasks 3 and 6 read `now.rig` (`{ key, value }[]`, directly usable as `KeyValue` rows), `now.playing`, `now.watching`, `now.learning`, `now.building` (`string[]`), `now.training` (`{ line: string; weeks: number[] }`) and `now.updated` (`"yyyy-mm"`).

- [ ] **Step 1: Confirm the branch**

Run: `git branch --show-current && git log --oneline -2`
Expected: `feat/axiom-3-now`, with this plan's commit on top of `main`.

- [ ] **Step 2: Write the failing test**

`test/now.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { now } from "../src/data/now";

const lists: Record<string, string[]> = {
  rig: now.rig.map((row) => row.key),
  playing: now.playing,
  watching: now.watching,
  learning: now.learning,
  building: now.building,
};

describe("now", () => {
  it("records the month it was last updated as yyyy-mm", () => {
    expect(now.updated).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
  });

  it.each(Object.entries(lists))("%s is non-empty, with unique, non-blank entries", (_, items) => {
    expect(items.length).toBeGreaterThan(0);
    expect(new Set(items).size).toBe(items.length);
    for (const item of items) expect(item.trim()).not.toBe("");
  });

  it("has a 12-bar training texture with every value in [0, 1]", () => {
    expect(now.training.weeks).toHaveLength(12);
    for (const value of now.training.weeks) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("never publishes lift numbers, bodyweight or basketball", () => {
    const text = JSON.stringify(now);
    expect(text).not.toMatch(/\b(lbs?|kg|bench|squat|deadlift|bodyweight|basketball)\b/i);
  });

  it("names the M2 Max work laptop", () => {
    expect(now.rig.find((row) => row.key === "work")?.value).toBe("MacBook Pro (M2 Max)");
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `pnpm vitest run test/now.test.ts`
Expected: FAIL — cannot resolve `../src/data/now`.

- [ ] **Step 4: Create `src/data/now.ts`**

```ts
// What Marcus is running, playing, watching and building right now. The single source for the
// home page's off-the-clock block and the /now page. Edit freely; test/now.test.ts keeps it sane.
export interface NowData {
  /** Month of the last edit, yyyy-mm. Shown on /now as "updated: 2026-09". */
  updated: string;
  rig: { key: string; value: string }[];
  playing: string[];
  watching: string[];
  learning: string[];
  building: string[];
  /** `weeks` is a 12-bar texture in [0, 1], not a training log: no numbers are ever shown. */
  training: { line: string; weeks: number[] };
}

export const now: NowData = {
  updated: "2026-09",
  rig: [
    { key: "work", value: "MacBook Pro (M2 Max)" },
    { key: "cpu", value: "AMD Ryzen 7 7800X3D" },
    { key: "gpu", value: "XFX Speedster MERC310 Radeon RX 7900 XTX, 24 GB" },
    { key: "board", value: "ASUS TUF Gaming B650E-E WiFi" },
    { key: "case", value: "Montech King 95 Pro, dual chamber" },
  ],
  playing: [
    "Call of Duty",
    "World of Warcraft",
    "League of Legends",
    "Old School RuneScape",
    "Steam co-op with friends",
  ],
  watching: ["Naruto", "Solo Leveling", "Demon Slayer"],
  learning: ["Go tooling for infrastructure"],
  building: ["this site (Astro 7, self-hosted behind HAProxy)"],
  training: {
    line: "lifting, for health",
    weeks: [0.6, 0.8, 0.8, 1, 0.6, 0.8, 1, 0.8, 0.4, 0.8, 1, 0.8],
  },
};
```

- [ ] **Step 5: Run it to verify it passes**

Run: `pnpm vitest run test/now.test.ts`
Expected: PASS (9 tests: 1 + 5 list cases + 3).

- [ ] **Step 6: Gate and commit**

Run: `pnpm check && pnpm test && pnpm build && pnpm exec prettier --check src test`
Expected: all green.

```bash
git add src/data/now.ts test/now.test.ts
git commit -m "feat: now.ts, the single source for off-the-clock and /now"
```

---

### Task 2: `Icon` line-icon set

**Files:**

- Create: `src/components/ui/Icon.astro`, `test/ui/Icon.test.ts`
- Modify: `test/migration.test.ts` (append one file), spec §8.1 icon colour

**Interfaces:**

- Produces: `Icon` with `name: IconName` (`"tower" | "controller" | "play" | "dumbbell" | "arrow"`) and `class?`; exports `type IconName`. Always `aria-hidden`.

- [ ] **Step 1: Write the failing test**

`test/ui/Icon.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import Icon from "../../src/components/ui/Icon.astro";
import { render } from "../render";

describe("Icon", () => {
  it.each(["tower", "controller", "play", "dumbbell", "arrow"] as const)(
    "draws %s as a decorative 16px line icon",
    async (name) => {
      const html = await render(Icon, { props: { name } });
      expect(html).toMatch(/<svg class="icon[^"]*"[^>]*viewBox="0 0 16 16"/);
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('focusable="false"');
      expect(html).toMatch(/<(path|rect|circle) /);
    },
  );
});
```

Append to `MIGRATED` in `test/migration.test.ts`: `"src/components/ui/Icon.astro",`

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run test/ui/Icon.test.ts`
Expected: FAIL — cannot resolve `Icon.astro`.

- [ ] **Step 3: Create `src/components/ui/Icon.astro`**

```astro
---
// 16×16 line icons (spec §8.1): 1.5px steel strokes, round caps, no fill. Decorative only, so
// always aria-hidden. The paths are static strings in this file, which makes set:html safe.
const PATHS = {
  tower:
    '<rect x="4" y="1.5" width="8" height="13" rx="1"/><path d="M6.5 4.5h3M6.5 7h3"/><circle cx="8" cy="11" r="1.25"/>',
  controller:
    '<path d="M4 5.5h8a3 3 0 0 1 3 3v.5a2.5 2.5 0 0 1-4.3 1.7L9.5 9.5h-3l-1.2 1.2A2.5 2.5 0 0 1 1 9v-.5a3 3 0 0 1 3-3z"/><path d="M4.5 7.5v2M3.5 8.5h2M11 8h.01M12.5 9h.01"/>',
  play: '<rect x="1.5" y="3" width="13" height="10" rx="1"/><path d="M6.5 6v4l3.5-2z"/>',
  dumbbell: '<path d="M1.5 6.5v3M3.5 4.5v7M12.5 4.5v7M14.5 6.5v3M3.5 8h9"/>',
  arrow: '<path d="M2 8h11M9 4l4 4-4 4"/>',
} as const;

export type IconName = keyof typeof PATHS;

interface Props {
  name: IconName;
  class?: string;
}

const { name, class: className } = Astro.props;
---

<svg
  class:list={["icon", className]}
  viewBox="0 0 16 16"
  width="16"
  height="16"
  aria-hidden="true"
  focusable="false"
  set:html={PATHS[name]}
/>

<style>
  /* Children come from set:html and carry no scope attribute; they inherit fill and stroke. */
  .icon {
    display: inline-block;
    flex: none;
    fill: none;
    stroke: var(--color-steel);
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>
```

- [ ] **Step 4: Record the icon colour in the spec**

Slate `#3a3a3a` on the graphite panels these icons sit on is 1.6:1 and reads as missing; steel is 2.8:1, the decorative-stroke colour the palette already reserves. In spec §8.1, change `16×16, 1.5px slate strokes, round caps. Decorative.` to `16×16, 1.5px steel strokes (slate is 1.6:1 on graphite panels and disappears), round caps. Decorative.`

- [ ] **Step 5: Run the tests and watch them pass**

Run: `pnpm vitest run test/ui/Icon.test.ts test/migration.test.ts`
Expected: PASS.

- [ ] **Step 6: Gate and commit**

Run: `pnpm check && pnpm test && pnpm build && pnpm exec prettier --check src test docs`
Expected: all green.

```bash
git add src/components/ui/Icon.astro test/ui/Icon.test.ts test/migration.test.ts \
  docs/superpowers/specs/2026-09-24-axiom-design-system-design.md
git commit -m "feat: Icon line-icon set"
```

---

### Task 3: `NowColumns`, the off-the-clock block and its home section

**Files:**

- Create: `src/components/home/NowColumns.astro`, `src/components/home/OffTheClock.astro`, `test/ui/OffTheClock.test.ts`
- Modify: `src/pages/index.astro` (new section; CTA band tone), `e2e/home.spec.ts` (one describe), `test/migration.test.ts`

**Interfaces:**

- Consumes: `now` (Task 1), `Icon` (Task 2), `KeyValue`, `Tag`, `Panel`, `LogBars`.
- Produces: `NowColumns` (no props): a `.now-cols` grid with three `.now-col` columns headed by `h3`s whose text is `rig`, `playing`, `watching`. `/now` (Task 6) reuses it.

- [ ] **Step 1: Write the failing tests**

`test/ui/OffTheClock.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import OffTheClock from "../../src/components/home/OffTheClock.astro";
import { now } from "../../src/data/now";
import { render } from "../render";

describe("OffTheClock", () => {
  it("heads the three columns rig, playing and watching, each with an icon", async () => {
    const html = await render(OffTheClock);
    const heads = [...html.matchAll(/<h3 class="now-col__head"[^>]*>([\s\S]*?)<\/h3>/g)];
    expect(heads.map((m) => m[1]!.match(/class="tag[^"]*"[^>]*>(\w+)</)?.[1])).toEqual([
      "rig",
      "playing",
      "watching",
    ]);
    for (const head of heads) expect(head[1]).toContain('class="icon');
  });

  it("shows every entry from now.ts", async () => {
    const html = await render(OffTheClock);
    for (const row of now.rig) expect(html).toContain(`>${row.value}<`);
    for (const item of [...now.playing, ...now.watching]) expect(html).toContain(`>${item}<`);
    expect(html).toContain(`>${now.training.line}<`);
  });

  it("draws the training texture and links to /now", async () => {
    const html = await render(OffTheClock);
    expect(html).toContain('aria-label="Illustrative training rhythm"');
    expect(html.match(/class="log-bars__bar"/g)).toHaveLength(12);
    expect(html).toMatch(
      /href="\/now"[^>]*><span aria-hidden="true"[^>]*>→ <\/span>more on \/now</,
    );
  });
});
```

Append to `MIGRATED`:

```ts
  "src/components/home/NowColumns.astro",
  "src/components/home/OffTheClock.astro",
```

Append to `e2e/home.spec.ts`:

```ts
test.describe("off the clock", () => {
  test("shows the rig, what's playing and what's on, with a link to /now", async ({ page }) => {
    await page.goto("/");
    const block = page.locator("#off-the-clock");
    await expect(block.locator(".prompt__path")).toHaveText("off-the-clock");
    await expect(block.getByRole("heading", { level: 3 })).toHaveText([
      "rig",
      "playing",
      "watching",
    ]);
    await expect(block).toContainText("MacBook Pro (M2 Max)");
    await expect(block).toContainText("Old School RuneScape");
    await expect(block).toContainText("Solo Leveling");
    await expect(block.getByRole("img", { name: "Illustrative training rhythm" })).toBeVisible();
    await expect(block.getByRole("link", { name: "more on /now" })).toHaveAttribute("href", "/now");
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run test/ui/OffTheClock.test.ts`
Expected: FAIL — cannot resolve `OffTheClock.astro`.

Run: `pnpm build && pnpm exec playwright test e2e/home.spec.ts --project=desktop -g "off the clock"`
Expected: FAIL — no `#off-the-clock`.

- [ ] **Step 3: Create `src/components/home/NowColumns.astro`**

```astro
---
// The three off-the-clock columns (spec §6.6): the rig, what Marcus is playing, what he is
// watching. Shared by the home page block and /now; the data lives in src/data/now.ts.
import Icon from "../ui/Icon.astro";
import KeyValue from "../ui/KeyValue.astro";
import Tag from "../ui/Tag.astro";
import { now } from "../../data/now";
---

<div class="now-cols">
  <div class="now-col">
    <h3 class="now-col__head">
      <Icon name="tower" />
      <Tag>rig</Tag>
    </h3>
    <KeyValue rows={now.rig} class="now-col__body" />
  </div>
  <div class="now-col">
    <h3 class="now-col__head">
      <Icon name="controller" />
      <Tag>playing</Tag>
    </h3>
    <ul class="now-col__body now-col__list">
      {now.playing.map((game) => (
        <li>{game}</li>
      ))}
    </ul>
  </div>
  <div class="now-col">
    <h3 class="now-col__head">
      <Icon name="play" />
      <Tag>watching</Tag>
    </h3>
    <ul class="now-col__body now-col__list">
      {now.watching.map((show) => (
        <li>{show}</li>
      ))}
    </ul>
  </div>
</div>

<style>
  .now-cols {
    display: grid;
    gap: 1.5rem;
  }

  @media (min-width: 48rem) {
    .now-cols {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  .now-col__head {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: var(--text-caption);
    line-height: 1.5;
  }

  .now-cols :global(.now-col__body) {
    margin-top: 0.75rem;
  }

  .now-col__list {
    display: grid;
    gap: 0.25rem;
    padding: 0;
    list-style: none;
  }
</style>
```

- [ ] **Step 4: Create `src/components/home/OffTheClock.astro`**

```astro
---
// Home page block (spec §6.6): the three columns, the training line with its bar texture, and a
// link to /now. The bars are illustrative; no training numbers are ever shown.
import KeyValue from "../ui/KeyValue.astro";
import LogBars from "../ui/LogBars.astro";
import Panel from "../ui/Panel.astro";
import NowColumns from "./NowColumns.astro";
import { now } from "../../data/now";
---

<div class="otc">
  <Panel>
    <NowColumns />
    <div class="otc__training">
      <KeyValue rows={[{ key: "training", value: now.training.line }]} />
      <LogBars values={now.training.weeks} label="Illustrative training rhythm" />
    </div>
    <p class="otc__more">
      <a href="/now">
        <span aria-hidden="true">→ </span>more on /now
      </a>
    </p>
  </Panel>
</div>

<style>
  .otc {
    margin-top: 2rem;
  }

  .otc__training {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem 1.5rem;
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--color-iron);
  }

  .otc__more {
    margin-top: 1.5rem;
  }

  .otc__more a {
    text-decoration: none;
  }
</style>
```

- [ ] **Step 5: Place the block on the home page**

In `src/pages/index.astro` add `import OffTheClock from "../components/home/OffTheClock.astro";` after the `About` import, and replace:

```astro
  <Section tone="carbon" prompt="contact" id="contact" aria-labelledby="cta-title">
```

with:

```astro
  <Section tone="carbon" prompt="off-the-clock" id="off-the-clock" aria-labelledby="otc-title">
    <h2 id="otc-title">Off the clock</h2>
    <p class="lede">The rig, the games and the anime. And lifting, for my health.</p>
    <OffTheClock />
  </Section>

  <Section prompt="contact" id="contact" aria-labelledby="cta-title">
```

(The CTA band drops to void so two carbon bands never touch.)

In spec §6.6, change ``a `→ /now` link.`` to ``a `→ more on /now` link (so the link's accessible name says where it goes, not just "/now").``

- [ ] **Step 6: Run the tests and watch them pass**

Run: `pnpm vitest run test/ui/OffTheClock.test.ts test/migration.test.ts`
Expected: PASS.

Run: `pnpm build && pnpm exec playwright test e2e/home.spec.ts e2e/pages.spec.ts e2e/layout.spec.ts`
Expected: PASS on every project (including no overflow at 393 px with the long GPU line).

- [ ] **Step 7: Gate and commit**

Run: `pnpm check && pnpm test && pnpm build && pnpm exec prettier --check src test e2e`
Expected: all green.

```bash
git add src/components/home/NowColumns.astro src/components/home/OffTheClock.astro \
  src/pages/index.astro test/ui/OffTheClock.test.ts test/migration.test.ts e2e/home.spec.ts \
  docs/superpowers/specs/2026-09-24-axiom-design-system-design.md
git commit -m "feat: off-the-clock block on the home page"
```

---

### Task 4: Generate, choose and import the three stills

**Files:**

- Create: `scripts/import-still.mjs`, `test/importStill.test.ts`, `docs/imagery.md`
- Create (from Higgsfield, after Marcus approves): `src/images/rig.webp`, `src/images/rack.webp`, `src/images/og-bg.webp`

**Interfaces:**

- Produces: `importStill(input: string, output: string, maxWidth = 2400): Promise<sharp.Metadata>` in `scripts/import-still.mjs`; the three files above, each ≤ 2400 px wide WebP. Tasks 5–7 import them.

- [ ] **Step 1: Write the failing test for the import script**

`test/importStill.test.ts`:

```ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { importStill } from "../scripts/import-still.mjs";

let dir: string | undefined;
const tmp = () => (dir = mkdtempSync(join(tmpdir(), "still-")));
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

const png = (path: string, width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: "#111111" } })
    .png()
    .toFile(path);

describe("importStill", () => {
  it("shrinks a large render to 2400 px wide WebP, keeping its aspect ratio", async () => {
    const d = tmp();
    await png(join(d, "in.png"), 3000, 1286);
    const meta = await importStill(join(d, "in.png"), join(d, "out.webp"));
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(2400);
    expect(meta.height).toBe(1029);
  });

  it("never upscales a smaller render", async () => {
    const d = tmp();
    await png(join(d, "in.png"), 2048, 1152);
    const meta = await importStill(join(d, "in.png"), join(d, "out.webp"));
    expect(meta.width).toBe(2048);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run test/importStill.test.ts`
Expected: FAIL — cannot resolve `../scripts/import-still.mjs`.

- [ ] **Step 3: Create `scripts/import-still.mjs`**

```js
// Imports a generated still into src/images: at most 2400 px wide, WebP quality 82, metadata
// stripped (sharp drops EXIF by default). astro:assets makes the 800/1200/1600 renditions.
// Usage: node scripts/import-still.mjs <downloaded file> src/images/<name>.webp
import sharp from "sharp";

export async function importStill(input, output, maxWidth = 2400) {
  await sharp(input)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(output);
  return sharp(output).metadata();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) {
    console.error("usage: node scripts/import-still.mjs <input> <output.webp>");
    process.exit(1);
  }
  const meta = await importStill(input, output);
  console.log(`${output}: ${meta.width}×${meta.height} ${meta.format}`);
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm vitest run test/importStill.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Write `docs/imagery.md` with the prompts**

```markdown
# Imagery

The site's generated stills (spec §8.2). Each is an **illustration**: the alt text says so, and
none of them depicts Marcus's own hardware or any employer's datacenter.

- Model: `nano_banana_pro` (Google Nano Banana Pro, via the Higgsfield MCP), resolution `2k`.
- Three variants per shot in one batch; Marcus picks one; the rest are discarded.
- Import: `node scripts/import-still.mjs <download> src/images/<name>.webp` (≤ 2400 px WebP).
  `astro:assets` serves AVIF/WebP at 800/1200/1600 via the `Still` component.

## Shared suffix (appended to every prompt)

Photographic, near-monochrome palette of pure black, charcoal and soft grey. Exactly one light
source: a warm burnt-orange glow (#da5c2c) from a single LED strip; no other colour anywhere, no
RGB rainbow lighting, no blue. Shallow depth of field, 35mm lens, f/2, ISO 800 grain, slight
vignette. No text, no logos, no brand marks, no people, no hands, no screens showing content.
Matte surfaces, no lens flare, no bloom, no glow halos.

## Shot 1 — rig (`/now` header), 21:9 → `src/images/rig.webp`

A custom-built gaming PC in a dual-chamber ATX tower with a tempered-glass side panel,
photographed at night on a dark wooden desk. Through the glass: a large three-fan graphics card
mounted horizontally, a tower air cooler, clean black braided cable runs, and a single horizontal
orange LED strip along the bottom edge of the chamber. The tower sits in the right two-thirds of
the frame; the left third is empty dark desk fading to black for text overlay. Camera slightly
below the case's midline, three-quarter angle.

## Shot 2 — rack (`~/built`), 16:9 → `src/images/rack.webp`

A single colocation server rack seen from the cold aisle at night, door open. Two matching 1U
load balancers at eye level with a neat row of small orange link LEDs, a bundle of black patch
cables dressed in vertical managers, blank panels above and below, a fibre patch panel with
yellow-free, grey cables. The rack frame is matte black; the raised floor tiles are dark grey.
Everything outside the rack falls to black. Camera at eye level, centred, slight downward tilt.

## Shot 3 — social card background, 16:9 → `src/images/og-bg.webp`

An extreme close-up of a dark matte monitor showing a black terminal window: only a thin grey
window border, a single blinking orange block cursor at the top left, and a faint grey `>` arrow
texture receding to the right. The screen fills the frame edge to edge with a very slight
curvature and subpixel texture visible on close inspection. Nothing else on screen.

## Chosen renders

| Shot | File | Higgsfield job ID | Generated |
| ---- | ---- | ----------------- | --------- |
```

(The "Chosen renders" table is filled in at Step 10 with the real job IDs.)

- [ ] **Step 6: Quote the cost — STOP for Marcus**

Load `mcp__claude_ai_Higgsfield__balance`, `…__generate_image`, `…__generate_image_batch`, `…__jobs_wait` and `…__show_generation_by_ids` with ToolSearch. Call `balance`, then `generate_image` with `get_cost: true` for `{ model: "nano_banana_pro", resolution: "2k", aspect_ratio: "21:9" }` and for `"16:9"`. Tell Marcus: "9 images (3 per shot) with nano_banana_pro at 2K: N credits of your B balance. Generate?" **Do not continue without an explicit yes.** If the model or price differs from spec §8.2 (2 credits each), say so in the same message.

- [ ] **Step 7: Generate the nine variants**

One `generate_image_batch` call with nine requests, `use_unlim` omitted. Indices 0–2: Shot 1 prompt + suffix, `aspect_ratio: "21:9"`; 3–5: Shot 2 + suffix, `"16:9"`; 6–8: Shot 3 + suffix, `"16:9"`. Every request: `model: "nano_banana_pro"`, `resolution: "2k"`, the prompt text exactly as in `docs/imagery.md` (shot paragraph, one space, suffix paragraph). If the tool returns an `unlim_choice` instead of jobs, relay that question to Marcus verbatim and wait. Poll with `jobs_wait` until all nine are terminal, then call `show_generation_by_ids` once with all nine so Marcus sees them in the widget. If any job fails, report which, and do not resubmit without Marcus's yes (it costs credits).

- [ ] **Step 8: Marcus picks — STOP**

Ask Marcus to pick one variant per shot (by index or position), or to ask for a reroll of a shot. A reroll repeats Steps 6–7 for that shot only, with its own quote. Reject, and say why, any variant that shows readable text, a logo, a person or hands, a second colour of light, or a screen with content.

- [ ] **Step 9: Download and import — STOP for the download**

For each chosen job, get its result URL from the `jobs_wait` output. Ask Marcus once for all three: "Download these 3 files into the plan workspace? `rig` (source: <host>, <size>), `rack` (…), `og-bg` (…)". Wait for a yes. Then, for each:

```bash
curl -fsSL -o .superpowers/sdd/2026-09-24-axiom-phase-3-now/<name>-src.<ext> "<result URL>"
node scripts/import-still.mjs .superpowers/sdd/2026-09-24-axiom-phase-3-now/<name>-src.<ext> src/images/<name>.webp
```

Expected: three lines like `src/images/rig.webp: 2400×1029 webp`. Read each WebP with the Read tool and confirm it is the variant Marcus picked. Downloads stay in the git-ignored workspace; only the WebPs are committed.

- [ ] **Step 10: Record the choices**

Fill the "Chosen renders" table in `docs/imagery.md`, one row per shot: shot name, file, the job ID, today's date.

- [ ] **Step 11: Gate and commit**

Run: `pnpm check && pnpm test && pnpm build && pnpm exec prettier --check scripts test docs`
Expected: all green. `ls -la src/images/{rig,rack,og-bg}.webp` shows three files, each under 1 MB.

```bash
git add scripts/import-still.mjs test/importStill.test.ts docs/imagery.md \
  src/images/rig.webp src/images/rack.webp src/images/og-bg.webp
git commit -m "feat: three Higgsfield stills with their prompts and import script"
```

---

### Task 5: `Still` component and the rack still in Work

**Files:**

- Create: `src/components/ui/Still.astro`, `test/ui/Still.test.ts`, `e2e/stills.spec.ts`
- Modify: `src/components/home/Work.astro` (second column of `.work__infra`), `test/ui/Work.test.ts`, `test/migration.test.ts`
- Modify: spec §8.2 loading line

**Interfaces:**

- Consumes: `src/images/rack.webp` (Task 4).
- Produces: `Still` with `src: ImageMetadata`, `subject: string` (alt becomes `Illustration: <subject>`), `sizes: string`, `eager?: boolean` (default false), `class?`. Root is `figure.still`; the `<img>` has class `still__img`.

- [ ] **Step 1: Write the failing tests**

`test/ui/Still.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import Still from "../../src/components/ui/Still.astro";
import rack from "../../src/images/rack.webp";
import { render } from "../render";

const props = { src: rack, subject: "a server rack", sizes: "100vw" };

describe("Still", () => {
  it("labels every still as an illustration", async () => {
    const html = await render(Still, { props });
    expect(html).toMatch(/<img[^>]*alt="Illustration: a server rack"/);
  });

  it("serves AVIF and WebP at 800, 1200 and 1600 px", async () => {
    const html = await render(Still, { props });
    expect(html).toContain("<picture");
    expect(html).toContain('type="image/avif"');
    for (const w of ["800w", "1200w", "1600w"]) expect(html).toContain(w);
  });

  it("lazy-loads by default and loads eagerly with high priority when it is a page's hero", async () => {
    expect(await render(Still, { props })).toMatch(/<img[^>]*loading="lazy"/);
    const hero = await render(Still, { props: { ...props, eager: true } });
    expect(hero).toMatch(/<img[^>]*loading="eager"/);
    expect(hero).toMatch(/<img[^>]*fetchpriority="high"/);
  });
});
```

In `test/ui/Work.test.ts`, add inside the `describe`:

```ts
it("shows the rack illustration next to the topology", async () => {
  const html = await render(Work);
  expect(html).toMatch(/<figure class="still[^"]*"[\s\S]*alt="Illustration: a colocation rack/);
});
```

Create `e2e/stills.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

/** Pages that show stills. Task 6 adds "/now". */
const PAGES = ["/"];

test.beforeEach(({}, info) => {
  test.skip(info.project.name !== "desktop", "rendition sizes do not depend on the device");
});

test("serves every still rendition under 120 KB", async ({ page, request }) => {
  for (const path of PAGES) {
    await page.goto(path);
    const urls = await page.locator(".still source, .still img").evaluateAll((els) =>
      els.flatMap((el) =>
        (el.getAttribute("srcset") ?? "")
          .split(",")
          .map((candidate) => candidate.trim().split(" ")[0])
          .filter((url): url is string => Boolean(url)),
      ),
    );
    expect(urls.length, path).toBeGreaterThan(0);
    for (const url of new Set(urls)) {
      const res = await request.get(url);
      expect(res.ok(), url).toBe(true);
      expect((await res.body()).length, url).toBeLessThanOrEqual(120 * 1024);
    }
  }
});
```

Append to `MIGRATED`: `"src/components/ui/Still.astro",`

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run test/ui/Still.test.ts test/ui/Work.test.ts`
Expected: FAIL — cannot resolve `Still.astro`; Work has no still.

- [ ] **Step 3: Create `src/components/ui/Still.astro`**

```astro
---
// A generated still (spec §8.2): AVIF/WebP at 800/1200/1600 px, a 1px iron border, 2px corners
// and a 20% carbon scrim so every still sits at one brightness. The stills are illustrations,
// so the alt text always says so. Lazy unless it is a page's hero (then eager, high priority).
import type { ImageMetadata } from "astro";
import { Picture } from "astro:assets";

interface Props {
  src: ImageMetadata;
  /** What the illustration shows; the alt text becomes "Illustration: <subject>". */
  subject: string;
  sizes: string;
  eager?: boolean;
  class?: string;
}

const { src, subject, sizes, eager = false, class: className } = Astro.props;
---

<figure class:list={["still", className]}>
  <Picture
    src={src}
    alt={`Illustration: ${subject}`}
    widths={[800, 1200, 1600]}
    sizes={sizes}
    formats={["avif", "webp"]}
    quality={60}
    loading={eager ? "eager" : "lazy"}
    fetchpriority={eager ? "high" : undefined}
    class="still__img"
  />
</figure>

<style>
  .still {
    position: relative;
    overflow: hidden;
    margin: 0;
    border: 1px solid var(--color-iron);
    border-radius: var(--radius);
    background: var(--color-carbon);
  }

  .still :global(.still__img) {
    display: block;
    width: 100%;
    height: auto;
  }

  /* The scrim: a flat carbon layer at 20%, not a gradient. */
  .still::after {
    content: "";
    position: absolute;
    inset: 0;
    background: var(--color-carbon);
    opacity: 0.2;
    pointer-events: none;
  }
</style>
```

- [ ] **Step 4: Put the rack still in Work**

In `src/components/home/Work.astro` add `import Still from "../ui/Still.astro";` and `import rack from "../../images/rack.webp";` to the frontmatter, and inside `<div class="work__infra">`, after the topology `</figure>`, add:

```astro
<Still
  src={rack}
  subject="a colocation rack at night, one row of orange link lights"
  sizes="(min-width: 72rem) 34rem, (min-width: 60rem) 45vw, 92vw"
/>
```

- [ ] **Step 5: Record the eager exception in the spec**

In spec §8.2, change `` `loading="lazy"`, never in the LCP path. `` to `` `loading="lazy"`, except the `/now` header still, which is that page's hero and loads eagerly with `fetchpriority="high"` (lazy-loading it would delay that page's LCP). `` In the Phase 3 row of spec §10, change `no still in the LCP path` to `no still in the LCP path except the eager /now hero`.

- [ ] **Step 6: Run the tests and watch them pass**

Run: `pnpm vitest run test/ui/Still.test.ts test/ui/Work.test.ts test/migration.test.ts`
Expected: PASS.

Run: `pnpm build && pnpm exec playwright test e2e/stills.spec.ts e2e/home.spec.ts e2e/layout.spec.ts`
Expected: PASS. If a rendition exceeds 120 KB, lower `quality` in `Still.astro` to 50, rebuild and rerun; record the value in the ledger.

- [ ] **Step 7: Gate and commit**

Run: `pnpm check && pnpm test && pnpm build && pnpm exec prettier --check src test e2e docs`
Expected: all green.

```bash
git add src/components/ui/Still.astro src/components/home/Work.astro test/ui/Still.test.ts \
  test/ui/Work.test.ts test/migration.test.ts e2e/stills.spec.ts \
  docs/superpowers/specs/2026-09-24-axiom-design-system-design.md
git commit -m "feat: Still component and the rack illustration beside the topology"
```

---

### Task 6: The `/now` page and the nav item

**Files:**

- Create: `src/pages/now.astro`
- Modify: `src/data/site.ts` (nav), `test/ui/Header.test.ts`, `e2e/pages.spec.ts`, `e2e/layout.spec.ts`, `e2e/stills.spec.ts` (`PAGES`), `lighthouse/lighthouserc.cjs`, `test/migration.test.ts`
- Modify (regenerated): `public/marcus-hancock-gaillard-resume.pdf`, `scripts/resume-pdf.source-sha256`

**Interfaces:**

- Consumes: `now` (Task 1), `NowColumns` (Task 3), `Still` + `src/images/rig.webp` (Tasks 4–5), `Prompt`, `Panel`, `KeyValue`, `LogBars`, `Section`.

- [ ] **Step 1: Write the failing tests**

In `test/ui/Header.test.ts`, add inside the `describe`:

```ts
it("lists Resume, Now, Notes and Contact, in that order", async () => {
  const html = await render(Header, at("/"));
  const labels = [...html.matchAll(/<a href="\/(resume|now|notes|contact)"[^>]*>([^<]+)</g)].map(
    (m) => m[2]!.trim(),
  );
  expect(labels).toEqual(["Resume", "Now", "Notes", "Contact"]);
});
```

Append to `e2e/pages.spec.ts` (before `test.describe("machine-readable files"`):

```ts
test("/now lists the rig, the games, the anime and what Marcus is building", async ({ page }) => {
  await page.goto("/now");
  await expect(page).toHaveTitle("Now · Marcus Hancock-Gaillard");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Now");
  await expect(page.locator(".now__updated")).toHaveText("updated: 2026-09");
  await expect(page.getByRole("heading", { level: 3 })).toHaveText(["rig", "playing", "watching"]);
  for (const text of ["AMD Ryzen 7 7800X3D", "League of Legends", "Demon Slayer"]) {
    await expect(page.locator("main")).toContainText(text);
  }
  for (const key of ["training:", "learning:", "building:"]) {
    await expect(page.locator("main .kv__key", { hasText: key })).toHaveCount(1);
  }
});

test("/now leads with the rig still as its eager hero", async ({ page }) => {
  await page.goto("/now");
  const img = page.locator(".now__hero .still img");
  await expect(img).toHaveAttribute("alt", /^Illustration: /);
  await expect(img).toHaveAttribute("loading", "eager");
  await expect(img).toHaveAttribute("fetchpriority", "high");
  await expect(img).toHaveAttribute("width", /^\d+$/);
  await expect(img).toHaveAttribute("height", /^\d+$/);
});
```

In the `sitemap, robots.txt and security.txt are served` test in `e2e/pages.spec.ts`, add after the `/resume/` assertion:

```ts
expect(sitemap).toContain("https://evilist.io/now/");
```

In `e2e/layout.spec.ts`, change `const routes = ["/", "/resume", "/notes", "/contact"];` to `const routes = ["/", "/now", "/resume", "/notes", "/contact"];`, and add after the "current page is marked in the nav" test:

```ts
test("the nav shows Now and keeps one row from tablet up", async ({ page }) => {
  await page.goto("/now");
  if (page.viewportSize()!.width < COLLAPSED_NAV_MAX) await page.click("[data-menu-toggle]");
  const link = page.locator('#site-nav a[href="/now"]');
  await expect(link).toHaveAttribute("aria-current", "page");
  if (page.viewportSize()!.width >= COLLAPSED_NAV_MAX) {
    const tops = await page
      .locator("#site-nav a")
      .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
  }
});
```

In `e2e/stills.spec.ts` change `const PAGES = ["/"];` to `const PAGES = ["/", "/now"];`.

Append to `MIGRATED`: `"src/pages/now.astro",`

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run test/ui/Header.test.ts test/migration.test.ts`
Expected: FAIL — the nav has no Now; `src/pages/now.astro` does not exist (the migration test errors reading it).

Run: `pnpm build && pnpm exec playwright test e2e/pages.spec.ts e2e/layout.spec.ts e2e/stills.spec.ts --project=desktop`
Expected: FAIL — `/now` is a 404.

- [ ] **Step 3: Add the nav item**

In `src/data/site.ts` replace the `nav` array with:

```ts
export const nav = [
  { href: "/resume", label: "Resume" },
  { href: "/now", label: "Now" },
  { href: "/notes", label: "Notes" },
  { href: "/contact", label: "Contact" },
] as const;
```

- [ ] **Step 4: Create `src/pages/now.astro`**

```astro
---
// /now (spec §7.1): what Marcus is running, playing, watching and building right now.
// Everything comes from src/data/now.ts. The rig still is this page's hero, so it loads eagerly.
import BaseLayout from "../layouts/BaseLayout.astro";
import Section from "../components/ui/Section.astro";
import Panel from "../components/ui/Panel.astro";
import Prompt from "../components/ui/Prompt.astro";
import KeyValue from "../components/ui/KeyValue.astro";
import LogBars from "../components/ui/LogBars.astro";
import Still from "../components/ui/Still.astro";
import NowColumns from "../components/home/NowColumns.astro";
import rig from "../images/rig.webp";
import { now } from "../data/now";

const rows = [
  { key: "training", value: now.training.line },
  { key: "learning", value: now.learning.join(", ") },
  { key: "building", value: now.building.join(", ") },
];
---

<BaseLayout
  title="Now"
  description="What Marcus is running, playing, watching and building right now."
>
  <Section>
    <div class="now__hero">
      <Still
        src={rig}
        subject="a dual-chamber gaming PC on a dark desk, lit by one orange strip"
        sizes="(min-width: 72rem) 67rem, 94vw"
        eager
      />
      <div class="now__intro">
        <Prompt path="now" cursor />
        <h1 class="now__title">Now</h1>
        <p class="now__updated">
          <span class="now__key">updated:</span> {now.updated}
        </p>
      </div>
    </div>

    <div class="now__body">
      <Panel>
        <NowColumns />
      </Panel>
      <Panel>
        <KeyValue rows={rows} />
        <LogBars
          values={now.training.weeks}
          label="Illustrative training rhythm"
          class="now__bars"
        />
      </Panel>
    </div>
  </Section>
</BaseLayout>

<style>
  /* Phones: the 21:9 still is short, so the intro sits under it. From 48rem it overlays the
     still's empty left third (the prompt asked for dark desk there). */
  .now__hero {
    position: relative;
  }

  .now__intro {
    margin-top: 1.5rem;
  }

  @media (min-width: 48rem) {
    .now__intro {
      position: absolute;
      inset: 0 auto 0 0;
      width: 34%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      margin: 0;
      padding-left: clamp(1.25rem, 3vw, 2.5rem);
    }
  }

  .now__title {
    margin-top: 0.75rem;
    font-size: var(--text-display);
  }

  .now__updated {
    margin-top: 0.5rem;
    color: var(--color-paper);
  }

  .now__key {
    color: var(--color-ash);
  }

  .now__body {
    display: grid;
    gap: 1rem;
    margin-top: 2.5rem;
  }

  .now__body :global(.now__bars) {
    margin-top: 1.25rem;
  }
</style>
```

- [ ] **Step 5: Add `/now/` to Lighthouse CI**

In `lighthouse/lighthouserc.cjs` change the `url` array to:

```js
      url: [`${base}/`, `${base}/now/`, `${base}/resume/`, `${base}/notes/`, `${base}/contact`],
```

- [ ] **Step 6: Run the tests and watch them pass**

Run: `pnpm vitest run test/ui/Header.test.ts test/migration.test.ts`
Expected: PASS.

Run: `pnpm build && pnpm exec playwright test e2e/pages.spec.ts e2e/layout.spec.ts e2e/stills.spec.ts e2e/home.spec.ts`
Expected: PASS on every project.

- [ ] **Step 7: Regenerate the resume PDF**

`site.ts` is a resume source, so `test/resumePdf.test.ts` now fails. Run: `pnpm build:pdf`
Expected: `Wrote public/marcus-hancock-gaillard-resume.pdf`; `pnpm vitest run test/resumePdf.test.ts` passes.

- [ ] **Step 8: Gate and commit**

Run: `pnpm check && pnpm test && pnpm build && pnpm exec prettier --check src test e2e lighthouse`
Expected: all green.

```bash
git add src/pages/now.astro src/data/site.ts test/ui/Header.test.ts test/migration.test.ts \
  e2e/pages.spec.ts e2e/layout.spec.ts e2e/stills.spec.ts lighthouse/lighthouserc.cjs \
  public/marcus-hancock-gaillard-resume.pdf scripts/resume-pdf.source-sha256
git commit -m "feat: the /now page and its nav item"
```

---

### Task 7: The 1200×630 social card

**Files:**

- Create: `src/pages/og-card.astro`, `scripts/build-og.mjs`, `test/ogCard.test.ts`, `public/og-default.png` (generated)
- Modify: `src/components/seo/Head.astro` (OG meta), `astro.config.ts` (sitemap filter), `package.json` (`build:og`), `e2e/pages.spec.ts`, `test/migration.test.ts` (append `"src/pages/og-card.astro",` in Step 1)

**Interfaces:**

- Consumes: `src/images/og-bg.webp` (Task 4), `Prompt`, `site`.
- Produces: `pnpm build:og` → `public/og-default.png` (1200×630 PNG). Every page's `og:image` is `https://evilist.io/og-default.png`.

- [ ] **Step 1: Write the failing tests**

`test/ogCard.test.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const CARD = "public/og-default.png";

describe("social card", () => {
  it("exists (run `pnpm build:og` to regenerate it)", () => {
    expect(existsSync(CARD)).toBe(true);
  });

  it("is a 1200×630 PNG", () => {
    const png = readFileSync(CARD);
    expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  });
});
```

In `e2e/pages.spec.ts`, inside `test.describe("machine-readable files", …)`, add:

```ts
test("every page shares the 1200×630 social card", async ({ page, request }) => {
  for (const path of ["/", "/now", "/resume"]) {
    await page.goto(path);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      "https://evilist.io/og-default.png",
    );
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute(
      "content",
      "1200",
    );
    await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute(
      "content",
      "630",
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary_large_image",
    );
  }
  const res = await request.get("/og-default.png");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("image/png");
});

test("the social card's source page stays out of search", async ({ page, request }) => {
  const sitemap = await (await request.get("/sitemap-0.xml")).text();
  expect(sitemap).not.toContain("og-card");
  await page.goto("/og-card/");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run test/ogCard.test.ts`
Expected: FAIL — `public/og-default.png` does not exist.

Run: `pnpm build && pnpm exec playwright test e2e/pages.spec.ts --project=desktop -g "social card"`
Expected: FAIL — `og:image` points at the square portrait; `/og-card/` is a 404.

- [ ] **Step 3: Create `src/pages/og-card.astro`**

```astro
---
// The 1200×630 social card. Not a real page: scripts/build-og.mjs renders it once into
// public/og-default.png. noindex, and excluded from the sitemap in astro.config.ts.
import "../styles/global.css";
import { Font, Image } from "astro:assets";
import Prompt from "../components/ui/Prompt.astro";
import ogBg from "../images/og-bg.webp";
import { site } from "../data/site";
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=1200" />
    <meta name="robots" content="noindex" />
    <title>Social card</title>
    <Font cssVariable="--font-jetbrains" preload />
  </head>
  <body class="og">
    <Image src={ogBg} alt="" width={1200} height={630} loading="eager" class="og__bg" />
    <div class="og__copy">
      <Prompt path="marcus" cursor class="og__prompt" />
      <p class="og__name">{site.name}</p>
      <p class="og__role">
        {site.role} · {site.location}
      </p>
      <p class="og__url">evilist.io</p>
    </div>
  </body>
</html>

<style>
  .og {
    position: relative;
    width: 1200px;
    height: 630px;
    min-height: 0;
    overflow: hidden;
    background: var(--color-void);
  }

  .og :global(.og__bg) {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* Flat void scrim so the copy reads on any render. */
  .og::after {
    content: "";
    position: absolute;
    inset: 0;
    background: var(--color-void);
    opacity: 0.45;
  }

  .og__copy {
    position: absolute;
    left: 72px;
    bottom: 72px;
    z-index: 1;
  }

  .og :global(.og__prompt) {
    font-size: 24px;
  }

  .og__name {
    margin-top: 16px;
    font-size: 64px;
    line-height: 1.1;
    color: var(--color-paper);
  }

  .og__role {
    margin-top: 16px;
    font-size: 26px;
    color: var(--color-fog);
  }

  .og__url {
    margin-top: 28px;
    font-size: 22px;
    color: var(--color-ember);
  }
</style>
```

- [ ] **Step 4: Keep it out of the sitemap**

In `astro.config.ts` change `integrations: [mdx(), sitemap()],` to:

```ts
  // og-card is an internal render target for the social card, not a page.
  integrations: [mdx(), sitemap({ filter: (page) => !page.includes("/og-card") })],
```

- [ ] **Step 5: Create `scripts/build-og.mjs` and the `build:og` script**

```js
// Renders /og-card from the production build into public/og-default.png (1200×630), the social
// card every page links. Usage: pnpm build:og (builds first). Re-run after changing the name,
// role or the card's design, and commit the PNG.
import { spawn } from "node:child_process";
import { copyFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const PORT = 4398;
const base = `http://127.0.0.1:${PORT}`;
const OUT = "public/og-default.png";

const server = spawn("node", ["./dist/server/entry.mjs"], {
  env: { ...process.env, HOST: "127.0.0.1", PORT: String(PORT), SENDGRID_API_KEY: "unused" },
  stdio: "ignore",
});

try {
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(`${base}/healthz`)).ok) break;
    } catch {}
    if (i > 50) throw new Error("preview server did not start");
    await new Promise((r) => setTimeout(r, 200));
  }

  const browser = await chromium.launch();
  // Reduced motion freezes the prompt cursor in its visible state.
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  await page.goto(`${base}/og-card/`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: OUT, type: "png" });
  await browser.close();

  // The build already copied public/; copy the fresh card into the output too.
  copyFileSync(OUT, "dist/client/og-default.png");
  console.log(`Wrote ${OUT}`);
} finally {
  server.kill("SIGTERM");
}
```

In `package.json` `scripts`, after `"build:pdf"`, add:

```json
    "build:og": "astro build && node scripts/build-og.mjs",
```

- [ ] **Step 6: Point every page at the card**

In `src/components/seo/Head.astro`:

- change `import { Font, getImage } from "astro:assets";` to `import { Font } from "astro:assets";` and delete `import authorPic from "../../images/author-pic.webp";`
- replace the two lines starting `// Interim social image` through `const ogImageUrl = new URL(ogImage.src, Astro.site);` with:

```astro
// Built by `pnpm build:og` from src/pages/og-card.astro. const ogImageUrl = new
URL("/og-default.png", Astro.site);
```

- replace the `og:image`, `og:image:alt` and `twitter:card` lines with:

```astro
<meta property="og:image" content={ogImageUrl} />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content={`${site.name}, ${site.role}`} />
<meta name="twitter:card" content="summary_large_image" />
```

- [ ] **Step 7: Build the card and look at it**

Run: `pnpm build:og`
Expected: `Wrote public/og-default.png`. Read the PNG: the terminal close-up behind a dark scrim, `~/marcus` with the cursor, the name, the role line and `evilist.io` in ember, all legible, nothing cut off.

- [ ] **Step 8: Run the tests and watch them pass**

Run: `pnpm vitest run test/ogCard.test.ts`
Expected: PASS.

Run: `pnpm build && pnpm exec playwright test e2e/pages.spec.ts e2e/layout.spec.ts`
Expected: PASS on every project.

- [ ] **Step 9: Gate and commit**

Run: `pnpm check && pnpm test && pnpm build && pnpm exec prettier --check src test e2e scripts astro.config.ts package.json`
Expected: all green.

```bash
git add src/pages/og-card.astro scripts/build-og.mjs test/ogCard.test.ts public/og-default.png \
  src/components/seo/Head.astro astro.config.ts package.json e2e/pages.spec.ts test/migration.test.ts
git commit -m "feat: 1200×630 social card built from an internal route"
```

---

### Task 8: Phase verification, baselines, screenshots, docs

**Files:**

- Modify: `e2e/visual.spec.ts` (one page), `e2e/__screenshots__/**`, `CLAUDE.md`
- Modify: `~/vaults/personal/Projects/evilist.io.md` (outside the repo)

- [ ] **Step 1: Full gate**

Run: `pnpm lint && pnpm check && pnpm test && pnpm build && pnpm size`
Expected: all green; initial JS on `/` still well under 100 KB (the block adds the LogBars script, which shares the Motion chunk); fonts unchanged.

- [ ] **Step 2: E2E**

Run: `pnpm test:e2e`
Expected: green across all projects.

- [ ] **Step 3: Baselines**

In `e2e/visual.spec.ts` add `{ name: "now", path: "/now", fullPage: true },` to `pages` after the `home` entry. Run `pnpm test:visual --update-snapshots=all`, then read `now` and `home` for desktop and iphone-15 and confirm: the rig still with the intro over its left third on desktop and under it on the phone; the three columns with icons; the training bars; the rack still beside the topology on the home page. Run `pnpm test:visual` → 18 passed.

(`=all` because the default `changed` mode keeps a baseline that still passes the 1% tolerance, which let a visible headline change through in Phase 2.)

- [ ] **Step 4: Browser check at the four widths**

Serve the build on 4396. Real Chrome at whatever width the window allows (see CLAUDE.md), then Playwright Chromium at 390×844, 430×932, 768×1024, 1440×900 for `/` (the off-the-clock block and the Work row), `/now` and `/og-card/`. For each: no horizontal overflow, no console errors, the nav on one row from 768 up, the stills loaded. Record the results in the ledger; stop the server.

- [ ] **Step 5: Lighthouse**

```bash
pnpm build && npx -y @lhci/cli@0.15.1 autorun --config=lighthouse/lighthouserc.cjs --upload.target=filesystem --upload.outputDir=/tmp/lhci
```

Expected: accessibility 1.0 and SEO 1.0 on all five URLs; performance ≥ 0.95 locally; CLS ≤ 0.05; total bytes under the 600 KB budget on `/now/`.

- [ ] **Step 6: Docs**

In `CLAUDE.md`:

- in the status note, change `Phases 1 (tokens, primitives, shell) and 2 (home, journey avatar, topology) are done. Phases 3 (\`/now\`, imagery) and 4`to`Phases 1 (tokens, primitives, shell), 2 (home, journey avatar, topology) and 3 (\`/now\`, stills, social card) are done. Phase 4`
- under Commands, after the `pnpm build:pdf` line, add: ``- `pnpm build:og` renders `src/pages/og-card.astro` into `public/og-default.png` (the 1200×630 social card). Re-run it after changing the name, role or card design, and commit the PNG.``
- under Where things live, after the `site.ts` bullet, add: ``- `src/data/now.ts` is the single source for the off-the-clock block and `/now` (rig, games, anime, learning, building, training). No lift numbers or bodyweight, ever.``
- in the Design brief imagery bullet, after `prompts and job IDs go in \`docs/imagery.md\``, add: `. Serve stills through \`Still\` (alt text always starts "Illustration:"); import new renders with \`scripts/import-still.mjs\``

Append to `~/vaults/personal/Projects/evilist.io.md` under `## Build Log (2026)`:

```markdown
### 2026-09-24 — Axiom redesign, Phase 3 done (/now, stills, social card)

- **Shipped:** `now.ts` (rig with the M2 Max, games, anime, learning, building, lifting for health) feeding an off-the-clock block on the home page and a new `/now` page (in the nav); a line-icon set; three Higgsfield illustrations (rig header on `/now`, a rack beside the topology, the social-card background), each labelled "Illustration:"; a 1200×630 social card built by `pnpm build:og`.
- **Checks:** fill in the real Lighthouse scores and test counts.
- **Next:** Phase 4 (resume, notes and contact on the new system, PDF restyle, ADR, deleting the old token aliases, the deferred minors from Phases 1–2).
```

Replace "fill in the real Lighthouse scores and test counts" with the actual numbers before saving.

- [ ] **Step 7: Commit and stop for approval**

Run: `pnpm check && pnpm test && pnpm build && pnpm exec prettier --check .`

```bash
git add e2e/visual.spec.ts e2e/__screenshots__ CLAUDE.md
git commit -m "test: visual baselines for /now and the off-the-clock block"
git log --oneline main..HEAD
```

Report to Marcus: commits, Lighthouse scores, test counts, screenshots, credits spent. Do not merge or push.
