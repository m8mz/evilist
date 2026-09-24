// Fingerprint of everything the resume PDF is rendered from. If it changes, the PDF is stale.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export const RESUME_SOURCES = [
  "src/data/career.ts",
  "src/data/skills.ts",
  "src/data/site.ts",
  "src/pages/resume.astro",
  // Every component the page renders (test/resumePdf.test.ts keeps this list complete).
  "src/components/ui/Section.astro",
  "src/components/ui/Prompt.astro",
  "src/components/ui/Button.astro",
  "src/components/ui/RankChip.astro",
  "src/components/ui/KeyValue.astro",
];
export const PDF_PATH = "public/marcus-hancock-gaillard-resume.pdf";
export const FINGERPRINT_PATH = "scripts/resume-pdf.source-sha256";

export function resumeFingerprint(root = ".") {
  const hash = createHash("sha256");
  for (const file of RESUME_SOURCES) hash.update(readFileSync(`${root}/${file}`));
  return hash.digest("hex");
}
