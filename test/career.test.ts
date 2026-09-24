import { describe, expect, it } from "vitest";
import {
  career,
  formatRange,
  yearsOfExperience,
  currentStage,
  type Activity,
} from "../src/data/career";

const RANKS = ["E", "E+", "D", "C", "B", "A", "S"];
const ACTIVITIES: Activity[] = [
  "headset",
  "wordpress",
  "migration",
  "escalation",
  "rack",
  "pipeline",
  "datacenter",
];

describe("career data", () => {
  it("has one stage per rank, in rank order E → S", () => {
    expect(career.map((s) => s.rankLabel)).toEqual(RANKS);
    expect(career.map((s) => s.rank)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("is chronological by start date", () => {
    const starts = career.map((s) => s.start);
    expect([...starts].sort()).toEqual(starts);
  });

  it("uses yyyy-mm dates and only the last stage is ongoing", () => {
    for (const s of career) {
      expect(s.start).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
      if (s.end !== null) expect(s.end).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
    }
    expect(career.filter((s) => s.end === null).map((s) => s.id)).toEqual([career.at(-1)!.id]);
  });

  it("gives every stage a unique id, a known activity, a summary and highlights", () => {
    expect(new Set(career.map((s) => s.id)).size).toBe(career.length);
    for (const s of career) {
      expect(ACTIVITIES).toContain(s.activity);
      expect(s.summary.length).toBeGreaterThan(20);
      expect(s.highlights.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("never names confidential vendors or partners", () => {
    const text = JSON.stringify(career).toLowerCase();
    for (const banned of ["qts", "evoque", "gtt", "cogent", "hurricane electric", "vikingcloud"]) {
      expect(text).not.toContain(banned);
    }
  });
});

describe("yearsOfExperience", () => {
  it("counts whole years since the first role (Jun 2016)", () => {
    expect(yearsOfExperience(new Date(2026, 8, 24))).toBe(10);
    expect(yearsOfExperience(new Date(2026, 4, 31))).toBe(9);
    expect(yearsOfExperience(new Date(2026, 5, 1))).toBe(10);
  });
});

describe("formatRange", () => {
  it("formats closed ranges as short month and year", () => {
    expect(formatRange("2016-06", "2016-09")).toBe("Jun 2016 – Sep 2016");
  });

  it("formats open ranges as Present", () => {
    expect(formatRange("2021-11", null)).toBe("Nov 2021 – Present");
  });
});

describe("currentStage", () => {
  it("is the ongoing S-rank role", () => {
    expect(currentStage().rankLabel).toBe("S");
    expect(currentStage().end).toBeNull();
  });
});
