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
