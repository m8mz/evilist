import { gzipSync } from "node:zlib";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildScene,
  energyTransform,
  partTransform,
  sceneBox,
  sceneMarkup,
  stillMarkup,
} from "../scripts/build-scene.mjs";

/** A two-rank, two-part rig on a 100×150 canvas. */
const rig = {
  ranks: ["a", "b"],
  canvas: { width: 100, height: 150 },
  anchors: { crown: 10, feet: 140, centre: 50 },
  parts: [
    {
      id: "torso",
      polygon: [
        [0, 45],
        [100, 45],
        [100, 150],
        [0, 150],
      ],
    },
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

let dir: string | undefined;
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

const webp = (path: string, svg: string) =>
  sharp(Buffer.from(svg)).webp({ lossless: true }).toFile(path);

const figure = (ember = false) => `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="150">
  <rect width="100" height="150" fill="#f4f4f0"/>
  <circle cx="50" cy="28" r="18" fill="#101014"/>
  <rect x="30" y="46" width="40" height="94" fill="#1e1e24"/>
  ${ember ? '<rect x="35" y="100" width="30" height="20" fill="#da5c2c"/>' : ""}
</svg>`;

const square = (fill: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150">
  <rect width="150" height="150" fill="#f4f4f0"/><rect x="10" y="90" width="40" height="40" fill="${fill}"/>
</svg>`;

async function artDir() {
  dir = mkdtempSync(join(tmpdir(), "scene-"));
  const art = join(dir, "art");
  mkdirSync(art);
  await webp(join(art, "base.webp"), figure());
  await webp(join(art, "outfit-a.webp"), figure());
  await webp(join(art, "outfit-b.webp"), figure(true));
  await webp(join(art, "props-a.webp"), square("#6e6e78"));
  await webp(join(art, "energy.webp"), square("#7040d2"));
  return art;
}

describe("sceneBox", () => {
  it("derives the scene from the figure canvas: 1.6× wide, figure at 30%, props square at 5%", () => {
    expect(sceneBox(rig)).toEqual({
      width: 160,
      height: 150,
      figureX: 30,
      propsX: 5,
      propsSize: 150,
    });
    expect(sceneBox({ ...rig, canvas: { width: 1000, height: 1500 } })).toEqual({
      width: 1600,
      height: 1500,
      figureX: 300,
      propsX: 50,
      propsSize: 1500,
    });
  });
});

describe("partTransform", () => {
  it("rotates a pivoted part about its pivot and leaves the rest alone", () => {
    expect(partTransform(rig, "head", rig.poses.b)).toBe(' transform="rotate(-10 50 45)"');
    expect(partTransform(rig, "torso", rig.poses.b)).toBe("");
  });
});

describe("energyTransform", () => {
  it("scales about the hips in scene coordinates", () => {
    expect(energyTransform(rig, 0.5)).toBe("translate(80 90) scale(0.5) translate(-80 -90)");
  });
});

describe("sceneMarkup", () => {
  const art = {
    outfits: {
      a: [{ part: "head", name: "base", fill: "#0e0e12", d: "M 0 0 L 1 0 L 1 1 Z" }],
      b: [
        { part: "head", name: "base", fill: "#0e0e12", d: "M 0 0 L 1 0 L 1 1 Z" },
        { part: "torso", name: "ember", fill: "#da5c2c", d: "M 2 2 L 3 2 L 3 3 Z" },
      ],
    },
    props: { a: [{ name: "base", fill: "#0e0e12", d: "M 5 5 L 6 5 L 6 6 Z" }], b: [] },
    energy: [{ name: "violet", fill: "#7040d2", d: "M 7 7 L 8 7 L 8 8 Z" }],
  };

  it("emits every id of the contract, in draw order, with rank 0 visible", () => {
    const svg = sceneMarkup(art, rig, { visibleRank: 0 });
    expect(svg).toMatch(
      /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 160 150" preserveAspectRatio="xMidYMid meet">/,
    );
    const order = [
      "floor",
      "energy",
      "props",
      "props-a",
      "props-a-fill",
      "props-a-outline",
      "props-b",
      "avatar",
      "part-torso",
      "part-torso-idle",
      "outfit-a-torso",
      "outfit-b-torso",
      "part-head",
      "part-head-idle",
      "outfit-a-head",
      "outfit-b-head",
    ];
    let at = -1;
    for (const id of order) {
      const i = svg.indexOf(`id="${id}"`);
      expect(i, id).toBeGreaterThan(at);
      at = i;
    }
    expect(svg).toContain('<g id="outfit-a-head" visibility="visible" opacity="1">');
    expect(svg).toContain('<g id="outfit-b-head" visibility="hidden" opacity="0">');
    expect(svg).toContain('<g id="outfit-a-torso" visibility="visible" opacity="1"></g>'); // no layers, same id
    expect(svg).toContain('<g id="props-a" visibility="visible">');
    expect(svg).toContain('<g id="props-b" visibility="hidden">');
    expect(svg).toContain(
      '<path id="props-a-outline" d="M 5 5 L 6 5 L 6 6 Z" fill="none" stroke="#6e6e78" stroke-width="3" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="0" opacity="0"/>',
    );
    expect(svg).toContain('<path id="props-b-outline" d="" ');
    expect(svg).toContain('<g id="part-head" transform="rotate(0 50 45)">');
    expect(svg).toContain('<g id="part-torso">');
    expect(svg).toContain('<g id="avatar" transform="translate(30 0)">');
    // progress at the middle of rank 0 of 2 is 0.25: opacity 0.0625, scale 0.625
    expect(svg).toContain(
      '<g id="energy" opacity="0.063" transform="translate(80 90) scale(0.625) translate(-80 -90)"><g transform="translate(5 0)">',
    );
    expect(svg).toContain('<rect id="floor"');
    expect(svg).not.toContain("style=");
  });

  it("gives the ember layers of props a glow class for the idle blink", () => {
    const svg = sceneMarkup(
      { ...art, props: { a: [{ name: "ember", fill: "#da5c2c", d: "M 0 0 Z" }], b: [] } },
      rig,
      {},
    );
    expect(svg).toContain('<g class="glow" fill="#da5c2c"');
  });

  it("can start on another rank, posed", () => {
    const svg = sceneMarkup(art, rig, { visibleRank: 1 });
    expect(svg).toContain('<g id="outfit-b-head" visibility="visible" opacity="1">');
    expect(svg).toContain('<g id="outfit-a-head" visibility="hidden" opacity="0">');
    expect(svg).toContain('<g id="part-head" transform="rotate(-10 50 45)">');
  });
});

describe("stillMarkup", () => {
  it("re-poses a built scene on one rank with the energy at that rank's level", () => {
    const art = { outfits: { a: [], b: [] }, props: { a: [], b: [] }, energy: [] };
    const scene = sceneMarkup(art, rig, { visibleRank: 0 });
    const still = stillMarkup(scene, rig, 1);
    expect(still).toContain('<g id="outfit-b-head" visibility="visible" opacity="1">');
    expect(still).toContain('<g id="outfit-a-head" visibility="hidden" opacity="0">');
    expect(still).toContain('<g id="props-b" visibility="visible">');
    expect(still).toContain('<g id="props-a" visibility="hidden">');
    expect(still).toContain('<g id="part-head" transform="rotate(-10 50 45)">');
    // progress at the middle of rank 1 of 2 is 0.75: opacity 0.5625, scale 0.875
    expect(still).toContain(
      '<g id="energy" opacity="0.563" transform="translate(80 90) scale(0.875) translate(-80 -90)">',
    );
    expect(stillMarkup(still, rig, 0)).toBe(scene);
  });
});

describe("buildScene", () => {
  it("traces the art into scene.svg and the silhouette, tolerating missing props", async () => {
    const art = await artDir();
    const out = join(dir!, "public");
    const silhouette = join(dir!, "silhouette.svg");
    mkdirSync(out);
    const result = await buildScene({ artDir: art, outDir: out, silhouettePath: silhouette, rig });
    const scene = readFileSync(join(out, "scene.svg"), "utf8");
    expect(scene).toBe(result.scene);
    for (const id of [
      "outfit-a-head",
      "outfit-a-torso",
      "outfit-b-head",
      "outfit-b-torso",
      "props-a-fill",
      "props-b-fill",
      "energy",
    ]) {
      expect(scene, id).toContain(`id="${id}"`);
    }
    // A part group's content runs up to the next group with an id.
    const groupOf = (id: string) =>
      scene.match(new RegExp(`id="${id}"[^>]*>([\\s\\S]*?)<g id=`))![1]!;
    expect(groupOf("outfit-b-torso")).toContain('fill="#da5c2c"');
    expect(groupOf("outfit-a-torso")).not.toContain('fill="#da5c2c"');
    expect(scene).toMatch(/id="props-a-outline" d="M/);
    expect(scene).toContain('id="props-b-outline" d=""');
    expect(scene).not.toContain("style=");
    expect(existsSync(silhouette)).toBe(true);
    const sil = readFileSync(silhouette, "utf8");
    expect(sil).toMatch(
      /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 160 150" preserveAspectRatio="xMidYMid meet"><path transform="translate\(30 0\)" fill="#202020" d="M/,
    );
    expect(statSync(silhouette).size).toBeLessThan(4096);
    expect(gzipSync(scene).length).toBeGreaterThan(100);
  }, 30_000);

  it("fails loudly when an outfit is missing", async () => {
    const art = await artDir();
    rmSync(join(art, "outfit-b.webp"));
    await expect(
      buildScene({ artDir: art, outDir: dir!, silhouettePath: join(dir!, "s.svg"), rig }),
    ).rejects.toThrow(/outfit-b\.webp/);
  });
});
