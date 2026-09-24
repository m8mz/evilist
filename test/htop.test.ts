import { describe, expect, it } from "vitest";
import { htop } from "../src/data/htop";
import { drift, meter, pct } from "../src/scripts/htop";

describe("meter", () => {
  it.each([0, 0.42, 1, -0.5, 1.5, Number.NaN])("is always exactly the width (%s)", (f) => {
    expect(meter(f, "42.0%", 30)).toHaveLength(30);
  });

  it("fills bars in proportion to the space left after the label", () => {
    // width 26, label 5, one space → 20 columns for bars
    expect(meter(0.5, "50.0%", 26)).toBe(`${"|".repeat(10)}${" ".repeat(10)} 50.0%`);
  });

  it("formats percentages to one decimal", () => {
    expect(pct(42)).toBe("42.0%");
    expect(pct(9.14)).toBe("9.1%");
  });
});

describe("drift", () => {
  it("stays within its bounds and rounds to one decimal", () => {
    expect(drift(50, 9, 3, 96, () => 0)).toBe(41);
    expect(drift(50, 9, 3, 96, () => 1)).toBe(59);
    expect(drift(95, 9, 3, 96, () => 1)).toBe(96);
    expect(drift(4, 9, 3, 96, () => 0)).toBe(3);
  });
});

describe("htop snapshot", () => {
  it("has sane meters", () => {
    for (const core of htop.cores) {
      expect(core).toBeGreaterThanOrEqual(0);
      expect(core).toBeLessThanOrEqual(100);
    }
    expect(htop.memory.used).toBeLessThanOrEqual(htop.memory.total);
    expect(htop.swap.used).toBeLessThanOrEqual(htop.swap.total);
  });

  it("lists processes by CPU%, highest first", () => {
    const cpu = htop.processes.map((p) => p.cpu);
    expect(cpu).toEqual([...cpu].sort((a, b) => b - a));
  });

  it("never names a host, an IP address or a real user", () => {
    const text = JSON.stringify(htop);
    expect(text).not.toMatch(/\b\d{1,3}(\.\d{1,3}){3}\b/);
    expect(text).not.toMatch(/\.(com|net|org|io|co|local|internal)\b/);
    for (const p of htop.processes) expect(["web", "root", "chrony"]).toContain(p.user);
  });
});
