import { readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { PART_ORDER, RIG } from "../src/data/avatarRig";

const scene = readFileSync("public/journey/scene.svg", "utf8");

describe("public/journey/scene.svg", () => {
  it("exposes every outfit's parts, every rank's props and the energy by id", () => {
    for (const rank of RIG.ranks) {
      for (const part of PART_ORDER)
        expect(scene, `${rank}/${part}`).toContain(`id="outfit-${rank}-${part}"`);
      expect(scene).toContain(`id="props-${rank}-fill"`);
      expect(scene).toContain(`id="props-${rank}-outline"`);
    }
    for (const part of PART_ORDER) {
      expect(scene).toContain(`id="part-${part}"`);
      expect(scene).toContain(`id="part-${part}-idle"`);
    }
    expect(scene).toContain('id="energy"');
    expect(scene).toContain('id="avatar"');
  });

  it("starts on rank E, with every other rank hidden", () => {
    expect(scene).toContain(`id="outfit-${RIG.ranks[0]}-head" visibility="visible" opacity="1"`);
    expect(scene).toContain(`id="outfit-${RIG.ranks[1]}-head" visibility="hidden" opacity="0"`);
  });

  it("draws every prop set and every outfit with at least one path", () => {
    for (const rank of RIG.ranks) {
      expect(scene, `props-${rank}`).toMatch(new RegExp(`id="props-${rank}-fill"[^>]*><g `));
      expect(scene, `outfit-${rank}`).toMatch(new RegExp(`id="outfit-${rank}-torso"[^>]*><g `));
    }
  });

  it("uses no style attributes and stays within its budget", () => {
    expect(scene).not.toContain("style=");
    expect(gzipSync(scene).length).toBeLessThanOrEqual(300 * 1024);
  });
});

describe("src/components/journey/silhouette.svg", () => {
  it("is one small path on the scene's viewBox", () => {
    const svg = readFileSync("src/components/journey/silhouette.svg", "utf8");
    expect(svg).toMatch(
      /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 1600 1500" preserveAspectRatio="xMidYMid meet"><path transform="translate\(300 0\) scale\(4\)" fill="#202020" d="M/,
    );
    expect(svg.match(/<path/g)).toHaveLength(1);
    expect(statSync("src/components/journey/silhouette.svg").size).toBeLessThanOrEqual(4096);
  });
});
