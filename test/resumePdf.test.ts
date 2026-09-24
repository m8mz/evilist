import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  FINGERPRINT_PATH,
  PDF_PATH,
  RESUME_SOURCES,
  resumeFingerprint,
} from "../scripts/resume-source.mjs";

describe("resume PDF", () => {
  it("exists", () => {
    expect(existsSync(PDF_PATH)).toBe(true);
  });

  it("is up to date with the resume data (run `pnpm build:pdf` after editing it)", () => {
    const recorded = existsSync(FINGERPRINT_PATH)
      ? readFileSync(FINGERPRINT_PATH, "utf8").trim()
      : "";
    expect(recorded).toBe(resumeFingerprint());
  });
  it("fingerprints every component the resume page imports", () => {
    const page = readFileSync("src/pages/resume.astro", "utf8");
    const imported = [...page.matchAll(/from "\.\.\/(components\/[^"]+\.astro)"/g)].map(
      (m) => `src/${m[1]}`,
    );
    expect(imported.length).toBeGreaterThan(0);
    for (const file of imported) expect(RESUME_SOURCES, file).toContain(file);
  });
});
