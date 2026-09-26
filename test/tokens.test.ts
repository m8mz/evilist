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

/** Font variables the Astro Fonts API sets on :root: every `cssVariable` in astro.config.ts. */
const configFontVars = [
  ...readFileSync("astro.config.ts", "utf8").matchAll(/cssVariable:\s*"(--[a-z0-9-]+)"/g),
].map((m) => m[1]);

/** Custom properties set at runtime rather than in tokens.css. */
const PROVIDED = new Set([
  ...configFontVars, // set by <Font cssVariable> in Head.astro
  "--progress", // set on [data-deck] by src/scripts/deck/index.ts
  "--net-scale", // set on [data-network] by scripts/stack-network.ts
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

  it("keeps every text colour AA on every surface text sits on", () => {
    // Tags and key labels (ash) sit inside graphite panels, the lightest text surface.
    for (const surface of ["void", "carbon", "graphite"]) {
      for (const text of ["paper", "fog", "ash", "ember"]) {
        const ratio = contrast(color(text), color(surface));
        expect(ratio, `${text} on ${surface}: ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("puts void text on ember fills, because paper on ember fails AA", () => {
    expect(contrast(color("void"), color("ember"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(color("paper"), color("ember"))).toBeLessThan(4.5);
  });

  it("wires the configured font into --font-mono and loads it in Head", () => {
    // If these drift apart, every page silently falls back to ui-monospace.
    expect(configFontVars.length).toBeGreaterThan(0);
    const head = readFileSync("src/components/seo/Head.astro", "utf8");
    for (const v of configFontVars) {
      expect(head, `Head.astro loads ${v}`).toContain(`<Font cssVariable="${v}"`);
    }
    const fontMono = tokens.get("--font-mono") ?? "";
    expect(
      configFontVars.some((v) => fontMono.startsWith(`var(${v})`)),
      fontMono,
    ).toBe(true);
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
