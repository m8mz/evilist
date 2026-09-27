import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const GONE = [
  "public/journey/scene.svg",
  "art/journey",
  "scripts/import-art.mjs",
  "scripts/register-outfit.mjs",
  "scripts/build-scene.mjs",
  "scripts/trace-vector.mjs",
  "scripts/trace-mark.mjs",
  "scripts/render-rank-stills.mjs",
  "scripts/import-still.mjs",
  "scripts/preview-rig.mjs",
  "src/data/avatar-rig.json",
  "src/data/avatarRig.ts",
  "src/data/journeyArt.ts",
  "src/images/journey",
];
const NAMES =
  /scene\.svg|art\/journey|build-scene|trace-vector|trace-mark|render-rank-stills|import-still|import-art|register-outfit|preview-rig|avatar-rig|avatarRig|journeyArt|stageArt|potrace/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

describe("the vector journey pipeline stays retired (deck spec §14)", () => {
  it("keeps every deleted path deleted", () => {
    for (const p of GONE) expect(existsSync(p), p).toBe(false);
  });
  it("names none of it from code, scripts, tests or e2e", () => {
    const files = ["src", "scripts", "test", "e2e"].flatMap((d) => walk(d));
    for (const f of files) {
      if (f === "test/retired.test.ts") continue;
      expect(readFileSync(f, "utf8")).not.toMatch(NAMES);
    }
  });
  it("no longer depends on potrace", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      devDependencies?: Record<string, string>;
      dependencies?: Record<string, string>;
    };
    expect(pkg.devDependencies?.potrace).toBeUndefined();
    expect(pkg.dependencies?.potrace).toBeUndefined();
  });
});
