# Axiom Phase 4 (Resume, Notes, Contact, Polish) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the Axiom redesign: the resume, notes and contact pages on the terminal primitives, a regenerated PDF, the retired manga token aliases deleted, the deferred minors from Phases 1–3 closed, ADR 0002 and the docs, and final baselines for Marcus's sign-off.

**Architecture:** Each page is rebuilt from the existing primitives (`Section` with a `~/path` prompt, `Panel case`, `RankChip`, `KeyValue`, `Tag`, `Button`), so no new visual vocabulary appears. `Button` gains a submit form so the contact form uses the primitive. Once the last five files are off the alias names, the `:root` alias block is deleted and a test keeps the names from coming back. Committed build artefacts (the resume PDF and the social card) share one source-fingerprint helper, so editing anything they are rendered from fails a test until they are rebuilt.

**Tech Stack:** Astro 7 · TypeScript 6 · Tailwind 4 `@theme` · Motion 13 · vitest 5 (Astro Container API via `test/render.ts`) · Playwright 1.63 · sharp · pnpm 12.

**Spec:** `docs/superpowers/specs/2026-09-24-axiom-design-system-design.md` (Phase 4: §7.2–7.4, PDF regeneration, §9.4 docs, ADR, CLAUDE.md, vault log, final baselines).

## Global Constraints

- Ember `#da5c2c` appears only where spec §3.2 lists it: primary button fill, the prompt cursor, the `Panel case` left border, LogBars / topology pulse / scene LEDs / htop selected row and hot cores, link hover, `:focus-visible`, `::selection`, the S `RankChip`. **Never** for status, errors, headings, borders, list markers or icons.
- Every text colour passes 4.5:1 on void, carbon and graphite (`test/tokens.test.ts`). Steel `#606060` is never text; ash `#848484` is for keys, tags and labels.
- JetBrains Mono only. Headings are weight 400; 700 only for emphasis, the wordmark and primary button labels.
- 2px radius (`var(--radius)`) everywhere; 9999px only on tiny dots. No `box-shadow`, gradients, `filter: blur()` or glow.
- Animate only `transform`, `opacity`, `pathLength`; respect `prefers-reduced-motion`; JS-only states behind `@media (scripting: enabled)`.
- CSP: no inline `style=` attributes, no `is:inline` scripts, keep `build.inlineStylesheets: "never"`.
- `trailingSlash: "never"`: every internal link is slashless (`/notes/x`, never `/notes/x/`).
- Budgets: initial JS on `/` ≤ 100 KB gz; fonts 20–120 KB; zero third-party requests.
- `scripts/contact-form.ts`, `src/actions/contact.ts`, the honeypot, time-trap, rate limit and CSRF check keep their behaviour.
- After editing anything in `RESUME_SOURCES` (`scripts/resume-source.mjs`), run `pnpm build:pdf` and commit the PDF and `scripts/resume-pdf.source-sha256`.
- Before every commit: `pnpm check && pnpm test && pnpm build`. Commits are GPG-signed by Marcus's git config; never `--no-gpg-sign`, never AI attribution trailers.
- Preview servers never use port 4321. The production server for checks: `HOST=127.0.0.1 PORT=4396 CONTACT_DRY_RUN=true SENDGRID_API_KEY=test node ./dist/server/entry.mjs`.
- Public-safe copy only: no customer names, hostnames, IPs, or employer vendor names.

## Review Focus

1. **The resume prints dark, orange or with filled chips.** A recruiter's PDF must be black on white with outlined chips and no site chrome. Pinned by `e2e/pages.spec.ts` "the resume prints on white with outlined, unfilled chips" (Task 2) and a read of the regenerated PDF (Task 2 Step 7).
2. **After a failed contact submission the button loses its label or arrow, or errors are hard to see.** Errors must read clearly without the accent. Pinned by `e2e/contact.spec.ts` "errors read as terminal errors and the button keeps its label and arrow" (Task 4).
3. **Deleting the aliases leaves a rule pointing at an undefined variable.** Some element silently loses its colour or size. Pinned by `test/migration.test.ts` "are used nowhere in src" and `test/tokens.test.ts` "has no undefined custom property references" (Task 7), plus the final baselines (Task 10).
4. **An internal link bounces through a 301.** The pager, lists or nav still link with a trailing slash. Pinned by `e2e/layout.spec.ts` "internal links point straight at their page, with no redirect hop" (Task 3).
5. **The new layouts overflow a phone.** The chip pair on /contact, the chip + title job head on /resume, a long note title. Pinned by the overflow test in `e2e/layout.spec.ts`, whose routes gain a note page (Task 3), plus the four-width browser check (Task 10).

## Rulings made in this plan

- **Contact errors** are paper with an ash `error:` prefix and a paper border, not ember. Spec §7.4 is silent on errors and §3.2 bans ember for status. Task 9 amends the spec.
- **Header nav stays 15px.** Spec §5 said 14px, but the type scale (§3.3) has no 14px step; Task 9 amends §5 rather than adding an off-scale size.
- **`scripts/contact-form.ts` changes by two lines**: it relabels `[data-button-label]` instead of the whole button, so the Button primitive's arrow survives "Sending…". The tabs, submission and every security check are untouched.
- **Not in this plan** (Phase 1–3 minors, left as they are):
  - `@theme static`: it would emit Tailwind's entire default theme, and the undefined-variable test already guards token emission.
  - One shared "is external" helper for `KeyValue` and `Footer`: still only two callers.
  - The visual spec's global `setInterval` stub: htop is the only interval user; the comment says why.
  - The ArrowField `cols` prop: done in Phase 2.

---

### Task 1: `Button` submits forms

**Files:**

- Modify: `src/components/ui/Button.astro`
- Test: `test/ui/Button.test.ts`

**Interfaces:**

- Consumes: nothing new.
- Produces: `Button` props `{ href?: string; type?: "submit" | "button"; variant?: "primary" | "ghost"; class?: string }`. With `href` it renders `<a class="btn btn--{variant}">`; without, `<button type={type} class="btn btn--{variant}">` whose label sits in `<span data-button-label>`, followed by `<span class="btn__arrow" aria-hidden="true">→</span>`. Task 4 relies on `[data-button-label]`.

- [ ] **Step 1: Write the failing test**

Append inside `describe("Button", …)` in `test/ui/Button.test.ts`:

```ts
it("renders a submit button, with its label in a span a script can relabel", async () => {
  const html = await render(Button, { slots: { default: "Send message" } });
  expect(html).toMatch(/<button type="submit" class="btn btn--primary[^"]*"/);
  expect(html).toMatch(/<span data-button-label[^>]*>\s*Send message\s*<\/span>/);
  expect(html).toMatch(/class="btn__arrow" aria-hidden="true"[^>]*>→</);
  expect(html).not.toContain("<a ");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run test/ui/Button.test.ts`
Expected: FAIL. Without `href` the component still renders `<a href=undefined …>`.

- [ ] **Step 3: Replace `src/components/ui/Button.astro`**

```astro
---
// Terminal button: 2px corners, an arrow after the label, an instant colour change on hover (no
// transition: only transform, opacity and pathLength animate). With `href` it is a link; without,
// a <button>, e.g. a form's submit. Primary carries void text on the ember fill: paper on ember
// is 3.3:1 and fails AA (spec §3.1).
interface Props {
  href?: string;
  type?: "submit" | "button";
  variant?: "primary" | "ghost";
  class?: string;
}

const { href, type = "submit", variant = "primary", class: className } = Astro.props;
const classes = ["btn", `btn--${variant}`, className];
---

{href ? (
  <a href={href} class:list={classes}>
    <slot />
    <span class="btn__arrow" aria-hidden="true">
      →
    </span>
  </a>
) : (
  <button type={type} class:list={classes}>
    <span data-button-label>
      <slot />
    </span>
    <span class="btn__arrow" aria-hidden="true">
      →
    </span>
  </button>
)}

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
  }

  button.btn {
    cursor: pointer;
  }

  .btn[disabled] {
    opacity: 0.6;
    cursor: progress;
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
    background: none;
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

(The old `transition:` block is gone on purpose: it closes the Phase 1 minor "Button uses colour transitions despite the animate-only rule".)

- [ ] **Step 4: Run the tests and watch them pass**

Run: `pnpm vitest run test/ui/Button.test.ts`
Expected: PASS (4 tests). The three existing link tests still pass.

- [ ] **Step 5: Gate and commit**

Run: `pnpm check && pnpm test && pnpm build`
Expected: all green. `test/resumePdf.test.ts` stays green because `Button.astro` isn't a resume source until Task 2.

```bash
git add src/components/ui/Button.astro test/ui/Button.test.ts
git commit -m "feat: Button renders a submit button when it has no href"
```

---

### Task 2: The resume on the terminal primitives, and a fresh PDF

**Files:**

- Modify: `src/pages/resume.astro` (full replacement), `src/components/ui/Section.astro` (first-band rule), `scripts/resume-source.mjs` (sources), `test/resumePdf.test.ts`, `test/migration.test.ts`, `e2e/pages.spec.ts`, `e2e/layout.spec.ts`
- Regenerate: `public/marcus-hancock-gaillard-resume.pdf`, `scripts/resume-pdf.source-sha256`

**Interfaces:**

- Consumes: `Button` (Task 1), `RankChip` (`rank`, `size`), `KeyValue` (`rows: { key; value }[]`, `class`), `Section` (`prompt`, `class`), `career`, `formatRange`, `yearsOfExperience`, `skillDomains`, `site`.
- Produces: `RESUME_SOURCES` now lists every component the page renders. The resume's classes stay: `.job` (one per role), `.job h3` (title), `.resume__actions`, `.no-print`. New ones: `.job__facts` (`KeyValue`), `.skill-list` (`KeyValue`).

- [ ] **Step 1: Write the failing tests**

In `test/resumePdf.test.ts`, change the import line to:

```ts
import {
  FINGERPRINT_PATH,
  PDF_PATH,
  RESUME_SOURCES,
  resumeFingerprint,
} from "../scripts/resume-source.mjs";
```

and append inside `describe("resume PDF", …)`:

```ts
it("fingerprints every component the resume page imports", () => {
  const page = readFileSync("src/pages/resume.astro", "utf8");
  const imported = [...page.matchAll(/from "\.\.\/(components\/[^"]+\.astro)"/g)].map(
    (m) => `src/${m[1]}`,
  );
  expect(imported.length).toBeGreaterThan(0);
  for (const file of imported) expect(RESUME_SOURCES, file).toContain(file);
});
```

In `test/migration.test.ts`, append `"src/pages/resume.astro",` as the last entry of `MIGRATED`.

In `e2e/pages.spec.ts`, after the test "resume lists every role, newest first, and offers the PDF", add:

```ts
test("each role shows its rank chip and org/dates rows; only the current role is S", async ({
  page,
}) => {
  await page.goto("/resume");
  const chips = page.locator(".job .rank-chip");
  await expect(chips).toHaveCount(7);
  await expect(chips.first()).toHaveAttribute("aria-label", "Rank S");
  await expect(chips.last()).toHaveAttribute("aria-label", "Rank E");
  await expect(page.locator(".job .rank-chip--s")).toHaveCount(1);
  const newest = page.locator(".job").first();
  await expect(newest.locator(".kv__key")).toHaveText(["org:", "dates:"]);
  await expect(newest.locator(".kv__value").last()).toContainText("Present");
});

