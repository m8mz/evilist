import { describe, expect, it } from "vitest";
import { heroPitch, site } from "../src/data/site";

describe("site.titles", () => {
  it("starts with the current role and includes Forward Deployed Engineer", () => {
    expect(site.titles[0]).toBe(site.role);
    expect(site.titles).toContain("Forward Deployed Engineer");
  });

  it("has no duplicates", () => {
    expect(new Set(site.titles).size).toBe(site.titles.length);
  });

  it("keeps every title to 25 characters, so one line fits a 390px phone", () => {
    for (const title of site.titles) expect(title.length, title).toBeLessThanOrEqual(25);
  });
});

describe("heroPitch", () => {
  it("opens with the capitalised phrase", () => {
    expect(heroPitch("a decade")).toMatch(/^A decade in Linux infrastructure\. Today I run the/);
    expect(heroPitch("over a decade")).toMatch(/^Over a decade in Linux infrastructure\./);
  });

  it("keeps the uptime claim and the Go and Python line", () => {
    expect(heroPitch("a decade")).toContain("hundreds of banking websites at 99.99%");
    expect(heroPitch("a decade")).toMatch(/And I build the tooling in Go and Python\.$/);
  });
});
