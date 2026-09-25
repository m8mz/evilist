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

/** Adds files under dist/client/journey to the fake build. */
function withClips(dist: string, clips: Record<string, number>): string {
  mkdirSync(join(dist, "dist/client/journey"), { recursive: true });
  for (const [name, bytes] of Object.entries(clips)) {
    writeFileSync(join(dist, "dist/client/journey", name), Buffer.alloc(bytes, 1));
  }
  return dist;
}

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

  it("passes clips within their limits", () => {
    const dist = fakeDist({ "fonts/a.woff2": 42_000 });
    const res = run(
      withClips(dist, { "sysadmin-1280.webm": 600 * 1024, "sysadmin-640.mp4": 300 * 1024 }),
    );
    expect(res.stdout).toMatch(/ok {3}Journey clips: 2 files/);
    expect(res.status).toBe(0);
  });

  it("fails a clip over its limit, naming it", () => {
    const dist = fakeDist({ "fonts/a.woff2": 42_000 });
    const res = run(withClips(dist, { "sysadmin-640.webm": 251 * 1024 }));
    expect(res.stdout).toContain("FAIL sysadmin-640.webm");
    expect(res.status).toBe(1);
  });

  it("fails a file in journey/ that is not one of the four encodes", () => {
    const dist = fakeDist({ "fonts/a.woff2": 42_000 });
    const res = run(withClips(dist, { "sysadmin-1920.webm": 10 }));
    expect(res.stdout).toContain("FAIL sysadmin-1920.webm");
    expect(res.status).toBe(1);
  });
});
