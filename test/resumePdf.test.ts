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

  it("stays two pages, the length a recruiter expects", () => {
    // The page tree is the dictionary with /Type /Pages; outline entries carry their own /Count.
    const pdf = readFileSync(PDF_PATH, "latin1");
    const tree = pdf.match(/<<[^<>]*\/Type\s*\/Pages\b[^<>]*>>/)?.[0] ?? "";
    expect(tree.match(/\/Count\s+(\d+)/)?.[1]).toBe("2");
  });

  it("fingerprints the stylesheets and layout the page renders with", () => {
    for (const file of [
      "src/styles/tokens.css",
      "src/styles/global.css",
      "src/layouts/BaseLayout.astro",
      "src/components/seo/Head.astro",
    ]) {
      expect(RESUME_SOURCES, file).toContain(file);
    }
  });
});
