import { readdirSync, readFileSync } from "node:fs";
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
    const allowed = new Set([
      ...Object.values(COLORS),
      "#2a2a2a",
      "#1b1526",
      "#0b0b0b",
      "#0d0d0d",
      "#050505",
      "#9080ff", // deck-stage's rim light: a violet sheen colour baked into the stage, not a token
      "#1b1b1b", // deck-stage's slab edge colour
      "#ffffff", // deck-stage's light/emissive-map recipe base: pure white, not a design token
    ]);
    // Three.js colours are numeric (0xrrggbb), so the scan matches both forms and canonicalises
    // to "#rrggbb" before checking the allow-list. Every script in the deck directory is scanned,
    // not a hard-coded list, so a new file (e.g. `index.ts` today, `deck-bloom.ts` later) is
    // checked automatically instead of silently skipped.
    for (const file of readdirSync("src/scripts/deck").filter((f) => f.endsWith(".ts"))) {
      const text = readFileSync(`src/scripts/deck/${file}`, "utf8");
      for (const hex of text.match(/(?:#|0x)[0-9a-fA-F]{6}\b/g) ?? []) {
        const canonical = `#${hex.slice(-6)}`.toLowerCase();
        expect(allowed.has(canonical), `${hex} in ${file}`).toBe(true);
      }
    }
  });
});
