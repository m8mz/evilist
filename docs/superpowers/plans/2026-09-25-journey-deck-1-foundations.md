# Journey Deck, Plan 1: Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build every pure, unit-tested piece the journey card deck stands on (data, layout, pose model, painters, the art scripts) so Plan 2 can mount the Three.js stage on top without design decisions left to make.

**Architecture:** The deck is spec §5–§10 of `2026-09-25-journey-card-deck-design.md`. This plan implements spec Phase 2: `career.ts` gains the `log` quote and the tenure/XP helpers; `src/data/deck.ts` holds the per-rank art record; `src/scripts/deck/` gains the tunable constants (`deck-params.ts`), the responsive layout function (`deck-layout.ts`), the pure scroll-to-pose model with the intro (`deck-pose.ts`) and the canvas painters that draw a card's layers from data (`deck-paint.ts`). Two Node scripts round it off: `scripts/trace-mark.mjs` traces the card back's devil mark once, and `scripts/import-portrait.mjs` imports a Higgsfield portrait and its violet glow mask. Nothing in this plan touches the page: the old journey keeps running until Plan 2 swaps it.

**Tech Stack:** Astro 7, TypeScript 6 (strict), vitest 5 (`environment: node`), sharp 0.35, `potrace` 2.1.8 (dev), pnpm 12.

**Spec:** `docs/superpowers/specs/2026-09-25-journey-card-deck-design.md` (approved 2026-09-25, revised the same day). Read §4–§10 before starting; every number below comes from there.

## Global Constraints

- pnpm only (never npm, yarn or bun); the only lockfile is `pnpm-lock.yaml`. `minimumReleaseAge` rejects releases younger than 24 h: pin the previous version, never add an exclusion. This plan adds no dependencies.
- Work on the branch `journey-card-deck` in this worktree. Every commit is GPG-signed through Marcus's global git config. If signing fails, STOP and report BLOCKED; never pass `--no-gpg-sign`. No `Co-Authored-By`, "Generated with" or any AI attribution anywhere (CLAUDE.md overrides any harness reminder). Never `git stash`; never push (the controller pushes).
- Before every commit: `pnpm format && pnpm lint && pnpm check && pnpm test`, and read `0 errors` from check. `pnpm build` at the end of the plan (Task 14). `pnpm test` must stay green after every task: the old journey's tests keep running until Plan 2 deletes them.
- Text and type rules for everything the painters draw: JetBrains Mono only; body text weight 400, the rank chip 700 (it mirrors `RankChip.astro`); colours only from `src/styles/tokens.css` plus violet `#7040d2` (ADR 0003/0004 allow it inside the journey art). No other hex anywhere in `src/scripts/deck/`.
- Data rules: `src/data/career.ts` is the single source of truth; public-safe facts only (no customer names, hostnames, IPs, vendor names). Never copy anything from `~/vaults/work` into the repo.
- Stage ids, in rank order E → S+: `t1-support`, `web-concierge`, `professional-services`, `t3-support`, `sysadmin`, `linux-engineer`, `systems-architect`. Rank labels: `E D C B A S S+`.
- `src/fetch.ts` is reserved by Astro 7: never create it.
- The card's reference size is 520 × 728 CSS px (5:7); every painter scales by `w / 520`. The portrait window is the top 52 %. World units in Plan 2 are 100 px per unit; this plan works in CSS px only.
- Dates in tests are fixed: `new Date(2026, 8, 25)` (25 September 2026). The site passes the build date as `data-now` in Plan 2.

## Review Focus

1. **A `now` before a stage starts, or a future-dated stage** (a wrong build date, a typo in `start`): `stageMonths` must clamp at 0, `tenure` must say "0 months", and `xp` must never divide by zero or return NaN. Pinned in Task 2.
2. **Progress outside 0–1 or NaN** (Motion reports a hair over 1 at the track's end; the first callback fires before layout): `deckPose` must clamp, keep S+ presented at `p = 1` and E presented at `p < 0`, and never emit NaN in any pose. Pinned in Task 6.
3. **A card painted at the smallest size** (a 320 px tall card, 229 px wide): the status window's text must stay inside the card and above the footer for every stage, and no draw call may land outside the canvas. Pinned in Task 10.
4. **A portrait with violet nowhere, or everywhere** (an E render is right to have none; a bad S+ render may be all aura): the import must report the coverage and refuse a file outside the rank's band, naming both numbers. Pinned in Task 13.
5. **Extreme stage sizes** (2560 px wide, 400 px tall, a 320 px phone): the card never exceeds the column or the stage width, never drops under the minimum height, and the rack never overlaps the presented card. Pinned in Task 5.

## Deviations from the spec, decided while planning

- Portrait sources live in `src/images/deck/<stage-id>.webp` and `<stage-id>-glow.webp`, not `src/images/journey/<rank>.webp`: the old rank stills already occupy `src/images/journey/` until Phase 6 (a name collision would break `test/journeyArt.test.ts` mid-flight), and `S+` is a poor file name. `<rank>` in spec §9–§10 means the stage id in file names.
- The new scripts live in `src/scripts/deck/` (spec §9 already says so).
- The glow-mask coverage bands live in `src/data/deck-glow-bands.json`, imported by both `src/data/deck.ts` and the Node import script (Node cannot import the TS file).

## File structure

New:

- `src/data/deck-glow-bands.json` — per-stage allowed violet coverage, in percent.
- `src/data/deck.ts` — `DeckArt` per stage: outfit, eyes, eye colour, expression, posture, alt subject, glow band.
- `src/scripts/deck/deck-params.ts` — `DeckParams` and `DECK_PARAMS`: every tunable number with the spec's value.
- `src/scripts/deck/deck-layout.ts` — `deckLayout()`: stage size → card size, rack slots, presented anchor, floor.
- `src/scripts/deck/deck-pose.ts` — `deckPose()`: progress, tilt, hover, time, intro → seven card poses and the stage's energy.
- `src/scripts/deck/deck-paint.ts` — `cardModel()` and the painters: body, text (by line count), frame, chip, back, placeholder.
- `scripts/trace-mark.mjs` — traces `src/images/logo-devil.webp` to `src/images/devil-mark.svg` once.
- `scripts/import-portrait.mjs` — imports a portrait render: 1600 px WebP plus the 400 px violet glow mask, with the band check.
- `src/images/devil-mark.svg` — the card back's mark (built, committed).
- Tests: `test/helpers/fakeCanvas.ts`, `test/deck.test.ts`, `test/deckParams.test.ts`, `test/deckLayout.test.ts`, `test/deckPose.test.ts`, `test/deckPaint.test.ts`, `test/deckPalette.test.ts`, `test/traceMark.test.ts`, `test/importPortrait.test.ts`.

Modified: `src/data/career.ts` (the `log` field, five helpers), `test/career.test.ts`, `public/marcus-hancock-gaillard-resume.pdf` and `scripts/resume-pdf.source-sha256` (rebuilt because career.ts changed), `CLAUDE.md` (one bullet in "Where things live").

Coordinate conventions used by every module: CSS px, origin at the stage's top-left, y down; card positions are the card's **centre**; rotations in degrees; `z` in px toward the viewer; `pull ∈ [0, 1]` where 0 is racked and 1 is presented.

---

### Task 0: Install the worktree and confirm the baseline

**Files:** none changed.

- [ ] **Step 1: Install dependencies in the worktree**

Run: `pnpm install --frozen-lockfile`
Expected: completes without changing `pnpm-lock.yaml` (`git status --short` shows nothing).

- [ ] **Step 2: Confirm the suite is green before touching anything**

Run: `pnpm test`
Expected: all tests pass. If `test/resumePdf.test.ts` fails here, stop: the branch is already stale and the controller must sort it out before this plan starts.

No commit for this task.

---

### Task 1: The `log` quote on every stage

**Files:**

- Modify: `src/data/career.ts` (the `CareerStage` interface at lines 8–28, and each stage object)
- Modify: `test/career.test.ts`
- Rebuilt: `public/marcus-hancock-gaillard-resume.pdf`, `scripts/resume-pdf.source-sha256`

**Interfaces:**

- Produces: `CareerStage.log: string` (one line, under 80 characters, no trailing period rule: the painter draws it inside typographic quotes).

- [ ] **Step 1: Write the failing test**

Append to the `describe("career data", …)` block in `test/career.test.ts`:

```ts
it("gives every stage a one-line log quote under 80 characters (deck spec §4)", () => {
  for (const s of career) {
    expect(typeof s.log, s.id).toBe("string");
    expect(s.log.length, s.id).toBeGreaterThan(10);
    expect(s.log.length, s.id).toBeLessThan(80);
    expect(s.log, s.id).not.toMatch(/\n/);
  }
  expect(career.find((s) => s.id === "linux-engineer")!.log).toBe(
    "Replaced manual server setup with repeatable automation.",
  );
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm vitest run test/career.test.ts`
Expected: FAIL, `expected 'undefined' to be 'string'`.

- [ ] **Step 3: Add the field and the seven quotes**

In `src/data/career.ts`, add to the `CareerStage` interface, after `skills: string[];`:

```ts
/** One line the journey card prints under `$ log`. Drawn from the highlights; under 80 chars. */
log: string;
```

Then add a `log` line to each stage object (after `skills`), in rank order:

```ts
    log: "Traced lost mail through Splunk on live customer servers.",
```

```ts
    log: "Turned non-technical customers into confident site owners.",
```

```ts
    log: "Moved websites and mailboxes between servers, providers and brands.",
```

```ts
    log: "Closed the cases the other tiers couldn't.",
```

```ts
    log: "Kept a fleet of customer servers patched, hardened and running.",
```

```ts
    log: "Replaced manual server setup with repeatable automation.",
```

```ts
    log: "99.99 % uptime, two datacenters, BGP failover.",
```

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run test/career.test.ts`
Expected: PASS.

- [ ] **Step 5: Rebuild the resume PDF (its fingerprint covers career.ts)**

Run: `pnpm build:pdf`
Expected: `public/marcus-hancock-gaillard-resume.pdf` and `scripts/resume-pdf.source-sha256` change. Then `pnpm vitest run test/resumePdf.test.ts` passes.

- [ ] **Step 6: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test`
Expected: `0 errors` from check; all tests pass.

```bash
git add src/data/career.ts test/career.test.ts public/marcus-hancock-gaillard-resume.pdf scripts/resume-pdf.source-sha256
git commit -m "deck: every career stage carries a log quote"
```

---

### Task 2: Tenure, XP, set number and the acquired list

**Files:**

- Modify: `src/data/career.ts` (append after `currentStage()`)
- Modify: `test/career.test.ts`

**Interfaces:**

- Produces:
  - `stageMonths(stage: CareerStage, now: Date): number` — whole months from `start` to `end` (or to `now` for the open stage), never negative.
  - `tenure(stage: CareerStage, now: Date): string` — `"3 months"`, `"19 months"`, `"2 years"`, `"4 years, 10 months"`; under 24 months stays in months; singular units.
  - `xp(stage: CareerStage, now: Date): number` — cumulative months through this stage over the total of all stages, 0–1; the last stage is 1.
  - `xpBlocks(value: number, total = 10): number` — `Math.ceil(value × total)` clamped to `[0, total]`.
  - `setNumber(stage: CareerStage): string` — `"EVL-06/07"`.
  - `acquired(stage: CareerStage, cap = 8): string[]` — the first `cap` skills, plus `"+N"` when more remain.

- [ ] **Step 1: Write the failing tests**

Append to `test/career.test.ts` (extend the import at the top with `stageMonths, tenure, xp, xpBlocks, setNumber, acquired`):

```ts
const NOW = new Date(2026, 8, 25);
const stage = (id: string) => career.find((s) => s.id === id)!;

describe("stageMonths", () => {
  it("counts whole months from start to end, or to now for the open stage", () => {
    expect(stageMonths(stage("t1-support"), NOW)).toBe(3);
    expect(stageMonths(stage("linux-engineer"), NOW)).toBe(19);
    expect(stageMonths(stage("systems-architect"), NOW)).toBe(58);
  });

  it("never goes negative when now is before a stage starts", () => {
    expect(stageMonths(stage("systems-architect"), new Date(2020, 0, 1))).toBe(0);
  });
});

describe("tenure", () => {
  it("stays in months under two years, then speaks in years and months", () => {
    expect(tenure(stage("t1-support"), NOW)).toBe("3 months");
    expect(tenure(stage("linux-engineer"), NOW)).toBe("19 months");
    expect(tenure(stage("systems-architect"), NOW)).toBe("4 years, 10 months");
    expect(tenure(stage("systems-architect"), new Date(2023, 10, 1))).toBe("2 years");
    expect(tenure(stage("systems-architect"), new Date(2022, 11, 1))).toBe("13 months");
    expect(tenure(stage("systems-architect"), new Date(2021, 11, 1))).toBe("1 month");
    expect(tenure(stage("systems-architect"), new Date(2022, 10, 1))).toBe("12 months");
    expect(tenure(stage("systems-architect"), new Date(2024, 0, 1))).toBe("2 years, 2 months");
  });

  it("says 0 months rather than throwing when now is before the start", () => {
    expect(tenure(stage("systems-architect"), new Date(2020, 0, 1))).toBe("0 months");
  });
});

describe("xp", () => {
  it("is the cumulative share of all months worked, ending at 1", () => {
    // 3 + 5 + 7 + 5 + 18 + 19 + 58 = 115 months on 25 Sep 2026.
    expect(xp(stage("t1-support"), NOW)).toBeCloseTo(3 / 115, 6);
    expect(xp(stage("linux-engineer"), NOW)).toBeCloseTo(57 / 115, 6);
    expect(xp(stage("systems-architect"), NOW)).toBe(1);
  });

  it("is monotonic across the ladder", () => {
    const values = career.map((s) => xp(s, NOW));
    for (let i = 1; i < values.length; i++) expect(values[i]).toBeGreaterThan(values[i - 1]!);
  });

  it("never divides by zero", () => {
    const early = new Date(2000, 0, 1);
    for (const s of career) expect(Number.isFinite(xp(s, early)), s.id).toBe(true);
  });
});

describe("xpBlocks", () => {
  it("rounds up so every stage shows at least one block and S+ shows all ten", () => {
    expect(xpBlocks(3 / 115)).toBe(1);
    expect(xpBlocks(57 / 115)).toBe(5);
    expect(xpBlocks(1)).toBe(10);
    expect(xpBlocks(0)).toBe(0);
    expect(xpBlocks(1.2)).toBe(10);
    expect(xpBlocks(Number.NaN)).toBe(0);
  });
});

describe("setNumber", () => {
  it("numbers the cards EVL-nn/07", () => {
    expect(setNumber(stage("t1-support"))).toBe("EVL-01/07");
    expect(setNumber(stage("linux-engineer"))).toBe("EVL-06/07");
  });
});

describe("acquired", () => {
  it("lists every skill when there are eight or fewer", () => {
    expect(acquired(stage("t1-support"))).toEqual(["DNS", "Email", "Splunk", "cPanel"]);
    expect(acquired(stage("systems-architect"))).toHaveLength(8);
    expect(acquired(stage("systems-architect")).at(-1)).not.toMatch(/^\+/);
  });

  it("caps at eight and counts the rest", () => {
    const list = acquired(stage("linux-engineer"));
    expect(list).toHaveLength(9);
    expect(list.slice(0, 8)).toEqual(stage("linux-engineer").skills.slice(0, 8));
    expect(list.at(-1)).toBe("+6");
    expect(acquired(stage("linux-engineer"), 3)).toEqual(["Ansible", "Jenkins", "Linux", "+11"]);
  });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `pnpm vitest run test/career.test.ts`
Expected: FAIL, the new names are not exported.

- [ ] **Step 3: Implement the helpers**

Append to `src/data/career.ts`:

```ts
/* ---------- The journey deck's stats (deck spec §4) ---------- */

/** Months since year 0 of a "yyyy-mm" string. */
const monthIndex = (yyyyMm: string): number => {
  const [year, month] = yyyyMm.split("-").map(Number);
  return year! * 12 + (month! - 1);
};

const monthIndexOf = (date: Date): number => date.getFullYear() * 12 + date.getMonth();

/** Whole months from `start` to `end`, or to `now` while the stage is ongoing. Never negative. */
export function stageMonths(stage: CareerStage, now: Date): number {
  const end = stage.end ? monthIndex(stage.end) : monthIndexOf(now);
  return Math.max(0, end - monthIndex(stage.start));
}

const plural = (n: number, unit: string): string => `${n} ${unit}${n === 1 ? "" : "s"}`;

/** "3 months", "19 months", "2 years", "4 years, 10 months". Under 24 months stays in months. */
export function tenure(stage: CareerStage, now: Date): string {
  const months = stageMonths(stage, now);
  if (months < 24) return plural(months, "month");
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest ? `${plural(years, "year")}, ${plural(rest, "month")}` : plural(years, "year");
}

/** Cumulative months through this stage over all stages' months: the card's XP bar, 0–1. */
export function xp(stage: CareerStage, now: Date): number {
  const total = career.reduce((sum, s) => sum + stageMonths(s, now), 0);
  if (total === 0) return 0;
  const through = career
    .filter((s) => s.rank <= stage.rank)
    .reduce((sum, s) => sum + stageMonths(s, now), 0);
  return through / total;
}

/** How many of the XP bar's blocks are lit: rounded up, so every stage shows at least one. */
export function xpBlocks(value: number, total = 10): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(total, Math.max(0, Math.ceil(value * total)));
}

/** The card's set number, "EVL-06/07". */
export const setNumber = (stage: CareerStage): string =>
  `EVL-${String(stage.rank).padStart(2, "0")}/${String(career.length).padStart(2, "0")}`;

