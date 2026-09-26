import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { afterEach, describe, expect, it } from "vitest";

const SCRIPT = resolve("scripts/check-bundle-size.mjs");
let root: string | undefined;

/** A minimal fake build: dist/client/index.html plus the given files under dist/client/_astro. */
function fakeDist(files: Record<string, number>): string {
  root = mkdtempSync(join(tmpdir(), "size-"));
  mkdirSync(join(root, "dist/client/_astro/fonts"), { recursive: true });
  writeFileSync(join(root, "dist/client/index.html"), "<!doctype html><title>x</title>");
  for (const [path, bytes] of Object.entries(files)) {
    writeFileSync(join(root, "dist/client/_astro", path), Buffer.alloc(bytes, 1));
  }
  return root;
}

const run = (cwd: string) => spawnSync("node", [SCRIPT], { cwd, encoding: "utf8" });

/** Writes a small journey/scene.svg into a fake dist so the scene budget row stays green. */
function withScene(dist: string, bytes = 10 * 1024): void {
  mkdirSync(join(dist, "dist/client/journey"), { recursive: true });
  writeFileSync(join(dist, "dist/client/journey/scene.svg"), Buffer.alloc(bytes, 1));
}

/** Writes a small lazy deck-stage chunk (no page references it) so the deck rows stay green. */
function withDeck(dist: string, bytes = 10 * 1024, name = "deck-stage.abc.js"): void {
  writeFileSync(join(dist, "dist/client/_astro", name), Buffer.alloc(bytes, 1));
}

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true });
  root = undefined;
});