test("the resume prints on white with outlined, unfilled chips", async ({ page }) => {
  await page.goto("/resume");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  const s = page.locator(".job .rank-chip--s");
  await expect(s).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(s).toHaveCSS("border-top-color", "rgb(17, 17, 17)");
  await expect(s).toHaveCSS("color", "rgb(17, 17, 17)");
  await expect(page.locator(".band__prompt")).toBeHidden();
  await expect(page.locator(".resume__actions")).toBeHidden();
});
```

In `e2e/layout.spec.ts`, after the test "production build sends a hashed Content-Security-Policy", add:

```ts
test("a page that opens with a band doesn't double the header's rule", async ({ page }) => {
  for (const path of ["/resume", "/notes", "/contact"]) {
    await page.goto(path);
    await expect(page.locator("main > .band").first(), path).toHaveCSS("border-top-width", "0px");
  }
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run test/resumePdf.test.ts test/migration.test.ts`
Expected: FAIL. `src/components/ui/Section.astro` is not in `RESUME_SOURCES`, and resume.astro still uses retired names (`--color-seam`, `--text-3xl`, …).

Run: `pnpm build && pnpm exec playwright test e2e/pages.spec.ts e2e/layout.spec.ts --project=desktop -g "rank chip|prints on white|double the header"`
Expected: FAIL. There are no `.job .rank-chip` elements, the print test finds no S chip, and the first band's border is `1px`.

- [ ] **Step 3: Stop a page-opening band from doubling the header rule**

In `src/components/ui/Section.astro`, add to the end of the `<style>` block:

```css
/* The header already draws a rule; a band that opens the page doesn't draw a second one. */
:global(main) > .band:first-child {
  border-top: 0;
}
```

- [ ] **Step 4: List the resume's components in `scripts/resume-source.mjs`**

Replace the `RESUME_SOURCES` array with:

```js
export const RESUME_SOURCES = [
  "src/data/career.ts",
  "src/data/skills.ts",
  "src/data/site.ts",
  "src/pages/resume.astro",
  // Every component the page renders (test/resumePdf.test.ts keeps this list complete).
  "src/components/ui/Section.astro",
  "src/components/ui/Prompt.astro",
  "src/components/ui/Button.astro",
  "src/components/ui/RankChip.astro",
  "src/components/ui/KeyValue.astro",
];
```

- [ ] **Step 5: Replace `src/pages/resume.astro`**

```astro
---
// The resume (spec §7.2): the same data and sections, drawn with the terminal primitives. A rank
// chip per role, org and dates as key: value rows, 1px iron dividers. The print styles also render
// the PDF (`pnpm build:pdf`): white page, black text, chips outlined and never filled.
import BaseLayout from "../layouts/BaseLayout.astro";
import Section from "../components/ui/Section.astro";
import Button from "../components/ui/Button.astro";
import RankChip from "../components/ui/RankChip.astro";
import KeyValue from "../components/ui/KeyValue.astro";
import { career, formatRange, yearsOfExperience } from "../data/career";
import { skillDomains } from "../data/skills";
import { site } from "../data/site";

const years = yearsOfExperience();
const newestFirst = [...career].reverse();
const RESUME_PDF = "/marcus-hancock-gaillard-resume.pdf";
const skills = skillDomains.map((d) => ({ key: d.name, value: d.items.join(", ") }));
---

<BaseLayout
  title="Resume"
  description={`Resume of ${site.name}: ${years} years from T1 support to ${site.role}.`}
>
  <Section prompt="resume" class="resume">
    <header class="resume__head">
      <div>
        <h1>{site.name}</h1>
        <p class="resume__role">
          {site.role}, {site.location}
        </p>
      </div>
      <ul class="resume__links" role="list">
        <li>
          <a href={site.url}>evilist.io</a>
        </li>
        <li>
          <a href={site.socials.linkedin}>linkedin.com/in/m8mz</a>
        </li>
        <li>
          <a href={site.socials.github}>github.com/m8mz</a>
        </li>
        <li>
          <a href={`${site.url}/contact`}>evilist.io/contact</a>
        </li>
      </ul>
    </header>

    <div class="resume__actions no-print">
      <Button href={RESUME_PDF}>Download the PDF</Button>
    </div>

    <section aria-labelledby="summary-title" class="resume__block">
      <h2 id="summary-title">Summary</h2>
      <p>
        {years} years in infrastructure, from front-line hosting support to architecting two
        datacenters. {site.pitch}
      </p>
    </section>

    <section aria-labelledby="experience-title" class="resume__block">
      <h2 id="experience-title">Experience</h2>
      <ol class="jobs" role="list">
        {newestFirst.map((stage) => (
          <li class="job">
            <div class="job__head">
              <RankChip rank={stage.rankLabel} size="sm" />
              <h3>{stage.title}</h3>
            </div>
            <KeyValue
              class="job__facts"
              rows={[
                { key: "org", value: `${stage.org}, ${stage.location}` },
                { key: "dates", value: formatRange(stage.start, stage.end) },
              ]}
            />
            <p class="job__summary">{stage.summary}</p>
            <ul class="job__highlights">
              {stage.highlights.map((h) => (
                <li>{h}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>

    <section aria-labelledby="skills-title" class="resume__block">
      <h2 id="skills-title">Skills</h2>
      <KeyValue rows={skills} class="skill-list" />
    </section>

    <section aria-labelledby="learning-title" class="resume__block">
      <h2 id="learning-title">Education</h2>
      <p>
        Self-taught through books, online courses, and {years} years of running production systems.
      </p>
    </section>
  </Section>
</BaseLayout>

<style>
  .resume__head {
    display: grid;
    gap: 1rem 2rem;
    align-items: end;
  }

  @media (min-width: 48rem) {
    .resume__head {
      grid-template-columns: 1fr auto;
    }
  }

  .resume__head h1 {
    font-size: var(--text-display);
  }

  .resume__role {
    margin-top: 0.25rem;
    color: var(--color-fog);
  }

  .resume__links {
    display: grid;
    gap: 0.15rem;
    padding: 0;
    list-style: none;
    font-size: var(--text-caption);
  }

  .resume__actions {
    margin-top: 2rem;
  }

  .resume__block {
    margin-top: 3rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--color-iron);
  }

  .resume__block h2 {
    margin-bottom: 1rem;
  }

  .jobs {
    display: grid;
    padding: 0;
    list-style: none;
  }

  .job + .job {
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid var(--color-iron);
  }

  .job__head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 0.75rem;
  }

  .job__head h3 {
    font-size: var(--text-heading-sm);
  }

  .job :global(.job__facts) {
    margin-top: 0.5rem;
    font-size: var(--text-caption);
  }

  .job__summary {
    margin-top: 0.75rem;
  }

  .job__highlights {
    margin-top: 0.5rem;
    padding-left: 1.2rem;
    list-style: "- ";
  }

  .job__highlights li::marker {
    color: var(--color-ash);
  }

  .job__highlights li + li {
    margin-top: 0.25rem;
  }

  .resume :global(.skill-list) {
    gap: 0.5rem;
  }

  /* Print: paper-friendly, one column, no site chrome, chips outlined. Also renders the PDF. */
  @media print {
    @page {
      margin: 14mm 16mm;
    }

    :global(html),
    :global(body) {
      background: #fff !important;
      color: #111 !important;
      font-size: 10pt;
      line-height: 1.4;
    }

    :global(.site-header),
    :global(.site-footer),
    :global(.skip-link),
    :global(.band__prompt),
    .no-print {
      display: none !important;
    }

    :global(.band) {
      padding-block: 0 !important;
      background: none !important;
    }

    .resume__head h1 {
      font-size: 22pt;
    }

    .resume__role,
    .resume :global(.kv__key) {
      color: #444 !important;
    }

    .resume :global(.kv__value) {
      color: #111 !important;
    }

    .job :global(.rank-chip) {
      background: none !important;
      border-color: #111 !important;
      color: #111 !important;
    }

    .resume__block {
      margin-top: 1.1rem;
      padding-top: 0.6rem;
      border-top: 1px solid #bbb;
    }

    .resume__block h2 {
      font-size: 13pt;
      margin-bottom: 0.5rem;
    }

    .job + .job {
      margin-top: 0.9rem;
      padding-top: 0;
      border-top: 0;
    }

    .job {
      break-inside: avoid;
    }

    .job__summary,
    .job__highlights,
    .job :global(.job__facts) {
      margin-top: 0.2rem;
    }

    .job__highlights li + li {
      margin-top: 0;
    }

    .job__highlights li::marker {
      color: #111;
    }

    .resume :global(.skill-list) {
      gap: 0.15rem;
    }

    a {
      color: #111 !important;
      text-decoration: none;
    }
  }
</style>
```

- [ ] **Step 6: Run the tests and watch them pass**

Run: `pnpm vitest run test/resumePdf.test.ts test/migration.test.ts`
Expected: the migration and "fingerprints every component" tests PASS. "is up to date with the resume data" FAILS: the sources changed, so the PDF is stale. Step 7 fixes that.

- [ ] **Step 7: Regenerate the PDF and read it**

Run: `pnpm build:pdf`
Expected: `Wrote public/marcus-hancock-gaillard-resume.pdf`.

Read the PDF (Read tool, `pages: "1-2"`). Confirm: a white page with black text; the name, role and links at the top; `[ S ]` … `[ E ]` chips outlined in black, none filled or orange; `org:`/`dates:` rows under each title; no header, footer, prompt or download button; nothing clipped.

- [ ] **Step 8: Run everything touched and watch it pass**

Run: `pnpm vitest run test/resumePdf.test.ts test/migration.test.ts`
Expected: PASS.

Run: `pnpm build && pnpm exec playwright test e2e/pages.spec.ts e2e/layout.spec.ts`
Expected: PASS on every project.

- [ ] **Step 9: Gate and commit**

Run: `pnpm check && pnpm test && pnpm build`

```bash
git add src/pages/resume.astro src/components/ui/Section.astro scripts/resume-source.mjs \
  test/resumePdf.test.ts test/migration.test.ts e2e/pages.spec.ts e2e/layout.spec.ts \
  public/marcus-hancock-gaillard-resume.pdf scripts/resume-pdf.source-sha256
git commit -m "feat: resume on the terminal primitives, with a rank chip per role and a fresh PDF"
```

---

### Task 3: Notes list and note pages

**Files:**

- Modify: `src/lib/readingTime.ts`, `test/readingTime.test.ts`, `src/pages/notes/index.astro` (full replacement), `src/layouts/NoteLayout.astro` (full replacement), `test/migration.test.ts`, `e2e/pages.spec.ts`, `e2e/layout.spec.ts`

**Interfaces:**

- Consumes: `Section`, `Panel` (`variant="case"`, `class`), `Tag`, `KeyValue`, `Prompt` (`path`, `class`), `getPublishedNotes`, `formatDate`.
- Produces: `readingMinutes(markdown: string): number` from `src/lib/readingTime.ts`; it replaces `readingTime`. The classes `.notes h2 a`, `.note__meta` and `article h1` stay, because e2e uses them.

- [ ] **Step 1: Write the failing tests**

Replace `test/readingTime.test.ts` with:

````ts
import { describe, expect, it } from "vitest";
import { readingMinutes } from "../src/lib/readingTime";

describe("readingMinutes", () => {
  it("rounds up at ~220 words per minute", () => {
    expect(readingMinutes("word ".repeat(221))).toBe(2);
  });

  it("never reports less than a minute", () => {
    expect(readingMinutes("")).toBe(1);
  });

  it("ignores markdown syntax and code fences when counting", () => {
    const md = "# Title\n\n```sh\nls -la /etc/haproxy\n```\n\n**Bold** words here.";
    expect(readingMinutes(md)).toBe(1);
  });
});
````

In `test/migration.test.ts`, append `"src/pages/notes/index.astro",` and `"src/layouts/NoteLayout.astro",` to `MIGRATED`.

In `e2e/pages.spec.ts`, in the test "notes list links to readable posts", change

```ts
await expect(page.locator(".note__meta")).toContainText("min read");
```

to

```ts
await expect(page.locator(".note__meta")).toContainText(/read:\s*\d+ min/);
```

and add after that test:

```ts
test("each note on the list is a case panel with its tags, date and reading time", async ({
  page,
}) => {
  await page.goto("/notes");
  const rows = page.locator(".notes .panel--case");
  await expect(rows).toHaveCount(2);
  await expect(rows.first().locator(".kv__key")).toHaveText(["date:", "read:"]);
  await expect(rows.first().locator(".kv__value").last()).toHaveText(/^\d+ min$/);
  await expect(page.locator(".notes .tag", { hasText: "career" })).toHaveCount(1);
});

test("a note opens with its path as the prompt, then date and reading time", async ({ page }) => {
  await page.goto("/notes/ten-years-t1-to-architect");
  await expect(page.locator(".note__prompt")).toContainText("notes/ten-years-t1-to-architect");
  await expect(page.locator(".note__meta .kv__key")).toHaveText(["date:", "read:"]);
});

test("note code sits on carbon with an iron hairline, inline code on graphite", async ({
  page,
}) => {
  await page.goto("/notes/building-this-site");
  // No published note has code yet, so add some to the rendered body and read its styles.
  const styles = await page.evaluate(() => {
    const prose = document.querySelector(".prose")!;
    prose.insertAdjacentHTML("beforeend", "<pre><code>ls</code></pre><p><code>x</code></p>");
    const s = (sel: string) => getComputedStyle(prose.querySelector(sel)!);
    return {
      preBg: s("pre").backgroundColor,
      preBorder: s("pre").borderTopColor,
      preRadius: s("pre").borderTopLeftRadius,
      inlineBg: s("p > code").backgroundColor,
      body: getComputedStyle(prose).fontSize,
    };
  });
  expect(styles).toEqual({
    preBg: "rgb(17, 17, 17)",
    preBorder: "rgb(32, 32, 32)",
    preRadius: "2px",
    inlineBg: "rgb(25, 25, 25)",
    body: "15px",
  });
});
```

In `e2e/layout.spec.ts`, change the first line after the imports to

```ts
const routes = ["/", "/now", "/resume", "/notes", "/notes/ten-years-t1-to-architect", "/contact"];
```

and append at the end of the file:

```ts
test.describe("internal links", () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "desktop", "one project is enough");
  });

  test("internal links point straight at their page, with no redirect hop", async ({
    page,
    request,
  }) => {
    const pages = [
      "/",
      "/now",
      "/resume",
      "/notes",
      "/notes/ten-years-t1-to-architect",
      "/notes/building-this-site",
    ];
    for (const path of pages) {
      await page.goto(path);
      const hrefs = await page
        .locator('a[href^="/"]')
        .evaluateAll((links) => [
          ...new Set(links.map((a) => a.getAttribute("href")!.split("#")[0]!).filter(Boolean)),
        ]);
      for (const href of hrefs) {
        const res = await request.get(href, { maxRedirects: 0 });
        expect(res.status(), `${path} → ${href}`).toBe(200);
      }
    }
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run test/readingTime.test.ts test/migration.test.ts`
Expected: FAIL. `readingMinutes` is not exported, and the two files still use retired names.

Run: `pnpm build && pnpm exec playwright test e2e/pages.spec.ts e2e/layout.spec.ts --project=desktop -g "note|internal links"`
Expected: FAIL. There are no case panels or `.kv__key` rows, prose is 18px and code sits on carbon without a radius, and the note pager links to `/notes/<id>/`, which 301s.

- [ ] **Step 3: Replace `src/lib/readingTime.ts`**

````ts
const WORDS_PER_MINUTE = 220;

/** Whole minutes to read a Markdown/MDX body, at least 1. Code blocks are scanned, not read. */
export function readingMinutes(markdown: string): number {
  const prose = markdown.replace(/```[\s\S]*?```/g, " ").replace(/[#*_>`[\]()!-]/g, " ");
  const words = prose.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
````

- [ ] **Step 4: Replace `src/pages/notes/index.astro`**

```astro
---
// Notes list (spec §7.3): each note is a case panel with its title, description, tags, and its
// date and reading time as key: value rows.
import BaseLayout from "../../layouts/BaseLayout.astro";
import Section from "../../components/ui/Section.astro";
import Panel from "../../components/ui/Panel.astro";
import Tag from "../../components/ui/Tag.astro";
import KeyValue from "../../components/ui/KeyValue.astro";
import { formatDate, getPublishedNotes } from "../../lib/notes";
import { readingMinutes } from "../../lib/readingTime";

const notes = await getPublishedNotes();
---

<BaseLayout
  title="Notes"
  description="Notes from Marcus Hancock-Gaillard on careers, infrastructure, and how this site is built."
>
  <Section prompt="notes">
    <h1 class="page-title">Notes</h1>
    <p class="intro">
      Short writing on my career and how this site is built. Longer technical posts will live on{" "}
      linux.engineering. <a href="/rss.xml">Subscribe by RSS</a>.
    </p>

    {notes.length === 0 && <p class="empty">No notes published yet. Check back soon.</p>}

    <ol class="notes" role="list">
      {notes.map((note) => (
        <li>
          <Panel variant="case" class="note-row">
            <h2 class="note-row__title">
              <a href={`/notes/${note.id}`}>{note.data.title}</a>
            </h2>
            <p class="note-row__desc">{note.data.description}</p>
            {note.data.tags.length > 0 && (
              <p class="note-row__tags">
                {note.data.tags.map((tag) => (
                  <Tag>{tag}</Tag>
                ))}
              </p>
            )}
            <KeyValue
              class="note-row__meta"
              rows={[
                { key: "date", value: formatDate(note.data.pubDate) },
                { key: "read", value: `${readingMinutes(note.body ?? "")} min` },
              ]}
            />
          </Panel>
        </li>
      ))}
    </ol>
  </Section>
</BaseLayout>

<style>
  .page-title {
    font-size: var(--text-display);
  }

  .intro,
  .empty {
    margin-top: 1rem;
    color: var(--color-fog);
  }

  .notes {
    display: grid;
    gap: 1rem;
    margin-top: 2.5rem;
    padding: 0;
    list-style: none;
  }

  .notes :global(.note-row) {
    display: grid;
    gap: 0.75rem;
  }

  .note-row__title {
    font-size: var(--text-heading);
  }

  .note-row__title a {
    text-decoration: none;
  }

  .note-row__title a:hover {
    text-decoration: underline;
  }

  .note-row__desc {
    color: var(--color-fog);
  }

  .note-row__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 1rem;
  }
</style>
```

- [ ] **Step 5: Replace `src/layouts/NoteLayout.astro`**

```astro
---
// One note (spec §7.3): a `~/notes/<id>` prompt, the title, date and reading time as key: value
// rows, then the body in a 68ch measure at 15px/1.7. Code blocks sit on carbon, inline code on
// graphite. Pager links are slashless (trailingSlash: "never").
import BaseLayout from "./BaseLayout.astro";
import Prompt from "../components/ui/Prompt.astro";
import KeyValue from "../components/ui/KeyValue.astro";
import { formatDate, type Note } from "../lib/notes";
import { readingMinutes } from "../lib/readingTime";

interface Props {
  note: Note;
  newer?: Note;
  older?: Note;
}

const { note, newer, older } = Astro.props;
const { title, description, pubDate, updatedDate } = note.data;
const meta = [
  { key: "date", value: formatDate(pubDate) },
  { key: "read", value: `${readingMinutes(note.body ?? "")} min` },
  ...(updatedDate ? [{ key: "updated", value: formatDate(updatedDate) }] : []),
];
---

<BaseLayout title={title} description={description}>
  <article class="wrap note">
    <header class="note__head">
      <p class="note__back">
        <a href="/notes">
          <span aria-hidden="true">← </span>all notes
        </a>
      </p>
      <Prompt path={`notes/${note.id}`} class="note__prompt" />
      <h1>{title}</h1>
      <KeyValue rows={meta} class="note__meta" />
    </header>

    <div class="prose">
      <slot />
    </div>

    {(newer || older) && (
      <nav class="note__pager" aria-label="More notes">
        {older && (
          <a href={`/notes/${older.id}`} rel="prev" class="note__pager-link">
            <span class="note__pager-label">
              <span aria-hidden="true">← </span>older
            </span>
            {older.data.title}
          </a>
        )}
        {newer && (
          <a href={`/notes/${newer.id}`} rel="next" class="note__pager-link note__pager-next">
            <span class="note__pager-label">
              newer<span aria-hidden="true"> →</span>
            </span>
            {newer.data.title}
          </a>
        )}
      </nav>
    )}
  </article>
</BaseLayout>

<style>
  .note {
    padding-block: var(--section-y);
    max-width: calc(var(--measure) + 2 * var(--gutter));
  }

  .note__back a {
    color: var(--color-ash);
    font-size: var(--text-caption);
    text-decoration: none;
  }

  .note__back a:hover {
    color: var(--color-ember);
  }

  .note__head :global(.note__prompt) {
    margin-top: 2rem;
  }

  .note__head h1 {
    margin-top: 0.5rem;
    font-size: var(--text-display);
  }

  .note__head :global(.note__meta) {
    margin-top: 1rem;
    font-size: var(--text-caption);
  }

  .prose {
    margin-top: 2.5rem;
    font-size: var(--text-body);
    line-height: var(--leading-body);
  }

  .prose :global(> * + *) {
    margin-top: 1.1em;
  }

  .prose :global(h2) {
    margin-top: 2em;
    font-size: var(--text-heading-lg);
  }

  .prose :global(h3) {
    margin-top: 1.6em;
    font-size: var(--text-heading);
  }

  .prose :global(ul),
  .prose :global(ol) {
    padding-left: 1.3em;
  }

  .prose :global(ul) {
    list-style: "- ";
  }

  .prose :global(ol) {
    list-style: decimal;
  }

  .prose :global(li::marker) {
    color: var(--color-ash);
  }

  .prose :global(li + li) {
    margin-top: 0.35em;
  }

  .prose :global(blockquote) {
    padding-left: 1em;
    border-left: 2px solid var(--color-slate);
    color: var(--color-fog);
  }

  .prose :global(code) {
    padding: 0.1em 0.35em;
    border-radius: var(--radius);
    background: var(--color-graphite);
    font-size: 0.93em;
  }

  .prose :global(pre) {
    padding: 1rem;
    overflow-x: auto;
    background: var(--color-carbon);
    border: 1px solid var(--color-iron);
    border-radius: var(--radius);
    font-size: var(--text-caption);
    line-height: 1.5;
  }

  .prose :global(pre code) {
    padding: 0;
    border-radius: 0;
    background: none;
    font-size: inherit;
  }

  .note__pager {
    display: grid;
    gap: 1rem;
    margin-top: 4rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--color-iron);
  }

  @media (min-width: 40rem) {
    .note__pager {
      grid-template-columns: 1fr 1fr;
    }
  }

  .note__pager-link {
    display: grid;
    gap: 0.25rem;
    text-decoration: none;
  }

  .note__pager-label {
    color: var(--color-ash);
    font-size: var(--text-caption);
  }

  .note__pager-next {
    grid-column: 2;
    text-align: right;
  }
</style>
```

- [ ] **Step 6: Run the tests and watch them pass**

Run: `pnpm vitest run test/readingTime.test.ts test/migration.test.ts`
Expected: PASS.

Run: `pnpm build && pnpm exec playwright test e2e/pages.spec.ts e2e/layout.spec.ts`
Expected: PASS on every project. That includes the new note route in the overflow and header/footer tests.

- [ ] **Step 7: Gate and commit**

Run: `pnpm check && pnpm test && pnpm build`

```bash
git add src/lib/readingTime.ts test/readingTime.test.ts src/pages/notes/index.astro \
  src/layouts/NoteLayout.astro test/migration.test.ts e2e/pages.spec.ts e2e/layout.spec.ts
git commit -m "feat: notes as case panels, a terminal note page, and slashless pager links"
```

---

### Task 4: Contact on the terminal primitives

**Files:**

- Modify: `src/pages/contact.astro` (full replacement), `src/components/contact/ContactForm.astro` (import, submit button, `<style>`), `src/scripts/contact-form.ts` (two lines), `test/migration.test.ts`, `e2e/contact.spec.ts`

**Interfaces:**

- Consumes: `Button` without `href` renders `<button type="submit">` with `[data-button-label]` (Task 1); `Section` (`prompt`).
- Produces: nothing new for later tasks. The ids (`#panel-recruiter`, `#panel-client`, `tab-*`), data attributes (`data-contact-tab`, `data-contact-panel`, `data-contact-form`, `data-error-for`, `data-form-status`) and the `is-active` class stay, because the script and e2e depend on them.

Error treatment (spec §7.4 says nothing about errors, and §3.2 forbids ember for status). Invalid fields get a **paper** 1px border. Error text is paper with an ash `error: ` prefix, the same `key: value` voice as the rest of the site. Task 9 records this in the spec.

- [ ] **Step 1: Write the failing tests**

In `test/migration.test.ts`, append `"src/pages/contact.astro",` and `"src/components/contact/ContactForm.astro",` to `MIGRATED`.

In `e2e/contact.spec.ts`, after the test "switches to the client form with tabs", add:

```ts
test("the form tabs are a chip pair: paper outline selected, slate unselected", async ({
  page,
}) => {
  await openContact(page);
  await expect(page.getByRole("tab", { name: "I'm hiring" })).toHaveCSS(
    "border-top-color",
    "rgb(238, 238, 238)",
  );
  await expect(page.getByRole("tab", { name: "I need help with a project" })).toHaveCSS(
    "border-top-color",
    "rgb(58, 58, 58)",
  );
});

test("errors read as terminal errors and the button keeps its label and arrow", async ({
  page,
}) => {
  await openContact(page);
  const form = page.locator("#panel-recruiter form");
  await form.getByLabel("Email").fill("not-an-email");
  await form.getByRole("button", { name: "Send message" }).click();

  const error = form.locator('[data-error-for="email"]');
  await expect(error).toBeVisible();
  await expect(error).toHaveCSS("color", "rgb(238, 238, 238)");
  expect(await error.evaluate((el) => getComputedStyle(el, "::before").content)).toBe('"error: "');
  await expect(form.getByLabel("Email")).toHaveCSS("border-top-color", "rgb(238, 238, 238)");

  const submit = form.locator('button[type="submit"]');
  await expect(submit).toHaveText(/Send message/);
  await expect(submit.locator(".btn__arrow")).toHaveCount(1);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run test/migration.test.ts`
Expected: FAIL. `contact.astro` and `ContactForm.astro` still use `--color-seam`, `--color-hanko-hot`, `--color-washi`, …

Run: `pnpm build && pnpm exec playwright test e2e/contact.spec.ts --project=desktop -g "chip pair|terminal errors"`
Expected: FAIL. The tabs have no border (`rgba(0, 0, 0, 0)` / `transparent`), the error is ember, there is no `::before`, and the submit has no `.btn__arrow`.

- [ ] **Step 3: Relabel only the button's label span in `src/scripts/contact-form.ts`**

Replace

```ts
const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
```

with

```ts
const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
// The Button primitive keeps its arrow outside the label, so only the label text changes.
const label = button.querySelector<HTMLElement>("[data-button-label]") ?? button;
```

then replace `button.textContent = "Sending…";` with `label.textContent = "Sending…";`, and `button.textContent = "Send message";` with `label.textContent = "Send message";`.

- [ ] **Step 4: Update `src/components/contact/ContactForm.astro`**

After `import { BUDGETS } from "../../lib/contactSchema";` add:

```ts
import Button from "../ui/Button.astro";
```

Replace

```astro
<button type="submit" class="submit">
  Send message
</button>
```

with

```astro
<Button class="submit">Send message</Button>
```

Replace the whole `<style>` block with:

```astro
<style>
  .contact-form {
    display: grid;
    gap: 1.25rem;
    max-width: 38rem;
  }

  .trap {
    position: absolute;
    left: -10000px;
    width: 1px;
    height: 1px;
    overflow: hidden;
  }

  .field {
    display: grid;
    gap: 0.4rem;
  }

  label {
    color: var(--color-paper);
  }

  .field__hint {
    color: var(--color-ash);
  }

  input,
  textarea,
  select {
    width: 100%;
    min-height: 2.75rem;
    padding: 0.6rem 0.8rem;
    background: var(--color-carbon);
    color: var(--color-paper);
    border: 1px solid var(--color-iron);
    border-radius: var(--radius);
  }

  textarea {
    resize: vertical;
  }

  /* The ember ring comes from the global :focus-visible rule; keep it close to the field. */
  input:focus-visible,
  textarea:focus-visible,
  select:focus-visible {
    outline-offset: 2px;
  }

  /* Errors are paper, never ember (ember doesn't mark status, spec §3.2): a paper border and an
     `error:` prefix in the site's key: value voice. */
  [aria-invalid="true"] {
    border-color: var(--color-paper);
  }

  .field__error {
    color: var(--color-paper);
    font-size: var(--text-caption);
  }

  .field__error::before {
    content: "error: ";
    color: var(--color-ash);
  }

  .field__error:empty,
  .form-status:empty {
    display: none;
  }

  .form-status {
    padding: 0.75rem 1rem;
    background: var(--color-carbon);
    border: 1px solid var(--color-iron);
    border-radius: var(--radius);
  }

  .contact-form :global(.submit) {
    justify-self: start;
  }
</style>
```

- [ ] **Step 5: Replace `src/pages/contact.astro`**

```astro
---
// On-demand page: it renders a fresh time-trap token per visit and reads no-JS action results.
// Spec §7.4: the two forms sit behind a chip pair styled like RankChip, on the terminal inputs.
export const prerender = false;

import { actions, isInputError } from "astro:actions";
import BaseLayout from "../layouts/BaseLayout.astro";
import Section from "../components/ui/Section.astro";
import ContactForm from "../components/contact/ContactForm.astro";
import { issueToken } from "../lib/timeTrap";
import { formSecret } from "../lib/formSecret";

const result = Astro.getActionResult(actions.contact);
const sent = Boolean(result?.data?.sent);
const fieldErrors = result?.error && isInputError(result.error) ? result.error.fields : {};
const formError = result?.error && !isInputError(result.error) ? result.error.message : undefined;
const token = issueToken(formSecret);

const forms = [
  { type: "recruiter", tab: "I'm hiring" },
  { type: "client", tab: "I need help with a project" },
] as const;

// Pages with per-request tokens must never be cached.
Astro.response.headers.set("Cache-Control", "no-store");
---

<BaseLayout
  title="Contact"
  description="Get in touch with Marcus Hancock-Gaillard about infrastructure roles or consulting work."
>
  <Section prompt="contact">
    <h1 class="page-title">Get in touch</h1>
    {sent ? (
      <div class="sent" role="status">
        <h2>Message sent</h2>
        <p>Thanks. I'll reply to you by email.</p>
      </div>
    ) : (
      <>
        <p class="intro">
          Hiring for an infrastructure role, or need help with load balancing, failover, or
          automation? Tell me a little about it and I'll reply by email.
        </p>

        {formError && (
          <p class="form-error" role="alert">
            {formError}
          </p>
        )}

        <div class="tabs" role="tablist" aria-label="Why you're writing">
          {forms.map(({ type, tab }, i) => (
            <button
              type="button"
              role="tab"
              id={`tab-${type}`}
              aria-controls={`panel-${type}`}
              aria-selected={i === 0 ? "true" : "false"}
              tabindex={i === 0 ? 0 : -1}
              data-contact-tab
            >
              {tab}
            </button>
          ))}
        </div>

        {forms.map(({ type, tab }, i) => (
          <section
            id={`panel-${type}`}
            role="tabpanel"
            aria-labelledby={`tab-${type}`}
            class:list={["form-panel", { "is-active": i === 0 }]}
            data-contact-panel
          >
            <h2 class="form-panel__heading">{tab}</h2>
            <ContactForm type={type} token={token} errors={fieldErrors} />
          </section>
        ))}
      </>
    )}
  </Section>
</BaseLayout>

<script>
  import "../scripts/contact-form";
</script>

<style>
  .page-title {
    font-size: var(--text-display);
  }

  .intro {
    margin-top: 1rem;
    color: var(--color-fog);
  }

  .form-error {
    margin-top: 1.5rem;
    padding: 0.75rem 1rem;
    max-width: 38rem;
    background: var(--color-carbon);
    border: 1px solid var(--color-iron);
    border-radius: var(--radius);
  }

  .form-error::before {
    content: "error: ";
    color: var(--color-ash);
  }

  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 2.5rem;
  }

  /* A chip pair styled like RankChip: selected = paper border and text, unselected = slate and fog. */
  .tabs button {
    min-height: 2.75rem;
    padding: 0.5rem 0.9rem;
    background: var(--color-graphite);
    border: 1px solid var(--color-slate);
    border-radius: var(--radius);
    color: var(--color-fog);
    cursor: pointer;
  }

  .tabs button:hover {
    color: var(--color-paper);
  }

  .tabs button[aria-selected="true"] {
    border-color: var(--color-paper);
    color: var(--color-paper);
  }

  .form-panel {
    margin-top: 2rem;
  }

  .form-panel__heading {
    font-size: var(--text-heading);
    margin-bottom: 1.25rem;
  }

  /* With scripting: tabs switch panels and the per-panel heading is redundant.
     Without it: no tabs, both forms stacked under their headings. */
  @media (scripting: enabled) {
    .form-panel:not(.is-active) {
      display: none;
    }

    .form-panel__heading {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
    }
  }

  @media (scripting: none) {
    .tabs {
      display: none;
    }

    .form-panel + .form-panel {
      margin-top: 4rem;
    }
  }

  :global(.sent) {
    margin-top: 2rem;
  }

  :global(.sent h2) {
    font-size: var(--text-heading-lg);
  }

  :global(.sent p) {
    margin-top: 0.5rem;
  }
</style>
```

- [ ] **Step 6: Run the tests and watch them pass**

Run: `pnpm vitest run test/migration.test.ts`
Expected: PASS.

Run: `pnpm build && pnpm exec playwright test e2e/contact.spec.ts`
Expected: PASS on every project. That includes the existing send, error, too-fast, honeypot, tabs, no-JS, rate-limit and CSRF tests.

- [ ] **Step 7: Gate and commit**

Run: `pnpm check && pnpm test && pnpm build`

```bash
git add src/pages/contact.astro src/components/contact/ContactForm.astro \
  src/scripts/contact-form.ts test/migration.test.ts e2e/contact.spec.ts
git commit -m "feat: contact on the terminal primitives: chip tabs, carbon inputs, paper errors"
```

---

### Task 5: Shell and home polish (deferred minors)

**Files:**

- Modify: `src/components/layout/Header.astro` (mobile sheet), `src/components/layout/Footer.astro` (tap targets, `role="list"`), `src/components/home/Skills.astro`, `src/components/home/Work.astro`, `src/components/home/NowColumns.astro`, `src/components/journey/JourneyTimeline.astro` (`role="list"`), `src/components/home/Topology.astro` (`decorative`), `src/components/journey/Journey.astro` (tablet summaries)
- Create: `e2e/constants.ts`
- Test: `test/ui/Skills.test.ts`, `test/ui/Work.test.ts`, `test/ui/OffTheClock.test.ts`, `test/ui/JourneyTimeline.test.ts`, `test/ui/Footer.test.ts`, `test/ui/Topology.test.ts`, `e2e/home.spec.ts`, `e2e/journey.spec.ts`, `e2e/layout.spec.ts`, `e2e/visual.spec.ts`

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces: `Topology` prop `decorative?: boolean`. When true the SVG is `aria-hidden="true"` with no role or label. `e2e/constants.ts` exports `HEADER_PX = 56`.

- [ ] **Step 1: Write the failing tests**

`role="list"` on lists that drop their bullets (Safari/VoiceOver removes list semantics from `list-style: none` lists):

- `test/ui/Skills.test.ts`, inside `describe("Skills", …)`:

```ts
it("keeps list semantics on its unbulleted lists", async () => {
  const html = await render(Skills);
  expect(html).toMatch(/<ul class="skills" role="list"/);
  expect(html.match(/<ul class="skills__items" role="list"/g)).toHaveLength(skillDomains.length);
});
```

- `test/ui/OffTheClock.test.ts`, inside its `describe`:

```ts
it("keeps list semantics on the playing and watching lists", async () => {
  const html = await render(OffTheClock);
  expect(html.match(/class="now-col__body now-col__list" role="list"/g)).toHaveLength(2);
});
```

- `test/ui/JourneyTimeline.test.ts`, inside its `describe`:

```ts
it("keeps list semantics on the timeline", async () => {
  expect(await render(JourneyTimeline)).toMatch(/<ol class="timeline" role="list"/);
});
```

- `test/ui/Footer.test.ts`, inside its `describe`:

```ts
it("keeps list semantics on its links", async () => {
  expect(await render(Footer)).toMatch(/<ul class="site-footer__links" role="list"/);
});
```

(Use the render call and imports each file already has. If a file names its component import differently, use that name.)

Topology: in `test/ui/Topology.test.ts` add inside `describe("Topology", …)`:

```ts
it("hides itself from assistive tech when its caller captions it", async () => {
  const html = await render(Topology, { props: { decorative: true } });
  expect(html).toMatch(/<svg class="topo"[^>]*aria-hidden="true"/);
  expect(html).not.toContain('role="img"');
  expect(html).not.toContain("aria-label=");
});
```

In `test/ui/Work.test.ts`, replace the test "shows the topology diagram" with:

```ts
it("describes the topology once, through its caption, and keeps list semantics", async () => {
  const html = await render(Work);
  expect(html).toMatch(/<svg class="topo"[^>]*aria-hidden="true"/);
  expect(html).toMatch(
    /<figcaption class="work__caption"[^>]*>two datacenters, BGP failover, HAProxy in front</,
  );
  expect(html).toContain('<ul role="list"');
});
```

In `e2e/home.spec.ts`, replace the test "describes the topology to assistive tech" with:

```ts
test("describes the topology once, through its caption", async ({ page }) => {
  await page.goto("/");
  const figure = page.locator("figure.work__topology");
  await expect(figure.locator("figcaption")).toHaveText(
    "two datacenters, BGP failover, HAProxy in front",
  );
  await expect(figure.locator("svg.topo")).toHaveAttribute("aria-hidden", "true");
  await expect(page.getByRole("img", { name: /BGP failover/ })).toHaveCount(0);
});
```

Create `e2e/constants.ts`:

```ts
/** The sticky header's height in px (Header.astro: min-height 3.5rem). */
export const HEADER_PX = 56;
```

In `e2e/journey.spec.ts`:

- add `import { HEADER_PX } from "./constants";` under the Playwright import;
- replace the `scrollToStage` function with:

```ts
/** Scrolls so the journey is at the middle of stage `i` (of 7). */
async function scrollToStage(page: Page, i: number) {
  await page.evaluate(
    ({ stage, header }) => {
      const el = document.querySelector<HTMLElement>("[data-journey]")!;
      const top = el.getBoundingClientRect().top + scrollY - header;
      const span = el.offsetHeight - (innerHeight - header);
      scrollTo(0, top + span * ((stage + 0.5) / 7));
    },
    { stage: i, header: HEADER_PX },
  );
}
```

- in "keeps the active card inside the viewport at every stage", change the skip to `test.skip(!["iphone-15", "pixel-7", "ipad"].includes(info.project.name), "phone and tablet heights");` and `toBeLessThanOrEqual(64)` to `toBeLessThanOrEqual(HEADER_PX)`;
- add inside `test.describe("animated journey", …)`:

```ts
test("keeps card summaries at body size on tablets", async ({ page }, info) => {
  test.skip(info.project.name !== "ipad", "tablet only");
  await page.goto("/");
  await expect(page.locator(".journey__card.is-active p:not(.journey__meta)").first()).toHaveCSS(
    "font-size",
    "15px",
  );
});
```

In `e2e/visual.spec.ts`, add `import { HEADER_PX } from "./constants";` under the Playwright import, and replace the two journey `page.evaluate` calls with:

```ts
await page.evaluate((header) => {
  const el = document.querySelector<HTMLElement>("[data-journey]")!;
  const top = el.getBoundingClientRect().top + scrollY - header;
  scrollTo(0, top + (el.offsetHeight - innerHeight + header) * (3.5 / 7));
}, HEADER_PX);
```

(rank C) and

```ts
await page.evaluate((header) => {
  const el = document.querySelector<HTMLElement>("[data-journey]")!;
  const top = el.getBoundingClientRect().top + scrollY - header;
  scrollTo(0, top + (el.offsetHeight - innerHeight + header) * (0.5 / 7));
}, HEADER_PX);
```

(rank E).

In `e2e/layout.spec.ts`, add inside `test.describe("collapsed navigation (phones)", …)`:

```ts
test("the open menu is a carbon sheet", async ({ page }) => {
  await page.goto("/");
  await page.locator("[data-menu-toggle]").click();
  await expect(page.locator("#site-nav")).toHaveCSS("background-color", "rgb(17, 17, 17)");
});
```

and at the end of the file:

```ts
test("footer links are 44px tap targets", async ({ page }) => {
  await page.goto("/");
  const heights = await page
    .locator(".site-footer__links a")
    .evaluateAll((links) => links.map((a) => a.getBoundingClientRect().height));
  expect(heights.length).toBeGreaterThan(0);
  for (const h of heights) expect(h).toBeGreaterThanOrEqual(44);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run test/ui`
Expected: FAIL. None of the lists have `role="list"`, `decorative` is ignored, and Work's SVG still carries `role="img"`.

Run: `pnpm build && pnpm exec playwright test e2e/home.spec.ts e2e/journey.spec.ts e2e/layout.spec.ts -g "caption|tablet|carbon sheet|tap targets"`
Expected: FAIL. The SVG isn't hidden, tablet summaries are 12px, the menu background is transparent, and footer links are under 44px.

- [ ] **Step 3: Add `role="list"` to the unbulleted lists**

- `src/components/home/Skills.astro`: `<ul class="skills">` → `<ul class="skills" role="list">`; `<ul class="skills__items">` → `<ul class="skills__items" role="list">`.
- `src/components/home/Work.astro`: the `<ul>` inside `.shared` → `<ul role="list">`.
- `src/components/home/NowColumns.astro`: both `<ul class="now-col__body now-col__list">` → `<ul class="now-col__body now-col__list" role="list">`.
- `src/components/journey/JourneyTimeline.astro`: `<ol class="timeline">` → `<ol class="timeline" role="list">`.
- `src/components/layout/Footer.astro`: `<ul class="site-footer__links">` → `<ul class="site-footer__links" role="list">`.

- [ ] **Step 4: Let the caption describe the topology**

In `src/components/home/Topology.astro`, replace the frontmatter and the opening `<svg …>` tag with:

```astro
---
// The shape of the infrastructure Marcus runs: internet → HAProxy → two datacenters joined by a
// BGP link. One ember pulse crosses the link and back (translateX only; frozen with reduced
// motion). Public-safe detail only: no hostnames, vendors or customers.
// `decorative`: the caller captions the diagram itself, so the SVG stays out of the accessibility
// tree instead of announcing the same sentence twice.
interface Props {
  decorative?: boolean;
}

const { decorative = false } = Astro.props;
const a11y = decorative
  ? { "aria-hidden": "true" }
  : { role: "img", "aria-label": "Two datacenters with BGP failover behind HAProxy" };
---

<svg class="topo" viewBox="0 0 480 220" {...a11y}>
```

In `src/components/home/Work.astro`, change `<Topology />` to `<Topology decorative />`.

- [ ] **Step 5: Header sheet, footer tap targets, tablet summaries**

In `src/components/layout/Header.astro`, inside `@media (max-width: 44.99rem)`, replace

```css
.site-nav {
  flex-basis: 100%;
}
```

with

```css
/* The mobile menu is a carbon sheet under the bar, edge to edge (spec §5). */
.site-nav {
  flex-basis: 100%;
  margin-inline: calc(-1 * var(--gutter));
  padding-inline: var(--gutter);
  background: var(--color-carbon);
  border-top: 1px solid var(--color-iron);
}
```

In `src/components/layout/Footer.astro`, replace

```css
.site-footer__links a {
  display: inline-block;
  padding-block: 0.6rem; /* 44px tap target with line-height */
  color: var(--color-paper);
  text-decoration: none;
}
```

with

```css
.site-footer__links a {
  display: inline-flex;
  align-items: center;
  min-height: 2.75rem; /* 44px tap target */
  color: var(--color-paper);
  text-decoration: none;
}
```

In `src/components/journey/Journey.astro`, replace

```css
@media (max-width: 59.99rem) {
  .journey__cards p:not(.journey__meta) {
    font-size: var(--text-caption);
  }

  .journey__highlight {
    display: none;
  }
}
```

with

```css
/* Phones: smaller summaries so the active card fits under the pinned scene. Tablets keep 15px. */
@media (max-width: 47.99rem) {
  .journey__cards p:not(.journey__meta) {
    font-size: var(--text-caption);
  }
}

@media (max-width: 59.99rem) {
  .journey__highlight {
    display: none;
  }
}
```

- [ ] **Step 6: Run the tests and watch them pass**

Run: `pnpm vitest run test/ui`
Expected: PASS.

Run: `pnpm build && pnpm exec playwright test e2e/home.spec.ts e2e/journey.spec.ts e2e/layout.spec.ts`
Expected: PASS on every project. On the ipad project, "keeps the active card inside the viewport" is the guard for the larger tablet summaries. If it fails, keep 15px and cap the card with `max-height: calc(100dvh - var(--header) - 2rem); overflow: hidden;` on `.journey__cards :global(.journey__card)` at `min-width: 48rem`. Rerun, and ledger the ruling.

- [ ] **Step 7: Gate and commit**

Run: `pnpm check && pnpm test && pnpm build`
(`pnpm test:visual` is not run here: the journey offsets changed from 64 to 56, and every baseline is regenerated once, in Task 10.)

```bash
git add src/components/layout/Header.astro src/components/layout/Footer.astro \
  src/components/home/Skills.astro src/components/home/Work.astro \
  src/components/home/NowColumns.astro src/components/journey/JourneyTimeline.astro \
  src/components/home/Topology.astro src/components/journey/Journey.astro e2e/constants.ts \
  test/ui e2e/home.spec.ts e2e/journey.spec.ts e2e/layout.spec.ts e2e/visual.spec.ts
git commit -m "fix: list semantics, one topology description, carbon menu sheet, 44px footer links, tablet summaries"
```

---

### Task 6: LogBars start flat from the first paint

**Files:**

- Modify: `src/components/ui/LogBars.astro` (`<style>`), `src/scripts/log-bars.ts`
- Test: `test/ui/LogBars.test.ts`, `e2e/pages.spec.ts`

**Interfaces:**

- Consumes: nothing new.
- Produces: `initLogBars()` no longer sets `data-animate`; CSS alone decides the flat starting state. `.is-live` still marks a streamed-in bar, and `e2e/visual.spec.ts` still waits on it.

- [ ] **Step 1: Write the failing tests**

In `test/ui/LogBars.test.ts`, in "never emits a negative height or a zero-width viewBox", after the first `render` line add:

```ts
expect(html.match(/<rect /g)).toHaveLength(3);
```

and change the empty case to:

```ts
const empty = await render(LogBars, { props: { values: [], label: "empty" } });
expect(empty).toContain('viewBox="0 0 4 24"');
expect(empty).not.toContain("<rect ");
```

In `e2e/pages.spec.ts`, append:

```ts
test.describe("training bars", () => {
  test("are flat from the first paint until they scroll into view", async ({ page }, info) => {
    test.skip(!["iphone-15", "pixel-7"].includes(info.project.name), "phones: bars start below");
    await page.goto("/now");
    const bars = page.locator(".now__bars");
    expect(await bars.getAttribute("data-animate")).toBeNull();
    await expect(bars.locator(".log-bars__bar").first()).toHaveCSS(
      "transform",
      "matrix(1, 0, 0, 0, 0, 0)",
    );
    await bars.scrollIntoViewIfNeeded();
    await expect(bars.locator(".log-bars__bar:not(.is-live)")).toHaveCount(0);
    await expect(bars.locator(".log-bars__bar").last()).toHaveCSS(
      "transform",
      "matrix(1, 0, 0, 1, 0, 0)",
    );
  });

  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("stand at full height", async ({ page }, info) => {
      test.skip(info.project.name !== "desktop", "one project is enough");
      await page.goto("/now");
      await expect(page.locator(".now__bars .log-bars__bar").first()).toHaveCSS(
        "transform",
        "none",
      );
    });
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run test/ui/LogBars.test.ts`
Expected: PASS already. These are regression pins for the Phase 1 minor "the bad-input test would pass with zero rects"; they must stay green through Step 3.

Run: `pnpm build && pnpm exec playwright test e2e/pages.spec.ts -g "training bars"`
Expected: FAIL on the phone projects. `data-animate` is present, because the script sets it after first paint, so the bars flash full → flat → stream in.

- [ ] **Step 3: Move the starting state into CSS**

In `src/components/ui/LogBars.astro`, replace the block that starts `/* Only when scripts/log-bars.ts opted in (it checks reduced motion first). */` and ends with the closing `}` of its `@media (prefers-reduced-motion: no-preference)` with:

```css
/* With scripting and motion the bars start flat and scripts/log-bars.ts streams them in when
   they scroll into view. CSS sets the start, not the script, so the first paint is already flat. */
@media (scripting: enabled) and (prefers-reduced-motion: no-preference) {
  .log-bars__bar {
    transform: scaleY(0);
    transition: transform 400ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .log-bars__bar.is-live {
    transform: scaleY(1);
  }
}
```

Update line 3's comment in the component to: `// With scripting and motion, CSS starts the bars flat and scripts/log-bars.ts streams them in.`

In `src/scripts/log-bars.ts`, delete the line `svg.dataset.animate = "";`.

- [ ] **Step 4: Run the tests and watch them pass**

Run: `pnpm vitest run test/ui/LogBars.test.ts test/logBars.test.ts`
Expected: PASS.

Run: `pnpm build && pnpm exec playwright test e2e/pages.spec.ts e2e/home.spec.ts`
Expected: PASS on every project, including reduced-motion, where the bars render at full height because the media query doesn't match.

- [ ] **Step 5: Gate and commit**

Run: `pnpm check && pnpm test && pnpm build`

```bash
git add src/components/ui/LogBars.astro src/scripts/log-bars.ts test/ui/LogBars.test.ts \
  e2e/pages.spec.ts
git commit -m "fix: LogBars start flat in CSS, so they never flash full before streaming in"
```

---

### Task 7: Retire the manga token aliases

**Files:**

- Modify: `src/styles/tokens.css` (delete the alias block), `test/tokens.test.ts` (drop the alias test), `test/migration.test.ts` (full replacement), `src/components/journey/JourneyScene.astro` (class renames), `CLAUDE.md` (one bullet)

**Interfaces:**

- Consumes: Tasks 2–4 migrated the last five files.
- Produces: `test/migration.test.ts` exports nothing and guards `RETIRED` for good.

- [ ] **Step 1: Write the failing test**

Replace `test/migration.test.ts` with:

```ts
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The manga design's token names. The Axiom redesign retired them and Phase 4 deleted their
// aliases; this keeps them from coming back.
const RETIRED = [
  "--color-night",
  "--color-night-deep",
  "--color-seam",
  "--color-washi",
  "--color-hanko",
  "--color-hanko-hot",
  "--color-gold",
  "--font-display",
  "--font-body",
  "--text-sm",
  "--text-base",
  "--text-lg",
  "--text-xl",
  "--text-2xl",
  "--text-3xl",
];

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) sourceFiles(p, out);
    else if (/\.(astro|css|ts|mjs|mdx?)$/.test(name)) out.push(p);
  }
  return out;
}

describe("retired design tokens", () => {
  it("are no longer defined in tokens.css", () => {
    const css = readFileSync("src/styles/tokens.css", "utf8");
    for (const name of RETIRED) expect(css, name).not.toMatch(new RegExp(`${name}\\s*:`));
  });

  it("are used nowhere in src", () => {
    const hits = sourceFiles("src").flatMap((file) => {
      const text = readFileSync(file, "utf8");
      return RETIRED.filter((name) => text.includes(`var(${name})`)).map((n) => `${n} in ${file}`);
    });
    expect(hits).toEqual([]);
  });
});
```

In `test/tokens.test.ts`, delete the whole test `it("aliases every retired token name so untouched components still render", …)`.

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run test/migration.test.ts`
Expected: FAIL. "are no longer defined in tokens.css" lists every alias. "are used nowhere in src" PASSES, because Tasks 2–4 moved the last users off.

- [ ] **Step 3: Delete the alias block and the scene's retired class names**

In `src/styles/tokens.css`, delete everything from the comment `/*` that begins `* Compatibility aliases for the retired "manga panel" token names.` through the closing `}` of the `:root { … }` block (the end of the file). The file ends at the `@theme` block's closing `}`.

In `src/components/journey/JourneyScene.astro`, rename the class `c-night` to `c-void` everywhere (five uses plus the `.c-night` rule), and `c-seam` to `c-coat-seam` everywhere (one use plus the `.c-seam` rule):

```bash
sed -i '' 's/c-night/c-void/g; s/c-seam/c-coat-seam/g' src/components/journey/JourneyScene.astro
grep -c "c-night\|c-seam" src/components/journey/JourneyScene.astro
```

Expected: `0`. Also check `.c-coat-seam` doesn't collide with an existing class: `grep -n "c-coat-seam\|c-void" src/components/journey/JourneyScene.astro` should show only the renamed rules and their uses.

In `CLAUDE.md`, replace the bullet that starts `` - `src/styles/tokens.css` holds the design tokens (`@theme`). Its `:root` block aliases`` with:

```markdown
- `src/styles/tokens.css` holds the design tokens (`@theme`). The retired manga names (`--color-washi`, `--color-hanko`, `--text-3xl`, …) are gone; `test/migration.test.ts` keeps them from coming back.
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `pnpm vitest run test/migration.test.ts test/tokens.test.ts test/journeyScene.test.ts test/ui/Journey.test.ts`
Expected: PASS. "has no undefined custom property references anywhere in src" passing is the proof that no rule points at a deleted alias.

Run: `pnpm build && pnpm exec playwright test e2e/journey.spec.ts e2e/home.spec.ts --project=desktop`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run: `pnpm check && pnpm test && pnpm build && pnpm size`
Expected: all green; fonts still 20–120 KB.

```bash
git add src/styles/tokens.css test/tokens.test.ts test/migration.test.ts \
  src/components/journey/JourneyScene.astro CLAUDE.md
git commit -m "refactor: delete the manga token aliases; a test keeps them out"
```

---

### Task 8: htop consistency and fingerprinted build artefacts

**Files:**

- Create: `scripts/fingerprint.mjs`, `scripts/og-source.mjs`, `scripts/og-card.source-sha256` (generated)
- Modify: `src/scripts/htop.ts`, `src/components/home/Htop.astro`, `scripts/resume-source.mjs`, `scripts/build-og.mjs`, `scripts/import-still.mjs`
- Test: `test/htop.test.ts`, `test/ui/Htop.test.ts`, `test/ogCard.test.ts`, `test/importStill.test.ts`
- Regenerate: `public/og-default.png`

**Interfaces:**

- Consumes: nothing from earlier tasks. Run it after Task 7 because the card fingerprints `tokens.css`.
- Produces:
  - `export const METER_WIDTH = 30`, `export const HOT = 75` and `export function driftSorted(values: readonly number[], spread: number, min: number, max: number, rand?: () => number): number[]`, all from `src/scripts/htop.ts`;
  - `Htop` prop `snapshot?: HtopSnapshot`;
  - `fingerprint(files: string[], root?: string): string` from `scripts/fingerprint.mjs`;
  - `OG_SOURCES`, `OG_PATH`, `OG_FINGERPRINT_PATH` and `ogFingerprint(root?)` from `scripts/og-source.mjs`.

- [ ] **Step 1: Write the failing tests**

In `test/htop.test.ts`, add `driftSorted` to the import from `"../src/scripts/htop"` and append:

```ts
describe("driftSorted", () => {
  it("drifts every row but keeps the CPU% column sorted, highest first", () => {
    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    let cpu = [4.2, 2.9, 1.1, 0.7, 0.3, 0.1, 0, 0];
    for (let tick = 0; tick < 50; tick++) {
      cpu = driftSorted(cpu, 0.8, 0, 12, rand);
      expect(cpu).toHaveLength(8);
      for (let i = 1; i < cpu.length; i++) expect(cpu[i]).toBeLessThanOrEqual(cpu[i - 1]!);
      for (const v of cpu) expect(v >= 0 && v <= 12).toBe(true);
    }
  });
});
```

In `test/ui/Htop.test.ts`, change the imports to

```ts
import Htop from "../../src/components/home/Htop.astro";
import { htop } from "../../src/data/htop";
import { METER_WIDTH } from "../../src/scripts/htop";
import { render } from "../render";
```

and append inside `describe("Htop", …)`:

```ts
it("marks cores at 75% or more hot, at the client's meter width", async () => {
  const html = await render(Htop, { props: { snapshot: { ...htop, cores: [80, 20, 74.9, 75] } } });
  expect(html.match(/class="htop__line is-hot"/g)).toHaveLength(2);
  const bars = [...html.matchAll(/data-core="[^"]*"[\s\S]*?class="htop__bar"[^>]*>([^<]*)</g)];
  expect(new Set(bars.map((m) => m[1]!.length))).toEqual(new Set([METER_WIDTH]));
});
```

Replace `test/ogCard.test.ts` with:

```ts
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { OG_FINGERPRINT_PATH, OG_PATH, OG_SOURCES, ogFingerprint } from "../scripts/og-source.mjs";

describe("social card", () => {
  it("exists (run `pnpm build:og` to regenerate it)", () => {
    expect(existsSync(OG_PATH)).toBe(true);
  });

  it("is a 1200×630 PNG", () => {
    const png = readFileSync(OG_PATH);
    expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  });

  it("is up to date with its sources (run `pnpm build:og` after editing them)", () => {
    const recorded = existsSync(OG_FINGERPRINT_PATH)
      ? readFileSync(OG_FINGERPRINT_PATH, "utf8").trim()
      : "";
    expect(recorded).toBe(ogFingerprint());
  });

  it("fingerprints every component the card page imports", () => {
    const page = readFileSync("src/pages/og-card.astro", "utf8");
    const imported = [...page.matchAll(/from "\.\.\/(components\/[^"]+\.astro)"/g)].map(
      (m) => `src/${m[1]}`,
    );
    expect(imported.length).toBeGreaterThan(0);
    for (const file of imported) expect(OG_SOURCES, file).toContain(file);
  });
});
```

In `test/importStill.test.ts`, change the first import to `import { existsSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";`, add `import { execFileSync } from "node:child_process";` and change `import { join } from "node:path";` to `import { join, resolve } from "node:path";`. Then append inside `describe("importStill", …)`:

```ts
it("runs as a CLI through a symlinked path with a space in it", async () => {
  const d = tmp();
  await png(join(d, "in.png"), 800, 400);
  const link = join(d, "import still.mjs");
  symlinkSync(resolve("scripts/import-still.mjs"), link);
  execFileSync(process.execPath, [link, join(d, "in.png"), join(d, "out.webp")]);
  expect(existsSync(join(d, "out.webp"))).toBe(true);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run test/htop.test.ts test/ui/Htop.test.ts test/ogCard.test.ts test/importStill.test.ts`
Expected: FAIL.

- `driftSorted` and `METER_WIDTH` are not exported, and the `snapshot` prop is ignored.
- `scripts/og-source.mjs` doesn't exist.
- The CLI silently does nothing: `import.meta.url` is the realpath, `file://` plus the raw symlink path with a space never matches it, so `out.webp` is missing.

- [ ] **Step 3: Share the htop constants and keep CPU% sorted**

In `src/scripts/htop.ts`:

- replace

```ts
const WIDTH = 30;
const HOT = 75;
```

with

```ts
/** Meter body width in columns; the server render and the client tick must agree. */
export const METER_WIDTH = 30;
/** A core at this load or more is drawn hot (ember). */
export const HOT = 75;

/** Every row drifted, then capped at the row above, so the CPU% column stays sorted like htop's. */
export function driftSorted(
  values: readonly number[],
  spread: number,
  min: number,
  max: number,
  rand: () => number = Math.random,
): number[] {
  const out: number[] = [];
  for (const v of values) {
    const next = drift(v, spread, min, max, rand);
    out.push(out.length > 0 ? Math.min(next, out[out.length - 1]!) : next);
  }
  return out;
}
```

- in `initHtop`, change `meter(next / 100, pct(next), WIDTH)` to `meter(next / 100, pct(next), METER_WIDTH)`;
- replace

```ts
for (const el of cpus) {
  const next = drift(Number(el.dataset.cpu), 0.8, 0, 12);
  el.dataset.cpu = String(next);
  el.textContent = next.toFixed(1);
}
```

with

```ts
const next = driftSorted(
  cpus.map((el) => Number(el.dataset.cpu)),
  0.8,
  0,
  12,
);
cpus.forEach((el, i) => {
  el.dataset.cpu = String(next[i]);
  el.textContent = next[i]!.toFixed(1);
});
```

In `src/components/home/Htop.astro`, replace

```ts
import { htop } from "../../data/htop";
import { meter, pct } from "../../scripts/htop";

const WIDTH = 30;
const HOT = 75;
```

with

```ts
import { htop as siteSnapshot, type HtopSnapshot } from "../../data/htop";
import { HOT, METER_WIDTH, meter, pct } from "../../scripts/htop";

interface Props {
  /** Defaults to the site's snapshot; tests pass their own. */
  snapshot?: HtopSnapshot;
}

const { snapshot: htop = siteSnapshot } = Astro.props;
```

and change every `WIDTH)` in the markup to `METER_WIDTH)`:

```bash
sed -i '' 's/, WIDTH)/, METER_WIDTH)/g' src/components/home/Htop.astro
grep -c "METER_WIDTH)" src/components/home/Htop.astro
```

Expected: `3` (cores, Mem, Swp).

- [ ] **Step 4: One fingerprint helper for the PDF and the card**

Create `scripts/fingerprint.mjs`:

```js
// Fingerprint of the files a committed build artefact is rendered from. When it changes, the
// artefact is stale, and its test fails until it is rebuilt (pnpm build:pdf, pnpm build:og).
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export function fingerprint(files, root = ".") {
  const hash = createHash("sha256");
  for (const file of files) hash.update(readFileSync(`${root}/${file}`));
  return hash.digest("hex");
}
```

In `scripts/resume-source.mjs`, replace the two `node:crypto`/`node:fs` imports with `import { fingerprint } from "./fingerprint.mjs";`, and replace the `resumeFingerprint` function with:

```js
export const resumeFingerprint = (root = ".") => fingerprint(RESUME_SOURCES, root);
```

(Same algorithm, so the recorded resume fingerprint still matches and no PDF rebuild is needed.)

Create `scripts/og-source.mjs`:

```js
// Everything the social card is rendered from. If one changes, public/og-default.png is stale:
// test/ogCard.test.ts fails until `pnpm build:og` rebuilds it.
import { fingerprint } from "./fingerprint.mjs";

export const OG_SOURCES = [
  "src/pages/og-card.astro",
  "src/components/home/Htop.astro",
  "src/components/ui/Prompt.astro",
  "src/components/ui/TerminalFrame.astro",
  "src/data/htop.ts",
  "src/data/site.ts",
  "src/scripts/htop.ts",
  "src/styles/tokens.css",
  "src/styles/global.css",
];
export const OG_PATH = "public/og-default.png";
export const OG_FINGERPRINT_PATH = "scripts/og-card.source-sha256";
export const ogFingerprint = (root = ".") => fingerprint(OG_SOURCES, root);
```

In `scripts/build-og.mjs`:

- change `import { copyFileSync } from "node:fs";` to `import { copyFileSync, writeFileSync } from "node:fs";`;
- add `import { OG_FINGERPRINT_PATH, OG_PATH, ogFingerprint } from "./og-source.mjs";`;
- delete the line `const OUT = "public/og-default.png";` and change every other `OUT` to `OG_PATH`;
- after `copyFileSync(OG_PATH, "dist/client/og-default.png");` add `writeFileSync(OG_FINGERPRINT_PATH, `${ogFingerprint()}\n`);`.

- [ ] **Step 5: Make the import-still CLI check robust**

In `scripts/import-still.mjs`, add

```js
import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
```

to the imports, and replace

```js
if (import.meta.url === `file://${process.argv[1]}`) {
```

with

```js
// Run as a CLI? Compare real paths as file URLs, so symlinks and spaces in the path still match.
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
```

- [ ] **Step 6: Rebuild the card and watch the tests pass**

Run: `pnpm build:og`
Expected: `Wrote public/og-default.png`, and `scripts/og-card.source-sha256` exists. Read the PNG and check it matches Phase 3's card (only the drift logic changed, and the card renders under reduced motion).

Run: `pnpm vitest run test/htop.test.ts test/ui/Htop.test.ts test/ogCard.test.ts test/importStill.test.ts test/resumePdf.test.ts`
Expected: PASS.

- [ ] **Step 7: Gate and commit**

Run: `pnpm check && pnpm test && pnpm build`

```bash
git add src/scripts/htop.ts src/components/home/Htop.astro scripts/fingerprint.mjs \
  scripts/og-source.mjs scripts/resume-source.mjs scripts/build-og.mjs scripts/import-still.mjs \
  scripts/og-card.source-sha256 public/og-default.png test/htop.test.ts test/ui/Htop.test.ts \
  test/ogCard.test.ts test/importStill.test.ts
git commit -m "fix: htop stays sorted and shares its constants; the social card has a staleness guard"
```

---

### Task 9: ADR 0002, spec amendments, CLAUDE.md

**Files:**

- Create: `docs/decisions/0002-axiom-design-system.md`
- Modify: `docs/superpowers/specs/2026-09-24-axiom-design-system-design.md`, `CLAUDE.md`

**Interfaces:** documentation only.

- [ ] **Step 1: Write `docs/decisions/0002-axiom-design-system.md`**

```markdown
# 0002 — Axiom design system

- **Status:** Accepted
- **Date:** 2026-09-24
- **Decider:** Marcus Hancock-Gaillard
- **Supersedes:** the "Design" and "Animation" rows of [0001](0001-domain-and-hosting.md)

## Context

The rebuilt site shipped a manga/hanko look: a crimson accent, diagonal section cuts, speed lines, a hanko seal and a Three.js aura behind the hero. It read as an anime title card. The audience is employers first and clients second, and Marcus wanted the site to feel like the world he works in: a terminal at midnight. The reference is the Axiom style (styles.refero.design), with Devin as a secondary reference.

## Decisions

| Area          | Decision                                                                                                                                                                                                                                                                                           |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Surfaces      | Void `#000` → carbon `#111` → graphite `#191919` → iron `#202020` (borders). Elevation comes only from stepping surfaces: no shadows, gradients, blur or glow.                                                                                                                                     |
| Accent        | One accent, ember `#da5c2c`, in a closed list of places (primary fills, the prompt cursor, the case-panel border, log bars and LEDs, the htop selected row and hot cores, link hover, focus, selection, the S rank chip). Never for status or errors.                                              |
| Accessibility | Filled ember controls carry **void** text (5.55:1), not paper (3.3:1): a deliberate deviation from Axiom. Ash is lifted from `#7e7e7e` to `#848484` so labels pass on graphite. Every text colour is tested at 4.5:1 on every surface text sits on.                                                |
| Type          | JetBrains Mono for everything, self-hosted through the Fonts API (Fontsource). Headings are weight 400; hierarchy comes from size.                                                                                                                                                                 |
| Shape         | 2px radius everywhere; 9999px only on tiny dots. Sections open with a `~/path` prompt and are separated by 1px iron rules.                                                                                                                                                                         |
| Motion        | Only `transform`, `opacity` and `pathLength` animate, every animation respects reduced motion, and buttons change colour instantly on hover.                                                                                                                                                       |
| Three.js      | **Removed.** The system forbids glow, which was the aura's whole effect, and dropping it removed about 170 KB of lazy JS and the `three` dependency. This reverses rebuild-plan Phase 5.                                                                                                           |
| Imagery       | SVG drawn in code for anything diagrammatic or animated (topology, journey scene, htop band). Higgsfield stills only where the spec places them (the rig, the rack), labelled "Illustration:", with no logos, text, people or vendor marks. Prompts and job IDs are recorded in `docs/imagery.md`. |
| Errors        | Form errors are paper text with an ash `error:` prefix and a paper field border, in the site's `key: value` voice, because ember never marks status.                                                                                                                                               |

## Consequences

- The retired manga token names are deleted, and `test/migration.test.ts` keeps them out.
- Visual baselines are macOS renders and are regenerated once per design phase.
- The social card and the resume PDF are committed build artefacts with source fingerprints. Editing what they are rendered from fails a test until `pnpm build:og` / `pnpm build:pdf` rebuilds them.
- Crimson survives only in the favicon/OG mark history. The live accent is ember.
```

- [ ] **Step 2: Amend the spec**

In `docs/superpowers/specs/2026-09-24-axiom-design-system-design.md`:

- §5 Header, replace `Nav: Resume · Now · Notes · Contact, 14px,` with `Nav: Resume · Now · Notes · Contact, at body size (15px; the type scale has no 14px step),`.
- §6.6, replace `16px slate icon` with `16px steel icon`.
- §7.2, append the sentence: `The page opens with a \`~/resume\` prompt (hidden in print).`
- §7.3, append: `The list opens with \`~/notes\`; a note opens with \`~/notes/<id>\` and shows \`date\`, \`read\` (and \`updated\`) as key: value rows. Pager and list links are slashless.`
- §7.4, append: `Errors (amended in Phase 4): ember never marks status, so an invalid field gets a 1px paper border and its message is paper text with an ash \`error: \` prefix; the page-level error and status blocks are carbon with a 1px iron border. The page opens with \`~/contact\`.`
- §7.6, replace `JSON-LD, sitemap, RSS unchanged.` with `JSON-LD unchanged; sitemap, canonical links and RSS use the slashless URL (\`trailingSlash: "never"\`, so every served page carries the CSP header).`
- §8.1, after the topology description, add: `The BGP link is stroked in steel, not slate, so the dashed line stays visible (about 3:1) on the dark surface; it is decoration, not text.`

- [ ] **Step 3: Update `CLAUDE.md`**

Replace the status sentence

```markdown
Phases 1 (tokens, primitives, shell), 2 (home, journey avatar, topology) and 3 (`/now`, stills, htop band, social card) are done. Phase 4 (resume/notes/contact, PDF, ADR) comes next, then rebuild Phase 7 (container, HAProxy, VPS runbook, release pipeline).
```

with

```markdown
All four phases are done (tokens and shell; home, journey avatar and topology; `/now`, stills, htop band and social card; resume, notes, contact, PDF and ADR 0002). Next is rebuild Phase 7 (container, HAProxy, VPS runbook, release pipeline).
```

and change the heading phrase `**Axiom redesign in progress**` to `**Axiom redesign done**`.

Replace the primitives bullet (it starts `` - `src/components/ui/` holds the primitives:``) with:

```markdown
- `src/components/ui/` holds the primitives: `Section` (`tone`, `prompt` eyebrow), `Panel` (`variant="case"`), `Button` (a link with `href`, otherwise a submit button), `RankChip`, `Prompt`, `Tag`, `KeyValue`, `TerminalFrame`, `ArrowField`, `LogBars`, `Icon`, `Still` (Higgsfield stills, alt starting "Illustration:").
```

In the Design brief, after the bullet that begins `- One accent, \`--color-ember\``, add:

```markdown
- Errors and status never use ember: paper text with an ash `error:` prefix, and a 1px paper border on the invalid field.
```

After the Commands bullet for `pnpm build:og`, add:

```markdown
- The resume PDF and the social card are fingerprinted (`scripts/resume-source.mjs`, `scripts/og-source.mjs`). If `test/resumePdf.test.ts` or `test/ogCard.test.ts` says stale, run `pnpm build:pdf` or `pnpm build:og` and commit the result.
```

- [ ] **Step 4: Format and gate**

Run: `pnpm exec prettier --write docs/decisions/0002-axiom-design-system.md docs/superpowers/specs/2026-09-24-axiom-design-system-design.md CLAUDE.md && pnpm lint && pnpm check && pnpm test && pnpm build`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add docs/decisions/0002-axiom-design-system.md \
  docs/superpowers/specs/2026-09-24-axiom-design-system-design.md CLAUDE.md
git commit -m "docs: ADR 0002 (Axiom design system), spec amendments, CLAUDE.md for the finished redesign"
```

---

### Task 10: Verification, final baselines, sign-off

**Files:**

- Modify: `e2e/visual.spec.ts` (hero region shot), `e2e/__screenshots__/**`
- Modify (outside the repo): `~/vaults/personal/Projects/evilist.io.md`

- [ ] **Step 1: Add a hero region baseline**

The 1%-of-pixels tolerance on the full home shot let a headline re-wrap through in Phase 2. A shot of just the hero copy makes the same tolerance sensitive to it. In `e2e/visual.spec.ts`, inside `test.describe("visual regression @visual", …)` after the `for` loop over `pages`, add:

```ts
test("hero copy (catches headline re-wraps)", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".hero__copy")).toHaveScreenshot("hero-copy.png", {
    animations: "disabled",
    maxDiffPixelRatio: 0.01,
    threshold: 0.02,
  });
});
```

- [ ] **Step 2: Full gate**

Run: `pnpm lint && pnpm check && pnpm test && pnpm build && pnpm size`
Expected: all green. Initial JS on `/` about 8 KB; fonts about 42 KB.

- [ ] **Step 3: E2E**

Run: `pnpm test:e2e`
Expected: green on every project.

- [ ] **Step 4: Final baselines**

Run: `pnpm test:visual --update-snapshots=all`, then read the new images for desktop and iphone-15: `resume`, `notes`, `note`, `contact`, `home`, `now`, `hero-copy`, `journey-rank-c`, `journey-rank-e`. Confirm:

- the resume shows rank chips with key: value rows and iron dividers, and only the current role is S (ember);
- the notes list shows case panels with tags and `date:`/`read:` rows;
- the note page shows its `~/notes/…` prompt;
- the contact page shows the chip pair and carbon inputs;
- no page shows a doubled rule under the header.

Then run `pnpm test:visual` twice. Expected: 20 passed both times (per project: the seven pages `home`, `now`, `resume`, `contact`, `notes`, `note`, `not-found`, plus `journey-rank-c`, `journey-rank-e` and `hero-copy`; two projects).

- [ ] **Step 5: Browser check at four widths**

Serve the build on 4396 with the production env from Global Constraints. Use Playwright Chromium at 390×844, 430×932, 768×1024 and 1440×900, and real Chrome at whatever width the window allows (see CLAUDE.md). Check `/resume`, `/notes`, `/notes/ten-years-t1-to-architect` and `/contact`; at 390 also check `/contact` after submitting an empty recruiter form (the error state).

For each: no horizontal overflow, no console errors, the nav on one row from 768 up, and one rule under the header. Save screenshots under the plan's `.superpowers/sdd/…/shots/`. Emulate print on `/resume` at 1440 and screenshot it. Record the results in the ledger and stop the server.

- [ ] **Step 6: Lighthouse**

```bash
pnpm build && npx -y @lhci/cli@0.15.1 autorun --config=lighthouse/lighthouserc.cjs --upload.target=filesystem --upload.outputDir="$CLAUDE_JOB_DIR/tmp/lhci"
```

Expected: accessibility 1.0 and SEO 1.0 on all five URLs, performance ≥ 0.95, CLS ≤ 0.05. If `$CLAUDE_JOB_DIR` is unset, use `/tmp/lhci`.

- [ ] **Step 7: Vault log**

Append to `~/vaults/personal/Projects/evilist.io.md`, after the last entry under `## Build Log (2026)`:

```markdown
### 2026-09-24 — Axiom redesign, Phase 4 done (resume, notes, contact; redesign complete)

- **Shipped** on `feat/axiom-4-polish` (not merged):
  - The resume on the terminal primitives: a rank chip per role, `org:`/`dates:` rows and iron dividers. The PDF prints black on white with outlined chips.
  - Notes as case panels with tags and `date:`/`read:` rows; each note opens with its `~/notes/…` path, and its code blocks are on carbon.
  - Contact: a chip pair for the two forms, carbon inputs, and errors in paper with an `error:` prefix (the accent never marks status).
  - The old manga colour names are deleted, and a test keeps them out.
  - ADR 0002 records the design system.
- **Closed:** the minor notes from Phases 1–3 (list semantics, one topology description, a carbon mobile menu, 44px footer links, tablet journey text, bars that no longer flash, htop that stays sorted, a staleness check for the social card).
- **Checks:** fill in the real test counts, baselines and Lighthouse scores.
- **Next:** Marcus's sign-off and merge, then rebuild Phase 7 (container, HAProxy, VPS runbook, release pipeline).
```

Replace "fill in the real test counts, baselines and Lighthouse scores." with the measured numbers before saving.

- [ ] **Step 8: Commit and stop for sign-off**

Run: `pnpm check && pnpm test && pnpm build && pnpm exec prettier --check .`

```bash
git add e2e/visual.spec.ts e2e/__screenshots__
git commit -m "test: final Axiom baselines, plus a hero region shot"
git log --oneline main..HEAD
```

Report to Marcus: commits, test counts, Lighthouse scores, screenshots (four widths and the printed resume), and the rulings and deferred items. Do not merge or push.
