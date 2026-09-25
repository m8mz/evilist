import { mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { sceneMarkup } from "../scripts/build-scene.mjs";
import { STILL, renderRankStills, wrap16x9 } from "../scripts/render-rank-stills.mjs";

const rig = {
  ranks: ["a", "b"],
  canvas: { width: 100, height: 150 },
  anchors: { crown: 10, feet: 140, centre: 50 },
  parts: [
    {
      id: "head",
      polygon: [
        [0, 0],
        [100, 0],
        [100, 50],
        [0, 50],
      ],
    },
  ],
  pivots: { neck: [50, 45], hips: [50, 90] },
  poses: { a: { neck: 0, hips: 0 }, b: { neck: -10, hips: 0 } },
};
const art = {
  outfits: {
    a: [{ part: "head", name: "base", fill: "#0e0e12", d: "M 20 10 L 80 10 L 80 50 L 20 50 Z" }],
    b: [{ part: "head", name: "ember", fill: "#da5c2c", d: "M 20 10 L 80 10 L 80 50 L 20 50 Z" }],
  },
  props: { a: [], b: [] },
  energy: [],
};

let dir: string | undefined;
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

describe("wrap16x9", () => {
  it("nests the scene, centred by height, on a carbon 1920×1080 canvas", () => {
    const wrapped = wrap16x9(sceneMarkup(art, rig), rig);
    expect(wrapped).toMatch(
      /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><rect width="1920" height="1080" fill="#111111"\/><svg x="384" y="0" width="1152" height="1080" viewBox="0 0 160 150"/,
    );
    expect(wrapped).not.toContain("style=");
  });
});

describe("renderRankStills", () => {
  it("writes one 1920×1080 WebP per rank showing that rank", async () => {
    dir = mkdtempSync(join(tmpdir(), "stills-"));
    const scenePath = join(dir, "scene.svg");
    writeFileSync(scenePath, sceneMarkup(art, rig));
    const written = await renderRankStills({ scenePath, outDir: dir, rig });
    expect(written).toEqual([join(dir, "a.webp"), join(dir, "b.webp")]);
    for (const path of written) {
      const meta = await sharp(path).metadata();
      expect([meta.width, meta.height, meta.format]).toEqual([STILL.width, STILL.height, "webp"]);
      expect(statSync(path).size).toBeLessThan(120 * 1024);
    }
    // The head spans scene x 50–110, y 10–50 (rank b's is rotated -10° about (80, 45), which still
    // covers (60, 30)); that point lands at (384 + 60 * 7.2, 30 * 7.2) on the still: ink on a, ember on b.
    const at = async (path: string) =>
      (
        await sharp(path)
          .removeAlpha()
          .extract({ left: 816, top: 216, width: 1, height: 1 })
          .raw()
          .toBuffer()
      )[0];
    expect(await at(written[0]!)).toBeLessThan(0x20);
    expect(await at(written[1]!)).toBeGreaterThan(0xc0);
  });
});
