import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { previewRig } from "../scripts/preview-rig.mjs";
import { career } from "../src/data/career";
import { PART_ORDER, PIVOT_OF_PART, RIG, type PartId } from "../src/data/avatarRig";

const PARTS: PartId[] = [
  "head",
  "torso",
  "arm-left",
  "arm-right",
  "legs",
  "coat-left",
  "coat-right",
];

describe("avatar rig", () => {
  it("lists the ranks in career order", () => {
    expect(RIG.ranks).toEqual(career.map((s) => s.id));
  });

  it("names every part once, in a draw order that ends with the torso and the head", () => {
    expect(RIG.parts.map((p) => p.id).sort()).toEqual([...PARTS].sort());
    expect(PART_ORDER).toEqual([
      "coat-left",
      "coat-right",
      "legs",
      "arm-left",
      "arm-right",
      "torso",
      "head",
    ]);
  });

  it("keeps every polygon and pivot inside the figure canvas", () => {
    const { width, height } = RIG.canvas;
    for (const part of RIG.parts) {
      expect(part.polygon.length, part.id).toBeGreaterThanOrEqual(3);
      for (const [x, y] of part.polygon) {
        expect(x, part.id).toBeGreaterThanOrEqual(0);
        expect(x, part.id).toBeLessThanOrEqual(width);
        expect(y, part.id).toBeGreaterThanOrEqual(0);
        expect(y, part.id).toBeLessThanOrEqual(height);
      }
    }
    for (const [name, [x, y]] of Object.entries(RIG.pivots)) {
      expect(x, name).toBeGreaterThan(0);
      expect(x, name).toBeLessThan(width);
      expect(y, name).toBeGreaterThan(0);
      expect(y, name).toBeLessThan(height);
    }
    expect(RIG.anchors.crown).toBeLessThan(RIG.anchors.feet);
    expect(RIG.anchors.feet).toBeLessThanOrEqual(height);
  });

  it("maps the head and the arms to their pivots", () => {
    expect(PIVOT_OF_PART).toEqual({
      head: "neck",
      "arm-left": "shoulder-left",
      "arm-right": "shoulder-right",
    });
  });

  it("gives every rank a pose for every pivot, within ±60°", () => {
    for (const rank of RIG.ranks) {
      const pose = RIG.poses[rank];
      expect(pose, rank).toBeDefined();
      expect(Object.keys(pose!).sort()).toEqual(Object.keys(RIG.pivots).sort());
      for (const deg of Object.values(pose!)) expect(Math.abs(deg)).toBeLessThanOrEqual(60);
    }
  });
});

describe("previewRig", () => {
  let dir: string | undefined;
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = undefined;
  });

  it("draws the polygons and pivots over the base at the base's size", async () => {
    dir = mkdtempSync(join(tmpdir(), "rig-"));
    const base = join(dir, "base.webp");
    await sharp({ create: { width: 100, height: 150, channels: 3, background: "#f4f4f0" } })
      .webp({ lossless: true })
      .toFile(base);
    const rig = {
      ...RIG,
      canvas: { width: 100, height: 150 },
      parts: [
        {
          id: "head",
          polygon: [
            [40, 10],
            [60, 10],
            [60, 40],
            [40, 40],
          ],
        },
      ],
      pivots: { neck: [50, 40] },
    };
    const out = join(dir, "preview.png");
    await previewRig(base, rig, out);
    expect(existsSync(out)).toBe(true);
    const meta = await sharp(out).metadata();
    expect([meta.width, meta.height]).toEqual([100, 150]);
    // The overlay drew something: the pixel on the polygon's edge is no longer background.
    const { data } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
    const at = (x: number, y: number) => data[(y * 100 + x) * 3];
    expect(at(40, 25)).not.toBe(0xf4);
  });
});
