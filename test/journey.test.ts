import { describe, expect, it } from "vitest";
import { neighbours, stageForProgress } from "../src/scripts/journey";

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

describe("neighbours", () => {
  it("is the rank and the ranks either side, inside the journey", () => {
    expect(neighbours(0, 7)).toEqual([0, 1]);
    expect(neighbours(3, 7)).toEqual([2, 3, 4]);
    expect(neighbours(6, 7)).toEqual([5, 6]);
    expect(neighbours(0, 1)).toEqual([0]);
  });
});
