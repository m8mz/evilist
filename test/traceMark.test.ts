import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { traceMark } from "../scripts/trace-mark.mjs";

let dir: string | undefined;
const tmp = () => (dir = mkdtempSync(join(tmpdir(), "mark-")));
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

/** A 120 × 120 transparent PNG with an opaque yellow disc in the middle. */
async function disc(path: string): Promise<void> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><circle cx="60" cy="60" r="40" fill="#f8f818"/></svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path);
}

describe("traceMark", () => {
  it("traces the opaque pixels into one slate path with the image's viewBox", async () => {
    const d = tmp();
    await disc(join(d, "disc.png"));
    const result = await traceMark(join(d, "disc.png"), join(d, "mark.svg"));
    expect(result).toMatchObject({ width: 120, height: 120 });
    const svg = readFileSync(join(d, "mark.svg"), "utf8");
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 120 120">/);
    expect(svg.match(/<path /g)).toHaveLength(1);
    expect(svg).toContain('fill="#3a3a3a"');
    expect(svg).not.toContain("style=");
    // A disc's path spans most of the image.
    const xs = [...result.d.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
    expect(Math.min(...xs)).toBeLessThan(30);
    expect(Math.max(...xs)).toBeGreaterThan(90);
  });

  it("runs as a CLI", async () => {
    const d = tmp();
    await disc(join(d, "disc.png"));
    execFileSync(process.execPath, [
      resolve("scripts/trace-mark.mjs"),
      join(d, "disc.png"),
      join(d, "out.svg"),
    ]);
    expect(existsSync(join(d, "out.svg"))).toBe(true);
  });
});

describe("the committed devil mark", () => {
  it("is one slate path traced from logo-devil.webp", () => {
    const svg = readFileSync("src/images/devil-mark.svg", "utf8");
    expect(svg).toContain('viewBox="0 0 226 242"');
    expect(svg.match(/<path /g)).toHaveLength(1);
    expect(svg).toContain('fill="#3a3a3a"');
    expect(svg.length).toBeLessThan(20_000);
  });
});
