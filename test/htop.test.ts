import { describe, expect, it } from "vitest";
import { htop } from "../src/data/htop";
import { drift, driftSorted, meter, pct } from "../src/scripts/htop";

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

  it("has enough processes to fill the hero's terminal pane", () => {
    expect(htop.processes.length).toBeGreaterThanOrEqual(24);
  });
});

describe("driftSorted", () => {
  it("drifts every row but keeps the CPU% column sorted, highest first", () => {
    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    let cpu = [4.2, 2.9, 1.1, 0.7, 0.3, 0.1, 0, 0];
    for (let tick = 0; tick < 50; tick++) {
      cpu = driftSorted(cpu, 0.8, 0, 12, rand);
      expect(cpu).toHaveLength(8);
      for (let i = 1; i < cpu.length; i++) expect(cpu[i]).toBeLessThanOrEqual(cpu[i - 1]!);
      for (const v of cpu) expect(v >= 0 && v <= 12).toBe(true);
    }
  });
});