/** The skills the card lists: the first `cap`, then "+N" for the rest. */
export function acquired(stage: CareerStage, cap = 8): string[] {
  if (stage.skills.length <= cap) return [...stage.skills];
  return [...stage.skills.slice(0, cap), `+${stage.skills.length - cap}`];
}
```

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run test/career.test.ts`
Expected: PASS.

- [ ] **Step 5: Rebuild the PDF fingerprint (career.ts changed again)**

Run: `pnpm build:pdf && pnpm vitest run test/resumePdf.test.ts`
Expected: PASS.

- [ ] **Step 6: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test`

```bash
git add src/data/career.ts test/career.test.ts public/marcus-hancock-gaillard-resume.pdf scripts/resume-pdf.source-sha256
git commit -m "deck: tenure, xp, set number and acquired helpers on the career data"
```

---

### Task 3: The per-rank art record

**Files:**

- Create: `src/data/deck-glow-bands.json`
- Create: `src/data/deck.ts`
- Test: `test/deck.test.ts`

**Interfaces:**

- Produces:
  ```ts
  export interface DeckArt {
    id: string; // CareerStage.id
    rank: RankLabel;
    outfit: string;
    eyes: string;
    eyeColor: string; // hex, the violet ramp; placeholder eyes and the glow tint
    expression: string;
    posture: string;
    subject: string; // alt text is "Illustration: <subject>"
    glowBand: readonly [number, number]; // allowed violet coverage, percent
  }
  export const deckArt: readonly DeckArt[]; // rank order
  export const deckArtById: Readonly<Record<string, DeckArt>>;
  ```
- Consumes: `RankLabel`, `career` from `src/data/career.ts`.

- [ ] **Step 1: Write the failing test**

Create `test/deck.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { career } from "../src/data/career";
import { deckArt, deckArtById } from "../src/data/deck";

