import { describe, expect, it } from "vitest";
import { barHeight, shouldStream } from "../src/scripts/log-bars";

describe("barHeight", () => {
  it("scales a 0–1 value to the bar height, never below 1px", () => {
    expect(barHeight(0.5, 24)).toBe(12);
    expect(barHeight(1, 24)).toBe(24);
    expect(barHeight(0, 24)).toBe(1);
  });

  it("clamps out-of-range and non-finite input", () => {
    expect(barHeight(1.7, 24)).toBe(24);
    expect(barHeight(-3, 24)).toBe(1);
    expect(barHeight(Number.NaN, 24)).toBe(1);
    expect(barHeight(Number.POSITIVE_INFINITY, 24)).toBe(1);
  });
});

describe("shouldStream", () => {
  it("animates only when motion is not reduced", () => {
    expect(shouldStream({ reducedMotion: false })).toBe(true);
    expect(shouldStream({ reducedMotion: true })).toBe(false);
  });
});
