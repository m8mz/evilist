import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FINGERPRINT_PATH, PDF_PATH, resumeFingerprint } from "../scripts/resume-source.mjs";

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
});
