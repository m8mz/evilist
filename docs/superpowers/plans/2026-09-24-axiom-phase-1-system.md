# Axiom Phase 1 — Design System, Primitives and Shell — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the site's tokens, fonts, global styles, UI primitives and layout shell with the Axiom-derived terminal system, so every page renders in the new skin while section internals stay as they are.

**Architecture:** New `tokens.css` defines the Axiom surface ladder, one accent and a single monospaced type scale, plus a `:root` block of compatibility aliases so untouched components (journey, notes, contact, resume) render in the new palette without edits. Primitives are rewritten or added as small Astro components with Container-API unit tests. The Three.js aura, speed lines and seal filter are removed. Sections, hero internals, notes, resume and contact are restyled in later phases.

**Tech Stack:** Astro 7, Tailwind 4 `@theme`, Astro Fonts API (Fontsource provider), vitest 5 with `experimental_AstroContainer`, Playwright 1.63, `motion` (`inView`).

**Spec:** `docs/superpowers/specs/2026-09-24-axiom-design-system-design.md` (this plan implements §3, §4, §5 and the Phase 1 row of §10).

## Global Constraints

- Dark only. No `box-shadow`, no gradients, no `filter: blur()`, no glow. Elevation is `void → carbon → graphite → iron` surface steps only.
- Ember `#da5c2c` appears only on: primary button fills, the prompt cursor, `Panel case` left borders, log bars / pulse dots / LEDs, link hover, `:focus-visible`, `::selection`.
- Filled controls carry **void** text (paper on ember is 3.3:1 and fails AA).
- No visible text below 4.5:1 on its surface. Steel `#606060` (3.1:1) is for borders, strokes and decorative glyphs only, never text. Tags, prompt prefixes and key labels use ash `#7e7e7e`.
- Border radius 2px everywhere; 9999px only on the terminal-chrome dots.
- Animate only `transform`, `opacity`, `pathLength`; respect `prefers-reduced-motion`; JS-only states behind `@media (scripting: enabled)` or a JS-set attribute.
- CSP: no inline `style=` attributes, no `is:inline` scripts, `build.inlineStylesheets: "never"` stays.
- Budgets: initial JS on `/` ≤ 100 KB gz; fonts ≤ 120 KB; zero third-party requests; Lighthouse a11y = 1, SEO = 1, perf ≥ 0.9 (CI config), CLS ≤ 0.05.
- pnpm only. `minimumReleaseAge` 24 h. Never `--no-gpg-sign`. No AI attribution in commits.
- Before every commit: `pnpm check && pnpm test && pnpm build`. Before the phase is done: browser check at 390, 430, 768, 1440 with screenshots.
- Keep e2e selectors working: `.site-header`, `.site-footer`, `.brand`, `[data-menu-toggle]`, `#site-nav`, `.site-nav.is-open`, `#journey [role=img]` (`aria-label="Rank E"`), `#contact a[href="/contact"]`, link name "Download the PDF" (substring match).

## Review Focus

1. **A component references a token that no longer exists** (e.g. `var(--color-seam)` after the rename) and silently falls back to `initial`, giving invisible text or borders. Pinned by `test/tokens.test.ts` "has no undefined custom property references anywhere in src" (Task 1).
2. **The `→` on buttons and links is read aloud** ("See the journey right arrow") and breaks `getByRole("link", { name })` matches. Pinned by `test/ui/Button.test.ts` "hides the arrow from assistive tech" (Task 7) and `test/ui/KeyValue.test.ts` (Task 5).
3. **`LogBars` receives a value outside 0–1, `NaN`, or an empty array** and renders a negative-height `<rect>` (invalid SVG) or a zero-width viewBox. Pinned by `test/logBars.test.ts` (Task 12).
4. **A `KeyValue` link value points off-site** and opens without `rel="noopener"`. Pinned by `test/ui/KeyValue.test.ts` "external links get rel and target" (Task 5).
5. **`Section` without a `prompt` renders an empty eyebrow `<p>`**, adding a phantom gap above every non-home section. Pinned by `test/ui/Section.test.ts` "renders no prompt when none is given" (Task 9).

---

### Task 1: Branch, tokens, fonts, global styles

**Files:**

- Create: `test/tokens.test.ts`
- Modify: `src/styles/tokens.css` (replace whole file)
- Modify: `src/styles/global.css` (replace whole file)
- Modify: `astro.config.ts:23-44` (the `fonts` array)
- Modify: `src/components/seo/Head.astro:26,32-33`
- Modify: `src/components/journey/Journey.astro:169`, `src/components/journey/JourneyTimeline.astro:53`, `src/layouts/NoteLayout.astro:124,130`, `src/pages/contact.astro:102`, `src/components/ui/Section.astro:27` (old surface `--color-slate` → `--color-carbon`)
- Modify: `docs/superpowers/specs/2026-09-24-axiom-design-system-design.md` (steel is never text)

**Interfaces:**

- Note on the font variable: the spec names the Fonts API `cssVariable` `--font-mono`. Because `@theme` also needs a `--font-mono` token with fallbacks, the Fonts API variable is `--font-jetbrains` and `@theme` defines `--font-mono: var(--font-jetbrains), …`. Components use `--font-mono` only.
- Produces: CSS custom properties `--color-{void,carbon,graphite,iron,slate,steel,ash,fog,paper,ember}`, `--font-mono`, `--text-{caption,body,heading-sm,heading,heading-lg,display,hero}`, `--leading-{body,display}`, `--radius`, `--measure`, `--gutter`, `--section-y`; compatibility aliases for every old token name (`--color-night`, `--color-night-deep`, `--color-seam`, `--color-washi`, `--color-hanko`, `--color-hanko-ink`, `--color-hanko-hot`, `--color-gold`, `--font-display`, `--font-body`, `--text-{sm,base,lg,xl,2xl,3xl}`, `--cut`). Every later task uses only the new names.

- [ ] **Step 1: Create the branch**

```bash
git checkout -b feat/axiom-1-system docs/axiom-spec
```

- [ ] **Step 2: Write the failing token tests**

Create `test/tokens.test.ts`:

```ts
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const tokensCss = readFileSync("src/styles/tokens.css", "utf8");

/** Every `--name: value;` declared in tokens.css (the @theme block and the :root aliases). */
function declaredTokens(css: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) out.set(m[1], m[2].trim());
  return out;
}

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio between two 6-digit hex colours. */
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) sourceFiles(p, out);
    else if (/\.(astro|css|mdx)$/.test(name)) out.push(p);
  }
  return out;
}

const tokens = declaredTokens(tokensCss);
const color = (name: string) => tokens.get(`--color-${name}`)!;

/** Custom properties set at runtime rather than in tokens.css. */
const PROVIDED = new Set([
  "--font-jetbrains", // set on :root by <Font cssVariable> in Head.astro
  "--progress", // set on [data-journey] by scripts/journey.ts
]);

describe("design tokens", () => {
  it("defines the Axiom surface ladder and one accent", () => {
    expect(color("void")).toBe("#000000");
    expect(color("carbon")).toBe("#111111");
    expect(color("graphite")).toBe("#191919");
    expect(color("iron")).toBe("#202020");
    expect(color("ember")).toBe("#da5c2c");
    expect(color("paper")).toBe("#eeeeee");
  });

  it("keeps text on the void readable (AA or better)", () => {
    expect(contrast(color("paper"), color("void"))).toBeGreaterThanOrEqual(7);
    expect(contrast(color("fog"), color("void"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(color("ash"), color("void"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(color("ember"), color("void"))).toBeGreaterThanOrEqual(4.5);
  });

  it("puts void text on ember fills, because paper on ember fails AA", () => {
    expect(contrast(color("void"), color("ember"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(color("paper"), color("ember"))).toBeLessThan(4.5);
  });

  it("aliases every retired token name so untouched components still render", () => {
    for (const old of [
      "--color-night",
      "--color-seam",
      "--color-washi",
      "--color-hanko",
      "--color-hanko-hot",
      "--font-display",
      "--font-body",
      "--text-lg",
      "--text-3xl",
      "--cut",
    ]) {
      expect(tokens.has(old), old).toBe(true);
    }
  });

  it("has no undefined custom property references anywhere in src", () => {
    const missing = new Set<string>();
    for (const file of sourceFiles("src")) {
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(/var\((--[a-z0-9-]+)/g)) {
        const definedLocally = text.includes(`${m[1]}:`);
        if (!tokens.has(m[1]) && !definedLocally && !PROVIDED.has(m[1])) {
          missing.add(`${m[1]} in ${file}`);
        }
      }
    }
    expect([...missing]).toEqual([]);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm vitest run test/tokens.test.ts`