describe("check-bundle-size", () => {
  it("passes with self-hosted fonts inside the budget", () => {
    const dist = fakeDist({ "fonts/a.woff2": 21_000, "fonts/b.woff2": 21_000 });
    withScene(dist);
    withDeck(dist);
    const res = run(dist);
    expect(res.stdout).toContain("ok   Fonts (woff2)");
    expect(res.status).toBe(0);
  });

  it("fails when no fonts were emitted, instead of shipping the fallback face", () => {
    const res = run(fakeDist({}));
    expect(res.stdout).toMatch(/FAIL Fonts \(woff2\)/);
    expect(res.status).toBe(1);
  });

  it("passes a lazy deck-stage chunk under 170 KB gz and reports it", () => {
    const dist = fakeDist({ "fonts/a.woff2": 42_000 });
    withScene(dist);
    writeFileSync(join(dist, "dist/client/_astro/deck-stage.abc.js"), randomBytes(150 * 1024));
    const res = run(dist);
    expect(res.stdout).toMatch(/ok {3}Deck lazy JS \(gz\): 15\d\.\d KB \(budget 170 KB\)/);
    expect(res.status).toBe(0);
  });

  it("fails when the deck-stage chunk is missing (inlined into a page)", () => {
    const dist = fakeDist({ "fonts/a.woff2": 42_000 });
    withScene(dist);
    const res = run(dist);
    expect(res.stdout).toContain("FAIL deck-stage chunk missing");
    expect(res.status).toBe(1);
  });

  it("fails when a deck or Three.js chunk is in the home page's initial graph", () => {
    const dist = fakeDist({ "fonts/a.woff2": 42_000, "three.def.js": 10 });
    withScene(dist);
    withDeck(dist);
    writeFileSync(
      join(dist, "dist/client/index.html"),
      '<!doctype html><script type="module" src="/_astro/three.def.js"></script>',
    );
    const res = run(dist);
    expect(res.stdout).toContain("FAIL deck chunk in the initial graph: /_astro/three.def.js");
    expect(res.status).toBe(1);
  });

  it("fails lazy JS over 170 KB gz", () => {
    const dist = fakeDist({ "fonts/a.woff2": 42_000 });
    withScene(dist);
    writeFileSync(join(dist, "dist/client/_astro/deck-stage.abc.js"), randomBytes(200 * 1024));
    const res = run(dist);
    expect(res.stdout).toMatch(/FAIL Deck lazy JS \(gz\)/);
    expect(res.status).toBe(1);
  });

  it("does not count a page's own scripts as lazy", () => {
    const dist = fakeDist({ "fonts/a.woff2": 42_000, "contact.ghi.js": 300 * 1024 });
    withScene(dist);
    withDeck(dist);
    mkdirSync(join(dist, "dist/client/contact"), { recursive: true });
    writeFileSync(
      join(dist, "dist/client/contact/index.html"),
      '<!doctype html><script type="module" src="/_astro/contact.ghi.js"></script>',
    );
    const res = run(dist);
    expect(res.stdout).toMatch(/ok {3}Deck lazy JS \(gz\)/);
    expect(res.status).toBe(0);
  });

  it("fails a stray file in journey/ (only the scene belongs there)", () => {
    const dist = fakeDist({ "fonts/a.woff2": 42_000 });
    withScene(dist);
    withDeck(dist);
    writeFileSync(join(dist, "dist/client/journey/sysadmin-640.mp4"), Buffer.alloc(10, 1));
    const res = run(dist);
    expect(res.stdout).toContain("FAIL stray journey file: sysadmin-640.mp4");
    expect(res.stdout).not.toContain("FAIL Journey scene (gz): missing");
    expect(res.status).toBe(1);
  });

  it("passes a journey scene within 300 KB gzipped, reporting its size", () => {
    const dist = fakeDist({ "fonts/a.woff2": 42_000 });
    // 200 KB of incompressible bytes gzips to about 200 KB: inside the budget.
    mkdirSync(join(dist, "dist/client/journey"), { recursive: true });
    writeFileSync(join(dist, "dist/client/journey/scene.svg"), randomBytes(200 * 1024));
    withDeck(dist);
    const res = run(dist);
    expect(res.stdout).toMatch(/ok {3}Journey scene \(gz\): 20\d\.\d KB \(budget 300 KB\)/);
    expect(res.status).toBe(0);
  });

  it("fails a journey scene over 300 KB gzipped", () => {
    const dist = fakeDist({ "fonts/a.woff2": 42_000 });
    mkdirSync(join(dist, "dist/client/journey"), { recursive: true });
    writeFileSync(join(dist, "dist/client/journey/scene.svg"), randomBytes(320 * 1024));
    const res = run(dist);
    expect(res.stdout).toMatch(/FAIL Journey scene \(gz\)/);
    expect(res.status).toBe(1);
  });

  it("fails when the journey scene is missing from the build", () => {
    const res = run(fakeDist({ "fonts/a.woff2": 42_000 }));
    expect(res.stdout).toContain("FAIL Journey scene (gz): missing");
    expect(res.status).toBe(1);
  });

  it("catches a three chunk pulled in only via a static import from the entry", () => {
    const dist = fakeDist({ "fonts/a.woff2": 42_000, "three.def.js": 10 });
    withScene(dist);
    withDeck(dist);
    writeFileSync(
      join(dist, "dist/client/_astro/entry.abc.js"),
      'import"./three.def.js";console.log(1);',
    );
    writeFileSync(
      join(dist, "dist/client/index.html"),
      '<!doctype html><script type="module" src="/_astro/entry.abc.js"></script>',
    );
    const res = run(dist);
    expect(res.stdout).toContain("FAIL deck chunk in the initial graph: /_astro/three.def.js");
    expect(res.status).toBe(1);
  });

  it("counts a helper chunk statically imported by the entry toward the initial total", () => {
    const dist = fakeDist({ "fonts/a.woff2": 42_000 });
    withScene(dist);
    withDeck(dist);
    const entryPath = join(dist, "dist/client/_astro/entry.abc.js");
    const helperPath = join(dist, "dist/client/_astro/helper.xyz.js");
    writeFileSync(helperPath, randomBytes(50 * 1024));
    writeFileSync(entryPath, `import"./helper.xyz.js";${"console.log(1);".repeat(50)}`);
    writeFileSync(
      join(dist, "dist/client/index.html"),
      '<!doctype html><script type="module" src="/_astro/entry.abc.js"></script>',
    );
    const expectedKb =
      (gzipSync(readFileSync(entryPath)).length + gzipSync(readFileSync(helperPath)).length) / 1024;
    const res = run(dist);
    expect(res.stdout).toMatch(
      new RegExp(`ok {3}Initial JS on / \\(gz\\): ${expectedKb.toFixed(1)} KB`),
    );
    expect(res.status).toBe(0);
  });
});
