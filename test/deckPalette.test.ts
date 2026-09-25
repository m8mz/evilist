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
    for (const file of [
      "deck-paint.ts",
      "deck-pose.ts",
      "deck-layout.ts",
      "deck-params.ts",
      "deck-tier.ts",
      "deck-util.ts",
      "deck-rail.ts",
    ]) {
      const text = readFileSync(`src/scripts/deck/${file}`, "utf8");
      for (const hex of text.match(/#[0-9a-fA-F]{6}\b/g) ?? []) {
        expect(allowed.has(hex.toLowerCase()), `${hex} in ${file}`).toBe(true);
      }
    }
  });
});