Expected: FAIL — "defines the Axiom surface ladder" (`--color-void` undefined) and "aliases every retired token name" (`--cut` is in `@theme` today but `--color-ember` etc. are missing).

- [ ] **Step 4: Replace `src/styles/tokens.css`**

```css
/*
 * Design tokens: "terminal window at midnight" (derived from the Axiom style reference).
 * Surfaces step void → carbon → graphite → iron. One accent (ember) does all the colour work and
 * appears only on: primary button fills, the prompt cursor, case-card left borders, log bars /
 * pulse dots / LEDs, link hover, focus rings and selection. Nowhere else.
 * Spec: docs/superpowers/specs/2026-09-24-axiom-design-system-design.md
 */
@theme {
  /* Surfaces */
  --color-void: #000000;
  --color-carbon: #111111;
  --color-graphite: #191919;
  --color-iron: #202020;
  --color-slate: #3a3a3a; /* muted borders, icon strokes, decorative glyphs */

  /* Text. Contrast on void in brackets. Steel is 3.1:1: never use it for text. */
  --color-steel: #606060;
  --color-ash: #7e7e7e; /* annotations, tags, key labels (5.2:1) */
  --color-fog: #b4b4b4; /* secondary text (10:1) */
  --color-paper: #eeeeee; /* primary text (17:1) */

  /* Accent: 5.6:1 on void. Fills carry void text (paper on ember is 3.3:1). */
  --color-ember: #da5c2c;

  /* Type: one monospaced face for everything. --font-jetbrains is set by <Font> in Head.astro. */
  --font-mono: var(--font-jetbrains), ui-monospace, SFMono-Regular, Menlo, monospace;

  --text-caption: 12px;
  --text-body: 15px;
  --text-heading-sm: 18px;
  --text-heading: 20px;
  --text-heading-lg: 24px;
  --text-display: 32px;
  --text-hero: clamp(2rem, 1.2rem + 3.5vw, 3.75rem);

  --leading-body: 1.7;
  --leading-display: 1.25;

  /* Shape and layout */
  --radius: 2px;
  --measure: 68ch;
  --gutter: clamp(1rem, 0.6rem + 2vw, 2.5rem);
  --section-y: clamp(4rem, 2.5rem + 4vw, 6rem);
}

/*
 * Compatibility aliases for the retired "manga panel" token names. Components that still use them
 * render in the new palette without being edited. Phase 4 deletes each alias once its last usage
 * is migrated. Do not add new usages of these names.
 */
:root {
  --color-night: var(--color-void);
  --color-night-deep: var(--color-void);
  --color-seam: var(--color-iron);
  --color-washi: var(--color-paper);
  --color-hanko: var(--color-ember);
  --color-hanko-ink: var(--color-ember);
  --color-hanko-hot: var(--color-ember);
  --color-gold: var(--color-fog);

  --font-display: var(--font-mono);
  --font-body: var(--font-mono);

  --text-sm: var(--text-caption);
  --text-base: var(--text-body);
  --text-lg: var(--text-heading-sm);
  --text-xl: var(--text-heading);
  --text-2xl: var(--text-heading-lg);
  --text-3xl: var(--text-display);

  --cut: 0px; /* diagonal cuts are gone; removed in Task 9 with Section */
}
```

- [ ] **Step 5: Point the old surface usages of `--color-slate` at carbon**

The old `--color-slate` was a surface (`#1b2133`); the new one is a border colour. Five rules use it as a background:

```bash
sed -i '' 's/var(--color-slate)/var(--color-carbon)/g' \
  src/components/journey/Journey.astro \
  src/components/journey/JourneyTimeline.astro \
  src/layouts/NoteLayout.astro \
  src/pages/contact.astro \
  src/components/ui/Section.astro
git diff --stat
```

Expected: 5 files changed, 6 insertions, 6 deletions (`NoteLayout.astro` has two).

- [ ] **Step 6: Replace the fonts in `astro.config.ts`**

Replace the whole `fonts: [ … ]` array (lines 23–44) with:

```ts
  fonts: [
    {
      // One monospaced face for everything: headlines, body, nav, buttons, code (spec §3.3).
      provider: fontProviders.fontsource(),
      name: "JetBrains Mono",
      cssVariable: "--font-jetbrains",
      weights: [400, 700],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
    },
  ],
```

- [ ] **Step 7: Update `src/components/seo/Head.astro`**

Change line 26 and replace lines 32–33:

```astro
<meta name="theme-color" content="#000000" />
```

```astro
<Font cssVariable="--font-jetbrains" preload />
```

- [ ] **Step 8: Replace `src/styles/global.css`**

```css
@import "tailwindcss";
@import "./tokens.css";

@layer base {
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  * {
    margin: 0;
  }

  :root {
    color-scheme: dark;
    -webkit-text-size-adjust: 100%;
  }

  html {
    scroll-behavior: smooth;
    scroll-padding-top: 4.5rem; /* sticky header + breathing room */
  }

  body {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    background: var(--color-void);
    color: var(--color-paper);
    font-family: var(--font-mono);
    font-size: var(--text-body);
    line-height: var(--leading-body);
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
  }

  main {
    flex: 1;
  }

  /* Hierarchy comes from size, not weight: headings are the same 400 as prose. */
  h1,
  h2,
  h3 {
    font-family: var(--font-mono);
    font-weight: 400;
    line-height: var(--leading-display);
    letter-spacing: 0;
    text-wrap: balance;
  }

  h2 {
    font-size: var(--text-heading-lg);
  }

  h3 {
    font-size: var(--text-heading);
  }

  p {
    max-width: var(--measure);
    text-wrap: pretty;
  }

  a {
    color: inherit;
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 0.2em;
  }

  a:hover {
    color: var(--color-ember);
  }

  img,
  svg,
  video {
    display: block;
    max-width: 100%;
    height: auto;
  }

  input,
  button,
  textarea,
  select {
    font: inherit;
  }

  ::selection {
    background: var(--color-ember);
    color: var(--color-void);
  }

  :focus-visible {
    outline: 2px solid var(--color-ember);
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    html {
      scroll-behavior: auto;
    }

    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
}

@layer components {
  /* Centered content column with responsive gutters. */
  .wrap {
    width: 100%;
    max-width: 72rem;
    margin-inline: auto;
    padding-inline: var(--gutter);
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
}
```

- [ ] **Step 9: Correct the spec where it put steel on text**

In `docs/superpowers/specs/2026-09-24-axiom-design-system-design.md`:

- §3.1 table, `--color-steel` row: change the Role cell to `Borders, icon strokes, arrow-field glyphs; never text (3.1:1)`.
- §3.1 table, `--color-ash` row: change the Role cell to `Annotations, tags, key labels, prompt prefix`.
- §4 `Prompt` row: change `~/` in steel to `~/` in ash.
- §4 `Tag` row: change `steel text` to `ash text`.
- §4 `KeyValue` row: change `keys in steel` to `keys in ash`.
- §6.6 stays as is.

- [ ] **Step 10: Run the token tests and the full gate**

Run: `pnpm vitest run test/tokens.test.ts`
Expected: PASS (5 tests).

Run: `pnpm check && pnpm test && pnpm build`
Expected: all green. `pnpm build` output lists `JetBrains Mono` under fonts and no `Dela Gothic One`.

- [ ] **Step 11: Commit**

```bash
git add src/styles/tokens.css src/styles/global.css astro.config.ts src/components/seo/Head.astro \
  src/components/journey/Journey.astro src/components/journey/JourneyTimeline.astro \
  src/layouts/NoteLayout.astro src/pages/contact.astro src/components/ui/Section.astro \
  test/tokens.test.ts docs/superpowers/specs/2026-09-24-axiom-design-system-design.md
git commit -m "feat: Axiom tokens, JetBrains Mono and global styles with compatibility aliases"
```

---

### Task 2: Remove the Three.js aura and the speed lines

**Files:**

