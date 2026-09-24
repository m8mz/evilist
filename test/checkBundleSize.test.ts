import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
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

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true });
  root = undefined;
});

describe("check-bundle-size", () => {
  it("passes with self-hosted fonts inside the budget", () => {
    const res = run(fakeDist({ "fonts/a.woff2": 21_000, "fonts/b.woff2": 21_000 }));
    expect(res.stdout).toContain("ok   Fonts (woff2)");
    expect(res.status).toBe(0);
  });

  it("fails when no fonts were emitted, instead of shipping the fallback face", () => {
    const res = run(fakeDist({}));
    expect(res.stdout).toMatch(/FAIL Fonts \(woff2\)/);
    expect(res.status).toBe(1);
  });

  it("fails when a Three.js chunk is present", () => {
    const res = run(fakeDist({ "fonts/a.woff2": 42_000, "hero-aura-scene.abc.js": 10 }));
    expect(res.stdout).toContain("FAIL Three.js chunk present");
    expect(res.status).toBe(1);
  });
});
