import { describe, expect, it } from "vitest";
import { isSceneDocument, stageForProgress } from "../src/scripts/journey";

describe("stageForProgress", () => {
  it("splits progress evenly across the stages", () => {
    expect(stageForProgress(0, 7)).toBe(0);
    expect(stageForProgress(0.14, 7)).toBe(0);
    expect(stageForProgress(0.15, 7)).toBe(1);
    expect(stageForProgress(0.5, 7)).toBe(3);
    expect(stageForProgress(0.99, 7)).toBe(6);
  });

  it("clamps overscroll and bad input", () => {
    expect(stageForProgress(1, 7)).toBe(6);
    expect(stageForProgress(1.4, 7)).toBe(6);
    expect(stageForProgress(-0.2, 7)).toBe(0);
    expect(stageForProgress(Number.NaN, 7)).toBe(0);
  });
});

describe("isSceneDocument", () => {
  const doc = (nodeName: string | null, hasAvatar: boolean) => ({
    documentElement: nodeName === null ? null : { nodeName },
    getElementById: (id: string) => (hasAvatar && id === "avatar" ? {} : null),
  });

  it("accepts an SVG document that carries the avatar", () => {
    expect(isSceneDocument(doc("svg", true))).toBe(true);
  });

  it("rejects an HTML error page, a parser error and an SVG without the avatar", () => {
    expect(isSceneDocument(doc("html", false))).toBe(false);
    expect(isSceneDocument(doc("parsererror", false))).toBe(false);
    expect(isSceneDocument(doc("svg", false))).toBe(false);
    expect(isSceneDocument(doc(null, true))).toBe(false);
  });
});
