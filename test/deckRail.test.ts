import { describe, expect, it } from "vitest";
import { career } from "../src/data/career";
import {
  counterText,
  liveText,
  rankAfterKey,
  scrollTargetFor,
} from "../src/scripts/deck/deck-rail";

describe("rankAfterKey", () => {
  it("moves with the arrows, jumps with Home and End, clamps at the ends", () => {
    expect(rankAfterKey(2, "ArrowRight", 7)).toBe(3);
    expect(rankAfterKey(2, "ArrowDown", 7)).toBe(3);
    expect(rankAfterKey(2, "ArrowLeft", 7)).toBe(1);
    expect(rankAfterKey(2, "ArrowUp", 7)).toBe(1);
    expect(rankAfterKey(6, "ArrowRight", 7)).toBe(6);
    expect(rankAfterKey(0, "ArrowLeft", 7)).toBe(0);
    expect(rankAfterKey(3, "Home", 7)).toBe(0);
    expect(rankAfterKey(3, "End", 7)).toBe(6);
  });

  it("ignores other keys", () => {
    expect(rankAfterKey(3, "Enter", 7)).toBeNull();
    expect(rankAfterKey(3, "a", 7)).toBeNull();
  });
});

describe("scrollTargetFor", () => {
  it("lands in the middle of a rank's stretch, the way the e2e helper always has", () => {
    // Track 5000 px tall starting at 1200, viewport 900, header 64: span = 5000 − 836.
    expect(scrollTargetFor(1200, 5000, 900, 64, 0, 7)).toBeCloseTo(1136 + 4164 * (0.5 / 7), 6);
    expect(scrollTargetFor(1200, 5000, 900, 64, 6, 7)).toBeCloseTo(1136 + 4164 * (6.5 / 7), 6);
  });
});

describe("counterText and liveText", () => {
  it("format the counter and the announcement", () => {
    expect(counterText(5, 7)).toBe("06 / 07");
    expect(counterText(0, 7)).toBe("01 / 07");
    expect(liveText(career[5]!)).toBe("Rank S, Linux Engineer, Caris Life Sciences");
    expect(liveText(career[6]!)).toBe("Rank S+, Sr. Systems Architect, BankSITE® Services");
  });
});