- Delete: `src/components/home/HeroAura.astro`, `src/scripts/hero-aura.ts`, `src/scripts/hero-aura-scene.ts`, `test/heroAura.test.ts`, `e2e/aura.spec.ts`, `src/components/ui/SpeedLines.astro`
- Modify: `src/components/home/Hero.astro:5-6,21,45,71,74-78`
- Modify: `scripts/check-bundle-size.mjs` (replace whole file)
- Modify: `package.json` (via `pnpm remove`)

**Interfaces:**

- Produces: `pnpm size` now reports `Initial JS on / (gz)` and `Fonts (woff2)` rows and fails if any `three`/`hero-aura` chunk exists in `dist/client/_astro`.

- [ ] **Step 1: Remove the dependency and the files**

```bash
pnpm remove three @types/three
git rm src/components/home/HeroAura.astro src/scripts/hero-aura.ts src/scripts/hero-aura-scene.ts \
  test/heroAura.test.ts e2e/aura.spec.ts src/components/ui/SpeedLines.astro
```

- [ ] **Step 2: Edit `src/components/home/Hero.astro`**

Remove lines 5–6:

```astro
import SpeedLines from "../ui/SpeedLines.astro"; import HeroAura from "./HeroAura.astro";
```

Remove line 21 (`<SpeedLines class="hero__lines" />`) and line 45 (`<HeroAura />`).

Change line 71 to:

```css
padding-block: clamp(3rem, 2rem + 6vw, 7.5rem) var(--section-y);
```

Remove the block at lines 74–78:

```css
.hero :global(.hero__lines) {
  left: auto;
  width: min(70rem, 120%);
  right: -20%;
}
```

- [ ] **Step 3: Replace `scripts/check-bundle-size.mjs`**

```js
// Fails the build if asset budgets are exceeded (see CLAUDE.md "Budgets").
// - Initial JS on the home page: every module script and modulepreload referenced by index.html.
// - Self-hosted fonts: every woff2 Astro emitted. woff2 is already compressed, so raw bytes count.
// - No Three.js: the aura was removed in the Axiom redesign; a three/hero-aura chunk is a regression.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";

const KB = 1024;
const BUDGETS = { initialHome: 100 * KB, fonts: 120 * KB };
const gz = (path) => gzipSync(readFileSync(path)).length;

const html = readFileSync("dist/client/index.html", "utf8");
const initial = [
  ...html.matchAll(/<script[^>]+src="(\/_astro\/[^"]+\.js)"/g),
  ...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="(\/_astro\/[^"]+\.js)"/g),
].map((m) => m[1]);
const initialBytes = [...new Set(initial)].reduce((sum, src) => sum + gz(`dist/client${src}`), 0);

const fontDir = "dist/client/_astro/fonts";
const fontBytes = existsSync(fontDir)
  ? readdirSync(fontDir)
      .filter((f) => f.endsWith(".woff2"))
      .reduce((sum, f) => sum + statSync(`${fontDir}/${f}`).size, 0)
  : 0;

const rows = [
  ["Initial JS on / (gz)", initialBytes, BUDGETS.initialHome],
  ["Fonts (woff2)", fontBytes, BUDGETS.fonts],
];
let failed = false;
for (const [name, bytes, budget] of rows) {
  const ok = bytes <= budget;
  failed ||= !ok;
  console.log(
    `${ok ? "ok  " : "FAIL"} ${name}: ${(bytes / KB).toFixed(1)} KB (budget ${budget / KB} KB)`,
  );
}

const stray = readdirSync("dist/client/_astro").filter((f) => /three|hero-aura/.test(f));
if (stray.length) {
  console.log(`FAIL Three.js chunk present: ${stray.join(", ")}`);
  failed = true;
}
process.exit(failed ? 1 : 0);
```

- [ ] **Step 4: Verify**

Run: `pnpm check && pnpm test && pnpm build && pnpm size`
Expected: green; `pnpm size` prints two `ok` rows, no `FAIL`. `grep -rl three dist/client/_astro` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: remove the Three.js hero aura and speed lines"
```

---

### Task 3: Remove the seal ink filter

**Files:**

- Delete: `src/components/ui/SealInkFilter.astro`
- Modify: `src/layouts/BaseLayout.astro:7,17`
- Modify: `src/components/ui/RankBadge.astro:44-45`

`RankBadge` stays until Phase 2 replaces its last usages (Hero, Journey, JourneyTimeline). Without the filter definition, browsers would drop every seal, so the reference goes now.

- [ ] **Step 1: Delete the filter and its mount**

```bash
git rm src/components/ui/SealInkFilter.astro
```

In `src/layouts/BaseLayout.astro` remove line 7 (`import SealInkFilter …`) and line 17 (`<SealInkFilter />`).

- [ ] **Step 2: Drop the filter reference in `RankBadge.astro`**

Replace lines 44–45:

```astro
    <!-- #seal-ink is defined once in BaseLayout (SealInkFilter). -->
    <g filter="url(#seal-ink)">
```

with:

```astro
    <g>
```

- [ ] **Step 3: Verify**

Run: `pnpm check && pnpm test && pnpm build`
Expected: green. `grep -rn "seal-ink" src` prints nothing.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove the seal ink filter"
```

---

### Task 4: Container test helper and `Prompt`

**Files:**

- Create: `test/render.ts`, `test/ui/Prompt.test.ts`, `src/components/ui/Prompt.astro`

**Interfaces:**

- Produces: `render(Component, { props?, slots? }): Promise<string>` in `test/render.ts`; `Prompt` with props `path: string`, `cursor?: boolean`, `class?: string`.

- [ ] **Step 1: Create the render helper**

`test/render.ts`:

```ts
import { experimental_AstroContainer as AstroContainer } from "astro/container";

type Component = Parameters<AstroContainer["renderToString"]>[0];

let container: AstroContainer | undefined;

/** Render an Astro component to HTML. Styles and scripts are not included: assert on markup. */
export async function render(
  Component: Component,
  options: { props?: Record<string, unknown>; slots?: Record<string, string> } = {},
): Promise<string> {
  container ??= await AstroContainer.create();
  return container.renderToString(Component, options);
}
```

- [ ] **Step 2: Write the failing test**

`test/ui/Prompt.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import Prompt from "../../src/components/ui/Prompt.astro";
import { render } from "../render";

describe("Prompt", () => {
  it("renders ~/ and the path", async () => {
    const html = await render(Prompt, { props: { path: "journey" } });
    // Components with a <style> get a data-astro-cid-* attribute on every element, so match
    // "attribute … > text <" with [^>]* between them.
    expect(html).toMatch(/class="prompt__prefix" aria-hidden="true"[^>]*>~\/</);
    expect(html).toMatch(/class="prompt__path"[^>]*>journey</);
    expect(html).not.toContain("prompt__cursor");
  });

  it("adds a decorative cursor on request", async () => {
    const html = await render(Prompt, { props: { path: "marcus", cursor: true } });
    expect(html).toContain('class="prompt__cursor" aria-hidden="true"');
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `pnpm vitest run test/ui/Prompt.test.ts`
Expected: FAIL — cannot resolve `../../src/components/ui/Prompt.astro`.

- [ ] **Step 4: Create `src/components/ui/Prompt.astro`**

```astro
---
// Terminal prompt line, `~/path`, with an optional blinking cursor. The eyebrow for every section.
// The cursor blinks with a CSS animation; global reduced-motion rules freeze it.
interface Props {
  path: string;
  cursor?: boolean;
  class?: string;
}

const { path, cursor = false, class: className } = Astro.props;
---

<p class:list={["prompt", className]}>
  <span class="prompt__prefix" aria-hidden="true">
    ~/
  </span>
  <span class="prompt__path">{path}</span>
  {cursor && <span class="prompt__cursor" aria-hidden="true"></span>}
</p>

<style>
  .prompt {
    display: flex;
    align-items: center;
    font-size: var(--text-caption);
    line-height: 1.5;
    color: var(--color-paper);
  }

  .prompt__prefix {
    color: var(--color-ash);
  }

  .prompt__cursor {
    display: inline-block;
    width: 0.6em;
    height: 1.1em;
    margin-left: 0.35em;
    background: var(--color-ember);
    animation: blink 1s steps(1, end) infinite;
  }

  @keyframes blink {
    50% {
      opacity: 0;
    }
  }
