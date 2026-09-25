import { describe, expect, it } from "vitest";
import {
  career,
  formatRange,
  yearsOfExperience,
  currentStage,
  decadePhrase,
  capitalise,
  stageMonths,
  tenure,
  xp,
  xpBlocks,
  setNumber,
  acquired,
  type Activity,
} from "../src/data/career";

const RANKS = ["E", "D", "C", "B", "A", "S", "S+"];
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
  it("has one stage per rank, in rank order E → S+", () => {
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

  it("prints at least one highlight per stage, and never more than it has", () => {
    for (const s of career) {
      expect(Number.isInteger(s.printHighlights), s.id).toBe(true);
      expect(s.printHighlights, s.id).toBeGreaterThanOrEqual(1);
      expect(s.printHighlights, s.id).toBeLessThanOrEqual(s.highlights.length);
    }
  });

  it("never repeats a highlight within a stage", () => {
    for (const s of career) expect(new Set(s.highlights).size, s.id).toBe(s.highlights.length);
  });

  it("carries the LinkedIn detail, with the original highlights still first (spec §6.1)", () => {
    const byId = new Map(career.map((s) => [s.id, s]));
    const architect = byId.get("systems-architect")!;
    const linux = byId.get("linux-engineer")!;
    const sysadmin = byId.get("sysadmin")!;
    const concierge = byId.get("web-concierge")!;

    expect(architect.highlights).toHaveLength(8);
    expect(architect.highlights[0]).toBe(
      "Hold a 99.99% uptime target with BGP failover between two datacenters",
    );
    expect(architect.highlights.at(-1)).toBe(
      "Lead strategic technical projects and align technology with business goals",
    );

    expect(linux.highlights).toHaveLength(9);
    expect(linux.highlights[0]).toBe(
      "Streamlined deployment, automation, and integration with Ansible and Jenkins",
    );
    expect(linux.highlights[3]).toBe("Administered HPC systems for research workloads");
    for (const skill of [
      "Bash",
      "Python",
      "Perl",
      "HPC",
      "VMware",
      "Nutanix",
      "Veeam",
      "Nagios",
      "Zabbix",
      "Active Directory",
    ]) {
      expect(linux.skills).toContain(skill);
    }

    expect(sysadmin.highlights).toHaveLength(7);
    expect(sysadmin.highlights[1]).toBe(
      "Wrote automation in Bash, Perl, PHP, JavaScript and Python",
    );
    expect(sysadmin.highlights.join(" ")).not.toContain("Wrote Bash tooling");
    for (const skill of ["ModSecurity", "CSF", "ClamAV", "IPMI"]) {
      expect(sysadmin.skills).toContain(skill);
    }

    expect(concierge.summary).toContain("Website Builder");
    expect(concierge.highlights).toHaveLength(4);
    expect(concierge.highlights).toContain("Managed 40–60 clients on my own schedule");
  });

  it("gives every stage a one-line log quote under 80 characters (deck spec §4)", () => {
    for (const s of career) {
      expect(typeof s.log, s.id).toBe("string");
      expect(s.log.length, s.id).toBeGreaterThan(10);
      expect(s.log.length, s.id).toBeLessThan(80);
      expect(s.log, s.id).not.toMatch(/\n/);
    }
    expect(career.find((s) => s.id === "linux-engineer")!.log).toBe(
      "Replaced manual server setup with repeatable automation.",
    );
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
  it("is the ongoing S+ role, the top of the ladder", () => {
    expect(currentStage().rankLabel).toBe("S+");
    expect(currentStage().end).toBeNull();
  });
});

describe("decadePhrase", () => {
  it("counts years below ten, then speaks in decades", () => {
    expect(decadePhrase(9)).toBe("9 years");
    expect(decadePhrase(10)).toBe("a decade");
    expect(decadePhrase(11)).toBe("over a decade");
    expect(decadePhrase(14)).toBe("over a decade");
  });
});

describe("capitalise", () => {
  it("upper-cases only the first letter", () => {
    expect(capitalise("a decade")).toBe("A decade");
    expect(capitalise("over a decade")).toBe("Over a decade");
  });
});

const NOW = new Date(2026, 8, 25);
const stage = (id: string) => career.find((s) => s.id === id)!;

describe("stageMonths", () => {
  it("counts whole months from start to end, or to now for the open stage", () => {
    expect(stageMonths(stage("t1-support"), NOW)).toBe(3);
    expect(stageMonths(stage("linux-engineer"), NOW)).toBe(19);
    expect(stageMonths(stage("systems-architect"), NOW)).toBe(58);
  });

  it("never goes negative when now is before a stage starts", () => {
    expect(stageMonths(stage("systems-architect"), new Date(2020, 0, 1))).toBe(0);
  });
});

describe("tenure", () => {
  it("stays in months under two years, then speaks in years and months", () => {
    expect(tenure(stage("t1-support"), NOW)).toBe("3 months");
    expect(tenure(stage("linux-engineer"), NOW)).toBe("19 months");
    expect(tenure(stage("systems-architect"), NOW)).toBe("4 years, 10 months");
    expect(tenure(stage("systems-architect"), new Date(2023, 10, 1))).toBe("2 years");
    expect(tenure(stage("systems-architect"), new Date(2022, 11, 1))).toBe("13 months");
    expect(tenure(stage("systems-architect"), new Date(2021, 11, 1))).toBe("1 month");
    expect(tenure(stage("systems-architect"), new Date(2022, 10, 1))).toBe("12 months");
    expect(tenure(stage("systems-architect"), new Date(2024, 0, 1))).toBe("2 years, 2 months");
  });

  it("says 0 months rather than throwing when now is before the start", () => {
    expect(tenure(stage("systems-architect"), new Date(2020, 0, 1))).toBe("0 months");
  });
});

describe("xp", () => {
  it("is the cumulative share of all months worked, ending at 1", () => {
    // 3 + 5 + 7 + 5 + 18 + 19 + 58 = 115 months on 25 Sep 2026.
    expect(xp(stage("t1-support"), NOW)).toBeCloseTo(3 / 115, 6);
    expect(xp(stage("linux-engineer"), NOW)).toBeCloseTo(57 / 115, 6);
    expect(xp(stage("systems-architect"), NOW)).toBe(1);
  });

  it("is monotonic across the ladder", () => {
    const values = career.map((s) => xp(s, NOW));
    for (let i = 1; i < values.length; i++) expect(values[i]).toBeGreaterThan(values[i - 1]!);
  });

  it("never divides by zero", () => {
    const early = new Date(2000, 0, 1);
    for (const s of career) expect(Number.isFinite(xp(s, early)), s.id).toBe(true);
  });
});

describe("xpBlocks", () => {
  it("rounds up so every stage shows at least one block and S+ shows all ten", () => {
    expect(xpBlocks(3 / 115)).toBe(1);
    expect(xpBlocks(57 / 115)).toBe(5);
    expect(xpBlocks(1)).toBe(10);
    expect(xpBlocks(0)).toBe(0);
    expect(xpBlocks(1.2)).toBe(10);
    expect(xpBlocks(Number.NaN)).toBe(0);
  });
});

describe("setNumber", () => {
  it("numbers the cards EVL-nn/07", () => {
    expect(setNumber(stage("t1-support"))).toBe("EVL-01/07");
    expect(setNumber(stage("linux-engineer"))).toBe("EVL-06/07");
  });
});

describe("acquired", () => {
  it("lists every skill when there are eight or fewer", () => {
    expect(acquired(stage("t1-support"))).toEqual(["DNS", "Email", "Splunk", "cPanel"]);
    expect(acquired(stage("systems-architect"))).toHaveLength(8);
    expect(acquired(stage("systems-architect")).at(-1)).not.toMatch(/^\+/);
  });

  it("caps at eight and counts the rest", () => {
    const list = acquired(stage("linux-engineer"));
    expect(list).toHaveLength(9);
    expect(list.slice(0, 8)).toEqual(stage("linux-engineer").skills.slice(0, 8));
    expect(list.at(-1)).toBe("+6");
    expect(acquired(stage("linux-engineer"), 3)).toEqual(["Ansible", "Jenkins", "Linux", "+11"]);
  });
});
