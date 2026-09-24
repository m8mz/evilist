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
  "src/components/journey/Journey.astro",
  "src/components/journey/JourneyTimeline.astro",
  "src/components/journey/JourneyScene.astro",
  "src/components/home/Skills.astro",
  "src/components/home/Topology.astro",
  "src/components/home/Work.astro",
  "src/components/home/About.astro",
  "src/components/home/CTA.astro",
  "src/pages/index.astro",
  "src/pages/404.astro",
  "src/components/ui/Icon.astro",
  "src/components/home/NowColumns.astro",
  "src/components/home/OffTheClock.astro",
  "src/components/ui/Still.astro",
  "src/components/home/Htop.astro",
  "src/pages/now.astro",
  "src/pages/og-card.astro",
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
