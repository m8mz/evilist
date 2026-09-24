import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { OG_FINGERPRINT_PATH, OG_PATH, OG_SOURCES, ogFingerprint } from "../scripts/og-source.mjs";

describe("social card", () => {
  it("exists (run `pnpm build:og` to regenerate it)", () => {
    expect(existsSync(OG_PATH)).toBe(true);
  });

  it("is a 1200×630 PNG", () => {
    const png = readFileSync(OG_PATH);
    expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  });

  it("is up to date with its sources (run `pnpm build:og` after editing them)", () => {
    const recorded = existsSync(OG_FINGERPRINT_PATH)
      ? readFileSync(OG_FINGERPRINT_PATH, "utf8").trim()
      : "";
    expect(recorded).toBe(ogFingerprint());
  });

  it("fingerprints every component the card page imports", () => {
    const page = readFileSync("src/pages/og-card.astro", "utf8");
    const imported = [...page.matchAll(/from "\.\.\/(components\/[^"]+\.astro)"/g)].map(
      (m) => `src/${m[1]}`,
    );
    expect(imported.length).toBeGreaterThan(0);
    for (const file of imported) expect(OG_SOURCES, file).toContain(file);
  });
});
