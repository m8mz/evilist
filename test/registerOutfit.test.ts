import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { RESIDUAL_MAX, measure, registerOutfit } from "../scripts/register-outfit.mjs";

let dir: string;
afterEach(() => rmSync(dir, { recursive: true, force: true }));

/** A stick figure on a 500×750 canvas: head, body, boots; `s` scales it, `dx`/`dy` shift it. */
async function figure(path: string, s = 1, dx = 0, dy = 0, bootHalf = 70, torsoHalf = 50) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750">
    <rect width="500" height="750" fill="#f4f4f0"/>
    <g transform="translate(${dx} ${dy}) scale(${s})">
      <circle cx="250" cy="70" r="40" fill="#101014"/>
      <rect x="${250 - torsoHalf}" y="110" width="${torsoHalf * 2}" height="500" fill="#1e1e24"/>
      <rect x="${250 - bootHalf}" y="610" width="${bootHalf * 2}" height="60" fill="#101014"/>
    </g></svg>`;
  await sharp(Buffer.from(svg)).webp({ lossless: true }).toFile(path);
}

describe("measure", () => {
  it("finds the crown, the feet and the crown's centre", async () => {
    dir = mkdtempSync(join(tmpdir(), "reg-"));
    const base = join(dir, "base.webp");
    await figure(base);
    const m = await measure(base, 500, 750);
    expect(m.crown).toBeGreaterThanOrEqual(29);
    expect(m.crown).toBeLessThanOrEqual(31);
    expect(m.feet).toBeGreaterThanOrEqual(668);
    expect(m.feet).toBeLessThanOrEqual(670);
    expect(Math.abs(m.centre - 250)).toBeLessThan(2);
    expect(m.rows[400]).toEqual([200, 299]);
  });
});

describe("registerOutfit", () => {
  it("fits a smaller, shifted render of the same body onto the base", async () => {
    dir = mkdtempSync(join(tmpdir(), "reg-"));
    const base = join(dir, "base.webp");
    const outfit = join(dir, "outfit.webp");
    const out = join(dir, "registered.webp");
    await figure(base);
    await figure(outfit, 0.8, 30, 40, 70, 80); // a wider coat, the same head and boots
    const r = await registerOutfit(base, outfit, out);
    expect(r.accepted).toBe(true);
    expect(r.scale).toBeCloseTo(1.25, 1);
    expect(r.residual).toBeLessThan(RESIDUAL_MAX);
    expect(existsSync(out)).toBe(true);
    const m = await measure(out, 500, 750);
    expect(Math.abs(m.crown - 30)).toBeLessThanOrEqual(2);
    expect(Math.abs(m.feet - 669)).toBeLessThanOrEqual(2);
    expect(Math.abs(m.centre - 250)).toBeLessThan(3);
    const meta = await sharp(out).metadata();
    expect([meta.width, meta.height]).toEqual([500, 750]);
  });

  it("rejects a render whose feet don't line up, and writes nothing", async () => {
    dir = mkdtempSync(join(tmpdir(), "reg-"));
    const base = join(dir, "base.webp");
    const outfit = join(dir, "outfit.webp");
    const out = join(dir, "registered.webp");
    await figure(base);
    await figure(outfit, 1, 0, 0, 110); // boots 40 px wider each side: ~6% of the figure's height
    const r = await registerOutfit(base, outfit, out);
    expect(r.accepted).toBe(false);
    expect(r.residual).toBeGreaterThan(RESIDUAL_MAX);
    expect(existsSync(out)).toBe(false);
  });
});
