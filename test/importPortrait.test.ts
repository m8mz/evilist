import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { glowMask, importPortrait, isViolet } from "../scripts/import-portrait.mjs";

let dir: string | undefined;
const tmp = () => (dir = mkdtempSync(join(tmpdir(), "portrait-")));
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

/** A 900 × 600 near-black image with a violet block covering `percent` of it. */
async function render(path: string, percent: number): Promise<void> {
  const w = 900;
  const h = 600;
  const side = Math.round(Math.sqrt((percent / 100) * w * h));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#0a0a0a"/><rect x="100" y="100" width="${side}" height="${side}" fill="#7040d2"/></svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path);
}

describe("isViolet", () => {
  it("keys the deck's violet and its lighter tints, not greys, ember or blue", () => {
    expect(isViolet(0x70, 0x40, 0xd2)).toBe(true);
    expect(isViolet(0x9d, 0x7c, 0xf0)).toBe(true);
    expect(isViolet(0x84, 0x84, 0x84)).toBe(false);
    expect(isViolet(0xda, 0x5c, 0x2c)).toBe(false);
    expect(isViolet(0x20, 0x60, 0xff)).toBe(false);
    expect(isViolet(0x10, 0x08, 0x20)).toBe(false); // too dark to count
  });
});

describe("glowMask", () => {
  it("measures the violet coverage and returns a 400 px single-channel mask", async () => {
    const d = tmp();
    await render(join(d, "in.png"), 2);
    const { mask, width, height, coverage } = await glowMask(join(d, "in.png"));
    expect(width).toBe(400);
    expect(height).toBe(267);
    expect(mask.length).toBe(400 * 267);
    expect(coverage).toBeGreaterThan(1.7);
    expect(coverage).toBeLessThan(2.3);
  });

  it("reports zero for an image without violet", async () => {
    const d = tmp();
    await render(join(d, "in.png"), 0);
    expect((await glowMask(join(d, "in.png"))).coverage).toBe(0);
  });
});

describe("importPortrait", () => {
  it("writes the 1600 px source and the blurred mask, never enlarging", async () => {
    const d = tmp();
    await render(join(d, "in.png"), 1.5);
    const result = await importPortrait(join(d, "in.png"), "linux-engineer", {
      outDir: d,
      band: [0.3, 2],
    });
    expect(result.files).toEqual([
      join(d, "linux-engineer.webp"),
      join(d, "linux-engineer-glow.webp"),
    ]);
    const source = await sharp(join(d, "linux-engineer.webp")).metadata();
    expect(source.format).toBe("webp");
    expect(source.width).toBe(900);
    const glow = await sharp(join(d, "linux-engineer-glow.webp")).metadata();
    expect(glow.width).toBe(400);
    expect(glow.height).toBe(267);
    const { channels } = await sharp(join(d, "linux-engineer-glow.webp")).stats();
    // Mostly black with a soft bright patch: the mean is low, the max is white.
    expect(channels[0]!.mean).toBeLessThan(20);
    expect(channels[0]!.max).toBe(255);
  });

  it("shrinks a 4K render to 1600 px wide", async () => {
    const d = tmp();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="3840" height="2560"><rect width="3840" height="2560" fill="#0a0a0a"/></svg>`;
    await sharp(Buffer.from(svg)).png().toFile(join(d, "big.png"));
    await importPortrait(join(d, "big.png"), "t1-support", { outDir: d, band: [0, 0.05] });
    expect((await sharp(join(d, "t1-support.webp")).metadata()).width).toBe(1600);
  });

  it("refuses a render whose coverage is outside the band, naming both", async () => {
    const d = tmp();
    await render(join(d, "in.png"), 6);
    await expect(
      importPortrait(join(d, "in.png"), "linux-engineer", { outDir: d, band: [0.3, 2] }),
    ).rejects.toThrow(/glow coverage \d\.\d+% is outside the band \[0\.3, 2\] for linux-engineer/);
    // The files are still there to look at.
    expect(existsSync(join(d, "linux-engineer.webp"))).toBe(true);
  });

  it("runs as a CLI and reads the band from deck-glow-bands.json", async () => {
    const d = tmp();
    await render(join(d, "in.png"), 30); // far outside S+'s 1–8% band
    expect(() =>
      execFileSync(
        process.execPath,
        [
          resolve("scripts/import-portrait.mjs"),
          join(d, "in.png"),
          "systems-architect",
          "--out",
          d,
        ],
        {
          stdio: "pipe",
        },
      ),
    ).toThrow(/outside the band \[1, 8\]/);
    await render(join(d, "ok.png"), 3);
    const out = execFileSync(
      process.execPath,
      [resolve("scripts/import-portrait.mjs"), join(d, "ok.png"), "systems-architect", "--out", d],
      { encoding: "utf8" },
    );
    expect(out).toMatch(/systems-architect: 900×600, glow [23]\.\d+% \(band 1–8%\)/);
  });
});
