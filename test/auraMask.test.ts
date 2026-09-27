import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { auraMask, silhouetteFromCutout } from "../scripts/aura-mask.mjs";
import bands from "../src/data/deck-glow-bands.json";

/** A 600 × 400 RGBA image, transparent except an opaque 200 × 300 rectangle at (200,50). */
async function cutout(): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect x="200" y="50" width="200" height="300" fill="#000000"/></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

describe("silhouetteFromCutout", () => {
  it("extracts the alpha channel as an 8-bit grey PNG at the requested width", async () => {
    const { png, width, height } = await silhouetteFromCutout(await cutout(), 400);
    expect(width).toBe(400);
    expect(height).toBe(267); // 400 × 400/600, rounded
    // toColourspace("b-w") before raw(): otherwise this sharp version promotes the read back to
    // three channels, even though the PNG itself is correctly single-channel (metadata says so).
    const { data, info } = await sharp(png)
      .toColourspace("b-w")
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(info.channels).toBe(1);
    const at = (x: number, y: number) => data[y * width + x]!;
    // The rectangle (200,50)-(400,350) of 600×400 scales to (133,33)-(267,233) of 400×267.
    expect(at(200, 133)).toBe(255); // inside the rectangle
    expect(at(10, 10)).toBe(0); // outside, far corner
  });
});

describe("auraMask", () => {
  it("bands the figure at rim 0.025: clear inside and far outside, an 8–14 px band at the edge", async () => {
    const { png } = await silhouetteFromCutout(await cutout(), 400);
    const { mask, width, height } = await auraMask(png);
    expect(width).toBe(400);
    expect(height).toBe(267);
    const at = (x: number, y: number) => mask[y * width + x]!;
    const centreY = 133; // the rectangle's own centre row (33 to 233)
    expect(at(200, centreY)).toBe(0); // the rectangle's centre
    expect(at(5, 5)).toBe(0); // far corner, well outside the rim
    expect(at(127, centreY)).toBeGreaterThan(40); // 6 px outside the left edge (~133)

    // The band's width along the centre row, outside the rectangle on each side.
    const row = Array.from({ length: width }, (_, x) => at(x, centreY));
    const runs: number[] = [];
    let count = 0;
    for (const v of row) {
      if (v > 128) count++;
      else {
        if (count > 0) runs.push(count);
        count = 0;
      }
    }
    if (count > 0) runs.push(count);
    expect(runs).toHaveLength(2); // one band left of the rectangle, one right
    for (const run of runs) {
      expect(run).toBeGreaterThanOrEqual(8);
      expect(run).toBeLessThanOrEqual(14);
    }
  });
});

describe("the committed aura assets", () => {
  const ids = Object.keys(bands);

  it("has a silhouette per id, at 800 px, with a figure share between 15% and 60%", async () => {
    for (const id of ids) {
      const path = `art/deck/${id}-silhouette.png`;
      // toColourspace("b-w") before raw(): this sharp version otherwise promotes a single-channel
      // PNG's read-back to three channels (verified: the file's own metadata says channels: 1).
      const { data, info } = await sharp(path)
        .toColourspace("b-w")
        .raw()
        .toBuffer({ resolveWithObject: true });
      expect(info.width, id).toBe(800);
      let lit = 0;
      const n = info.width * info.height;
      for (let i = 0; i < n; i++) if (data[i]! > 128) lit++;
      const share = (100 * lit) / n;
      expect(share, `${id} figure share`).toBeGreaterThan(15);
      expect(share, `${id} figure share`).toBeLessThan(60);
    }
  });

  it("has an aura mask per id: 400 px wide, mean 8–30/255, bright share under 12%", async () => {
    for (const id of ids) {
      const path = `src/images/deck/${id}-aura.webp`;
      const { data, info } = await sharp(path).raw().toBuffer({ resolveWithObject: true });
      expect(info.width, id).toBe(400);
      let sum = 0;
      let bright = 0;
      const n = info.width * info.height;
      for (let i = 0; i < n; i++) {
        const v = data[i * info.channels]!;
        sum += v;
        if (v > 128) bright++;
      }
      const mean = sum / n;
      expect(mean, `${id} mean`).toBeGreaterThan(8);
      expect(mean, `${id} mean`).toBeLessThan(30);
      expect((100 * bright) / n, `${id} bright share`).toBeLessThan(12);
    }
  });
});
