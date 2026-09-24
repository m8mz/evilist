// Fingerprint of the files a committed build artefact is rendered from. When it changes, the
// artefact is stale, and its test fails until it is rebuilt (pnpm build:pdf, pnpm build:og).
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export function fingerprint(files, root = ".") {
  const hash = createHash("sha256");
  for (const file of files) hash.update(readFileSync(`${root}/${file}`));
  return hash.digest("hex");
}
