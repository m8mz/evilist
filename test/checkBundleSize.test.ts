import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { afterEach, describe, expect, it } from "vitest";

const SCRIPT = resolve("scripts/check-bundle-size.mjs");
let root: string | undefined;

/**
 * A minimal fake build: dist/client/index.html plus the given files under dist/client/_astro.
 * Fonts default to a passing set, so callers who only care about deck/bloom/portrait rows can
 * call `fakeDist()` with no arguments.
 */
function fakeDist(files: Record<string, number> = { "fonts/a.woff2": 42_000 }): string {
  root = mkdtempSync(join(tmpdir(), "size-"));
  mkdirSync(join(root, "dist/client/_astro/fonts"), { recursive: true });
  writeFileSync(
    join(root, "dist/client/index.html"),
    "<!doctype html><title>x</title><body></body>",
  );
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

/** Writes a small lazy deck-bloom chunk (no page references it) so the bloom row stays green. */
function withBloom(dist: string, bytes = 5 * 1024, name = "deck-bloom.abc.js"): void {
  writeFileSync(join(dist, "dist/client/_astro", name), Buffer.alloc(bytes, 1));
}

/** Names one rail button's renditions in the home page and writes them, so the portrait rows pass. */
function withPortraits(dist: string): void {
  const index = join(dist, "dist/client/index.html");
  const button =
    '<button data-deck-rank data-portrait-1x="/_astro/r.1x.webp" data-portrait-2x="/_astro/r.2x.webp" data-glow="/_astro/r.g.webp"></button>';
  const html = readFileSync(index, "utf8");
  writeFileSync(
    index,
    html.includes("</body>") ? html.replace("</body>", `${button}</body>`) : html + button,
  );
  for (const name of ["r.1x.webp", "r.2x.webp", "r.g.webp"]) {
    writeFileSync(join(dist, "dist/client/_astro", name), Buffer.alloc(1_000));
  }
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
    withBloom(dist);
    withPortraits(dist);
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
    withBloom(dist);
    withPortraits(dist);
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
    withBloom(dist);
    withPortraits(dist);
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
    withBloom(dist);
    withPortraits(dist);
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
    withBloom(dist);
    const entryPath = join(dist, "dist/client/_astro/entry.abc.js");
    const helperPath = join(dist, "dist/client/_astro/helper.xyz.js");
    writeFileSync(helperPath, randomBytes(50 * 1024));
    writeFileSync(entryPath, `import"./helper.xyz.js";${"console.log(1);".repeat(50)}`);
    writeFileSync(
      join(dist, "dist/client/index.html"),
      '<!doctype html><script type="module" src="/_astro/entry.abc.js"></script>',
    );
    withPortraits(dist);
    const expectedKb =
      (gzipSync(readFileSync(entryPath)).length + gzipSync(readFileSync(helperPath)).length) / 1024;
    const res = run(dist);
    expect(res.stdout).toMatch(
      new RegExp(`ok {3}Initial JS on / \\(gz\\): ${expectedKb.toFixed(1)} KB`),
    );
    expect(res.status).toBe(0);
  });

  it("budgets the bloom chunk on its own row and keeps it out of the deck row", () => {
    const dist = fakeDist();
    withScene(dist);
    withDeck(dist);
    withPortraits(dist);
    // Without a bloom chunk the run fails on the missing row, but the deck row still prints.
    const before = /Deck lazy JS \(gz\): ([\d.]+) KB/.exec(run(dist).stdout)?.[1];
    writeFileSync(
      join(dist, "dist/client/_astro/deck-bloom.abc.js"),
      randomBytes(20_000).toString("base64"),
    );
    const out = run(dist);
    expect(out.status).toBe(0);
    expect(out.stdout).toMatch(/ok {3}Bloom chunk \(gz\): .* \(budget 40 KB\)/);
    // The bloom bytes are not counted twice: the deck row is what it was before the chunk existed.
    expect(/Deck lazy JS \(gz\): ([\d.]+) KB/.exec(out.stdout)?.[1]).toBe(before);
  });

  it("fails when the bloom chunk is missing or over 40 KB", () => {
    const dist = fakeDist();
    withScene(dist);
    withDeck(dist);
    expect(run(dist).stdout).toContain("FAIL deck-bloom chunk missing");
    writeFileSync(
      join(dist, "dist/client/_astro/deck-bloom.abc.js"),
      randomBytes(60_000).toString("base64"),
    );
    const out = run(dist);
    expect(out.status).toBe(1);
    expect(out.stdout).toMatch(/FAIL Bloom chunk/);
  });

  it("measures the served portrait renditions named by the home page", () => {
    const dist = fakeDist();
    withScene(dist);
    withDeck(dist);
    writeFileSync(join(dist, "dist/client/_astro/deck-bloom.abc.js"), "x".repeat(2_000));
    const html = readFileSync(join(dist, "dist/client/index.html"), "utf8").replace(
      "</body>",
      `<button data-deck-rank data-portrait-1x="/_astro/e.1x.webp" data-portrait-2x="/_astro/e.2x.webp" data-glow="/_astro/e.g.webp"></button></body>`,
    );
    writeFileSync(join(dist, "dist/client/index.html"), html);
    writeFileSync(join(dist, "dist/client/_astro/e.1x.webp"), Buffer.alloc(30_000));
    writeFileSync(join(dist, "dist/client/_astro/e.2x.webp"), Buffer.alloc(100_000));
    writeFileSync(join(dist, "dist/client/_astro/e.g.webp"), Buffer.alloc(5_000));
    let out = run(dist);
    expect(out.status).toBe(0);
    expect(out.stdout).toMatch(/ok {3}Portraits 1x \(largest\): 29\.3 KB \(budget 40 KB\)/);
    expect(out.stdout).toMatch(/ok {3}Portraits 2x \(largest\): 97\.7 KB \(budget 120 KB\)/);
    expect(out.stdout).toMatch(/ok {3}Glow masks \(largest\): 4\.9 KB \(budget 10 KB\)/);
    writeFileSync(join(dist, "dist/client/_astro/e.2x.webp"), Buffer.alloc(130_000));
    out = run(dist);
    expect(out.status).toBe(1);
    expect(out.stdout).toMatch(/FAIL Portraits 2x/);
  });

  it("fails when the home page names no portrait renditions (the rail must name seven)", () => {
    const dist = fakeDist();
    withScene(dist);
    withDeck(dist);
    withBloom(dist);
    const res = run(dist);
    expect(res.stdout).toContain("FAIL Portraits: none referenced");
    expect(res.status).toBe(1);
  });
});
