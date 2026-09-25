import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { importArt } from "../scripts/import-art.mjs";

let dir: string | undefined;
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

describe("importArt", () => {
  it("fits a render onto the canvas as lossless WebP, padding with white, never cropping", async () => {
    dir = mkdtempSync(join(tmpdir(), "art-"));
    const input = join(dir, "in.png");
    await sharp({ create: { width: 1600, height: 1600, channels: 4, background: "#101014ff" } })
      .png()
      .toFile(input);
    const meta = await importArt(input, join(dir, "out.webp"), 1000, 1500);
    expect([meta.width, meta.height, meta.format]).toEqual([1000, 1500, "webp"]);
    const { data } = await sharp(join(dir, "out.webp")).raw().toBuffer({ resolveWithObject: true });
    const px = (x: number, y: number) => data[(y * 1000 + x) * 3];
    expect(px(500, 10)).toBe(0xff); // padded top
    expect(px(500, 750)).toBe(0x10); // the art, centred
  });
});