</style>
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run test/ui/Prompt.test.ts`
Expected: PASS (2 tests). If the Container API cannot import `.astro` files, check `vitest.config.ts` still uses `getViteConfig` from `astro/config` (it does today) and that no `environment` other than `node` is set.

- [ ] **Step 6: Commit**

```bash
git add test/render.ts test/ui/Prompt.test.ts src/components/ui/Prompt.astro
git commit -m "feat: Prompt primitive and Astro container test helper"
```

---

### Task 5: `Tag` and `KeyValue`

**Files:**

- Create: `src/components/ui/Tag.astro`, `src/components/ui/KeyValue.astro`, `test/ui/Tag.test.ts`, `test/ui/KeyValue.test.ts`

**Interfaces:**

- Produces: `Tag` (default slot, `class?`); `KeyValue` with `rows: readonly KeyValueRow[]` where `KeyValueRow = { key: string; value: string | { href: string; label: string } }`, exported from `KeyValue.astro`.

- [ ] **Step 1: Write the failing tests**

`test/ui/Tag.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import Tag from "../../src/components/ui/Tag.astro";
import { render } from "../render";

describe("Tag", () => {
  it("renders its slot in a span with the tag class", async () => {
    const html = await render(Tag, { slots: { default: "automation" } });
    expect(html).toMatch(/<span class="tag[^"]*"[^>]*>automation<\/span>/);
  });
});
```

`test/ui/KeyValue.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import KeyValue from "../../src/components/ui/KeyValue.astro";
import { render } from "../render";

