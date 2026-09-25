import { describe, expect, it } from "vitest";
import { detectTier, pixelRatioCap, type TierEnv } from "../src/scripts/deck/deck-tier";

const desktop: TierEnv = {
  reducedMotion: false,
  saveData: false,
  webgl2: true,
  cores: 8,
  memory: 8,
  coarsePointer: false,
};

describe("detectTier", () => {
  it("is high on a capable desktop", () => {
    expect(detectTier(desktop)).toBe("high");
  });

  it("is none under reduced motion, save-data, no WebGL2, or a very small device", () => {
    expect(detectTier({ ...desktop, reducedMotion: true })).toBe("none");
    expect(detectTier({ ...desktop, saveData: true })).toBe("none");
    expect(detectTier({ ...desktop, webgl2: false })).toBe("none");
    expect(detectTier({ ...desktop, cores: 2 })).toBe("none");
    expect(detectTier({ ...desktop, memory: 2 })).toBe("none");
  });

  it("is mid on a coarse pointer, four cores or 4 GB", () => {
    expect(detectTier({ ...desktop, coarsePointer: true })).toBe("mid");
    expect(detectTier({ ...desktop, cores: 4 })).toBe("mid");
    expect(detectTier({ ...desktop, memory: 4 })).toBe("mid");
  });

  it("treats a missing cores or memory reading as passing (Safari and Firefox)", () => {
    expect(detectTier({ ...desktop, cores: undefined, memory: undefined })).toBe("high");
    expect(detectTier({ ...desktop, memory: undefined, coarsePointer: true })).toBe("mid");
  });

  it("caps the pixel ratio by tier", () => {
    expect(pixelRatioCap("high")).toBe(2);
    expect(pixelRatioCap("mid")).toBe(1.5);
    expect(pixelRatioCap("none")).toBe(1);
  });
});
