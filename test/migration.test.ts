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

describe("the retired E+ rank (the ladder is E → S+ since hero v2 Phase 2)", () => {
  it("appears nowhere in src", () => {
    // \b keeps htop's "TIME+" column header from matching.
    const hits = sourceFiles("src").filter((file) => /\bE\+/.test(readFileSync(file, "utf8")));
    expect(hits).toEqual([]);
  });
});
