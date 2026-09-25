import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  BACKGROUND,
  PALETTE,
  denoise,
  isBackground,
  quantise,
  roundPath,
  svgFromLayers,
  traceLayers,
} from "../scripts/trace-vector.mjs";

/** A 400×600 flat-art stand-in: a black column with an ember block near its foot. */
const art = () =>
  sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600">
        <rect width="400" height="600" fill="#f4f4f0"/>
        <rect x="100" y="100" width="200" height="400" fill="#101014"/>
        <rect x="150" y="400" width="100" height="80" fill="#da5c2c"/>
      </svg>`,
    ),
  )
    .png()
    .toBuffer();

const bbox = (d: string) => {
  const nums = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const xs = nums.filter((_, i) => i % 2 === 0);
  const ys = nums.filter((_, i) => i % 2 === 1);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
};

describe("isBackground", () => {
  it("treats near-white as background and anything darker or tinted as art", () => {
    expect(isBackground(250, 250, 250)).toBe(true);
    expect(isBackground(244, 244, 240)).toBe(true);
    expect(isBackground(200, 200, 200)).toBe(false);
    expect(isBackground(240, 200, 240)).toBe(false);
  });
});

describe("quantise", () => {
  it("maps each pixel to the nearest palette colour, background to 255", () => {
    const px = Buffer.from([218, 92, 44, 255, 255, 255, 20, 20, 24, 110, 60, 200]);
    const names = Object.keys(PALETTE);
    const out = quantise(px, 4);
    expect(names[out[0]!]).toBe("ember");
    expect(out[1]).toBe(BACKGROUND);
    expect(names[out[2]!]).toBe("ink");
    expect(names[out[3]!]).toBe("violet");
  });
});

describe("roundPath", () => {
  it("rounds to one decimal, drops trailing zeros and folds whitespace", () => {
    expect(roundPath("M 10.000 20.500\nC 1.234 -0.000 3 4")).toBe("M 10 20.5 C 1.2 0 3 4");
  });
});

describe("denoise", () => {
  it("snaps a one-pixel ring to its neighbours and keeps solid regions", () => {
    // 6×6: a 2×2 block of colour 1 ringed by colour 2, on background.
    const w = 6;
    const idx = new Uint8Array(w * w).fill(BACKGROUND);
    for (let y = 1; y <= 4; y++) for (let x = 1; x <= 4; x++) idx[y * w + x] = 2;
    for (let y = 2; y <= 3; y++) for (let x = 2; x <= 3; x++) idx[y * w + x] = 1;
    const out = denoise(idx, w, w);
    expect(out[2 * w + 2]).toBe(2); // the tiny block is outvoted by its ring
    expect(out[1 * w + 1]).toBe(BACKGROUND); // the ring's corner is outvoted by the background
    expect(out[0]).toBe(BACKGROUND); // edges keep their values
  });
});

describe("traceLayers", () => {
  it("traces a silhouette base plus one layer per colour, each where the colour is", async () => {
    const layers = await traceLayers(await art());
    expect(layers.map((l) => l.name)).toEqual(["base", "ember"]);
    expect(layers[0]!.fill).toBe(PALETTE.ink);
    const base = bbox(layers[0]!.d);
    expect(base.x0).toBeGreaterThan(95);
    expect(base.x1).toBeLessThan(305);
    expect(base.y0).toBeGreaterThan(95);
    expect(base.y1).toBeLessThan(505);
    const ember = bbox(layers[1]!.d);
    expect(ember.x0).toBeGreaterThan(145);
    expect(ember.x1).toBeLessThan(255);
    expect(ember.y0).toBeGreaterThan(395);
    expect(ember.y1).toBeLessThan(485);
    for (const l of layers) expect(l.d).not.toMatch(/\d\.\d\d/);
  });

  it("cuts every layer by the part masks, keeping the part's name", async () => {
    const parts = [
      {
        id: "top",
        polygon: [
          [0, 0],
          [400, 0],
          [400, 300],
          [0, 300],
        ],
      },
      {
        id: "bottom",
        polygon: [
          [0, 300],
          [400, 300],
          [400, 600],
          [0, 600],
        ],
      },
    ];
    const layers = await traceLayers(await art(), { parts });
    expect(layers.map((l) => `${l.part}/${l.name}`)).toEqual([
      "top/base",
      "bottom/base",
      "bottom/ember",
    ]);
    expect(bbox(layers[0]!.d).y1).toBeLessThan(305);
    expect(bbox(layers[1]!.d).y0).toBeGreaterThan(295);
  });

  it("traces nothing from a blank image", async () => {
    const blank = await sharp({
      create: { width: 50, height: 50, channels: 3, background: "#fff" },
    })
      .png()
      .toBuffer();
    expect(await traceLayers(blank)).toEqual([]);
  });

  it("resamples to the requested size first", async () => {
    const layers = await traceLayers(await art(), { width: 200, height: 300 });
    const base = bbox(layers[0]!.d);
    expect(base.x0).toBeGreaterThan(45);
    expect(base.x1).toBeLessThan(155);
  });
});

describe("svgFromLayers", () => {
  it("writes one filled group per layer with no style attributes", () => {
    const svg = svgFromLayers(
      [
        { name: "base", fill: "#0e0e12", d: "M 0 0 L 10 0 L 10 10 Z" },
        { name: "ember", fill: "#da5c2c", d: "M 2 2 L 4 2 L 4 4 Z" },
      ],
      10,
      10,
    );
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 10 10">/);
    expect(svg.match(/<g /g)).toHaveLength(2);
    expect(svg).toContain('fill="#da5c2c" fill-rule="evenodd"><path d="M 2 2 L 4 2 L 4 4 Z"/>');
    expect(svg).not.toContain("style=");
  });
});
