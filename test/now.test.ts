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
