import { describe, expect, it } from "vitest";
import { nextIndex } from "../src/scripts/title-rotator";

describe("nextIndex", () => {
  it("steps forward and wraps to the first title", () => {
    expect(nextIndex(0, 12)).toBe(1);
    expect(nextIndex(10, 12)).toBe(11);
    expect(nextIndex(11, 12)).toBe(0);
  });
});
