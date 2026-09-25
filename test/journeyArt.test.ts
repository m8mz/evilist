import { describe, expect, it } from "vitest";
import { career } from "../src/data/career";
import { stageArt } from "../src/data/journeyArt";

describe("journey art", () => {
  it("gives every career stage, and only those, a 16:9 still and an illustration subject", () => {
    expect(Object.keys(stageArt).sort()).toEqual(career.map((s) => s.id).sort());
    for (const stage of career) {
      const { still, subject } = stageArt[stage.id];
      expect(subject.length, stage.id).toBeGreaterThan(20);
      expect(still.width, stage.id).toBeGreaterThanOrEqual(1920);
      expect(still.width / still.height, stage.id).toBeCloseTo(16 / 9, 1);
    }
  });

  it("exports no clip sources any more", async () => {
    const art = await import("../src/data/journeyArt");
    expect(Object.keys(art).sort()).toEqual(["stageArt"]);
  });
});