describe("KeyValue", () => {
  it("renders key: value rows in a definition list", async () => {
    const html = await render(KeyValue, {
      props: { rows: [{ key: "cpu", value: "AMD Ryzen 7 7800X3D" }] },
    });
    expect(html).toContain("<dl");
    expect(html).toContain(">cpu:<");
    expect(html).toContain(">AMD Ryzen 7 7800X3D<");
  });

  it("renders link values with a hidden arrow", async () => {
    const html = await render(KeyValue, {
      props: { rows: [{ key: "more", value: { href: "/now", label: "now" } }] },
    });
    expect(html).toContain('href="/now"');
    expect(html).toMatch(/aria-hidden="true"[^>]*> →</);
    expect(html).not.toContain("noopener");
  });

  it("external links get rel and target", async () => {
    const html = await render(KeyValue, {
      props: {
        rows: [{ key: "code", value: { href: "https://github.com/m8mz", label: "github" } }],
      },
    });
    expect(html).toContain('rel="noopener"');
    expect(html).toContain('target="_blank"');
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run test/ui/Tag.test.ts test/ui/KeyValue.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Create `src/components/ui/Tag.astro`**

```astro
---
// Typographic category label: uppercase caption in ash. No fill, no border.
interface Props {
  class?: string;
}

const { class: className } = Astro.props;
---

<span class:list={["tag", className]}>
  <slot />
</span>

<style>
  .tag {
    display: inline-block;
    font-size: var(--text-caption);
    line-height: 1.5;
    text-transform: uppercase;
    color: var(--color-ash);
  }
</style>
```

- [ ] **Step 4: Create `src/components/ui/KeyValue.astro`**

```astro
---
// `key: value` rows in a definition list. Keys in ash, values in paper; link values get an arrow.
export interface KeyValueRow {
  key: string;
  value: string | { href: string; label: string };
}

interface Props {
  rows: readonly KeyValueRow[];
  class?: string;
}

const { rows, class: className } = Astro.props;
const isExternal = (href: string) => /^https?:\/\//.test(href);
---

<dl class:list={["kv", className]}>
  {rows.map(({ key, value }) => (
    <div class="kv__row">
      <dt class="kv__key">{key}:</dt>
      <dd class="kv__value">
        {typeof value === "string" ? (
          value
        ) : (
          <a
            href={value.href}
            {...(isExternal(value.href) ? { rel: "noopener", target: "_blank" } : {})}
          >
            {value.label}
            <span aria-hidden="true"> →</span>
          </a>
        )}
      </dd>
    </div>
  ))}
</dl>

<style>
  .kv {
    display: grid;
    gap: 0.25rem;
    font-size: var(--text-body);
  }

  .kv__row {
    display: flex;
    flex-wrap: wrap;
    gap: 0 0.5ch;
  }

  .kv__key {
    color: var(--color-ash);
  }

  .kv__value {
    color: var(--color-paper);
  }
</style>
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run test/ui/Tag.test.ts test/ui/KeyValue.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Tag.astro src/components/ui/KeyValue.astro test/ui/Tag.test.ts test/ui/KeyValue.test.ts
git commit -m "feat: Tag and KeyValue primitives"
```

---

### Task 6: `RankChip`

**Files:**

- Create: `src/components/ui/RankChip.astro`, `test/ui/RankChip.test.ts`

**Interfaces:**

- Produces: `RankChip` with `rank: Rank`, `size?: "sm" | "md"`, `label?: string`, `class?: string`; exports `type Rank = "E" | "E+" | "D" | "C" | "B" | "A" | "S"`. Phase 2 replaces every `RankBadge` with it.

- [ ] **Step 1: Write the failing test**

`test/ui/RankChip.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import RankChip from "../../src/components/ui/RankChip.astro";
import { render } from "../render";

const RANKS = ["E", "E+", "D", "C", "B", "A", "S"] as const;

describe("RankChip", () => {
  it("renders every rank as an image with an accessible label", async () => {
    for (const rank of RANKS) {
      const html = await render(RankChip, { props: { rank } });
      expect(html).toContain('role="img"');
      expect(html).toContain(`aria-label="Rank ${rank}"`);
      expect(html).toContain(`data-rank="${rank}"`);
      expect(html).toContain(`[ ${rank} ]`);
    }
  });

  it("gives only S the accent modifier", async () => {
    expect(await render(RankChip, { props: { rank: "S" } })).toContain("rank-chip--s");
    expect(await render(RankChip, { props: { rank: "A" } })).not.toContain("rank-chip--s");
  });

  it("accepts a custom label and size", async () => {
    const html = await render(RankChip, {
      props: { rank: "S", size: "sm", label: "S-rank: Sr. Systems Architect" },
    });
    expect(html).toContain('aria-label="S-rank: Sr. Systems Architect"');
    expect(html).toContain("rank-chip--sm");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run test/ui/RankChip.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/components/ui/RankChip.astro`**

```astro
---
// Rank as a terminal tag: `[ S ]`. Only S carries the accent (ember fill, void text); every other
// rank is paper on graphite. State is shown by the glyph, not by colour.
export type Rank = "E" | "E+" | "D" | "C" | "B" | "A" | "S";

interface Props {
  rank: Rank;
  size?: "sm" | "md";
  label?: string;
  class?: string;
}

const { rank, size = "md", label = `Rank ${rank}`, class: className } = Astro.props;
---

<span
  class:list={["rank-chip", `rank-chip--${size}`, { "rank-chip--s": rank === "S" }, className]}
  data-rank={rank}
  role="img"
  aria-label={label}
>
  <span aria-hidden="true">{`[ ${rank} ]`}</span>
</span>

<style>
  .rank-chip {
    display: inline-block;
    flex: none;
    border: 1px solid var(--color-slate);
    border-radius: var(--radius);
    background: var(--color-graphite);
    color: var(--color-paper);
    font-weight: 700;
    line-height: 1;
    white-space: nowrap;
  }

  .rank-chip--sm {
    padding: 0.25rem 0.4rem;
    font-size: var(--text-caption);
  }

  .rank-chip--md {
    padding: 0.4rem 0.6rem;
    font-size: var(--text-body);
  }

  .rank-chip--s {
    border-color: var(--color-ember);
    background: var(--color-ember);
    color: var(--color-void);
  }
</style>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run test/ui/RankChip.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/RankChip.astro test/ui/RankChip.test.ts
git commit -m "feat: RankChip primitive"
```

---

### Task 7: `Button`

**Files:**

- Modify: `src/components/ui/Button.astro` (replace whole file)
- Create: `test/ui/Button.test.ts`

**Interfaces:**

- Consumes: nothing new. Same props as today (`href`, `variant?: "primary" | "ghost"`, `class?`), so Hero, CTA, 404 and resume keep working.

- [ ] **Step 1: Write the failing test**

`test/ui/Button.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import Button from "../../src/components/ui/Button.astro";
import { render } from "../render";

describe("Button", () => {
  it("renders a primary link with the label and a hidden arrow", async () => {
    const html = await render(Button, {
      props: { href: "/resume" },
      slots: { default: "Read the resume" },
    });
    expect(html).toMatch(/<a href="\/resume" class="btn btn--primary[^"]*"/);
    expect(html).toContain("Read the resume");
    expect(html).toMatch(/class="btn__arrow" aria-hidden="true"[^>]*>→</);
  });

  it("hides the arrow from assistive tech so the accessible name is the label alone", async () => {
    const html = await render(Button, { props: { href: "/x" }, slots: { default: "Go" } });
    const arrows = html.match(/→/g) ?? [];
    expect(arrows).toHaveLength(1);
    expect(html).toMatch(/aria-hidden="true"[^>]*>→</);
  });

  it("supports the ghost variant", async () => {
    const html = await render(Button, {
      props: { href: "/x", variant: "ghost" },
      slots: { default: "Go" },
    });
    expect(html).toContain("btn--ghost");
    expect(html).not.toContain("btn--primary");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run test/ui/Button.test.ts`
Expected: FAIL — no `btn__arrow` in the current output.

- [ ] **Step 3: Replace `src/components/ui/Button.astro`**

```astro
---
// Terminal button: 2px corners, an arrow after the label, colour change only on hover.
// Primary carries void text on the ember fill: paper on ember is 3.3:1 and fails AA (spec §3.1).
interface Props {
  href: string;
  variant?: "primary" | "ghost";
  class?: string;
}

const { href, variant = "primary", class: className } = Astro.props;
---

<a href={href} class:list={["btn", `btn--${variant}`, className]}>
  <slot />
  <span class="btn__arrow" aria-hidden="true">
    →
  </span>
</a>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.6ch;
    min-height: 2.75rem; /* 44px tap target */
    padding: 0.55rem 1rem;
    border: 1px solid transparent;
    border-radius: var(--radius);
    font-size: var(--text-body);
    font-weight: 700;
    line-height: 1.2;
    text-decoration: none;
    transition:
      background-color 150ms ease-out,
      border-color 150ms ease-out,
      color 150ms ease-out;
  }

  .btn--primary {
    background: var(--color-ember);
    border-color: var(--color-ember);
    color: var(--color-void);
  }

  .btn--primary:hover {
    background: var(--color-paper);
    border-color: var(--color-paper);
    color: var(--color-void);
  }

  .btn--ghost {
    border-color: var(--color-slate);
    color: var(--color-paper);
    font-weight: 400;
  }

  .btn--ghost:hover {
    border-color: var(--color-paper);
    color: var(--color-paper);
  }
</style>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run test/ui/Button.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Button.astro test/ui/Button.test.ts
git commit -m "feat: terminal Button with void-on-ember primary"
```

---

### Task 8: `Panel`

**Files:**

- Modify: `src/components/ui/Panel.astro` (replace whole file)
- Create: `test/ui/Panel.test.ts`

**Interfaces:**

- Produces: `Panel` with `variant?: "default" | "case"` plus any `<div>` attributes (`class`, `id`, …). `Work.astro` passes `class:list` today and keeps working.

- [ ] **Step 1: Write the failing test**

`test/ui/Panel.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import Panel from "../../src/components/ui/Panel.astro";
import { render } from "../render";

describe("Panel", () => {
  it("renders a plain panel by default", async () => {
    const html = await render(Panel, { slots: { default: "body" } });
    expect(html).toMatch(/<div class="panel[^"]*"[^>]*>/);
    expect(html).not.toContain("panel--case");
    expect(html).toContain("body");
  });

  it("marks case cards and forwards attributes", async () => {
    const html = await render(Panel, {
      props: { variant: "case", id: "work-1", class: "extra" },
      slots: { default: "body" },
    });
    expect(html).toContain("panel--case");
    expect(html).toContain('id="work-1"');
    expect(html).toContain("extra");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run test/ui/Panel.test.ts`
Expected: FAIL — "marks case cards" (no `panel--case`).

- [ ] **Step 3: Replace `src/components/ui/Panel.astro`**

```astro
---
// Elevated surface: graphite, hairline iron border, 2px corners.
// `variant="case"` adds the 2px ember left border that marks editorial and case cards.
import type { HTMLAttributes } from "astro/types";

interface Props extends HTMLAttributes<"div"> {
  variant?: "default" | "case";
}

const { variant = "default", class: className, ...rest } = Astro.props;
---

<div class:list={["panel", { "panel--case": variant === "case" }, className]} {...rest}>
  <slot />
</div>

<style>
  .panel {
    padding: 1.5rem;
    border: 1px solid var(--color-iron);
    border-radius: var(--radius);
    background: var(--color-graphite);
  }

  @media (min-width: 48rem) {
    .panel {
      padding: 2rem;
    }
  }

  .panel--case {
    border-left: 2px solid var(--color-ember);
  }
</style>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run test/ui/Panel.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Panel.astro test/ui/Panel.test.ts
git commit -m "feat: Panel with case variant"
```

---

### Task 9: `Section` and the home page call sites

**Files:**

- Modify: `src/components/ui/Section.astro` (replace whole file)
- Modify: `src/pages/index.astro:18,26,32,38,43`
- Modify: `src/styles/tokens.css` (remove the `--cut` alias)
- Modify: `test/tokens.test.ts` (drop `"--cut"` from the alias list)
- Create: `test/ui/Section.test.ts`

**Interfaces:**

- Consumes: `Prompt` (Task 4).
- Produces: `Section` with `tone?: "void" | "carbon"`, `prompt?: string`, plus `<section>` attributes. The old `tone="slate"` and `cut` props are gone.

- [ ] **Step 1: Write the failing test**

`test/ui/Section.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import Section from "../../src/components/ui/Section.astro";
import { render } from "../render";

describe("Section", () => {
  it("renders a void band with the content column by default", async () => {
    const html = await render(Section, {
      props: { id: "about" },
      slots: { default: "<h2>How I work</h2>" },
    });
    expect(html).toMatch(/<section class="band band--void[^"]*" id="about"/);
    expect(html).toContain('class="wrap"');
    expect(html).toContain("<h2>How I work</h2>");
  });

  it("renders no prompt when none is given", async () => {
    const html = await render(Section, { slots: { default: "x" } });
    expect(html).not.toContain("prompt");
  });

  it("lifts to carbon and shows the prompt eyebrow", async () => {
    const html = await render(Section, {
      props: { tone: "carbon", prompt: "journey" },
      slots: { default: "x" },
    });
    expect(html).toContain("band--carbon");
    expect(html).toMatch(/class="prompt__path"[^>]*>journey</);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run test/ui/Section.test.ts`
Expected: FAIL — `band--night` instead of `band--void`, and no prompt output.

- [ ] **Step 3: Replace `src/components/ui/Section.astro`**

```astro
---
// Page band: a 1px iron rule on top, an optional `~/prompt` eyebrow, then the content column.
// `tone="carbon"` lifts the band one surface step. There are no diagonal cuts any more.
import type { HTMLAttributes } from "astro/types";
import Prompt from "./Prompt.astro";

interface Props extends HTMLAttributes<"section"> {
  tone?: "void" | "carbon";
  prompt?: string;
}

const { tone = "void", prompt, class: className, ...rest } = Astro.props;
---

<section class:list={["band", `band--${tone}`, className]} {...rest}>
  <div class="wrap">
    {prompt && <Prompt path={prompt} class="band__prompt" />}
    <slot />
  </div>
</section>

<style>
  .band {
    position: relative;
    padding-block: var(--section-y);
    border-top: 1px solid var(--color-iron);
  }

  .band--void {
    background: var(--color-void);
  }

  .band--carbon {
    background: var(--color-carbon);
  }

  .band :global(.band__prompt) {
    margin-bottom: 1rem;
  }
</style>
```

- [ ] **Step 4: Update the call sites in `src/pages/index.astro`**

Line 18: `<Section tone="carbon" prompt="journey" id="journey" aria-labelledby="journey-title">`
Line 26: `<Section prompt="stack" id="skills" aria-labelledby="skills-title">`
Line 32: `<Section tone="carbon" prompt="built" id="work" aria-labelledby="work-title">`
Line 38: `<Section prompt="how-i-work" id="about" aria-labelledby="about-title">`
Line 43: `<Section tone="carbon" prompt="contact" id="contact" aria-labelledby="cta-title">`

`404.astro`, `contact.astro`, `notes/index.astro` and `resume.astro` pass no tone and need no change.

- [ ] **Step 5: Remove the `--cut` alias**

In `src/styles/tokens.css` delete the line `--cut: 0px; /* diagonal cuts are gone; removed in Task 9 with Section */`. In `test/tokens.test.ts` delete `"--cut",` from the alias list.

- [ ] **Step 6: Run the tests and the full gate**

Run: `pnpm vitest run test/ui/Section.test.ts test/tokens.test.ts`
Expected: PASS. The "no undefined custom property references" test proves nothing still uses `--cut`.

Run: `pnpm check && pnpm test && pnpm build`
Expected: green.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/Section.astro src/pages/index.astro src/styles/tokens.css test/tokens.test.ts test/ui/Section.test.ts
git commit -m "feat: Section with prompt eyebrow; drop diagonal cuts"
```

---

### Task 10: `TerminalFrame`

**Files:**

- Create: `src/components/ui/TerminalFrame.astro`, `test/ui/TerminalFrame.test.ts`

**Interfaces:**

- Produces: `TerminalFrame` with `title: string`, `class?: string`, default slot (body) and named slot `aside` (right side of the chrome bar). Phase 2 wraps the hero portrait and the 404 in it.

- [ ] **Step 1: Write the failing test**

`test/ui/TerminalFrame.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import TerminalFrame from "../../src/components/ui/TerminalFrame.astro";
import { render } from "../render";

describe("TerminalFrame", () => {
  it("renders chrome with three decorative dots, a title and the body", async () => {
    const html = await render(TerminalFrame, {
      props: { title: "marcus@evilist:~" },
      slots: { default: "<img alt='' />" },
    });
    expect(html).toContain('class="term__dots" aria-hidden="true"');
    expect((html.match(/term__dot"/g) ?? []).length).toBe(3);
    expect(html).toMatch(/class="term__title"[^>]*>marcus@evilist:~</);
    expect(html).toContain("<img alt='' />");
  });

  it("renders the aside slot inside the chrome", async () => {
    const html = await render(TerminalFrame, {
      props: { title: "bash" },
      slots: { default: "x", aside: "<b>S</b>" },
    });
    expect(html).toMatch(/class="term__aside"[^>]*>\s*<b>S<\/b>/);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run test/ui/TerminalFrame.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/components/ui/TerminalFrame.astro`**

```astro
---
// A terminal window around a slot: carbon chrome bar (three dots, a title, an optional `aside`
// slot on the right), hairline border, 2px corners. Used for the hero portrait and the 404.
interface Props {
  title: string;
  class?: string;
}

const { title, class: className } = Astro.props;
---

<div class:list={["term", className]}>
  <div class="term__chrome">
    <span class="term__dots" aria-hidden="true">
      <span class="term__dot"></span>
      <span class="term__dot"></span>
      <span class="term__dot"></span>
    </span>
    <span class="term__title">{title}</span>
    <span class="term__aside">
      <slot name="aside" />
    </span>
  </div>
  <div class="term__body">
    <slot />
  </div>
</div>

<style>
  .term {
    overflow: hidden;
    border: 1px solid var(--color-iron);
    border-radius: var(--radius);
    background: var(--color-carbon);
  }

  .term__chrome {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-height: 2.25rem;
    padding: 0.4rem 0.75rem;
    border-bottom: 1px solid var(--color-iron);
    font-size: var(--text-caption);
    color: var(--color-fog);
  }

  .term__dots {
    display: inline-flex;
    gap: 0.35rem;
  }

  .term__dot {
    width: 8px;
    height: 8px;
    border-radius: 9999px;
    background: var(--color-slate);
  }

  .term__title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .term__aside:empty {
    display: none;
  }

  .term__body {
    background: var(--color-void);
  }
</style>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run test/ui/TerminalFrame.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/TerminalFrame.astro test/ui/TerminalFrame.test.ts
git commit -m "feat: TerminalFrame primitive"
```

---

### Task 11: `ArrowField`

**Files:**

- Create: `src/components/ui/ArrowField.astro`, `test/ui/ArrowField.test.ts`

**Interfaces:**

- Produces: `ArrowField` with `rows?: number` (default 8), `class?: string`. Absolutely positioned; the parent must be `position: relative; overflow: hidden`. Phase 2 places it behind the hero copy.

- [ ] **Step 1: Write the failing test**

`test/ui/ArrowField.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import ArrowField from "../../src/components/ui/ArrowField.astro";
import { render } from "../render";

describe("ArrowField", () => {
  it("is decorative and repeats two identical strips for a seamless loop", async () => {
    const html = await render(ArrowField, { props: { rows: 3 } });
    expect(html).toContain('aria-hidden="true"');
    const strips = html.match(/<pre class="arrows__strip[^"]*"[^>]*>[\s\S]*?<\/pre>/g) ?? [];
    expect(strips).toHaveLength(2);
    expect(strips[0]).toBe(strips[1]);
    expect(strips[0].split("\n")).toHaveLength(3);
    expect(strips[0]).toContain("&gt; &gt; &gt;");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run test/ui/ArrowField.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/components/ui/ArrowField.astro`**

```astro
---
// Decorative `>` glyph texture: Axiom's "streaming data" background. Two identical strips drift
// left inside a track so the loop is seamless; global reduced-motion rules freeze it.
// The parent must be `position: relative; overflow: hidden`.
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
---

<div class:list={["arrows", className]} aria-hidden="true">
  <div class="arrows__track">
    <pre class="arrows__strip">{strip}</pre>
    <pre class="arrows__strip">{strip}</pre>
  </div>
</div>

<style>
  .arrows {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    color: var(--color-slate);
    font-size: var(--text-caption);
    line-height: 1.6;
    transform: skewY(-8deg);
  }

  .arrows__track {
    display: flex;
    width: max-content;
    animation: drift 40s linear infinite;
  }

  .arrows__strip {
    margin: 0;
    font: inherit;
    white-space: pre;
  }

  @keyframes drift {
    to {
      transform: translateX(-50%);
    }
  }
</style>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run test/ui/ArrowField.test.ts`
Expected: PASS. If the two strips differ only by a scoped `data-astro-cid-*` attribute, the regex already includes the attributes in both, so they still compare equal.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/ArrowField.astro test/ui/ArrowField.test.ts
git commit -m "feat: ArrowField texture"
```

---

### Task 12: `LogBars` and its stream-in script

**Files:**

- Create: `src/scripts/log-bars.ts`, `src/components/ui/LogBars.astro`, `test/logBars.test.ts`, `test/ui/LogBars.test.ts`

**Interfaces:**

- Produces: `barHeight(value: number, max: number): number` and `shouldStream(env: { reducedMotion: boolean }): boolean` and `initLogBars(root?: ParentNode): void` in `src/scripts/log-bars.ts`; `LogBars` with `values: readonly number[]`, `label: string`, `class?: string`. Phase 3 uses it for the training strip.

- [ ] **Step 1: Write the failing unit tests for the pure helpers**

`test/logBars.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { barHeight, shouldStream } from "../src/scripts/log-bars";

describe("barHeight", () => {
  it("scales a 0–1 value to the bar height, never below 1px", () => {
    expect(barHeight(0.5, 24)).toBe(12);
    expect(barHeight(1, 24)).toBe(24);
    expect(barHeight(0, 24)).toBe(1);
  });

  it("clamps out-of-range and non-finite input", () => {
    expect(barHeight(1.7, 24)).toBe(24);
    expect(barHeight(-3, 24)).toBe(1);
    expect(barHeight(Number.NaN, 24)).toBe(1);
    expect(barHeight(Number.POSITIVE_INFINITY, 24)).toBe(1);
  });
});

describe("shouldStream", () => {
  it("animates only when motion is not reduced", () => {
    expect(shouldStream({ reducedMotion: false })).toBe(true);
    expect(shouldStream({ reducedMotion: true })).toBe(false);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run test/logBars.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/scripts/log-bars.ts`**

```ts
// LogBars helpers and the stream-in behaviour: when a bar row scrolls into view, each bar gets
// `.is-live` 30 ms after the previous one (CSS animates scaleY). Reduced motion: nothing happens
// and the bars render at full height.
import { inView } from "motion";

export interface LogBarsEnv {
  reducedMotion: boolean;
}

/** Height in SVG units for a 0–1 value. Bad input renders as the 1px floor, never as negative. */
export function barHeight(value: number, max: number): number {
  const v = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  return Math.max(1, Math.round(v * max));
}

export function shouldStream(env: LogBarsEnv): boolean {
  return !env.reducedMotion;
}

export function initLogBars(root: ParentNode = document): void {
  if (!shouldStream({ reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches })) {
    return;
  }
  for (const svg of root.querySelectorAll<SVGSVGElement>("[data-log-bars]")) {
    svg.dataset.animate = "";
    inView(
      svg,
      () => {
        svg.querySelectorAll<SVGRectElement>(".log-bars__bar").forEach((bar, i) => {
          setTimeout(() => bar.classList.add("is-live"), i * 30);
        });
      },
      { amount: 0.5 },
    );
  }
}
```

- [ ] **Step 4: Run the unit tests to verify they pass**

Run: `pnpm vitest run test/logBars.test.ts`
Expected: PASS (3 tests). Importing `motion` in node is fine; `initLogBars` is not called.

- [ ] **Step 5: Write the failing component test**

`test/ui/LogBars.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import LogBars from "../../src/components/ui/LogBars.astro";
import { render } from "../render";

describe("LogBars", () => {
  it("renders one bar per value with heights from the value", async () => {
    const html = await render(LogBars, { props: { values: [0, 0.5, 1], label: "Weeks trained" } });
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Weeks trained"');
    expect(html).toContain("data-log-bars");
    expect(html).toContain('viewBox="0 0 16 24"');
    expect(html).toContain('y="23" width="4" height="1"');
    expect(html).toContain('y="12" width="4" height="12"');
    expect(html).toContain('y="0" width="4" height="24"');
  });

  it("never emits a negative height or a zero-width viewBox", async () => {
    const html = await render(LogBars, { props: { values: [-1, 5, Number.NaN], label: "x" } });
    expect(html).not.toMatch(/height="-/);
    expect(html).toContain('viewBox="0 0 16 24"');
    expect(await render(LogBars, { props: { values: [], label: "empty" } })).toContain(
      'viewBox="0 0 4 24"',
    );
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `pnpm vitest run test/ui/LogBars.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 7: Create `src/components/ui/LogBars.astro`**

```astro
---
// A row of ember bars whose heights come from `values` (0–1): reads as an event-volume histogram.
// With scripting and motion, the bars stream in when scrolled into view (scripts/log-bars.ts).
import { barHeight } from "../../scripts/log-bars";

interface Props {
  values: readonly number[];
  label: string;
  class?: string;
}

const { values, label, class: className } = Astro.props;
const W = 4;
const GAP = 2;
const H = 24;
const width = Math.max(W, values.length * (W + GAP) - GAP);
---

<svg
  class:list={["log-bars", className]}
  viewBox={`0 0 ${width} ${H}`}
  width={width}
  height={H}
  role="img"
  aria-label={label}
  data-log-bars
>
  {values.map((v, i) => {
    const h = barHeight(v, H);
    return <rect x={i * (W + GAP)} y={H - h} width={W} height={h} class="log-bars__bar" />;
  })}
</svg>

<script>
  import { initLogBars } from "../../scripts/log-bars";
  initLogBars();
</script>

<style>
  .log-bars {
    display: block;
    overflow: visible;
  }

  .log-bars__bar {
    fill: var(--color-ember);
    transform-box: fill-box;
    transform-origin: bottom;
  }

  /* Only when scripts/log-bars.ts opted in (it checks reduced motion first). */
  @media (prefers-reduced-motion: no-preference) {
    .log-bars[data-animate] .log-bars__bar {
      transform: scaleY(0);
      transition: transform 400ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }

    .log-bars[data-animate] .log-bars__bar.is-live {
      transform: scaleY(1);
    }
  }
</style>
```

- [ ] **Step 8: Run the component test to verify it passes**

Run: `pnpm vitest run test/ui/LogBars.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 9: Commit**

```bash
git add src/scripts/log-bars.ts src/components/ui/LogBars.astro test/logBars.test.ts test/ui/LogBars.test.ts
git commit -m "feat: LogBars primitive with stream-in"
```

---

### Task 13: Header

**Files:**

- Modify: `src/components/layout/Header.astro` (replace whole file)

**Interfaces:**

- Consumes: `nav`, `site` from `src/data/site.ts`; `initMenu` from `src/scripts/menu.ts` (unchanged).
- Keeps: `.site-header`, `.brand`, `[data-menu-toggle]`, `#site-nav`, `.site-nav.is-open`, `aria-current="page"` for `e2e/layout.spec.ts`.

- [ ] **Step 1: Replace `src/components/layout/Header.astro`**

```astro
---
// 56px void bar with a hairline rule. Text wordmark `~evilist`; nav underlines the current page.
import { nav, site } from "../../data/site";

const path = Astro.url.pathname.replace(/\/$/, "") || "/";
const isCurrent = (href: string) => path === href || path.startsWith(`${href}/`);
---

<header class="site-header">
  <div class="wrap site-header__inner">
    <a href="/" class="brand" aria-label={`${site.name}, home`}>
      <span class="brand__tilde" aria-hidden="true">
        ~
      </span>
      <span class="brand__name">evilist</span>
    </a>

    <button
      type="button"
      class="menu-toggle"
      aria-expanded="false"
      aria-controls="site-nav"
      data-menu-toggle
    >
      <span class="menu-toggle__bars" aria-hidden="true"></span>
      <span class="menu-toggle__label">Menu</span>
    </button>

    <nav id="site-nav" class="site-nav" aria-label="Main" data-menu>
      <ul>
        {nav.map(({ href, label }) => (
          <li>
            <a href={href} aria-current={isCurrent(href) ? "page" : undefined}>
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  </div>
</header>

<script>
  import { initMenu } from "../../scripts/menu";
  initMenu();
</script>

<style>
  .site-header {
    position: sticky;
    top: 0;
    z-index: 50;
    background: var(--color-void);
    border-bottom: 1px solid var(--color-iron);
  }

  .site-header__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    min-height: 3.5rem; /* 56px */
  }

  .brand {
    display: inline-flex;
    align-items: baseline;
    color: var(--color-paper);
    font-weight: 700;
    text-decoration: none;
  }

  .brand__tilde {
    color: var(--color-ash);
  }

  .site-nav ul {
    display: flex;
    gap: clamp(1rem, 0.5rem + 2vw, 2rem);
    list-style: none;
    padding: 0;
  }

  .site-nav a {
    display: inline-block;
    padding-block: 0.6rem;
    color: var(--color-fog);
    text-decoration: none;
    border-bottom: 1px solid transparent;
  }

  .site-nav a:hover {
    color: var(--color-paper);
  }

  .site-nav a[aria-current="page"] {
    color: var(--color-paper);
    border-bottom-color: var(--color-paper);
  }

  .menu-toggle {
    display: none;
  }

  /* Mobile: nav collapses behind a toggle. Without scripting, the nav stays visible instead. */
  @media (max-width: 44.99rem) {
    .site-header__inner {
      flex-wrap: wrap;
    }

    @media (scripting: enabled) {
      .menu-toggle {
        display: inline-flex;
        align-items: center;
        gap: 0.6rem;
        min-height: 2.75rem;
        padding: 0 0.25rem;
        background: none;
        border: 0;
        color: var(--color-paper);
        font-weight: 700;
        cursor: pointer;
      }
    }

    .menu-toggle__bars,
    .menu-toggle__bars::before,
    .menu-toggle__bars::after {
      display: block;
      width: 1.25rem;
      height: 2px;
      background: currentColor;
      transition: transform 180ms ease-out;
    }

    .menu-toggle__bars {
      position: relative;
    }

    .menu-toggle__bars::before,
    .menu-toggle__bars::after {
      content: "";
      position: absolute;
      left: 0;
    }

    .menu-toggle__bars::before {
      top: -6px;
    }

    .menu-toggle__bars::after {
      top: 6px;
    }

    .menu-toggle[aria-expanded="true"] .menu-toggle__bars {
      background: transparent;
    }

    .menu-toggle[aria-expanded="true"] .menu-toggle__bars::before {
      transform: translateY(6px) rotate(45deg);
    }

    .menu-toggle[aria-expanded="true"] .menu-toggle__bars::after {
      transform: translateY(-6px) rotate(-45deg);
    }

    .site-nav {
      flex-basis: 100%;
    }

    /* Narrow phones: icon-only toggle so the brand and toggle share one row. */
    @media (max-width: 29.99rem) {
      .menu-toggle__label {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
      }

      .menu-toggle {
        min-width: 2.75rem;
        justify-content: center;
      }
    }

    @media (scripting: enabled) {
      .site-nav:not(.is-open) {
        display: none;
      }
    }

    .site-nav ul {
      flex-direction: column;
      gap: 0;
      padding-bottom: 0.75rem;
    }

    .site-nav li + li {
      border-top: 1px solid var(--color-iron);
    }

    .site-nav a {
      display: block;
      padding-block: 0.85rem;
      font-size: var(--text-heading-sm);
      border-bottom: 0;
    }

    .site-nav a[aria-current="page"] {
      color: var(--color-paper);
    }
  }
</style>
```

- [ ] **Step 2: Verify**

Run: `pnpm check && pnpm test && pnpm build`
Expected: green. `grep -rn "mascot" src` prints nothing (the file `src/images/mascot.webp` stays for the OG mark).

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Header.astro
git commit -m "feat: terminal header with text wordmark"
```

---

### Task 14: Footer and skip link

**Files:**

- Modify: `src/components/layout/Footer.astro` (replace whole file)
- Modify: `src/components/layout/SkipLink.astro` (replace whole file)

**Interfaces:**

- Keeps: `.site-footer` for `e2e/layout.spec.ts`; `href` values for `e2e/pages.spec.ts` (Discord and LinkedIn links are asserted by `href`); the "Skip to content" link text.

- [ ] **Step 1: Replace `src/components/layout/Footer.astro`**

```astro
---
// Carbon strip: arrow links to the socials and feed, then the hosting line and the copyright.
import { PUBLIC_DISCORD_INVITE_URL } from "astro:env/client";
import { site } from "../../data/site";

const links = [
  { href: site.socials.github, label: "github" },
  { href: site.socials.linkedin, label: "linkedin" },
  ...(PUBLIC_DISCORD_INVITE_URL ? [{ href: PUBLIC_DISCORD_INVITE_URL, label: "discord" }] : []),
  { href: "/rss.xml", label: "rss" },
];
const year = new Date().getFullYear();
---

<footer class="site-footer">
  <div class="wrap site-footer__inner">
    <ul class="site-footer__links">
      {links.map(({ href, label }) => (
        <li>
          <a
            href={href}
            {...(href.startsWith("http") ? { rel: "me noopener", target: "_blank" } : {})}
          >
            <span aria-hidden="true">→ </span>
            {label}
          </a>
        </li>
      ))}
    </ul>
    <p class="site-footer__note">self-hosted on Linux behind HAProxy · built with Astro</p>
    <p class="site-footer__copy">
      © {year} {site.name}.{" "}
      <a href="#main" class="site-footer__top">
        back to top
      </a>
    </p>
  </div>
</footer>

<style>
  .site-footer {
    padding-block: 2.5rem;
    border-top: 1px solid var(--color-iron);
    background: var(--color-carbon);
    font-size: var(--text-caption);
    color: var(--color-fog);
  }

  .site-footer__inner {
    display: grid;
    gap: 0.75rem;
  }

  .site-footer__links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 1.5rem;
    list-style: none;
    padding: 0;
  }

  .site-footer__links a {
    display: inline-block;
    padding-block: 0.6rem; /* 44px tap target with line-height */
    color: var(--color-paper);
    text-decoration: none;
  }

  .site-footer__links a:hover,
  .site-footer__top:hover {
    color: var(--color-ember);
  }

  .site-footer__top {
    color: var(--color-fog);
  }
</style>
```

- [ ] **Step 2: Replace `src/components/layout/SkipLink.astro`**

```astro
<a href="#main" class="skip-link">
  Skip to content
</a>

<style>
  .skip-link {
    position: absolute;
    left: var(--gutter);
    top: 0.75rem;
    z-index: 100;
    padding: 0.5rem 1rem;
    border-radius: var(--radius);
    background: var(--color-ember);
    color: var(--color-void);
    font-weight: 700;
    text-decoration: none;
    transform: translateY(-200%);
  }

  .skip-link:focus-visible {
    transform: none;
  }
</style>
```

- [ ] **Step 3: Verify**

Run: `pnpm check && pnpm test && pnpm build`
Expected: green.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Footer.astro src/components/layout/SkipLink.astro
git commit -m "feat: terminal footer and skip link"
```

---

### Task 15: Phase verification, baselines, screenshots, build log

**Files:**

- Modify: `e2e/__screenshots__/**` (regenerated)
- Modify: `~/vaults/personal/Projects/evilist.io.md` (append a Build Log entry; outside the repo)

- [ ] **Step 1: Full gate**

Run: `pnpm lint && pnpm check && pnpm test && pnpm build && pnpm size`
Expected: all green. `pnpm size` shows `Initial JS on / (gz)` at or below its Phase-6 value and `Fonts (woff2)` ≤ 120 KB. If `pnpm lint` fails on files this plan wrote, run `pnpm format` and re-run.

- [ ] **Step 2: E2E**

Run: `pnpm test:e2e`
Expected: green across desktop, iphone-15, pixel-7, ipad and reduced-motion. `e2e/aura.spec.ts` no longer exists; nothing else changed its selectors.

- [ ] **Step 3: Regenerate the visual baselines**

Run: `pnpm test:visual --update-snapshots`
Then open `e2e/__screenshots__/desktop/home-darwin.png` and `e2e/__screenshots__/iphone-15/home-darwin.png` with the Read tool and confirm: pure black canvas, JetBrains Mono everywhere, `~evilist` wordmark, ember only on the primary buttons and the S seal, no diagonal cut between hero and journey, 1px rules between sections.

Run: `pnpm test:visual`
Expected: green.

- [ ] **Step 4: Browser check at the four widths**

Start the production server on a spare port (not 4321):

```bash
HOST=127.0.0.1 PORT=4396 CONTACT_DRY_RUN=true SENDGRID_API_KEY=unused node ./dist/server/entry.mjs
```

With claude-in-chrome, open `http://127.0.0.1:4396/`, resize to 390×844, 430×932, 768×1024 and 1440×900, and take a screenshot of the top of the page and of `#journey` at each width (`save_to_disk: true`). Also screenshot `/resume`, `/notes` and `/contact` at 390 and 1440. Check: no horizontal scroll, the header toggle works at 390 and 430, focus rings are ember, text is readable (no steel text). Attach the screenshots to the phase summary.

- [ ] **Step 5: Lighthouse spot check**

```bash
npx -y @lhci/cli@0.15.1 autorun --config=lighthouse/lighthouserc.cjs --upload.target=filesystem --upload.outputDir=/tmp/lhci
```

Expected: accessibility 1.0 and SEO 1.0 on all four URLs; performance ≥ 0.9; `resource-summary:font:size` under budget; `third-party:count` 0.

- [ ] **Step 6: Vault build log**

Append to `~/vaults/personal/Projects/evilist.io.md` under `## Build Log (2026)`:

```markdown
### 2026-09-24 — Axiom Phase 1: design system, primitives, shell

- Decided: switch from the manga/hanko brief to an Axiom-derived terminal system (spec in `docs/superpowers/specs/2026-09-24-axiom-design-system-design.md`, ADR lands in Phase 4). Ember `#da5c2c` is the one accent; JetBrains Mono everywhere; 2px corners; no shadows, gradients or glow.
- Shipped: new tokens with compatibility aliases, JetBrains Mono via Fontsource, global styles, primitives (`Prompt`, `Tag`, `KeyValue`, `RankChip`, `Button`, `Panel`, `Section`, `TerminalFrame`, `ArrowField`, `LogBars`), header/footer/skip link, Container-API component tests, token contrast + undefined-reference tests. Removed Three.js aura, speed lines, seal ink filter.
- Deviations from Axiom for the a11y gate: void text on ember fills; steel never used for text.
- Open: Phase 2 (hero terminal frame, journey restyle, sections), Phase 3 (`now.ts`, off-the-clock, `/now`, Higgsfield stills), Phase 4 (resume/notes/contact polish, PDF, ADR, CLAUDE.md, alias removal).
```

- [ ] **Step 7: Commit the baselines and stop for approval**

```bash
git add e2e/__screenshots__
git commit -m "test: visual baselines for the Axiom design system"
git log --oneline docs/axiom-spec..HEAD
```

Report to Marcus: the commit list, the `pnpm size` rows, the Lighthouse scores, and the screenshots. Do not open a PR or merge; Marcus approves Phase 1 before Phase 2's plan is written.