describe("deck art", () => {
  it("has one record per career stage, in rank order, with matching ranks", () => {
    expect(deckArt.map((a) => a.id)).toEqual(career.map((s) => s.id));
    expect(deckArt.map((a) => a.rank)).toEqual(career.map((s) => s.rankLabel));
    for (const a of deckArt) expect(deckArtById[a.id]).toBe(a);
  });

  it("describes outfit, eyes, expression and posture for every rank", () => {
    for (const a of deckArt) {
      for (const field of [a.outfit, a.eyes, a.expression, a.posture]) {
        expect(field.length, a.id).toBeGreaterThan(6);
      }
    }
  });

  it("gives every portrait an alt subject that does not repeat the 'Illustration:' prefix", () => {
    for (const a of deckArt) {
      expect(a.subject.length, a.id).toBeGreaterThan(20);
      expect(a.subject, a.id).not.toMatch(/^illustration/i);
      expect(a.subject, a.id).toMatch(/^the journey character at rank /);
    }
  });

  it("uses a hex eye colour from the violet ramp, brown at E and white-violet at S+", () => {
    for (const a of deckArt) expect(a.eyeColor, a.id).toMatch(/^#[0-9a-f]{6}$/);
    expect(deckArtById["t1-support"]!.eyeColor).toBe("#6b4a2f");
    expect(deckArtById["systems-architect"]!.eyeColor).toBe("#e6ddff");
  });

  it("carries ascending glow bands that match the JSON the import script reads", () => {
    const json = JSON.parse(readFileSync("src/data/deck-glow-bands.json", "utf8"));
    for (const a of deckArt) {
      expect(a.glowBand, a.id).toEqual(json[a.id]);
      expect(a.glowBand[0], a.id).toBeLessThan(a.glowBand[1]);
      expect(a.glowBand[0], a.id).toBeGreaterThanOrEqual(0);
      expect(a.glowBand[1], a.id).toBeLessThanOrEqual(100);
    }
    expect(deckArtById["t1-support"]!.glowBand).toEqual([0, 0.05]);
    expect(deckArtById["systems-architect"]!.glowBand).toEqual([1, 8]);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm vitest run test/deck.test.ts`
Expected: FAIL, cannot find module `../src/data/deck`.

- [ ] **Step 3: Write the JSON and the record**

Create `src/data/deck-glow-bands.json`:

```json
{
  "t1-support": [0, 0.05],
  "web-concierge": [0, 0.05],
  "professional-services": [0, 0.05],
  "t3-support": [0.05, 0.5],
  "sysadmin": [0.1, 1],
  "linux-engineer": [0.3, 2],
  "systems-architect": [1, 8]
}
```

Create `src/data/deck.ts`:

```ts
// The journey deck's art per career stage (deck spec §10): what each portrait shows, for the
// Higgsfield prompts, the timeline's alt text, the placeholder painter and the glow-mask import.
// Keyed by CareerStage.id, in rank order. The bands are the allowed violet coverage of a portrait
// in percent; scripts/import-portrait.mjs reads the same JSON.
import type { RankLabel } from "./career";
import bands from "./deck-glow-bands.json";

export interface DeckArt {
  id: string;
  rank: RankLabel;
  outfit: string;
  eyes: string;
  /** The violet ramp: the placeholder's eyes and the glow mask's tint. */
  eyeColor: string;
  expression: string;
  posture: string;
  /** What the portrait shows; the alt text becomes "Illustration: <subject>". */
  subject: string;
  /** Allowed violet coverage of the portrait, in percent (min, max). */
  glowBand: readonly [number, number];
}

const band = (id: string): readonly [number, number] => {
  const value = (bands as Record<string, [number, number]>)[id];
  if (!value) throw new Error(`deck-glow-bands.json has no band for ${id}`);
  return value;
};

export const deckArt: readonly DeckArt[] = [
  {
    id: "t1-support",
    rank: "E",
    outfit: "grey hoodie, headset around the neck, company lanyard",
    eyes: "wide, warm brown, no glow",
    eyeColor: "#6b4a2f",
    expression: "open, eager, a little anxious",
    posture: "shoulders slightly forward",
    subject:
      "the journey character at rank E, in a grey hoodie with a headset around his neck and a lanyard, wide warm brown eyes, shoulders slightly forward",
    glowBand: band("t1-support"),
  },
  {
    id: "web-concierge",
    rank: "D",
    outfit: "dark company polo, no headset, sleeves pushed up",
    eyes: "slightly narrower, a cold grey glint",
    eyeColor: "#7a8088",
    expression: "focused, the start of a smile",
    posture: "upright",
    subject:
      "the journey character at rank D, in a dark polo with the sleeves pushed up, narrowed eyes with a cold grey glint, the start of a smile",
    glowBand: band("web-concierge"),
  },
  {
    id: "professional-services",
    rank: "C",
    outfit: "black shirt, laptop-bag strap across the chest",
    eyes: "steel grey, alert",
    eyeColor: "#96a0aa",
    expression: "determined",
    posture: "head a touch down, eyes up",
    subject:
      "the journey character at rank C, in a black shirt with a laptop-bag strap across his chest, alert steel-grey eyes looking up from a lowered head",
    glowBand: band("professional-services"),
  },
  {
    id: "t3-support",
    rank: "B",
    outfit: "rolled sleeves, a coiled patch cable over one shoulder",
    eyes: "steel grey with a faint violet rim on the iris",
    eyeColor: "#8a7fb8",
    expression: "tired but sharp",
    posture: "jaw set",
    subject:
      "the journey character at rank B, sleeves rolled, a coiled patch cable over one shoulder, tired sharp eyes with a faint violet rim, jaw set",
    glowBand: band("t3-support"),
  },
  {
    id: "sysadmin",
    rank: "A",
    outfit: "fitted black technical shirt, rack keys on a carabiner",
    eyes: "violet iris, no glow",
    eyeColor: "#7040d2",
    expression: "quiet confidence",
    posture: "squared shoulders",
    subject:
      "the journey character at rank A, in a fitted black technical shirt with rack keys on a carabiner, violet eyes, squared shoulders",
    glowBand: band("sysadmin"),
  },
  {
    id: "linux-engineer",
    rank: "S",
    outfit: "dark technical coat, closed to the collar",
    eyes: "violet iris, glowing",
    eyeColor: "#9d7cf0",
    expression: "calm authority",
    posture: "chin level, slight three-quarter turn",
    subject:
      "the journey character at rank S, in a dark technical coat closed to the collar, glowing violet eyes, calm and level",
    glowBand: band("linux-engineer"),
  },
  {
    id: "systems-architect",
    rank: "S+",
    outfit: "the coat open, violet energy visible inside it and at the shoulders",
    eyes: "white-violet, the glow breaking past the lids",
    eyeColor: "#e6ddff",
    expression: "serene, unbothered",
    posture: "chin slightly up, energy rising",
    subject:
      "the journey character at rank S+, his coat open with violet energy rising inside it and at his shoulders, white-violet eyes glowing past the lids, chin slightly up",
    glowBand: band("systems-architect"),
  },
];

export const deckArtById: Readonly<Record<string, DeckArt>> = Object.fromEntries(
  deckArt.map((art) => [art.id, art]),
);
```

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run test/deck.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test`

```bash
git add src/data/deck-glow-bands.json src/data/deck.ts test/deck.test.ts
git commit -m "deck: the per-rank art record and glow bands"
```

---

### Task 4: The tunable constants

**Files:**

- Create: `src/scripts/deck/deck-params.ts`
- Test: `test/deckParams.test.ts`

**Interfaces:**

- Produces: `DeckParams` (the interface below), `DECK_PARAMS: DeckParams` (the live object the tuning panel edits in Plan 2) and `defaultDeckParams(): DeckParams` (a deep copy for tests). Every later module takes a params argument that defaults to `DECK_PARAMS`.

- [ ] **Step 1: Write the failing test**

Create `test/deckParams.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DECK_PARAMS, defaultDeckParams } from "../src/scripts/deck/deck-params";

describe("deck params", () => {
  it("start at the spec's values", () => {
    expect(DECK_PARAMS.scroll.tau).toBe(90);
    expect(DECK_PARAMS.pull.handoffStart).toBe(0.7);
    expect(DECK_PARAMS.pull.rackRotY).toBe(103);
    expect(DECK_PARAMS.pull.liftZ).toBe(60);
    expect(DECK_PARAMS.layout.cardHMin).toBe(320);
    expect(DECK_PARAMS.layout.cardHMax).toBe(560);
    expect(DECK_PARAMS.layout.columnMax).toBe(1200);
    expect(DECK_PARAMS.tilt.maxX).toBe(8);
    expect(DECK_PARAMS.tilt.maxY).toBe(10);
    expect(DECK_PARAMS.intro.dealMs).toBe(420);
    expect(DECK_PARAMS.print.stepMs).toBe(90);
    expect(DECK_PARAMS.camera.fov).toBe(26);
    expect(DECK_PARAMS.energy.sPlusRamp).toBe(0.75);
    expect(DECK_PARAMS.smoke.pool).toBe(140);
    expect(DECK_PARAMS.bloom.strength).toBe(0.9);
  });

  it("keeps the handoff inside a rank and the lift and eases positive", () => {
    const p = DECK_PARAMS;
    expect(p.pull.handoffStart).toBeGreaterThan(0);
    expect(p.pull.handoffStart).toBeLessThan(1);
    expect(p.pull.landedAt).toBeGreaterThan(p.pull.handoffStart);
    expect(p.pull.landedAt).toBeLessThan(1);
    expect(p.pull.overshoot).toBeGreaterThan(0);
    expect(p.layout.cardHMin).toBeLessThan(p.layout.cardHMax);
    expect(p.layout.cardHRatio).toBeGreaterThan(0);
    expect(p.layout.cardHRatio).toBeLessThan(1);
    expect(p.layout.columnFraction).toBeGreaterThan(0.5);
    expect(p.layout.columnFraction).toBeLessThan(1);
  });

  it("hands out independent copies", () => {
    const a = defaultDeckParams();
    a.scroll.tau = 1;
    expect(DECK_PARAMS.scroll.tau).toBe(90);
    expect(defaultDeckParams().scroll.tau).toBe(90);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm vitest run test/deckParams.test.ts`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Write the params**

Create `src/scripts/deck/deck-params.ts`:

```ts
// Every tunable number of the journey deck, at the spec's starting values (deck spec §5–§8).
// Plan 2's dev-only tuning panel edits DECK_PARAMS live; the final values get committed here.
// Units: CSS px for lengths (the stage maps 100 px to one world unit), degrees for angles,
// milliseconds for time, fractions of the card's width where a comment says so.

export interface LayoutParams {
  cardHMin: number;
  cardHMax: number;
  /** Card height as a fraction of the stage height, before the clamp. */
  cardHRatio: number;
  railH: number;
  pad: number;
  /** Rack slot spacing, a fraction of the card's width. */
  slotGap: number;
  /** How wide a racked back projects at rackRotY, a fraction of the card's width. */
  backProjection: number;
  /** Gap between the rack and the presented card, a fraction of the card's width. */
  gap: number;
  /** How far above the floor the presented card's bottom edge sits. */
  presentedLift: number;
  /** The floor line's distance below the racked cards' bottom edge. */
  floorOffset: number;
  /** Phone: the next card's near edge sits this far inside the stage's right edge. */
  phoneNextInset: number;
  phoneNextRotY: number;
  /** Phone: played cards exit to this centre x, a fraction of the card's width (negative). */
  phoneExitX: number;
  phoneExitRotY: number;
  columnFraction: number;
  columnMax: number;
}

export interface PullParams {
  /** The handoff to the next card starts at this fraction of a rank's scroll stretch. */
  handoffStart: number;
  /** A card counts as landed above this pull. */
  landedAt: number;
  /** The back-ease's overshoot constant (c1). */
  overshoot: number;
  /** The presented card's z, and the peak of the extra lift during the pull. */
  liftZ: number;
  liftPeak: number;
  scalePeak: number;
  rackRotY: number;
}

export interface DeckParams {
  scroll: { tau: number };
  layout: LayoutParams;
  pull: PullParams;
  tilt: { maxX: number; maxY: number; tau: number };
  float: {
    fadeInMs: number;
    y: { amp: number; periodMs: number };
    rotZ: { amp: number; periodMs: number };
    rotY: { amp: number; periodMs: number };
    rotX: { amp: number; periodMs: number };
  };
  hover: { z: number; y: number; inMs: number; outMs: number };
  intro: {
    dealMs: number;
    staggerMs: number;
    holdMs: number;
    pullMs: number;
    floorMs: number;
    fastForward: number;
    /** How far off-stage the cards start, a fraction of the card's width. */
    entryOffset: number;
  };
  print: { stepMs: number; eyesMs: number; landingMs: number; cursorMs: number };
  camera: { fov: number; parallax: number; parallaxTau: number };
  energy: { s: number; sPlusBase: number; sPlusRamp: number; sPlusWindow: number; pulling: number };
  light: {
    ambient: number;
    key: number;
    rim: number;
    pointS: number;
    pointSPlus: number;
    breath: number;
    breathMs: number;
    flareSPlus: number;
    flareS: number;
    flareMs: number;
  };
  material: {
    roughness: number;
    metalness: number;
    clearcoat: number;
    clearcoatRoughness: number;
    envMapIntensity: number;
    sheen: number;
    sheenRoughness: number;
    edgeRoughness: number;
    edgeMetalness: number;
    thickness: number;
    cornerRadius: number;
    layerZ: { glow: number; frame: number; text: number; chip: number };
  };
  smoke: {
    pool: number;
    poolMid: number;
    rateS: number;
    rateSPlusBase: number;
    rateSPlusRamp: number;
    burstSPlus: number;
    burstS: number;
    opacityMin: number;
    opacityMax: number;
    sideSpeed: number;
  };
  fog: {
    strengthS: number;
    strengthSPlus: number;
    radiusS: number;
    radiusSPlusBase: number;
    radiusSPlusRamp: number;
    kick: number;
    kickMs: number;
  };
  glow: { scaleS: number; scaleSPlusBase: number; scaleSPlusRamp: number; flareScale: number };
  seam: { sMin: number; sMax: number; sPlusMin: number; sPlusMax: number; periodMs: number };
  shadow: { widthFactor: number; heightFactor: number; opacity: number; liftFade: number };
  bloom: { strength: number; radius: number; threshold: number };
  tiers: { dprHigh: number; dprMid: number; disposeAfterMs: number };
}

export function defaultDeckParams(): DeckParams {
  return {
    scroll: { tau: 90 },
    layout: {
      cardHMin: 320,
      cardHMax: 560,
      cardHRatio: 0.62,
      railH: 88,
      pad: 24,
      slotGap: 0.14,
      backProjection: 0.22,
      gap: 0.3,
      presentedLift: 30,
      floorOffset: 8,
      phoneNextInset: 24,
      phoneNextRotY: -80,
      phoneExitX: -0.6,
      phoneExitRotY: 70,
      columnFraction: 0.78,
      columnMax: 1200,
    },
    pull: {
      handoffStart: 0.7,
      landedAt: 0.985,
      overshoot: 1.3,
      liftZ: 60,
      liftPeak: 1.6,
      scalePeak: 0.06,
      rackRotY: 103,
    },
    tilt: { maxX: 8, maxY: 10, tau: 120 },
    float: {
      fadeInMs: 1500,
      y: { amp: 4, periodMs: 4200 },
      rotZ: { amp: 0.6, periodMs: 6100 },
      rotY: { amp: 1.2, periodMs: 5300 },
      rotX: { amp: 0.8, periodMs: 4700 },
    },
    hover: { z: 6, y: 3, inMs: 150, outMs: 250 },
    intro: {
      dealMs: 420,
      staggerMs: 55,
      holdMs: 200,
      pullMs: 700,
      floorMs: 500,
      fastForward: 4,
      entryOffset: 2.2,
    },
    print: { stepMs: 90, eyesMs: 500, landingMs: 700, cursorMs: 1000 },
    camera: { fov: 26, parallax: 0.15, parallaxTau: 200 },
    energy: { s: 0.3, sPlusBase: 0.25, sPlusRamp: 0.75, sPlusWindow: 0.7, pulling: 0.15 },
    light: {
      ambient: 0.35,
      key: 2.2,
      rim: 0.8,
      pointS: 16,
      pointSPlus: 55,
      breath: 0.15,
      breathMs: 3000,
      flareSPlus: 3,
      flareS: 1.6,
      flareMs: 400,
    },
    material: {
      roughness: 0.35,
      metalness: 0,
      clearcoat: 0.6,
      clearcoatRoughness: 0.25,
      envMapIntensity: 0.5,
      sheen: 1,
      sheenRoughness: 0.5,
      edgeRoughness: 0.6,
      edgeMetalness: 0.2,
      thickness: 6,
      cornerRadius: 2,
      layerZ: { glow: 0.2, frame: 1.4, text: 2.6, chip: 4 },
    },
    smoke: {
      pool: 140,
      poolMid: 70,
      rateS: 0.35,
      rateSPlusBase: 1.2,
      rateSPlusRamp: 4,
      burstSPlus: 30,
      burstS: 12,
      opacityMin: 0.1,
      opacityMax: 0.22,
      sideSpeed: 1.5,
    },
    fog: {
      strengthS: 0.1,
      strengthSPlus: 0.35,
      radiusS: 1.0,
      radiusSPlusBase: 1.2,
      radiusSPlusRamp: 2.4,
      kick: 0.5,
      kickMs: 600,
    },
    glow: { scaleS: 4.2, scaleSPlusBase: 7, scaleSPlusRamp: 9, flareScale: 1.4 },
    seam: { sMin: 0.1, sMax: 0.25, sPlusMin: 0.2, sPlusMax: 0.5, periodMs: 3200 },
    shadow: { widthFactor: 1.15, heightFactor: 0.35, opacity: 0.55, liftFade: 0.5 },
    bloom: { strength: 0.9, radius: 0.6, threshold: 0 },
    tiers: { dprHigh: 2, dprMid: 1.5, disposeAfterMs: 30_000 },
  };
}

/** The live parameters. Modules read this by default; the tuning panel mutates it in place. */
export const DECK_PARAMS: DeckParams = defaultDeckParams();
```

Note `material.layerZ` is in px (0.2 px = 0.002 world units, and so on) and `material.thickness` and `cornerRadius` are px too: 100 px per unit keeps every length in one system.

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run test/deckParams.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test`

```bash
git add src/scripts/deck/deck-params.ts test/deckParams.test.ts
git commit -m "deck: the tunable parameters at the spec's values"
```

---

### Task 5: The layout function

**Files:**

- Create: `src/scripts/deck/deck-layout.ts`
- Test: `test/deckLayout.test.ts`

**Interfaces:**

- Produces:
  ```ts
  export type DeckMode = "desktop" | "phone";
  export interface Point {
    x: number;
    y: number;
  }
  export interface LayoutInput {
    stageW: number;
    stageH: number;
    columnLeft: number;
    columnW: number;
    mode: DeckMode;
    count?: number;
  }
  export interface DeckLayout {
    mode: DeckMode;
    cardW: number;
    cardH: number;
    slots: Point[]; // desktop: the rack slots' centres, index = rank; phone: []
    presented: Point; // the presented card's centre
    next: Point | null; // phone: where the next card waits (centre)
    exit: Point | null; // phone: where played cards go (centre)
    baseY: number; // the presented card's bottom edge
    floorY: number; // the floor line
  }
  export const CARD_ASPECT = 5 / 7;
  export function deckLayout(input: LayoutInput, params?: LayoutParams): DeckLayout;
  export function columnFor(stageW: number, params?: LayoutParams): { left: number; width: number };
  ```
- Consumes: `LayoutParams`, `DECK_PARAMS` from Task 4.

- [ ] **Step 1: Write the failing test**

Create `test/deckLayout.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CARD_ASPECT, columnFor, deckLayout } from "../src/scripts/deck/deck-layout";

const HEADER = 64;
const desktop = (width: number, height: number) => {
  const column = columnFor(width);
  return deckLayout({
    stageW: width,
    stageH: height - HEADER,
    columnLeft: column.left,
    columnW: column.width,
    mode: "desktop",
  });
};
const phone = (width: number, height: number) =>
  deckLayout({
    stageW: width,
    stageH: height - HEADER,
    columnLeft: 0,
    columnW: width,
    mode: "phone",
  });

describe("columnFor", () => {
  it("is 78% of the stage, capped at 1200 px, centred", () => {
    expect(columnFor(1440).width).toBeCloseTo(1123.2, 6);
    expect(columnFor(1440).left).toBeCloseTo((1440 - 1123.2) / 2, 6);
    expect(columnFor(2560)).toEqual({ left: 680, width: 1200 });
  });
});

describe("deckLayout on desktop", () => {
  it("sizes the card at 62% of the stage height on a 1440 × 900 window", () => {
    const l = desktop(1440, 900);
    expect(l.cardH).toBeCloseTo(0.62 * 836, 5);
    expect(l.cardW).toBeCloseTo(l.cardH * CARD_ASPECT, 5);
    expect(l.slots).toHaveLength(7);
  });

  it("centres the rack-gap-card composition in the column and keeps it inside", () => {
    const l = desktop(1440, 900);
    const column = columnFor(1440);
    const compositionLeft = l.slots[0]!.x - 0.11 * l.cardW;
    const compositionRight = l.presented.x + l.cardW / 2;
    expect(compositionLeft - column.left).toBeCloseTo(
      column.left + column.width - compositionRight,
      5,
    );
    expect(compositionLeft).toBeGreaterThan(column.left);
    expect(compositionRight).toBeLessThan(column.left + column.width);
  });

  it("spaces the slots at 14% of the card width and never lets the rack touch the card", () => {
    const l = desktop(1440, 900);
    for (let i = 1; i < 7; i++) {
      expect(l.slots[i]!.x - l.slots[i - 1]!.x).toBeCloseTo(0.14 * l.cardW, 5);
    }
    const rackRight = l.slots[6]!.x + 0.11 * l.cardW;
    expect(l.presented.x - l.cardW / 2 - rackRight).toBeCloseTo(0.3 * l.cardW, 5);
  });

  it("puts the presented card above the rail and the rack 30 px lower on the floor", () => {
    const l = desktop(1440, 900);
    const stageH = 836;
    expect(l.baseY).toBeCloseTo((stageH - 88) / 2 + l.cardH / 2, 5);
    expect(l.presented.y).toBeCloseTo(l.baseY - l.cardH / 2, 5);
    expect(l.slots[0]!.y).toBeCloseTo(l.baseY + 30 - l.cardH / 2, 5);
    expect(l.floorY).toBeCloseTo(l.baseY + 30 + 8, 5);
    expect(l.floorY).toBeLessThan(stageH - 88);
  });

  it("shrinks the card so the composition fits a narrow column", () => {
    const l = desktop(1024, 700);
    const column = columnFor(1024);
    expect(l.cardW).toBeLessThanOrEqual(column.width / 2.36 + 1e-6);
    expect(l.presented.x + l.cardW / 2).toBeLessThanOrEqual(column.left + column.width + 1e-6);
  });

  it("caps the card at 560 px tall on very large windows", () => {
    const l = desktop(2560, 1300);
    expect(l.cardH).toBe(560);
    expect(l.cardW).toBeCloseTo(400, 5);
  });

  it("never drops under 320 px tall, even on a 400 px stage", () => {
    const l = desktop(960, 400 + HEADER);
    expect(l.cardH).toBe(320);
  });
});

describe("deckLayout on phones", () => {
  it("fits the card inside a 390 px stage with 24 px margins and centres it", () => {
    const l = phone(390, 844);
    expect(l.cardW).toBe(390 - 48);
    expect(l.cardH).toBeCloseTo(342 / CARD_ASPECT, 5);
    expect(l.presented.x).toBe(195);
    expect(l.slots).toEqual([]);
  });

  it("parks the next card 24 px inside the right edge and played cards off the left", () => {
    const l = phone(390, 844);
    expect(l.next!.x).toBeCloseTo(390 - 24 + l.cardW / 2, 5);
    expect(l.exit!.x).toBeCloseTo(-0.6 * l.cardW, 5);
    expect(l.next!.y).toBe(l.exit!.y);
    expect(l.next!.y).toBeCloseTo(l.presented.y + 30, 5);
  });

  it("lets the width rule win on a tall 430 px phone", () => {
    const l = phone(430, 932);
    expect(l.cardW).toBe(430 - 48);
    expect(l.cardH).toBeCloseTo(382 / CARD_ASPECT, 5);
  });

  it("uses the height rule when the width is not the limit", () => {
    const l = phone(430, 700);
    expect(l.cardH).toBeCloseTo(0.62 * (700 - HEADER), 5);
    expect(l.cardW).toBeLessThanOrEqual(430 - 48);
  });

  it("keeps the minimum height on a small 320 px phone, inside the width", () => {
    const l = phone(320, 568);
    expect(l.cardH).toBe(320);
    expect(l.cardW).toBeLessThanOrEqual(320 - 48);
    expect(Number.isFinite(l.floorY)).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm vitest run test/deckLayout.test.ts`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Implement the layout**

Create `src/scripts/deck/deck-layout.ts`:

```ts
// Where the deck's cards sit for a given stage size (deck spec §6). Pure: CSS px in, CSS px out,
// origin at the stage's top-left, y down, every position a card's centre. The stage converts to
// world units; the pose model (deck-pose.ts) moves cards between these anchors.
import { DECK_PARAMS, type LayoutParams } from "./deck-params";

export type DeckMode = "desktop" | "phone";

export interface Point {
  x: number;
  y: number;
}

export interface LayoutInput {
  stageW: number;
  stageH: number;
  columnLeft: number;
  columnW: number;
  mode: DeckMode;
  /** How many cards; seven ranks. */
  count?: number;
}

export interface DeckLayout {
  mode: DeckMode;
  cardW: number;
  cardH: number;
  /** Desktop: the rack slots' centres, one per rank. Phone: empty. */
  slots: Point[];
  presented: Point;
  /** Phone: where the next card waits, and where played cards go. */
  next: Point | null;
  exit: Point | null;
  /** The presented card's bottom edge and the floor line under the rack. */
  baseY: number;
  floorY: number;
}

export const CARD_ASPECT = 5 / 7;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The deck column: 78% of the stage, at most 1200 px, centred. */
export function columnFor(
  stageW: number,
  params: LayoutParams = DECK_PARAMS.layout,
): { left: number; width: number } {
  const width = Math.min(stageW * params.columnFraction, params.columnMax);
  return { left: (stageW - width) / 2, width };
}

export function deckLayout(
  input: LayoutInput,
  params: LayoutParams = DECK_PARAMS.layout,
): DeckLayout {
  const { stageW, stageH, columnLeft, columnW, mode } = input;
  const count = input.count ?? 7;
  const p = params;

  let cardH = clamp(p.cardHRatio * stageH, p.cardHMin, p.cardHMax);
  let cardW = cardH * CARD_ASPECT;
  // The desktop composition, in card widths: six gaps, one projected back, the gap, the card.
  const compositionUnits = (count - 1) * p.slotGap + p.backProjection + p.gap + 1;
  const maxW = mode === "desktop" ? columnW / compositionUnits : stageW - 2 * p.pad;
  if (cardW > maxW) {
    cardW = Math.max(1, maxW);
    cardH = cardW / CARD_ASPECT;
  }

  const baseY = (stageH - p.railH) / 2 + cardH / 2;
  const rackBottom = baseY + p.presentedLift;
  const floorY = rackBottom + p.floorOffset;
  const rackY = rackBottom - cardH / 2;
  const presentedY = baseY - cardH / 2;

  if (mode === "desktop") {
    const slotGap = p.slotGap * cardW;
    const backW = p.backProjection * cardW;
    const rackW = (count - 1) * slotGap + backW;
    const gap = p.gap * cardW;
    const rackX0 = columnLeft + (columnW - (rackW + gap + cardW)) / 2;
    const slots = Array.from({ length: count }, (_, i) => ({
      x: rackX0 + backW / 2 + i * slotGap,
      y: rackY,
    }));
    return {
      mode,
      cardW,
      cardH,
      slots,
      presented: { x: rackX0 + rackW + gap + cardW / 2, y: presentedY },
      next: null,
      exit: null,
      baseY,
      floorY,
    };
  }

  return {
    mode,
    cardW,
    cardH,
    slots: [],
    presented: { x: stageW / 2, y: presentedY },
    next: { x: stageW - p.phoneNextInset + cardW / 2, y: rackY },
    exit: { x: p.phoneExitX * cardW, y: rackY },
    baseY,
    floorY,
  };
}
```

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run test/deckLayout.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test`

```bash
git add src/scripts/deck/deck-layout.ts test/deckLayout.test.ts
git commit -m "deck: the responsive layout function"
```

---

### Task 6: The pose model, part 1: progress, pulls, phases and energy

**Files:**

- Create: `src/scripts/deck/deck-pose.ts`
- Test: `test/deckPose.test.ts`

**Interfaces:**

- Produces (this task):
  ```ts
  export const clamp01: (v: number) => number; // NaN → 0
  export const easeInOutCubic: (t: number) => number;
  export const easeOutCubic: (t: number) => number;
  export function backOut(t: number, overshoot: number): number; // passes 1, settles back
  export interface Pulls {
    active: number;
    within: number;
    k: number;
    pull: number[];
  }
  export function pullsFor(p: number, count: number, handoffStart?: number): Pulls;
  export type CardPhase = "racked" | "pulling" | "landing" | "presented" | "leaving";
  export interface Energy {
    energy: number;
    kind: "S" | "S+" | null;
    index: number | null;
  }
  export function energyFor(
    pulls: Pulls,
    labels: readonly RankLabel[],
    landedAt: number,
    params?: DeckParams,
  ): Energy;
  ```
- Consumes: `DeckParams`, `DECK_PARAMS` (Task 4); `RankLabel` (career.ts).

- [ ] **Step 1: Write the failing tests**

Create `test/deckPose.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { RankLabel } from "../src/data/career";
import {
  backOut,
  clamp01,
  easeInOutCubic,
  energyFor,
  pullsFor,
} from "../src/scripts/deck/deck-pose";

const LABELS: RankLabel[] = ["E", "D", "C", "B", "A", "S", "S+"];
/** Progress at fraction `local` of rank `i`'s stretch, for seven ranks. */
const at = (i: number, local: number) => (i + local) / 7;

describe("clamp01 and the eases", () => {
  it("clamps and turns NaN into 0", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(1.4)).toBe(1);
    expect(clamp01(Number.NaN)).toBe(0);
    expect(clamp01(0.25)).toBe(0.25);
  });

  it("eases start at 0 and end at 1; the back-ease overshoots on the way in", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 6);
    expect(backOut(0, 1.3)).toBeCloseTo(0, 6);
    expect(backOut(1, 1.3)).toBeCloseTo(1, 6);
    expect(backOut(0.8, 1.3)).toBeGreaterThan(1);
  });
});

describe("pullsFor", () => {
  it("presents the active rank alone outside the handoff window", () => {
    const r = pullsFor(at(3, 0.5), 7);
    expect(r.active).toBe(3);
    expect(r.within).toBeCloseTo(0.5, 6);
    expect(r.k).toBe(0);
    expect(r.pull).toEqual([0, 0, 0, 1, 0, 0, 0]);
  });

  it("hands off during the last 30% of a rank, cubic in-out", () => {
    const start = pullsFor(at(0, 0.7), 7);
    expect(start.k).toBeCloseTo(0, 6);
    const half = pullsFor(at(0, 0.85), 7);
    expect(half.k).toBeCloseTo(0.5, 6);
    expect(half.pull[0]).toBeCloseTo(0.5, 6);
    expect(half.pull[1]).toBeCloseTo(0.5, 6);
    const quarter = pullsFor(at(0, 0.775), 7);
    expect(quarter.pull[1]).toBeCloseTo(easeInOutCubic(0.25), 6);
    expect(quarter.pull[0]).toBeCloseTo(1 - easeInOutCubic(0.25), 6);
  });

  it("is continuous across the rank boundary", () => {
    const before = pullsFor(at(1, 0) - 1e-9, 7);
    const after = pullsFor(at(1, 0), 7);
    expect(before.pull[1]).toBeCloseTo(1, 4);
    expect(after.pull[1]).toBe(1);
    expect(before.pull[0]).toBeCloseTo(0, 4);
  });

  it("keeps E presented at the top and S+ presented at the end", () => {
    expect(pullsFor(0, 7).pull[0]).toBe(1);
    expect(pullsFor(-0.5, 7).pull[0]).toBe(1);
    expect(pullsFor(at(6, 0.9), 7).pull[6]).toBe(1);
    expect(pullsFor(1, 7).pull[6]).toBe(1);
    expect(pullsFor(1.3, 7).pull[6]).toBe(1);
    expect(pullsFor(Number.NaN, 7).pull[0]).toBe(1);
  });
});

describe("energyFor", () => {
  const now = 10_000;
  it("is zero through rank A", () => {
    for (const i of [0, 1, 2, 3, 4]) {
      expect(energyFor(pullsFor(at(i, 0.5), 7), LABELS, now)).toEqual({
        energy: 0,
        kind: null,
        index: null,
      });
    }
  });

  it("breathes at 0.3 while S is presented and grows through S+", () => {
    expect(energyFor(pullsFor(at(5, 0.5), 7), LABELS, now)).toEqual({
      energy: 0.3,
      kind: "S",
      index: 5,
    });
    const early = energyFor(pullsFor(at(6, 0), 7), LABELS, now);
    expect(early.kind).toBe("S+");
    expect(early.energy).toBeCloseTo(0.25, 6);
    const mid = energyFor(pullsFor(at(6, 0.35), 7), LABELS, now);
    expect(mid.energy).toBeCloseTo(0.25 + 0.75 * 0.5, 6);
    const late = energyFor(pullsFor(at(6, 0.9), 7), LABELS, now);
    expect(late.energy).toBeCloseTo(1, 6);
  });

  it("scales with the pull while S is arriving, and follows the larger pull in the S → S+ handoff", () => {
    const arriving = energyFor(pullsFor(at(4, 0.85), 7), LABELS, now); // S at pull 0.5
    expect(arriving.kind).toBe("S");
    expect(arriving.energy).toBeCloseTo(0.15 * 0.5, 6);
    const leavingS = energyFor(pullsFor(at(5, 0.775), 7), LABELS, now); // S 0.84, S+ 0.16
    expect(leavingS.kind).toBe("S");
    expect(leavingS.index).toBe(5);
    const arrivingSPlus = energyFor(pullsFor(at(5, 0.925), 7), LABELS, now); // S 0.16, S+ 0.84
    expect(arrivingSPlus.kind).toBe("S+");
    expect(arrivingSPlus.index).toBe(6);
    expect(arrivingSPlus.energy).toBeCloseTo(0.15 * easeInOutCubic(0.75), 6);
  });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `pnpm vitest run test/deckPose.test.ts`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Write part 1 of the pose model**

Create `src/scripts/deck/deck-pose.ts`:

```ts
// The deck's pose model (deck spec §7): pure functions from scroll progress, pointer tilt, hover,
// the clock and the intro to seven card poses and the stage's energy. No DOM, no Three. The stage
// (Plan 2) converts px to world units and drives the meshes; tests pin every curve here.
import type { RankLabel } from "../../data/career";
import type { DeckLayout, Point } from "./deck-layout";
import { DECK_PARAMS, type DeckParams } from "./deck-params";

export const clamp01 = (v: number): number =>
  Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;

export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

export const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

/** Ease-out that passes 1 and settles back; `overshoot` is the back-ease's c1 constant. */
export function backOut(t: number, overshoot: number): number {
  const c1 = overshoot;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

export interface Pulls {
  active: number;
  within: number;
  /** Handoff progress, 0 outside the window. */
  k: number;
  /** Per card: 0 racked, 1 presented. */
  pull: number[];
}

/** Which card is out, and how far the next one is on its way (spec §7). */
export function pullsFor(
  p: number,
  count: number,
  handoffStart: number = DECK_PARAMS.pull.handoffStart,
): Pulls {
  const f = clamp01(p) * count;
  const active = Math.min(count - 1, Math.floor(f));
  const within = f - active;
  const k =
    active < count - 1 && within > handoffStart
      ? clamp01((within - handoffStart) / (1 - handoffStart))
      : 0;
  const pull = new Array<number>(count).fill(0);
  pull[active] = 1 - easeInOutCubic(k);
  if (active + 1 < count) pull[active + 1] = easeInOutCubic(k);
  return { active, within, k, pull };
}

export type CardPhase = "racked" | "pulling" | "landing" | "presented" | "leaving";

export interface Energy {
  energy: number;
  kind: "S" | "S+" | null;
  /** The card the energy belongs to (the light and the smoke follow it). */
  index: number | null;
}

/** The stage's energy: S breathes, S+ grows with its rank; during a handoff the larger pull wins. */
export function energyFor(
  pulls: Pulls,
  labels: readonly RankLabel[],
  landedAt: number = DECK_PARAMS.pull.landedAt,
  params: DeckParams = DECK_PARAMS,
): Energy {
  const E = params.energy;
  let best = -1;
  const out: Energy = { energy: 0, kind: null, index: null };
  labels.forEach((label, i) => {
    if (label !== "S" && label !== "S+") return;
    const pull = pulls.pull[i] ?? 0;
    if (pull <= 0 || pull <= best) return;
    best = pull;
    const landed = pull > landedAt;
    let energy: number;
    if (!landed) energy = E.pulling * pull;
    else if (label === "S") energy = E.s;
    else energy = E.sPlusBase + E.sPlusRamp * Math.min(1, pulls.within / E.sPlusWindow);
    out.energy = energy;
    out.kind = label;
    out.index = i;
  });
  return out;
}

// Part 2 (poses, tilt, hover, float) and part 3 (the intro) follow in the next tasks.
export type { DeckLayout, Point };
```

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run test/deckPose.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test`

```bash
git add src/scripts/deck/deck-pose.ts test/deckPose.test.ts
git commit -m "deck: pulls, handoff and energy in the pose model"
```

---

### Task 7: The pose model, part 2: poses, tilt, hover and float

**Files:**

- Modify: `src/scripts/deck/deck-pose.ts`
- Modify: `test/deckPose.test.ts`

**Interfaces:**

- Produces:

  ```ts
  export interface CardPose {
    x: number;
    y: number;
    z: number; // px; centre; z toward the viewer
    rotX: number;
    rotY: number;
    rotZ: number; // degrees
    scale: number;
    opacity: number;
    pull: number;
    landed: boolean;
    phase: CardPhase;
  }
  export interface PoseInput {
    p: number;
    labels: readonly RankLabel[];
    layout: DeckLayout;
    tilt: { x: number; y: number }; // degrees, already smoothed by the caller
    hover: readonly number[]; // 0–1 per card, already smoothed
    time: number; // ms, a monotonic clock
    landedAt: readonly (number | null)[]; // ms when each card last landed; null if racked
    intro: IntroState | null; // Task 8; null here
  }
  export interface StagePose {
    cards: CardPose[];
    active: number;
    within: number;
    energy: number;
    kind: "S" | "S+" | null;
    energyIndex: number | null;
    intro: IntroPose | null;
  }
  export function deckPose(input: PoseInput, params?: DeckParams): StagePose;
  ```

  Rules the caller (Plan 2) follows: it keeps `landedAt[i]`, setting it to `time` when a card's `landed` flips from false to true and to `null` when it flips back; it smooths `tilt` and `hover` itself.

- [ ] **Step 1: Write the failing tests**

Append to `test/deckPose.test.ts` (extend the import with `deckPose, type PoseInput` and add `import { columnFor, deckLayout } from "../src/scripts/deck/deck-layout";`):

```ts
const column = columnFor(1440);
const desktopLayout = deckLayout({
  stageW: 1440,
  stageH: 836,
  columnLeft: column.left,
  columnW: column.width,
  mode: "desktop",
});
const phoneLayout = deckLayout({
  stageW: 390,
  stageH: 780,
  columnLeft: 0,
  columnW: 390,
  mode: "phone",
});
const none = [null, null, null, null, null, null, null];
const input = (over: Partial<PoseInput>): PoseInput => ({
  p: 0,
  labels: LABELS,
  layout: desktopLayout,
  tilt: { x: 0, y: 0 },
  hover: [0, 0, 0, 0, 0, 0, 0],
  time: 0,
  landedAt: none,
  intro: null,
  ...over,
});

const finite = (value: unknown): void => {
  if (typeof value === "number") expect(Number.isFinite(value)).toBe(true);
  else if (Array.isArray(value)) value.forEach(finite);
  else if (value && typeof value === "object") Object.values(value).forEach(finite);
};

describe("deckPose on desktop", () => {
  it("racks every card but the presented one, backs to the viewer at 103°", () => {
    const s = deckPose(input({ p: at(3, 0.5) }));
    expect(s.active).toBe(3);
    for (const i of [0, 1, 2, 4, 5, 6]) {
      const c = s.cards[i]!;
      expect(c.phase).toBe("racked");
      expect(c.x).toBe(desktopLayout.slots[i]!.x);
      expect(c.y).toBe(desktopLayout.slots[i]!.y);
      expect(c.z).toBe(0);
      expect(c.rotY).toBe(103);
      expect(c.scale).toBe(1);
      expect(c.opacity).toBe(1);
    }
  });

  it("presents the active card flat, lifted 60 px toward the viewer, at the presented anchor", () => {
    const c = deckPose(input({ p: at(3, 0.5) })).cards[3]!;
    expect(c.landed).toBe(true);
    expect(c.phase).toBe("presented");
    expect(c.x).toBeCloseTo(desktopLayout.presented.x, 6);
    expect(c.y).toBeCloseTo(desktopLayout.presented.y, 6);
    expect(c.z).toBeCloseTo(60, 6);
    expect(c.rotY).toBeCloseTo(0, 6);
    expect(c.rotX).toBe(0);
    expect(c.scale).toBeCloseTo(1, 6);
  });

  it("moves the incoming card along the pull curve and swings it past flat", () => {
    const half = deckPose(input({ p: at(0, 0.85) })); // pull 0.5 each
    const inc = half.cards[1]!;
    const out = half.cards[0]!;
    expect(inc.phase).toBe("pulling");
    expect(out.phase).toBe("leaving");
    const slot = desktopLayout.slots[1]!;
    const pres = desktopLayout.presented;
    expect(inc.x).toBeCloseTo(slot.x + (pres.x - slot.x) * 0.5, 6);
    expect(inc.z).toBeCloseTo(60 * 1.6 * Math.sin(Math.PI * 0.5) + 60 * 0.5, 6);
    expect(inc.scale).toBeCloseTo(1.06, 6);
    expect(inc.rotY).toBeCloseTo(103 * (1 - backOut(0.5, 1.3)), 6);
    const late = deckPose(input({ p: at(0, 0.7 + 0.3 * 0.9) })).cards[1]!; // pull ≈ 0.996
    expect(late.landed).toBe(true);
    const swing = deckPose(input({ p: at(0, 0.7 + 0.3 * 0.78) })).cards[1]!; // k 0.78 → pull 0.95
    expect(swing.rotY).toBeLessThan(0);
  });

  it("adds the smoothed tilt only to the landed card", () => {
    const s = deckPose(input({ p: at(2, 0.5), tilt: { x: -3, y: 7 } }));
    expect(s.cards[2]!.rotX).toBeCloseTo(-3, 6);
    expect(s.cards[2]!.rotY).toBeCloseTo(7, 6);
    expect(s.cards[3]!.rotY).toBe(103);
    expect(s.cards[1]!.rotX).toBe(0);
  });

  it("lifts a hovered racked card 6 px toward the viewer and 3 px up", () => {
    const s = deckPose(input({ p: at(2, 0.5), hover: [0, 0, 0, 0, 1, 0, 0] }));
    expect(s.cards[4]!.z).toBeCloseTo(6, 6);
    expect(s.cards[4]!.y).toBeCloseTo(desktopLayout.slots[4]!.y - 3, 6);
    expect(s.cards[2]!.z).toBeCloseTo(60, 6); // the presented card ignores hover
  });

  it("floats the presented card once landed, fading the amplitude in over 1.5 s", () => {
    const rest = deckPose(
      input({ p: at(2, 0.5), time: 5000, landedAt: [null, null, 5000, ...none.slice(3)] }),
    );
    expect(rest.cards[2]!.y).toBeCloseTo(desktopLayout.presented.y, 6);
    const t = 5000 + 1050; // a quarter of the y period after landing, amplitude 0.7
    const s = deckPose(
      input({ p: at(2, 0.5), time: t, landedAt: [null, null, 5000, ...none.slice(3)] }),
    );
    const a = 1050 / 1500;
    expect(s.cards[2]!.y).toBeCloseTo(
      desktopLayout.presented.y + a * 4 * Math.sin((2 * Math.PI * t) / 4200),
      6,
    );
    expect(s.cards[2]!.rotZ).toBeCloseTo(a * 0.6 * Math.sin((2 * Math.PI * t) / 6100), 6);
    expect(s.cards[2]!.rotY).toBeCloseTo(a * 1.2 * Math.sin((2 * Math.PI * t) / 5300), 6);
    expect(s.cards[2]!.rotX).toBeCloseTo(a * 0.8 * Math.sin((2 * Math.PI * t) / 4700), 6);
    expect(s.cards[2]!.phase).toBe("presented");
  });

  it("reports landing for 700 ms after a card lands, then presented", () => {
    const landed = [null, null, 5000, ...none.slice(3)];
    expect(deckPose(input({ p: at(2, 0.5), time: 5300, landedAt: landed })).cards[2]!.phase).toBe(
      "landing",
    );
    expect(deckPose(input({ p: at(2, 0.5), time: 5800, landedAt: landed })).cards[2]!.phase).toBe(
      "presented",
    );
  });

  it("never emits NaN, whatever the progress", () => {
    for (const p of [-1, 0, 0.123, 0.5, 0.999, 1, 2, Number.NaN]) {
      finite(deckPose(input({ p, time: 123 })));
    }
  });

  it("carries the energy through", () => {
    const s = deckPose(input({ p: at(6, 0.35) }));
    expect(s.kind).toBe("S+");
    expect(s.energyIndex).toBe(6);
    expect(s.energy).toBeCloseTo(0.625, 6);
  });
});

describe("deckPose on phones", () => {
  it("centres the presented card and parks the next one at the right edge, back to the viewer", () => {
    const s = deckPose(input({ p: at(2, 0.5), layout: phoneLayout }));
    expect(s.cards[2]!.x).toBe(phoneLayout.presented.x);
    expect(s.cards[3]!.x).toBe(phoneLayout.next!.x);
    expect(s.cards[3]!.rotY).toBe(-80);
    expect(s.cards[3]!.opacity).toBe(1);
    expect(s.cards[4]!.x).toBe(phoneLayout.next!.x);
    expect(s.cards[4]!.opacity).toBe(0);
  });

  it("sends played cards to the exit at 70°, half transparent", () => {
    const s = deckPose(input({ p: at(2, 0.5), layout: phoneLayout }));
    expect(s.cards[1]!.x).toBe(phoneLayout.exit!.x);
    expect(s.cards[1]!.rotY).toBe(70);
    expect(s.cards[1]!.opacity).toBe(0.5);
    expect(s.cards[0]!.x).toBe(phoneLayout.exit!.x);
  });

  it("pulls the incoming card in from the right and the leaving card out to the left", () => {
    const s = deckPose(input({ p: at(2, 0.85), layout: phoneLayout })); // pull 0.5 each
    const inc = s.cards[3]!;
    const out = s.cards[2]!;
    expect(inc.x).toBeCloseTo(
      phoneLayout.next!.x + (phoneLayout.presented.x - phoneLayout.next!.x) * 0.5,
      6,
    );
    expect(out.x).toBeCloseTo(
      phoneLayout.exit!.x + (phoneLayout.presented.x - phoneLayout.exit!.x) * 0.5,
      6,
    );
    expect(out.opacity).toBeCloseTo(0.75, 6);
    // While the handoff runs, the card after the incoming one is the visible "next".
    expect(s.cards[4]!.opacity).toBe(1);
    expect(s.cards[5]!.opacity).toBe(0);
  });

  it("is continuous across the boundary for the waiting stack", () => {
    const before = deckPose(input({ p: at(3, 0) - 1e-9, layout: phoneLayout }));
    const after = deckPose(input({ p: at(3, 0), layout: phoneLayout }));
    expect(before.cards[4]!.opacity).toBe(1);
    expect(after.cards[4]!.opacity).toBe(1);
    expect(before.cards[4]!.x).toBe(after.cards[4]!.x);
  });

  it("ignores hover on phones", () => {
    const s = deckPose(input({ p: at(2, 0.5), layout: phoneLayout, hover: [0, 0, 0, 1, 0, 0, 0] }));
    expect(s.cards[3]!.z).toBe(0);
  });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `pnpm vitest run test/deckPose.test.ts`
Expected: FAIL, `deckPose` is not exported.

- [ ] **Step 3: Write part 2**

Replace the last two lines of `src/scripts/deck/deck-pose.ts` (the "Part 2 …" comment and the `export type` line) with:

```ts
export interface CardPose {
  x: number;
  y: number;
  z: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  scale: number;
  opacity: number;
  pull: number;
  landed: boolean;
  phase: CardPhase;
}

export interface IntroState {
  startedAt: number;
  /** 1 normally; the caller raises it to fast-forward when the visitor scrolls. */
  speed: number;
}

export interface IntroPose {
  done: boolean;
  /** How much of the floor line has drawn in, 0–1. */
  floor: number;
  /** How far the rail chips have faded in, 0–1. */
  rail: number;
}

export interface PoseInput {
  p: number;
  labels: readonly RankLabel[];
  layout: DeckLayout;
  /** Degrees, already smoothed by the caller. */
  tilt: { x: number; y: number };
  /** 0–1 per card, already smoothed by the caller. Desktop only. */
  hover: readonly number[];
  /** A monotonic clock in ms. */
  time: number;
  /** When each card last landed (ms), or null while it is not presented. */
  landedAt: readonly (number | null)[];
  intro: IntroState | null;
}

export interface StagePose {
  cards: CardPose[];
  active: number;
  within: number;
  energy: number;
  kind: "S" | "S+" | null;
  energyIndex: number | null;
  intro: IntroPose | null;
}

interface RestPose {
  x: number;
  y: number;
  rotY: number;
  opacity: number;
}

/**
 * Where card `i` sits when it is not presented. Desktop: its rack slot. Phone: the active card and
 * the played ones belong at `exit` (half transparent, off the stage's left edge); the cards to
 * come wait at `next`, stacked, where only the visible next one is opaque. During a handoff
 * (`k > 0`) the incoming card `active + 1` arrives from `next` and `active + 2` becomes the
 * visible next, so the stack never pops.
 */
function restPose(
  i: number,
  active: number,
  k: number,
  layout: DeckLayout,
  params: DeckParams,
): RestPose {
  if (layout.mode === "desktop") {
    const slot = layout.slots[i] ?? layout.slots[layout.slots.length - 1]!;
    return { x: slot.x, y: slot.y, rotY: params.pull.rackRotY, opacity: 1 };
  }
  if (i <= active) {
    return { ...layout.exit!, rotY: params.layout.phoneExitRotY, opacity: 0.5 };
  }
  const visibleNext = k > 0 ? active + 2 : active + 1;
  return {
    ...layout.next!,
    rotY: params.layout.phoneNextRotY,
    opacity: i === active + 1 || i === visibleNext ? 1 : 0,
  };
}

const TAU = Math.PI * 2;

/** Moves a card from its rest pose to the presented anchor by `pull` (spec §7). */
function interpolate(
  rest: RestPose,
  pull: number,
  layout: DeckLayout,
  params: DeckParams,
): CardPose {
  const P = params.pull;
  const target = layout.presented;
  if (pull <= 0) {
    return {
      x: rest.x,
      y: rest.y,
      z: 0,
      rotX: 0,
      rotY: rest.rotY,
      rotZ: 0,
      scale: 1,
      opacity: rest.opacity,
      pull: 0,
      landed: false,
      phase: "racked",
    };
  }
  const e = easeInOutCubic(pull);
  const b = backOut(pull, P.overshoot);
  return {
    x: rest.x + (target.x - rest.x) * e,
    y: rest.y + (target.y - rest.y) * e,
    z: P.liftZ * P.liftPeak * Math.sin(Math.PI * pull) + P.liftZ * pull,
    rotX: 0,
    rotY: rest.rotY * (1 - b),
    rotZ: 0,
    scale: 1 + P.scalePeak * Math.sin(Math.PI * pull),
    opacity: rest.opacity + (1 - rest.opacity) * e,
    pull,
    landed: pull > P.landedAt,
    phase: "pulling",
  };
}

/** The idle float's offsets for a landed card at `time`, fading in after `landedAt`. */
function float(time: number, landedAt: number, params: DeckParams) {
  const F = params.float;
  const a = clamp01((time - landedAt) / F.fadeInMs);
  const wave = (spec: { amp: number; periodMs: number }) =>
    a * spec.amp * Math.sin((TAU * time) / spec.periodMs);
  return { y: wave(F.y), rotZ: wave(F.rotZ), rotY: wave(F.rotY), rotX: wave(F.rotX) };
}

/** Everything the stage needs for one frame (spec §7). */
export function deckPose(input: PoseInput, params: DeckParams = DECK_PARAMS): StagePose {
  if (input.intro) {
    const intro = introPose(input, params);
    if (!intro.intro.done) return intro;
  }
  const count = input.labels.length;
  const pulls = pullsFor(input.p, count, params.pull.handoffStart);
  const cards = input.labels.map((_, i) => {
    const rest = restPose(i, pulls.active, pulls.k, input.layout, params);
    const pose = interpolate(rest, pulls.pull[i] ?? 0, input.layout, params);
    if (pose.pull <= 0) {
      if (input.layout.mode === "desktop") {
        const h = clamp01(input.hover[i] ?? 0);
        pose.z += params.hover.z * h;
        pose.y -= params.hover.y * h;
      }
      return pose;
    }
    if (!pose.landed) {
      pose.phase = i === pulls.active && pulls.k > 0 ? "leaving" : "pulling";
      return pose;
    }
    pose.rotX += input.tilt.x;
    pose.rotY += input.tilt.y;
    const landedAt = input.landedAt[i];
    if (landedAt != null) {
      const f = float(input.time, landedAt, params);
      pose.y += f.y;
      pose.rotZ += f.rotZ;
      pose.rotY += f.rotY;
      pose.rotX += f.rotX;
      pose.phase = input.time - landedAt < params.print.landingMs ? "landing" : "presented";
    } else {
      // The caller has not recorded a landing (a deep link, a frozen frame): nothing to animate.
      pose.phase = "presented";
    }
    return pose;
  });
  const energy = energyFor(pulls, input.labels, params.pull.landedAt, params);
  return {
    cards,
    active: pulls.active,
    within: pulls.within,
    energy: energy.energy,
    kind: energy.kind,
    energyIndex: energy.index,
    intro: null,
  };
}

// Part 3, the intro, follows in the next task.
function introPose(input: PoseInput, params: DeckParams): StagePose {
  void params;
  return {
    cards: [],
    active: 0,
    within: 0,
    energy: 0,
    kind: null,
    energyIndex: null,
    intro: { done: true, floor: 1, rail: 1 },
  };
}

export type { DeckLayout, Point };
```

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run test/deckPose.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test`

```bash
git add src/scripts/deck/deck-pose.ts test/deckPose.test.ts
git commit -m "deck: card poses, tilt, hover and float in the pose model"
```

---

### Task 8: The pose model, part 3: the intro

**Files:**

- Modify: `src/scripts/deck/deck-pose.ts` (replace the stub `introPose`)
- Modify: `test/deckPose.test.ts`

**Interfaces:**

- Produces: `introPose` (internal) used by `deckPose` when `input.intro` is set, plus the exported helper `introDurationMs(count: number, params?: DeckParams): number` so the caller can size timers. Timeline for `count` cards, at `t = (time − startedAt) × speed`:
  1. Deal-in: card `i` starts `entryOffset × cardW` outside (left on desktop, right on phones) and eases (cubic out) to its rest pose over `dealMs`, starting at `i × staggerMs`. `intro.floor = clamp01(t / floorMs)`, `intro.rail = clamp01(t / dealEnd)`.
  2. Hold `holdMs`.
  3. Card 0 pulls over `pullMs` along the normal curve, `pull = easeInOutCubic(local)`.
  4. `done` when `t ≥ dealEnd + holdMs + pullMs`.

  On phones only card 0 and card 1 take part (card 1 arrives as the waiting "next"); the others sit at their rest with opacity 0.

- [ ] **Step 1: Write the failing tests**

Append to `test/deckPose.test.ts` (extend the import with `introDurationMs`):

```ts
describe("the intro", () => {
  const intro = { startedAt: 1000, speed: 1 };
  const dealEnd = 420 + 6 * 55; // 750
  const pullStart = dealEnd + 200; // 950
  const end = pullStart + 700; // 1650

  it("lasts 1650 ms for seven cards at speed 1", () => {
    expect(introDurationMs(7)).toBe(end);
  });

  it("starts with every card 2.2 widths off to the left, nothing drawn", () => {
    const s = deckPose(input({ intro, time: 1000 }));
    expect(s.intro).toEqual({ done: false, floor: 0, rail: 0 });
    for (const [i, c] of s.cards.entries()) {
      expect(c.x).toBeCloseTo(desktopLayout.slots[i]!.x - 2.2 * desktopLayout.cardW, 6);
      expect(c.rotY).toBe(103);
      expect(c.phase).toBe("racked");
      expect(c.opacity).toBe(1);
    }
  });

  it("deals the cards in one by one, 55 ms apart, cubic out over 420 ms", () => {
    const s = deckPose(input({ intro, time: 1000 + 210 }));
    const e0 = 1 - (1 - 210 / 420) ** 3;
    expect(s.cards[0]!.x).toBeCloseTo(
      desktopLayout.slots[0]!.x - 2.2 * desktopLayout.cardW * (1 - e0),
      6,
    );
    const e1 = 1 - (1 - (210 - 55) / 420) ** 3;
    expect(s.cards[1]!.x).toBeCloseTo(
      desktopLayout.slots[1]!.x - 2.2 * desktopLayout.cardW * (1 - e1),
      6,
    );
    expect(s.cards[6]!.x).toBeCloseTo(desktopLayout.slots[6]!.x - 2.2 * desktopLayout.cardW, 6);
    expect(s.intro!.floor).toBeCloseTo(210 / 500, 6);
    expect(s.intro!.rail).toBeCloseTo(210 / dealEnd, 6);
  });

  it("holds the full rack, then pulls E out along the normal curve", () => {
    const held = deckPose(input({ intro, time: 1000 + dealEnd + 100 }));
    for (const [i, c] of held.cards.entries())
      expect(c.x).toBeCloseTo(desktopLayout.slots[i]!.x, 6);
    expect(held.intro!.floor).toBe(1);
    const half = deckPose(input({ intro, time: 1000 + pullStart + 350 }));
    const pull = easeInOutCubic(0.5);
    expect(half.cards[0]!.pull).toBeCloseTo(pull, 6);
    expect(half.cards[0]!.phase).toBe("pulling");
    expect(half.cards[0]!.x).toBeCloseTo(
      desktopLayout.slots[0]!.x +
        (desktopLayout.presented.x - desktopLayout.slots[0]!.x) * easeInOutCubic(pull),
      6,
    );
    expect(half.cards[1]!.x).toBeCloseTo(desktopLayout.slots[1]!.x, 6);
  });

  it("ends landed on E, at the pose the scroll model gives at p = 0, and reports done", () => {
    const last = deckPose(input({ intro, time: 1000 + end - 1 }));
    expect(last.intro!.done).toBe(false);
    expect(last.cards[0]!.landed).toBe(true);
    const done = deckPose(input({ intro, time: 1000 + end }));
    expect(done.intro).toBeNull(); // handed over to the scroll model
    const scroll = deckPose(input({ p: 0 }));
    expect(done.cards[0]!.x).toBeCloseTo(scroll.cards[0]!.x, 6);
    expect(done.cards[0]!.z).toBeCloseTo(scroll.cards[0]!.z, 6);
  });

  it("runs faster when the caller raises the speed", () => {
    const fast = deckPose(input({ intro: { startedAt: 1000, speed: 4 }, time: 1000 + end / 4 }));
    expect(fast.intro).toBeNull();
  });

  it("on phones, deals E and the waiting card in from the right and hides the rest", () => {
    const s = deckPose(input({ intro, time: 1000, layout: phoneLayout }));
    expect(s.cards[0]!.x).toBeCloseTo(phoneLayout.next!.x + 2.2 * phoneLayout.cardW, 6);
    expect(s.cards[0]!.opacity).toBe(1);
    expect(s.cards[1]!.opacity).toBe(1);
    expect(s.cards[2]!.opacity).toBe(0);
    const done = deckPose(input({ intro, time: 1000 + end, layout: phoneLayout }));
    const scroll = deckPose(input({ p: 0, layout: phoneLayout }));
    expect(done.cards[0]!.x).toBeCloseTo(scroll.cards[0]!.x, 6);
    expect(done.cards[1]!.x).toBeCloseTo(scroll.cards[1]!.x, 6);
  });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `pnpm vitest run test/deckPose.test.ts`
Expected: FAIL, `introDurationMs` is not exported and the intro poses are empty.

- [ ] **Step 3: Write the intro**

In `src/scripts/deck/deck-pose.ts`, replace the stub `introPose` function (and the comment above it) with:

```ts
/** The intro's total length at speed 1: the deal-in, the hold, then E's pull. */
export function introDurationMs(count: number, params: DeckParams = DECK_PARAMS): number {
  const I = params.intro;
  return I.dealMs + (count - 1) * I.staggerMs + I.holdMs + I.pullMs;
}

/**
 * The entrance (spec §7): the rack deals in, holds, then E pulls itself out. On phones only E and
 * the waiting card take part. Returns `intro.done` once the scroll model should take over; the
 * end state equals `deckPose` at p = 0, so the handover has no jump.
 */
function introPose(input: PoseInput, params: DeckParams): StagePose {
  const I = params.intro;
  const count = input.labels.length;
  const t = (input.time - input.intro!.startedAt) * input.intro!.speed;
  const dealEnd = I.dealMs + (count - 1) * I.staggerMs;
  const pullStart = dealEnd + I.holdMs;
  const end = pullStart + I.pullMs;
  const phone = input.layout.mode === "phone";
  const direction = phone ? 1 : -1;
  const offset = direction * I.entryOffset * input.layout.cardW;

  const cards = input.labels.map((_, i) => {
    // Before the pull, E rests in its slot; on a phone it arrives at `next` like every other
    // card (never at the exit), and card 1 waits behind it as the visible next.
    const rest =
      phone && i === 0
        ? { ...input.layout.next!, rotY: params.layout.phoneNextRotY, opacity: 1 }
        : restPose(i, 0, 0, input.layout, params);
    if (phone && i > 1) return interpolate({ ...rest, opacity: 0 }, 0, input.layout, params);
    if (i === 0 && t >= pullStart) {
      const pull = easeInOutCubic(clamp01((t - pullStart) / I.pullMs));
      const pose = interpolate(rest, pull, input.layout, params);
      if (pull > 0 && !pose.landed) pose.phase = "pulling";
      return pose;
    }
    const local = clamp01((t - i * I.staggerMs) / I.dealMs);
    const e = easeOutCubic(local);
    const pose = interpolate(rest, 0, input.layout, params);
    pose.x = rest.x + offset * (1 - e);
    return pose;
  });

  return {
    cards,
    active: 0,
    within: 0,
    energy: 0,
    kind: null,
    energyIndex: null,
    intro: {
      done: t >= end,
      floor: clamp01(t / I.floorMs),
      rail: clamp01(t / dealEnd),
    },
  };
}
```

In `deckPose`, keep the existing guard as written in Task 7: when the intro reports `done`, the function falls through to the scroll model, whose result carries `intro: null`.

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run test/deckPose.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test`

```bash
git add src/scripts/deck/deck-pose.ts test/deckPose.test.ts
git commit -m "deck: the intro in the pose model"
```

---

### Task 9: The fake canvas, and the frame, chip, back and placeholder painters

**Files:**

- Create: `test/helpers/fakeCanvas.ts`
- Create: `src/scripts/deck/deck-paint.ts`
- Test: `test/deckPaint.test.ts`

**Interfaces:**

- Produces (this task):
  ```ts
  export const CARD_W = 520; // the reference size the numbers below are written for
  export const CARD_H = 728;
  export const WINDOW = 0.52; // the portrait window's share of the height
  export const COLORS: {
    void;
    carbon;
    graphite;
    iron;
    slate;
    steel;
    ash;
    fog;
    paper;
    ember;
    violet;
    back: string;
  };
  export const FONT = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
  export function font(px: number, weight?: 400 | 700, italic?: boolean): string;
  export function paintFrame(ctx: CanvasRenderingContext2D, w: number, h: number): void;
  export function paintChip(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    rank: RankLabel,
  ): void;
  export const CHIP_W = 80;
  export const CHIP_H = 28; // the chip plane's size at 1×
  export function paintBack(ctx, w, h, mark: CanvasImageSource | null): void;
  export function paintPlaceholder(ctx, x, y, w, h, eyeColor: string): void;
  ```
  Every painter draws for a canvas already sized to `(w, h)`; the scale is `s = w / CARD_W` (for the chip, `w / CHIP_W`).
- The fake canvas: `class FakeContext` records every call as `{ op: string; args: unknown[]; font, fillStyle, strokeStyle, textAlign }` in `ops`, implements `measureText` as `{ width: text.length × fontPx × 0.6 }`, and exposes `texts()`, `rects()` and `fillsWith(color)` helpers.

- [ ] **Step 1: Write the fake canvas**

Create `test/helpers/fakeCanvas.ts`:

```ts
/**
 * A recording stand-in for CanvasRenderingContext2D. The painters only draw; the tests read the
 * recorded operations back. measureText assumes a 0.6 em advance, the monospace face's width.
 */
export interface Op {
  op: string;
  args: unknown[];
  font: string;
  fillStyle: string;
  strokeStyle: string;
  textAlign: string;
  globalAlpha: number;
}

class FakeGradient {
  stops: [number, string][] = [];
  addColorStop(offset: number, color: string): void {
    this.stops.push([offset, color]);
  }
}

export class FakeContext {
  ops: Op[] = [];
  font = "10px sans-serif";
  fillStyle: string | FakeGradient = "#000000";
  strokeStyle: string | FakeGradient = "#000000";
  lineWidth = 1;
  textAlign = "left";
  textBaseline = "alphabetic";
  globalAlpha = 1;
  shadowColor = "transparent";
  shadowBlur = 0;
  imageSmoothingEnabled = true;

  private record(op: string, ...args: unknown[]): void {
    this.ops.push({
      op,
      args,
      font: this.font,
      fillStyle: typeof this.fillStyle === "string" ? this.fillStyle : "gradient",
      strokeStyle: typeof this.strokeStyle === "string" ? this.strokeStyle : "gradient",
      textAlign: this.textAlign,
      globalAlpha: this.globalAlpha,
    });
  }

  private fontPx(): number {
    return Number(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? 10);
  }

  save(): void {
    this.record("save");
  }
  restore(): void {
    this.record("restore");
  }
  clearRect(...a: number[]): void {
    this.record("clearRect", ...a);
  }
  fillRect(...a: number[]): void {
    this.record("fillRect", ...a);
  }
  strokeRect(...a: number[]): void {
    this.record("strokeRect", ...a);
  }
  fillText(text: string, x: number, y: number): void {
    this.record("fillText", text, x, y);
  }
  measureText(text: string): { width: number } {
    return { width: text.length * this.fontPx() * 0.6 };
  }
  beginPath(): void {
    this.record("beginPath");
  }
  closePath(): void {
    this.record("closePath");
  }
  moveTo(...a: number[]): void {
    this.record("moveTo", ...a);
  }
  lineTo(...a: number[]): void {
    this.record("lineTo", ...a);
  }
  rect(...a: number[]): void {
    this.record("rect", ...a);
  }
  arc(...a: number[]): void {
    this.record("arc", ...a);
  }
  ellipse(...a: number[]): void {
    this.record("ellipse", ...a);
  }
  stroke(): void {
    this.record("stroke");
  }
  fill(): void {
    this.record("fill");
  }
  clip(): void {
    this.record("clip");
  }
  translate(...a: number[]): void {
    this.record("translate", ...a);
  }
  scale(...a: number[]): void {
    this.record("scale", ...a);
  }
  drawImage(image: unknown, ...a: number[]): void {
    this.record("drawImage", image, ...a);
  }
  createLinearGradient(): FakeGradient {
    return new FakeGradient();
  }
  createRadialGradient(): FakeGradient {
    return new FakeGradient();
  }

  /** Every drawn string, in order. */
  texts(): string[] {
    return this.ops.filter((o) => o.op === "fillText").map((o) => String(o.args[0]));
  }
  /** The fillRect and strokeRect calls as boxes. */
  rects(
    op: "fillRect" | "strokeRect" = "fillRect",
  ): { x: number; y: number; w: number; h: number; color: string }[] {
    return this.ops
      .filter((o) => o.op === op)
      .map((o) => ({
        x: o.args[0] as number,
        y: o.args[1] as number,
        w: o.args[2] as number,
        h: o.args[3] as number,
        color: op === "fillRect" ? o.fillStyle : o.strokeStyle,
      }));
  }
  /** fillRect and fillText operations painted in a colour. */
  fillsWith(color: string): Op[] {
    return this.ops.filter(
      (o) =>
        (o.op === "fillRect" || o.op === "fillText" || o.op === "fill") && o.fillStyle === color,
    );
  }
}

export const fakeContext = (): CanvasRenderingContext2D & FakeContext =>
  new FakeContext() as unknown as CanvasRenderingContext2D & FakeContext;

/** A stand-in for an image: the painters only read width and height. */
export const fakeImage = (width: number, height: number): CanvasImageSource =>
  ({ width, height }) as unknown as CanvasImageSource;
```

- [ ] **Step 2: Write the failing tests**

Create `test/deckPaint.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  CARD_H,
  CARD_W,
  CHIP_H,
  CHIP_W,
  COLORS,
  font,
  paintBack,
  paintChip,
  paintFrame,
  paintPlaceholder,
} from "../src/scripts/deck/deck-paint";
import { fakeContext, fakeImage, type Op } from "./helpers/fakeCanvas";

/** Every recorded box and text anchor lies inside a w × h canvas. */
function expectInside(ops: Op[], w: number, h: number): void {
  for (const o of ops) {
    if (o.op === "fillRect" || o.op === "strokeRect" || o.op === "rect") {
      const [x, y, bw, bh] = o.args as number[];
      expect(x, `${o.op} x`).toBeGreaterThanOrEqual(-1);
      expect(y, `${o.op} y`).toBeGreaterThanOrEqual(-1);
      expect(x! + bw!, `${o.op} right`).toBeLessThanOrEqual(w + 1);
      expect(y! + bh!, `${o.op} bottom`).toBeLessThanOrEqual(h + 1);
    }
    if (o.op === "fillText") {
      const [, x, y] = o.args as [string, number, number];
      expect(x, `text x ${o.args[0]}`).toBeGreaterThanOrEqual(0);
      expect(x, `text x ${o.args[0]}`).toBeLessThanOrEqual(w);
      expect(y, `text y ${o.args[0]}`).toBeGreaterThan(0);
      expect(y, `text y ${o.args[0]}`).toBeLessThanOrEqual(h);
    }
  }
}

describe("font", () => {
  it("builds a JetBrains Mono font string, 400 by default, italic on request", () => {
    expect(font(14)).toBe(
      '400 14px "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
    );
    expect(font(12, 700)).toMatch(/^700 12px/);
    expect(font(10, 400, true)).toMatch(/^italic 400 10px/);
  });
});

describe("paintFrame", () => {
  it("draws the iron border, the slate inner frame and two steel brackets, scaled", () => {
    const ctx = fakeContext();
    paintFrame(ctx, CARD_W, CARD_H);
    const strokes = ctx.rects("strokeRect");
    expect(strokes[0]).toEqual({
      x: 0.5,
      y: 0.5,
      w: CARD_W - 1,
      h: CARD_H - 1,
      color: COLORS.iron,
    });
    expect(strokes[1]).toEqual({
      x: 6.5,
      y: 6.5,
      w: CARD_W - 13,
      h: CARD_H - 13,
      color: COLORS.slate,
    });
    const brackets = ctx.ops.filter((o) => o.op === "stroke" && o.strokeStyle === COLORS.steel);
    expect(brackets).toHaveLength(2);
    expectInside(ctx.ops, CARD_W, CARD_H);

    const big = fakeContext();
    paintFrame(big, CARD_W * 2, CARD_H * 2);
    expect(big.rects("strokeRect")[1]!.x).toBe(13);
  });
});

describe("paintChip", () => {
  it("fills S+ with ember and void text, borders S in violet, and the rest in slate", () => {
    const top = fakeContext();
    paintChip(top, CHIP_W, CHIP_H, "S+");
    expect(top.rects()[0]!.color).toBe(COLORS.ember);
    expect(top.ops.find((o) => o.op === "fillText")!.fillStyle).toBe(COLORS.void);
    expect(top.texts()).toEqual(["[ S+ ]"]);

    const s = fakeContext();
    paintChip(s, CHIP_W, CHIP_H, "S");
    expect(s.rects()[0]!.color).toBe(COLORS.graphite);
    expect(s.rects("strokeRect")[0]!.color).toBe(COLORS.violet);
    expect(s.ops.find((o) => o.op === "fillText")!.fillStyle).toBe(COLORS.paper);

    const e = fakeContext();
    paintChip(e, CHIP_W, CHIP_H, "E");
    expect(e.rects("strokeRect")[0]!.color).toBe(COLORS.slate);
    expect(e.ops.find((o) => o.op === "fillText")!.font).toMatch(/^700 12px/);
    expectInside(e.ops, CHIP_W, CHIP_H);
  });
});

describe("paintBack", () => {
  it("paints carbon, the inner frame, the mark centred at 84 px and the letter-spaced wordmark", () => {
    const ctx = fakeContext();
    const mark = fakeImage(226, 242);
    paintBack(ctx, CARD_W, CARD_H, mark);
    expect(ctx.rects()[0]).toEqual({ x: 0, y: 0, w: CARD_W, h: CARD_H, color: COLORS.back });
    expect(ctx.rects("strokeRect")[1]!.color).toBe("#2a2a2a");
    const draw = ctx.ops.find((o) => o.op === "drawImage")!;
    const [, x, y, w, h] = draw.args as [unknown, number, number, number, number];
    expect(h).toBeCloseTo(84, 6);
    expect(w).toBeCloseTo((84 * 226) / 242, 6);
    expect(x + w / 2).toBeCloseTo(CARD_W / 2, 6);
    expect(y + h / 2).toBeCloseTo(CARD_H / 2, 6);
    expect(ctx.texts().join("")).toBe("EVILIST · JOURNEY");
    expect(ctx.ops.find((o) => o.op === "fillText")!.fillStyle).toBe(COLORS.slate);
    expectInside(ctx.ops, CARD_W, CARD_H);
  });

  it("paints without the mark while it is still loading", () => {
    const ctx = fakeContext();
    paintBack(ctx, CARD_W, CARD_H, null);
    expect(ctx.ops.some((o) => o.op === "drawImage")).toBe(false);
    expect(ctx.texts().join("")).toBe("EVILIST · JOURNEY");
  });
});

describe("paintPlaceholder", () => {
  it("draws a head, shoulders and two eyes in the rank's colour, inside the window", () => {
    const ctx = fakeContext();
    paintPlaceholder(ctx, 0, 0, CARD_W, CARD_H * 0.52, "#9d7cf0");
    const ellipses = ctx.ops.filter((o) => o.op === "ellipse");
    expect(ellipses.length).toBeGreaterThanOrEqual(3);
    expect(ctx.fillsWith("#9d7cf0").length).toBeGreaterThanOrEqual(1);
    for (const e of ellipses) {
      const [cx, cy] = e.args as number[];
      expect(cx).toBeGreaterThan(0);
      expect(cx).toBeLessThan(CARD_W);
      expect(cy).toBeGreaterThan(0);
      expect(cy).toBeLessThan(CARD_H * 0.52);
    }
  });
});
```

- [ ] **Step 3: Run them to make sure they fail**

Run: `pnpm vitest run test/deckPaint.test.ts`
Expected: FAIL, cannot find module `../src/scripts/deck/deck-paint`.

- [ ] **Step 4: Write the first painters**

Create `src/scripts/deck/deck-paint.ts`:

```ts
// Paints a card's layers into canvases from the career data (deck spec §5). Pure drawing: the
// stage (Plan 2) owns the canvases and textures and calls these when a card needs painting. Every
// painter takes the canvas size it is drawing into and scales from the 520 × 728 reference.
// Colours are the site's tokens (test/deckPalette.test.ts keeps them in sync) plus violet, which
// ADR 0003/0004 allow inside the journey art.
import type { RankLabel } from "../../data/career";

export const CARD_W = 520;
export const CARD_H = 728;
/** The portrait window's share of the card's height. */
export const WINDOW = 0.52;
export const CHIP_W = 80;
export const CHIP_H = 28;

export const COLORS = {
  void: "#000000",
  carbon: "#111111",
  graphite: "#191919",
  iron: "#202020",
  slate: "#3a3a3a",
  steel: "#606060",
  ash: "#848484",
  fog: "#b4b4b4",
  paper: "#eeeeee",
  ember: "#da5c2c",
  violet: "#7040d2",
  /** The card back's carbon, a step darker than the face so the flip reads. */
  back: "#0e0e0e",
} as const;

export const FONT = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

export const font = (px: number, weight: 400 | 700 = 400, italic = false): string =>
  `${italic ? "italic " : ""}${weight} ${px}px ${FONT}`;

type Ctx = CanvasRenderingContext2D;

/** A corner bracket: two 18 px legs meeting at (x, y), pointing `dx`/`dy` inward. */
function bracket(ctx: Ctx, x: number, y: number, dx: number, dy: number, s: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y + dy * 18 * s);
  ctx.lineTo(x, y);
  ctx.lineTo(x + dx * 18 * s, y);
  ctx.stroke();
}

/** The frame layer: a 1 px iron border, the slate trace frame 6 px in, steel brackets. */
export function paintFrame(ctx: Ctx, w: number, h: number): void {
  const s = w / CARD_W;
  ctx.clearRect(0, 0, w, h);
  ctx.lineWidth = 1;
  ctx.strokeStyle = COLORS.iron;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  ctx.strokeStyle = COLORS.slate;
  ctx.strokeRect(6.5 * s, 6.5 * s, w - 13 * s, h - 13 * s);
  ctx.strokeStyle = COLORS.steel;
  bracket(ctx, 6.5 * s, 6.5 * s, 1, 1, s);
  bracket(ctx, w - 6.5 * s, h - 6.5 * s, -1, -1, s);
}

/** The rank chip, mirroring RankChip.astro: S+ ember on void; S paper with a violet border. */
export function paintChip(ctx: Ctx, w: number, h: number, rank: RankLabel): void {
  const s = w / CHIP_W;
  ctx.clearRect(0, 0, w, h);
  const top = rank === "S+";
  ctx.fillStyle = top ? COLORS.ember : COLORS.graphite;
  ctx.fillRect(0, 0, w, h);
  ctx.lineWidth = 1;
  ctx.strokeStyle = top ? COLORS.ember : rank === "S" ? COLORS.violet : COLORS.slate;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  ctx.font = font(12 * s, 700);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = top ? COLORS.void : COLORS.paper;
  ctx.fillText(`[ ${rank} ]`, w / 2, h / 2);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

/** Letter-spaced text: canvas has no letter-spacing everywhere, so draw a glyph at a time. */
function spaced(ctx: Ctx, text: string, cx: number, y: number, px: number, spacing: number): void {
  const advance = px * 0.6 + spacing;
  let x = cx - (advance * text.length - spacing) / 2;
  for (const ch of text) {
    ctx.fillText(ch, x, y);
    x += advance;
  }
}

/** The card back: darker carbon, the trace frame, the devil mark and the wordmark. */
export function paintBack(ctx: Ctx, w: number, h: number, mark: CanvasImageSource | null): void {
  const s = w / CARD_W;
  ctx.fillStyle = COLORS.back;
  ctx.fillRect(0, 0, w, h);
  ctx.lineWidth = 1;
  ctx.strokeStyle = COLORS.iron;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  ctx.strokeStyle = "#2a2a2a";
  ctx.strokeRect(6.5 * s, 6.5 * s, w - 13 * s, h - 13 * s);
  if (mark) {
    const size = 84 * s;
    const iw = (mark as { width: number }).width;
    const ih = (mark as { height: number }).height;
    const mh = size;
    const mw = (size * iw) / ih;
    ctx.drawImage(mark, w / 2 - mw / 2, h / 2 - mh / 2, mw, mh);
  }
  ctx.fillStyle = COLORS.slate;
  ctx.font = font(9 * s);
  spaced(ctx, "EVILIST · JOURNEY", w / 2, h - 16 * s, 9 * s, 9 * s * 0.28);
}

/**
 * The placeholder portrait while a rank's render is missing: a head and shoulders on a faint
 * violet field, two eyes in the rank's colour. Draws inside the box (x, y, w, h).
 */
export function paintPlaceholder(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  eyeColor: string,
): void {
  const cx = x + w / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const field = ctx.createRadialGradient(cx, y + h * 0.3, w * 0.05, cx, y + h * 0.3, w * 0.6);
  field.addColorStop(0, "#1b1526");
  field.addColorStop(0.7, "#0b0b0b");
  field.addColorStop(1, COLORS.void);
  ctx.fillStyle = field;
  ctx.fillRect(x, y, w, h);
  const headR = w * 0.085;
  const headY = y + h * 0.42;
  ctx.fillStyle = "#0d0d0d";
  // Shoulders: an ellipse centred just above the window's bottom edge; the clip trims the rest.
  ctx.beginPath();
  ctx.ellipse(cx, y + h * 0.98, w * 0.32, w * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, headY, headR, headR * 1.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = eyeColor;
  for (const dx of [-headR * 0.42, headR * 0.42]) {
    ctx.beginPath();
    ctx.ellipse(cx + dx, headY + headR * 0.05, headR * 0.22, headR * 0.075, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
```

- [ ] **Step 5: Run the tests**

Run: `pnpm vitest run test/deckPaint.test.ts`
Expected: PASS.

- [ ] **Step 6: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test`

```bash
git add test/helpers/fakeCanvas.ts src/scripts/deck/deck-paint.ts test/deckPaint.test.ts
git commit -m "deck: frame, chip, back and placeholder painters"
```

---

### Task 10: The body and text painters

**Files:**

- Modify: `src/scripts/deck/deck-paint.ts`
- Modify: `test/deckPaint.test.ts`

**Interfaces:**

- Produces:

  ```ts
  export interface CardModel {
    stage: CareerStage;
    art: DeckArt;
    dates: string;
    tenure: string;
    xp: number;
    blocks: number;
    acquired: string[];
    setNumber: string;
  }
  export function cardModel(stage: CareerStage, now: Date): CardModel;
  export const PRINT_STEPS = 7; // name plate, header, on_arrival, acquired, xp, tenure, footer
  export function wrapText(ctx, text: string, maxWidth: number): string[];
  export function xpGlyphs(blocks: number, total?: number): { lit: string; dark: string };
  export function paintBody(ctx, w, h, card: CardModel, portrait: CanvasImageSource | null): void;
  export function paintText(
    ctx,
    w,
    h,
    card: CardModel,
    lines: number,
    cursor?: boolean,
  ): { bottom: number };
  ```

  `paintText` clears the canvas first, draws the first `lines` steps (0–7) and returns the lowest y it used (for the overflow test). With `cursor` true and `lines ≥ 6`, an ember `▮` follows the tenure value.

- [ ] **Step 1: Write the failing tests**

Append to `test/deckPaint.test.ts` (extend the import with `PRINT_STEPS, cardModel, paintBody, paintText, wrapText, xpGlyphs, WINDOW` and add `import { career } from "../src/data/career";`):

```ts
const NOW = new Date(2026, 8, 25);
const byId = (id: string) =>
  cardModel(
    career.find((s) => s.id === id)!,
    NOW,
  );

describe("cardModel", () => {
  it("assembles everything the card prints", () => {
    const s = byId("linux-engineer");
    expect(s.art.rank).toBe("S");
    expect(s.dates).toBe("Oct 2019 – May 2021");
    expect(s.tenure).toBe("19 months");
    expect(s.xp).toBeCloseTo(57 / 115, 6);
    expect(s.blocks).toBe(5);
    expect(s.acquired).toHaveLength(9);
    expect(s.setNumber).toBe("EVL-06/07");
  });
});

describe("wrapText and xpGlyphs", () => {
  it("wraps greedily by words within the width", () => {
    const ctx = fakeContext();
    ctx.font = font(10);
    // 0.6 em advance: 10 px font → 6 px per character; 60 px fits ten characters.
    expect(wrapText(ctx, "one two three four", 60)).toEqual(["one two", "three four"]);
    expect(wrapText(ctx, "supercalifragilistic", 60)).toEqual(["supercalifragilistic"]);
    expect(wrapText(ctx, "", 60)).toEqual([]);
  });

  it("lights the blocks from the left", () => {
    expect(xpGlyphs(5)).toEqual({ lit: "▮▮▮▮▮", dark: "▯▯▯▯▯" });
    expect(xpGlyphs(10)).toEqual({ lit: "▮▮▮▮▮▮▮▮▮▮", dark: "" });
    expect(xpGlyphs(0)).toEqual({ lit: "", dark: "▯▯▯▯▯▯▯▯▯▯" });
  });
});

describe("paintBody", () => {
  it("paints carbon, a void window, the divider and the placeholder when there is no portrait", () => {
    const ctx = fakeContext();
    paintBody(ctx, CARD_W, CARD_H, byId("t1-support"), null);
    const fills = ctx.rects();
    expect(fills[0]).toEqual({ x: 0, y: 0, w: CARD_W, h: CARD_H, color: COLORS.carbon });
    expect(fills[1]).toEqual({ x: 0, y: 0, w: CARD_W, h: CARD_H * WINDOW, color: COLORS.void });
    expect(ctx.ops.some((o) => o.op === "ellipse")).toBe(true);
    expect(ctx.fillsWith("#6b4a2f").length).toBeGreaterThan(0);
    const divider = fills.find((r) => r.color === COLORS.iron && r.h === 1);
    expect(divider).toEqual({ x: 0, y: CARD_H * WINDOW, w: CARD_W, h: 1, color: COLORS.iron });
    expectInside(ctx.ops, CARD_W, CARD_H);
  });

  it("cover-fits a 3:2 portrait into the 11:8 window, anchored top-centre, under a scrim", () => {
    const ctx = fakeContext();
    paintBody(ctx, CARD_W, CARD_H, byId("linux-engineer"), fakeImage(800, 533));
    const draw = ctx.ops.find((o) => o.op === "drawImage")!;
    const [, dx, dy, dw, dh] = draw.args as [unknown, number, number, number, number];
    const winH = CARD_H * WINDOW;
    const scale = Math.max(CARD_W / 800, winH / 533);
    expect(dw).toBeCloseTo(800 * scale, 6);
    expect(dh).toBeCloseTo(533 * scale, 6);
    expect(dy).toBe(0);
    expect(dx + dw / 2).toBeCloseTo(CARD_W / 2, 6);
    expect(ctx.ops.some((o) => o.op === "clip")).toBe(true);
    expect(ctx.ops.some((o) => o.op === "ellipse")).toBe(false);
    const scrim = ctx.ops.filter((o) => o.op === "fillRect" && o.fillStyle === "gradient");
    expect(scrim).toHaveLength(1);
    const [sx, sy, sw, sh] = scrim[0]!.args as number[];
    expect([sx, sy, sw, sh]).toEqual([0, winH * 0.7, CARD_W, winH * 0.3]);
  });
});

describe("paintText", () => {
  it("draws nothing at 0 lines and everything at 7, in print order", () => {
    const none = fakeContext();
    expect(paintText(none, CARD_W, CARD_H, byId("linux-engineer"), 0).bottom).toBe(0);
    expect(none.texts()).toEqual([]);

    const all = fakeContext();
    paintText(all, CARD_W, CARD_H, byId("linux-engineer"), PRINT_STEPS);
    const texts = all.texts();
    const idx = (needle: string) => texts.findIndex((t) => t.includes(needle));
    expect(idx("Linux Engineer")).toBeGreaterThanOrEqual(0);
    expect(idx("Caris Life Sciences · Oct 2019 – May 2021")).toBeGreaterThan(idx("Linux Engineer"));
    expect(idx("status --rank 6")).toBeGreaterThan(idx("Caris"));
    expect(idx("on_arrival")).toBeGreaterThan(idx("status"));
    expect(idx("acquired")).toBeGreaterThan(idx("on_arrival"));
    expect(idx("xp")).toBeGreaterThan(idx("acquired"));
    expect(idx("tenure")).toBeGreaterThan(idx("xp"));
    expect(idx("EVL-06/07")).toBeGreaterThan(idx("tenure"));
    expect(texts.at(-1)).toBe("S");
  });

  it("puts the quote in the window, right-aligned, italic fog, within 42% of the width", () => {
    const ctx = fakeContext();
    paintText(ctx, CARD_W, CARD_H, byId("linux-engineer"), 1);
    const quote = ctx.ops.filter((o) => o.op === "fillText" && o.textAlign === "right");
    expect(quote.length).toBeGreaterThanOrEqual(2);
    expect(quote.join("")).toBeDefined();
    const words = quote.map((o) => String(o.args[0]));
    expect(words[0]!.startsWith("“")).toBe(true);
    expect(words.at(-1)!.endsWith("”")).toBe(true);
    for (const o of quote) {
      expect(o.font).toMatch(/^italic 400 10px/);
      expect(o.fillStyle).toBe(COLORS.fog);
      expect(o.args[1]).toBe(CARD_W - 14);
      expect(String(o.args[0]).length * 6).toBeLessThanOrEqual(CARD_W * 0.42);
      expect(o.args[2] as number).toBeLessThan(CARD_H * WINDOW - 40);
    }
  });

  it("prints each acquired skill in a slate box, eight of them and +6 for S", () => {
    const ctx = fakeContext();
    paintText(ctx, CARD_W, CARD_H, byId("linux-engineer"), 4);
    const boxes = ctx.rects("strokeRect").filter((r) => r.color === COLORS.slate);
    expect(boxes).toHaveLength(9);
    expect(ctx.texts()).toContain("+6");
    expect(ctx.texts()).toContain("Ansible");
  });

  it("lights the xp blocks in ember and the rest in slate, then the percentage", () => {
    const ctx = fakeContext();
    paintText(ctx, CARD_W, CARD_H, byId("linux-engineer"), 5);
    const lit = ctx.ops.find((o) => o.op === "fillText" && o.args[0] === "▮▮▮▮▮")!;
    const dark = ctx.ops.find((o) => o.op === "fillText" && o.args[0] === "▯▯▯▯▯")!;
    expect(lit.fillStyle).toBe(COLORS.ember);
    expect(dark.fillStyle).toBe(COLORS.slate);
    expect(ctx.texts()).toContain("50%");
  });

  it("adds the ember cursor after the tenure only when asked", () => {
    const off = fakeContext();
    paintText(off, CARD_W, CARD_H, byId("linux-engineer"), 6, false);
    expect(off.texts()).not.toContain("▮");
    const on = fakeContext();
    paintText(on, CARD_W, CARD_H, byId("linux-engineer"), 6, true);
    const cursor = on.ops.filter((o) => o.op === "fillText" && o.args[0] === "▮");
    expect(cursor).toHaveLength(1);
    expect(cursor[0]!.fillStyle).toBe(COLORS.ember);
    expect(on.texts().indexOf("▮")).toBe(on.texts().indexOf("19 months") + 1);
  });

  it("stays inside the card and above the footer for every stage at the smallest size", () => {
    const w = Math.round(320 * (5 / 7));
    const h = 320;
    for (const stage of career) {
      for (const lines of [0, 1, 2, 3, 4, 5, 6, 7]) {
        const ctx = fakeContext();
        const { bottom } = paintText(ctx, w, h, cardModel(stage, NOW), lines, true);
        expectInside(ctx.ops, w, h);
        if (lines >= 2 && lines < PRINT_STEPS) {
          expect(bottom, `${stage.id} at ${lines} lines`).toBeLessThanOrEqual(
            h - 20 * (w / CARD_W),
          );
        }
      }
    }
  });

  it("stays inside the card at the reference and double sizes too", () => {
    for (const [w, h] of [
      [CARD_W, CARD_H],
      [CARD_W * 2, CARD_H * 2],
    ]) {
      for (const stage of career) {
        const ctx = fakeContext();
        paintText(ctx, w!, h!, cardModel(stage, NOW), PRINT_STEPS, true);
        expectInside(ctx.ops, w!, h!);
        const body = fakeContext();
        paintBody(body, w!, h!, cardModel(stage, NOW), fakeImage(800, 533));
        expectInside(body.ops, w!, h!);
      }
    }
  });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `pnpm vitest run test/deckPaint.test.ts`
Expected: FAIL, `cardModel` is not exported.

- [ ] **Step 3: Write the body and text painters**

Append to `src/scripts/deck/deck-paint.ts` (and add to the imports at the top: `import { acquired, formatRange, setNumber, tenure, xp, xpBlocks, type CareerStage } from "../../data/career";` and `import { deckArtById, type DeckArt } from "../../data/deck";`):

```ts
export interface CardModel {
  stage: CareerStage;
  art: DeckArt;
  dates: string;
  tenure: string;
  xp: number;
  blocks: number;
  acquired: string[];
  setNumber: string;
}

/** Everything a card prints, computed once per stage for a fixed `now` (the build date). */
export function cardModel(stage: CareerStage, now: Date): CardModel {
  const art = deckArtById[stage.id];
  if (!art) throw new Error(`No deck art for ${stage.id}`);
  const value = xp(stage, now);
  return {
    stage,
    art,
    dates: formatRange(stage.start, stage.end),
    tenure: tenure(stage, now),
    xp: value,
    blocks: xpBlocks(value),
    acquired: acquired(stage),
    setNumber: setNumber(stage),
  };
}

/** The print-in's steps: name plate, header, on_arrival, acquired, xp, tenure, footer. */
export const PRINT_STEPS = 7;

/** Greedy word wrap by the context's current font. */
export function wrapText(ctx: Ctx, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function xpGlyphs(blocks: number, total = 10): { lit: string; dark: string } {
  const lit = Math.min(total, Math.max(0, blocks));
  return { lit: "▮".repeat(lit), dark: "▯".repeat(total - lit) };
}

/**
 * The body layer: carbon, the void window with the portrait cover-fitted (or the placeholder),
 * a scrim over the window's bottom 30% so the name plate reads, and the divider.
 */
export function paintBody(
  ctx: Ctx,
  w: number,
  h: number,
  card: CardModel,
  portrait: CanvasImageSource | null,
): void {
  const winH = h * WINDOW;
  ctx.fillStyle = COLORS.carbon;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = COLORS.void;
  ctx.fillRect(0, 0, w, winH);
  if (portrait) {
    const iw = (portrait as { width: number }).width;
    const ih = (portrait as { height: number }).height;
    const scale = Math.max(w / iw, winH / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, winH);
    ctx.clip();
    ctx.drawImage(portrait, (w - dw) / 2, 0, dw, dh);
    ctx.restore();
  } else {
    paintPlaceholder(ctx, 0, 0, w, winH, card.art.eyeColor);
  }
  const scrim = ctx.createLinearGradient(0, winH * 0.7, 0, winH);
  scrim.addColorStop(0, "rgba(0,0,0,0)");
  scrim.addColorStop(1, "rgba(0,0,0,0.7)");
  ctx.fillStyle = scrim;
  ctx.fillRect(0, winH * 0.7, w, winH * 0.3);
  ctx.fillStyle = COLORS.iron;
  ctx.fillRect(0, winH, w, 1);
}

/** `$ key` in ember and ash at (x, y); returns the x after the key. */
function key(ctx: Ctx, label: string, x: number, y: number, px: number): number {
  ctx.font = font(px);
  ctx.fillStyle = COLORS.ember;
  ctx.fillText("$", x, y);
  const dollar = ctx.measureText("$ ").width;
  ctx.fillStyle = COLORS.ash;
  ctx.fillText(label, x + dollar, y);
  return x + dollar + ctx.measureText(label).width;
}

/**
 * The text layer for the first `lines` print steps (0–7). Clears first. Returns the lowest y it
 * drew, so a caller (and the tests) can see whether the sheet fits.
 */
export function paintText(
  ctx: Ctx,
  w: number,
  h: number,
  card: CardModel,
  lines: number,
  cursor = false,
): { bottom: number } {
  const s = w / CARD_W;
  const winH = h * WINDOW;
  const left = 12 * s;
  const right = w - 12 * s;
  ctx.clearRect(0, 0, w, h);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  let bottom = 0;
  if (lines < 1) return { bottom };

  // 1. The name plate and the quote, in the window.
  ctx.fillStyle = COLORS.paper;
  ctx.font = font(14 * s);
  ctx.fillText(card.stage.shortTitle ?? card.stage.title, left, winH - 26 * s);
  ctx.fillStyle = COLORS.fog;
  ctx.font = font(10 * s);
  ctx.fillText(`${card.stage.org} · ${card.dates}`, left, winH - 12 * s);
  ctx.font = font(10 * s, 400, true);
  ctx.textAlign = "right";
  ctx.shadowColor = COLORS.void;
  ctx.shadowBlur = 8 * s;
  let qy = 48 * s;
  for (const line of wrapText(ctx, `“${card.stage.log}”`, w * 0.42)) {
    ctx.fillText(line, w - 14 * s, qy);
    qy += 14 * s;
  }
  ctx.shadowBlur = 0;
  ctx.textAlign = "left";
  bottom = winH - 12 * s;
  if (lines < 2) return { bottom };

  // 2. The header.
  let y = winH + 20 * s;
  ctx.font = font(9 * s);
  ctx.fillStyle = COLORS.ash;
  ctx.fillText("~/journey", left, y);
  const after = left + ctx.measureText("~/journey ").width;
  key(ctx, `status --rank ${card.stage.rank}`, after, y, 9 * s);
  bottom = y;
  if (lines < 3) return { bottom };

  // 3. on_arrival
  y += 14 * s;
  key(ctx, "on_arrival", left, y, 9 * s);
  y += 12 * s;
  ctx.font = font(10 * s);
  ctx.fillStyle = COLORS.fog;
  for (const line of wrapText(ctx, card.stage.summary, right - left)) {
    ctx.fillText(line, left, y);
    y += 15 * s;
  }
  bottom = y - 15 * s;
  if (lines < 4) return { bottom };

  // 4. acquired: tags in slate boxes, wrapping.
  y += 2 * s;
  key(ctx, "acquired", left, y, 9 * s);
  y += 13 * s;
  ctx.font = font(9 * s);
  ctx.lineWidth = 1;
  ctx.strokeStyle = COLORS.slate;
  let tx = left;
  for (const tag of card.acquired) {
    const tw = ctx.measureText(tag).width + 8 * s;
    if (tx + tw > right) {
      tx = left;
      y += 14 * s;
    }
    ctx.strokeRect(tx + 0.5, y - 9.5 * s, tw, 12 * s);
    ctx.fillStyle = COLORS.ash;
    ctx.fillText(tag, tx + 4 * s, y);
    tx += tw + 3 * s;
  }
  bottom = y + 2.5 * s;
  if (lines < 5) return { bottom };

  // 5. xp
  y += 16 * s;
  const glyphs = xpGlyphs(card.blocks);
  let gx = key(ctx, "xp", left, y, 9 * s) + 6 * s;
  ctx.font = font(10 * s);
  ctx.fillStyle = COLORS.ember;
  if (glyphs.lit) ctx.fillText(glyphs.lit, gx, y);
  gx += ctx.measureText(glyphs.lit).width;
  ctx.fillStyle = COLORS.slate;
  if (glyphs.dark) ctx.fillText(glyphs.dark, gx, y);
  gx += ctx.measureText(glyphs.dark).width + 6 * s;
  ctx.font = font(9 * s);
  ctx.fillStyle = COLORS.ash;
  ctx.fillText(`${Math.round(card.xp * 100)}%`, gx, y);
  bottom = y;
  if (lines < 6) return { bottom };

  // 6. tenure, with the cursor.
  y += 14 * s;
  const vx = key(ctx, "tenure", left, y, 9 * s) + 6 * s;
  ctx.font = font(10 * s);
  ctx.fillStyle = COLORS.paper;
  ctx.fillText(card.tenure, vx, y);
  if (cursor) {
    ctx.fillStyle = COLORS.ember;
    ctx.fillText("▮", vx + ctx.measureText(`${card.tenure} `).width, y);
  }
  bottom = y;
  if (lines < 7) return { bottom };

  // 7. The footer.
  ctx.font = font(9 * s);
  ctx.fillStyle = COLORS.steel;
  ctx.fillText(card.setNumber, left, h - 12 * s);
  ctx.textAlign = "right";
  ctx.fillText(card.stage.rankLabel, right, h - 12 * s);
  ctx.textAlign = "left";
  return { bottom: h - 12 * s };
}
```

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run test/deckPaint.test.ts`
Expected: PASS. If the smallest-size test fails on a long summary (rank D's is the longest), the fix is in the painter, not the test: reduce `on_arrival` to a 9 px font below `s < 0.6` and re-run; the sheet must fit at 320 px.

- [ ] **Step 5: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test`

```bash
git add src/scripts/deck/deck-paint.ts test/deckPaint.test.ts
git commit -m "deck: body and text painters with the print-in steps"
```

---

### Task 11: Keep the painters' palette in sync with the tokens

**Files:**

- Test: `test/deckPalette.test.ts`

- [ ] **Step 1: Write the test (it should pass at once; it exists to catch drift)**

Create `test/deckPalette.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COLORS } from "../src/scripts/deck/deck-paint";

const css = readFileSync("src/styles/tokens.css", "utf8");
const token = (name: string) => new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css)?.[1];

describe("the deck painters' palette", () => {
  it("uses the token values for every named surface and text colour", () => {
    for (const name of [
      "void",
      "carbon",
      "graphite",
      "iron",
      "slate",
      "steel",
      "ash",
      "fog",
      "paper",
      "ember",
    ] as const) {
      expect(COLORS[name], name).toBe(token(name)!.toLowerCase());
    }
  });

  it("keeps violet at the ADR 0003 value and the back a step below carbon", () => {
    expect(COLORS.violet).toBe("#7040d2");
    expect(COLORS.back).toBe("#0e0e0e");
  });

  it("has no other hex colours in the deck scripts", () => {
    const allowed = new Set([...Object.values(COLORS), "#2a2a2a", "#1b1526", "#0b0b0b", "#0d0d0d"]);
    for (const file of ["deck-paint.ts", "deck-pose.ts", "deck-layout.ts", "deck-params.ts"]) {
      const text = readFileSync(`src/scripts/deck/${file}`, "utf8");
      for (const hex of text.match(/#[0-9a-fA-F]{6}\b/g) ?? []) {
        expect(allowed.has(hex.toLowerCase()), `${hex} in ${file}`).toBe(true);
      }
    }
  });
});
```

- [ ] **Step 2: Run it**

Run: `pnpm vitest run test/deckPalette.test.ts`
Expected: PASS. If a token value differs from `COLORS`, fix `COLORS`, never the token.

- [ ] **Step 3: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test`

```bash
git add test/deckPalette.test.ts
git commit -m "test: the deck painters use the token palette"
```

---

### Task 12: Trace the card back's devil mark

**Files:**

- Create: `scripts/trace-mark.mjs`
- Create: `src/images/devil-mark.svg` (the script's output, committed)
- Test: `test/traceMark.test.ts`

**Interfaces:**

- Produces: `traceMark(input: string, output: string): Promise<{ width: number; height: number; d: string }>` — traces the opaque pixels (alpha > 128) of a WebP/PNG to one path and writes an SVG with `fill="#3a3a3a"` and the image's viewBox. CLI: `node scripts/trace-mark.mjs <input> <output.svg>`.
- Consumes: `tracePath(png, opts)` from `scripts/trace-vector.mjs` (potrace on a black-on-white PNG buffer).

- [ ] **Step 1: Write the failing test**

Create `test/traceMark.test.ts`:

```ts
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { traceMark } from "../scripts/trace-mark.mjs";

let dir: string | undefined;
const tmp = () => (dir = mkdtempSync(join(tmpdir(), "mark-")));
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

/** A 120 × 120 transparent PNG with an opaque yellow disc in the middle. */
async function disc(path: string): Promise<void> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><circle cx="60" cy="60" r="40" fill="#f8f818"/></svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path);
}

describe("traceMark", () => {
  it("traces the opaque pixels into one slate path with the image's viewBox", async () => {
    const d = tmp();
    await disc(join(d, "disc.png"));
    const result = await traceMark(join(d, "disc.png"), join(d, "mark.svg"));
    expect(result).toMatchObject({ width: 120, height: 120 });
    const svg = readFileSync(join(d, "mark.svg"), "utf8");
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 120 120">/);
    expect(svg.match(/<path /g)).toHaveLength(1);
    expect(svg).toContain('fill="#3a3a3a"');
    expect(svg).not.toContain("style=");
    // A disc's path spans most of the image.
    const xs = [...result.d.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
    expect(Math.min(...xs)).toBeLessThan(30);
    expect(Math.max(...xs)).toBeGreaterThan(90);
  });

  it("runs as a CLI", async () => {
    const d = tmp();
    await disc(join(d, "disc.png"));
    execFileSync(process.execPath, [
      resolve("scripts/trace-mark.mjs"),
      join(d, "disc.png"),
      join(d, "out.svg"),
    ]);
    expect(existsSync(join(d, "out.svg"))).toBe(true);
  });
});

describe("the committed devil mark", () => {
  it("is one slate path traced from logo-devil.webp", () => {
    const svg = readFileSync("src/images/devil-mark.svg", "utf8");
    expect(svg).toContain('viewBox="0 0 226 242"');
    expect(svg.match(/<path /g)).toHaveLength(1);
    expect(svg).toContain('fill="#3a3a3a"');
    expect(svg.length).toBeLessThan(20_000);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm vitest run test/traceMark.test.ts`
Expected: FAIL, cannot find module `../scripts/trace-mark.mjs`.

- [ ] **Step 3: Write the script**

Create `scripts/trace-mark.mjs`:

```js
// Traces the devil crop of the logo to one path for the journey deck's card back (deck spec §5).
// Opaque pixels (alpha > 128) become the shape; potrace does the rest through trace-vector.mjs.
// One-off: the output is committed as src/images/devil-mark.svg.
// Usage: node scripts/trace-mark.mjs src/images/logo-devil.webp src/images/devil-mark.svg
import { realpathSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { tracePath } from "./trace-vector.mjs";

export const MARK_FILL = "#3a3a3a";

export async function traceMark(input, output) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  // potrace wants black shapes on white.
  const px = Buffer.alloc(width * height * 3, 255);
  for (let i = 0; i < width * height; i++) {
    if (data[i * 4 + 3] > 128) px[i * 3] = px[i * 3 + 1] = px[i * 3 + 2] = 0;
  }
  const png = await sharp(px, { raw: { width, height, channels: 3 } })
    .png()
    .toBuffer();
  const d = await tracePath(png, { turdSize: 4, decimals: 1 });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><path fill="${MARK_FILL}" d="${d}"/></svg>\n`;
  writeFileSync(output, svg);
  return { width, height, d };
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) {
    console.error("usage: node scripts/trace-mark.mjs <input> <output.svg>");
    process.exit(1);
  }
  const { width, height, d } = await traceMark(input, output);
  console.log(`${output}: ${width}×${height}, ${d.length} path characters`);
}
```

- [ ] **Step 4: Trace the real mark**

Run: `node scripts/trace-mark.mjs src/images/logo-devil.webp src/images/devil-mark.svg`
Expected: prints `src/images/devil-mark.svg: 226×242, N path characters`. Open the SVG (or `qlmanage -p`) and confirm it reads as the devil silhouette; if the horns are lost, lower `turdSize` to 2 and re-run.

- [ ] **Step 5: Run the tests**

Run: `pnpm vitest run test/traceMark.test.ts`
Expected: PASS.

- [ ] **Step 6: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test`

```bash
git add scripts/trace-mark.mjs src/images/devil-mark.svg test/traceMark.test.ts
git commit -m "deck: trace the devil mark for the card back"
```

---

### Task 13: The portrait import with the violet glow mask

**Files:**

- Create: `scripts/import-portrait.mjs`
- Test: `test/importPortrait.test.ts`

**Interfaces:**

- Produces:

  ```js
  export const GLOW = { hueMin: 250, hueMax: 285, satMin: 0.35, valMin: 0.25, blur: 3, maskWidth: 400, sourceWidth: 1600, quality: 82 };
  export function isViolet(r, g, b, glow = GLOW): boolean;
  export async function glowMask(input, glow = GLOW): Promise<{ mask: Buffer, width, height, coverage }>; // coverage in percent, before the blur
  export async function importPortrait(input, id, { outDir = "src/images/deck", band, glow = GLOW } = {}): Promise<{ width, height, coverage, files: string[] }>;
  ```

  Writes `<outDir>/<id>.webp` (1600 px wide, quality 82, metadata stripped, never enlarged) and `<outDir>/<id>-glow.webp` (400 px wide, greyscale, the mask blurred 3 px). With `band = [min, max]`, throws `Error("glow coverage X% is outside the band [min, max] for <id>")` when outside; the source files are still written first so the render can be inspected. CLI: `node scripts/import-portrait.mjs <file> <stage-id>` reads the band from `src/data/deck-glow-bands.json`.

- [ ] **Step 1: Write the failing tests**

Create `test/importPortrait.test.ts`:

```ts
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { glowMask, importPortrait, isViolet } from "../scripts/import-portrait.mjs";

let dir: string | undefined;
const tmp = () => (dir = mkdtempSync(join(tmpdir(), "portrait-")));
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

/** A 900 × 600 near-black image with a violet block covering `percent` of it. */
async function render(path: string, percent: number): Promise<void> {
  const w = 900;
  const h = 600;
  const side = Math.round(Math.sqrt((percent / 100) * w * h));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#0a0a0a"/><rect x="100" y="100" width="${side}" height="${side}" fill="#7040d2"/></svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path);
}

describe("isViolet", () => {
  it("keys the deck's violet and its lighter tints, not greys, ember or blue", () => {
    expect(isViolet(0x70, 0x40, 0xd2)).toBe(true);
    expect(isViolet(0x9d, 0x7c, 0xf0)).toBe(true);
    expect(isViolet(0x84, 0x84, 0x84)).toBe(false);
    expect(isViolet(0xda, 0x5c, 0x2c)).toBe(false);
    expect(isViolet(0x20, 0x60, 0xff)).toBe(false);
    expect(isViolet(0x10, 0x08, 0x20)).toBe(false); // too dark to count
  });
});

describe("glowMask", () => {
  it("measures the violet coverage and returns a 400 px single-channel mask", async () => {
    const d = tmp();
    await render(join(d, "in.png"), 2);
    const { mask, width, height, coverage } = await glowMask(join(d, "in.png"));
    expect(width).toBe(400);
    expect(height).toBe(267);
    expect(mask.length).toBe(400 * 267);
    expect(coverage).toBeGreaterThan(1.7);
    expect(coverage).toBeLessThan(2.3);
  });

  it("reports zero for an image without violet", async () => {
    const d = tmp();
    await render(join(d, "in.png"), 0);
    expect((await glowMask(join(d, "in.png"))).coverage).toBe(0);
  });
});

describe("importPortrait", () => {
  it("writes the 1600 px source and the blurred mask, never enlarging", async () => {
    const d = tmp();
    await render(join(d, "in.png"), 1.5);
    const result = await importPortrait(join(d, "in.png"), "linux-engineer", {
      outDir: d,
      band: [0.3, 2],
    });
    expect(result.files).toEqual([
      join(d, "linux-engineer.webp"),
      join(d, "linux-engineer-glow.webp"),
    ]);
    const source = await sharp(join(d, "linux-engineer.webp")).metadata();
    expect(source.format).toBe("webp");
    expect(source.width).toBe(900);
    const glow = await sharp(join(d, "linux-engineer-glow.webp")).metadata();
    expect(glow.width).toBe(400);
    expect(glow.height).toBe(267);
    const { channels } = await sharp(join(d, "linux-engineer-glow.webp")).stats();
    // Mostly black with a soft bright patch: the mean is low, the max is white.
    expect(channels[0]!.mean).toBeLessThan(20);
    expect(channels[0]!.max).toBe(255);
  });

  it("shrinks a 4K render to 1600 px wide", async () => {
    const d = tmp();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="3840" height="2560"><rect width="3840" height="2560" fill="#0a0a0a"/></svg>`;
    await sharp(Buffer.from(svg)).png().toFile(join(d, "big.png"));
    await importPortrait(join(d, "big.png"), "t1-support", { outDir: d, band: [0, 0.05] });
    expect((await sharp(join(d, "t1-support.webp")).metadata()).width).toBe(1600);
  });

  it("refuses a render whose coverage is outside the band, naming both", async () => {
    const d = tmp();
    await render(join(d, "in.png"), 6);
    await expect(
      importPortrait(join(d, "in.png"), "linux-engineer", { outDir: d, band: [0.3, 2] }),
    ).rejects.toThrow(/glow coverage \d\.\d+% is outside the band \[0\.3, 2\] for linux-engineer/);
    // The files are still there to look at.
    expect(existsSync(join(d, "linux-engineer.webp"))).toBe(true);
  });

  it("runs as a CLI and reads the band from deck-glow-bands.json", async () => {
    const d = tmp();
    await render(join(d, "in.png"), 30); // far outside S+'s 1–8% band
    expect(() =>
      execFileSync(
        process.execPath,
        [
          resolve("scripts/import-portrait.mjs"),
          join(d, "in.png"),
          "systems-architect",
          "--out",
          d,
        ],
        {
          stdio: "pipe",
        },
      ),
    ).toThrow(/outside the band \[1, 8\]/);
    await render(join(d, "ok.png"), 3);
    const out = execFileSync(
      process.execPath,
      [resolve("scripts/import-portrait.mjs"), join(d, "ok.png"), "systems-architect", "--out", d],
      { encoding: "utf8" },
    );
    expect(out).toMatch(/systems-architect: 900×600, glow [23]\.\d+% \(band 1–8%\)/);
  });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `pnpm vitest run test/importPortrait.test.ts`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Write the script**

Create `scripts/import-portrait.mjs`:

```js
// Imports a Higgsfield portrait for the journey deck (deck spec §10): the 1600 px WebP source
// astro:assets serves the card and the timeline from, and a 400 px greyscale glow mask made by
// keying the portrait's violet (the eyes from rank B up, the coat's energy at S+). The mask's
// coverage must sit inside the rank's band from src/data/deck-glow-bands.json, or the render is
// wrong and gets re-rolled.
// Usage: node scripts/import-portrait.mjs <render> <stage-id> [--out src/images/deck]
import { existsSync, mkdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

export const GLOW = {
  hueMin: 250,
  hueMax: 285,
  satMin: 0.35,
  valMin: 0.25,
  blur: 3,
  maskWidth: 400,
  sourceWidth: 1600,
  quality: 82,
};

/** Is this pixel the deck's violet? HSV hue 250–285°, saturation over 0.35, value over 0.25. */
export function isViolet(r, g, b, glow = GLOW) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const value = max / 255;
  if (value < glow.valMin || max === 0) return false;
  const sat = (max - min) / max;
  if (sat < glow.satMin) return false;
  const delta = max - min;
  let hue;
  if (delta === 0) hue = 0;
  else if (max === r) hue = 60 * (((g - b) / delta) % 6);
  else if (max === g) hue = 60 * ((b - r) / delta + 2);
  else hue = 60 * ((r - g) / delta + 4);
  if (hue < 0) hue += 360;
  return hue >= glow.hueMin && hue <= glow.hueMax;
}

/** The violet mask at `maskWidth`, one byte per pixel, and its coverage in percent. */
export async function glowMask(input, glow = GLOW) {
  const { data, info } = await sharp(input)
    .resize({ width: glow.maskWidth, withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const mask = Buffer.alloc(width * height, 0);
  let hits = 0;
  for (let i = 0; i < width * height; i++) {
    if (isViolet(data[i * 3], data[i * 3 + 1], data[i * 3 + 2], glow)) {
      mask[i] = 255;
      hits++;
    }
  }
  return { mask, width, height, coverage: (hits / (width * height)) * 100 };
}

export async function importPortrait(
  input,
  id,
  { outDir = "src/images/deck", band, glow = GLOW } = {},
) {
  mkdirSync(outDir, { recursive: true });
  const source = join(outDir, `${id}.webp`);
  const glowFile = join(outDir, `${id}-glow.webp`);
  const meta = await sharp(input)
    .resize({ width: glow.sourceWidth, withoutEnlargement: true })
    .webp({ quality: glow.quality })
    .toFile(source);
  const { mask, width, height, coverage } = await glowMask(input, glow);
  await sharp(mask, { raw: { width, height, channels: 1 } })
    .blur(glow.blur)
    .webp({ quality: 90 })
    .toFile(glowFile);
  if (band && (coverage < band[0] || coverage > band[1])) {
    throw new Error(
      `glow coverage ${coverage.toFixed(2)}% is outside the band [${band[0]}, ${band[1]}] for ${id}`,
    );
  }
  return { width: meta.width, height: meta.height, coverage, files: [source, glowFile] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const outIndex = args.indexOf("--out");
  const outDir = outIndex >= 0 ? args[outIndex + 1] : "src/images/deck";
  const [input, id] = args.filter((_, i) => i !== outIndex && i !== outIndex + 1);
  if (!input || !id) {
    console.error("usage: node scripts/import-portrait.mjs <render> <stage-id> [--out <dir>]");
    process.exit(1);
  }
  const bandsPath = join(
    dirname(realpathSync(process.argv[1])),
    "..",
    "src/data/deck-glow-bands.json",
  );
  const bands = existsSync(bandsPath) ? JSON.parse(readFileSync(bandsPath, "utf8")) : {};
  const band = bands[id];
  if (!band) {
    console.error(`no glow band for ${id} in src/data/deck-glow-bands.json`);
    process.exit(1);
  }
  try {
    const { width, height, coverage } = await importPortrait(input, id, { outDir, band });
    console.log(
      `${id}: ${width}×${height}, glow ${coverage.toFixed(2)}% (band ${band[0]}–${band[1]}%)`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
```

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run test/importPortrait.test.ts`
Expected: PASS. (If the coverage of the 2 % block lands outside 1.7–2.3 because of resampling at the block's edges, widen the block's coordinates in the test's SVG to whole multiples of the 2.25 downscale factor, e.g. `x="99" y="99"`, rather than the assertion.)

- [ ] **Step 5: Gate and commit**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test`

```bash
git add scripts/import-portrait.mjs test/importPortrait.test.ts
git commit -m "deck: import a portrait with its violet glow mask and coverage band"
```

---

### Task 14: Documentation and the full gate

**Files:**

- Modify: `CLAUDE.md` ("Where things live")

- [ ] **Step 1: Add one bullet to CLAUDE.md**

In `CLAUDE.md`, under "## Where things live", after the `art/journey/` bullet, add:

```markdown
- The journey card deck (spec `docs/superpowers/specs/2026-09-25-journey-card-deck-design.md`) is being built in phases; the vector scene stays live until Phase 3 swaps it. Foundations: `src/data/deck.ts` (per-rank art record) with `deck-glow-bands.json`, `src/scripts/deck/` (`deck-params.ts` constants, `deck-layout.ts`, `deck-pose.ts`, `deck-paint.ts`), `scripts/import-portrait.mjs` (portraits into `src/images/deck/<stage-id>.webp` plus a `-glow.webp` mask) and `src/images/devil-mark.svg` (the card back's mark, from `scripts/trace-mark.mjs`).
```

- [ ] **Step 2: Run the full gate, including the build and the size check**

Run: `pnpm format && pnpm lint && pnpm check && pnpm test && pnpm build && pnpm size`
Expected: `0 errors`, all tests pass, the build succeeds, every `pnpm size` row is `ok` (this plan adds nothing to the client bundle: the deck scripts are not imported by any page yet).

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: where the journey deck's foundations live"
```

- [ ] **Step 4: Report**

Tell the controller: the branch's head, that all fourteen tasks are committed, and the output of `pnpm size`. The controller pushes and writes the Build Log entry.
