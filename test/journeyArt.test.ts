import { existsSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CLIP_VARIANTS } from "../scripts/clip-variants.mjs";
import { career } from "../src/data/career";
import { clipSources, stageArt } from "../src/data/journeyArt";

const WEBM = 'video/webm; codecs="av01.0.05M.08"';
const MP4 = 'video/mp4; codecs="avc1.640028"';

describe("journey art", () => {
  it("gives every career stage, and only those, a 16:9 still and an illustration subject", () => {
    expect(Object.keys(stageArt).sort()).toEqual(career.map((s) => s.id).sort());
    for (const stage of career) {
      const { still, subject } = stageArt[stage.id];
      expect(subject.length, stage.id).toBeGreaterThan(20);
      expect(still.width, stage.id).toBeGreaterThanOrEqual(1920);
      expect(still.width / still.height, stage.id).toBeCloseTo(16 / 9, 1);
    }
  });

  it("lists a clip's four encodes: the 1280 pair from 48rem first, WebM before MP4", () => {
    expect(clipSources("sysadmin")).toEqual([
      { src: "/journey/sysadmin-1280.webm", type: WEBM, media: "(min-width: 48rem)" },
      { src: "/journey/sysadmin-1280.mp4", type: MP4, media: "(min-width: 48rem)" },
      { src: "/journey/sysadmin-640.webm", type: WEBM },
      { src: "/journey/sysadmin-640.mp4", type: MP4 },
    ]);
  });

  it("has every encode in public/journey, each within its limit", () => {
    for (const stage of career) {
      for (const { src } of clipSources(stage.id)) {
        const path = `public${src}`;
        expect(existsSync(path), path).toBe(true);
        const [, width, ext] = src.match(/-(\d+)\.(webm|mp4)$/)!;
        const variant = CLIP_VARIANTS.find((v) => v.width === Number(width) && v.ext === ext)!;
        expect(statSync(path).size, path).toBeLessThanOrEqual(variant.maxBytes);
      }
    }
  });
});
