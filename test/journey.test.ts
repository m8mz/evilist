import { describe, expect, it } from "vitest";
import { stageForProgress } from "../src/scripts/journey";

describe("stageForProgress", () => {
  it("splits progress evenly across the stages", () => {
    expect(stageForProgress(0, 7)).toBe(0);
    expect(stageForProgress(0.14, 7)).toBe(0);
    expect(stageForProgress(0.15, 7)).toBe(1);
    expect(stageForProgress(0.5, 7)).toBe(3);
    expect(stageForProgress(0.99, 7)).toBe(6);
  });

  it("clamps overscroll and bad input", () => {
    expect(stageForProgress(1, 7)).toBe(6);
    expect(stageForProgress(1.4, 7)).toBe(6);
    expect(stageForProgress(-0.2, 7)).toBe(0);
    expect(stageForProgress(Number.NaN, 7)).toBe(0);
  });
});
