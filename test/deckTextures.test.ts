import { describe, expect, it } from "vitest";
import type { Texture } from "three";
import { career } from "../src/data/career";
import { cardModel } from "../src/scripts/deck/deck-paint";
import { DeckTextures, textureSize, type TextureFactory } from "../src/scripts/deck/deck-textures";
import { FakeContext, fakeImage } from "./helpers/fakeCanvas";

const NOW = new Date(2026, 8, 25);
const cards = career.map((s) => cardModel(s, NOW));

interface FakeTexture {
  needsUpdate: boolean;
  disposed: boolean;
  disposeCount: number;
  canvas: { width: number; height: number; ctx: FakeContext };
}

function factory() {
  const made: FakeTexture[] = [];
  const f: TextureFactory = {
    canvas(width, height) {
      const ctx = new FakeContext();
      const canvas = { width, height, ctx, getContext: () => ctx };
      return canvas as unknown as HTMLCanvasElement;
    },
    texture(canvas) {
      const t: FakeTexture = {
        needsUpdate: false,
        disposed: false,
        disposeCount: 0,
        canvas: canvas as unknown as FakeTexture["canvas"],
      };
      made.push(t);
      const dispose = () => {
        t.disposed = true;
        t.disposeCount++;
      };
      return Object.assign(t, { dispose }) as unknown as Texture;
    },
  };
  return { f, made };
}

describe("textureSize", () => {
  it("scales with the card and the pixel ratio, capped at 1040 wide, 5:7", () => {
    expect(textureSize(370, 2)).toEqual({ w: 740, h: 1036 });
    expect(textureSize(560, 2)).toEqual({ w: 1040, h: 1456 });
    expect(textureSize(342, 1.5)).toEqual({ w: 513, h: 718 });
  });
});

describe("DeckTextures", () => {
  it("paints bodies lazily and only repaints on a size change over 10%", () => {
    const { f, made } = factory();
    const t = new DeckTextures(cards, f);
    expect(t.setSize(370, 2)).toBe(true);
    expect(made).toHaveLength(0);
    t.body(0);
    expect(made).toHaveLength(1);
    expect(made[0]!.canvas.width).toBe(740);
    const paints = () => made[0]!.canvas.ctx.ops.filter((o) => o.op === "fillRect").length;
    const before = paints();
    expect(t.setSize(390, 2)).toBe(false); // 5% wider: no repaint
    expect(paints()).toBe(before);
    expect(t.setSize(460, 2)).toBe(true); // 24% wider: repaint at the new size
    expect(made[0]!.canvas.width).toBe(920);
    expect(paints()).toBeGreaterThan(before);
  });

  it("disposes a layer's old texture on resize, so three reallocates GPU storage at the new size", () => {
    const { f, made } = factory();
    const t = new DeckTextures(cards, f);
    t.setSize(370, 2);
    t.body(0);
    t.frame();
    const body = made[0]!;
    const frameLayer = made[1]!;
    expect(body.disposeCount).toBe(0);
    expect(frameLayer.disposeCount).toBe(0);
    expect(t.setSize(460, 2)).toBe(true); // 24% wider: triggers the resize
    expect(body.disposeCount).toBe(1);
    expect(frameLayer.disposeCount).toBe(1);
    // The same canvas and texture handle are reused and repainted, not replaced by a new one.
    expect(made).toHaveLength(2);
    expect(body.canvas.width).toBe(920);
    expect(frameLayer.canvas.width).toBe(920);
    expect(t.body(0)).toBe(body as unknown as Texture);
    expect(t.frame()).toBe(frameLayer as unknown as Texture);
  });

  it("shares one frame and one back, and paints the mark into the back when it arrives", () => {
    const { f, made } = factory();
    const t = new DeckTextures(cards, f);
    t.setSize(370, 1);
    expect(t.frame()).toBe(t.frame());
    expect(t.back()).toBe(t.back());
    const back = made.find((m) => m.canvas.ctx.texts().join("") === "EVILIST · JOURNEY")!;
    expect(back.canvas.ctx.ops.some((o) => o.op === "drawImage")).toBe(false);
    back.needsUpdate = false;
    t.setMark(fakeImage(226, 242));
    expect(back.canvas.ctx.ops.some((o) => o.op === "drawImage")).toBe(true);
    expect(back.needsUpdate).toBe(true);
  });

  it("repaints a body with its portrait when it arrives, and marks the texture dirty", () => {
    const { f, made } = factory();
    const t = new DeckTextures(cards, f);
    t.setSize(370, 1);
    t.body(5);
    made[0]!.needsUpdate = false;
    t.setPortrait(5, fakeImage(800, 533));
    expect(made[0]!.canvas.ctx.ops.some((o) => o.op === "drawImage")).toBe(true);
    expect(made[0]!.needsUpdate).toBe(true);
    // A portrait for a card whose body was never painted is kept for later, not painted now.
    t.setPortrait(2, fakeImage(800, 533));
    expect(made).toHaveLength(1);
    t.body(2);
    expect(made[1]!.canvas.ctx.ops.some((o) => o.op === "drawImage")).toBe(true);
  });

  it("gives text its own slot per card, two at a time, and never shows one card's lines on another", () => {
    const { f } = factory();
    const t = new DeckTextures(cards, f);
    t.setSize(370, 1);
    const s5 = t.text(5);
    expect(t.paintText(5, 3, false)).toBe(true);
    expect(t.paintText(5, 3, false)).toBe(false); // unchanged
    expect(t.paintText(5, 4, false)).toBe(true);
    const s6 = t.text(6);
    expect(s6).not.toBe(s5);
    expect(t.ownerOfSlot(0)).toBe(5);
    expect(t.ownerOfSlot(1)).toBe(6);
    // A third card evicts the least recently used slot, which is cleared first.
    const s0 = t.text(0);
    expect(s0).toBe(s5);
    expect(t.ownerOfSlot(0)).toBe(0);
    const ctx = (s0 as unknown as FakeTexture).canvas.ctx;
    const last = ctx.ops.at(-1)!;
    expect(last.op).toBe("clearRect");
    // The canvas (and its op log) is reused across owners, so isolate what the handoff itself
    // painted rather than the whole log: it must show card 0's lines, never card 5's.
    const before = ctx.ops.length;
    expect(t.paintText(0, 1, false)).toBe(true);
    const painted = ctx.ops
      .slice(before)
      .filter((o) => o.op === "fillText")
      .map((o) => String(o.args[0]));
    expect(painted).toContain("T1 Tech Support");
    expect(painted).not.toContain("Linux Engineer");
  });

  it("releases a slot back to the pool, cleared", () => {
    const { f } = factory();
    const t = new DeckTextures(cards, f);
    t.setSize(370, 1);
    t.text(3);
    t.paintText(3, 7, true);
    t.releaseText(3);
    expect(t.ownerOfSlot(0)).toBeNull();
    const ctx = (t.text(3) as unknown as FakeTexture).canvas.ctx;
    expect(ctx.texts().filter((x) => x === "T3 Tech Support")).toHaveLength(1);
    expect(t.paintText(3, 0, false)).toBe(false); // a fresh slot is already at 0 lines
  });

  it("hands out one shared blank texture for cards without a slot", () => {
    const { f, made } = factory();
    const t = new DeckTextures(cards, f);
    t.setSize(370, 1);
    expect(t.blank()).toBe(t.blank());
    expect(made).toHaveLength(1);
    expect(made[0]!.canvas.width).toBe(1);
    expect(made[0]!.canvas.height).toBe(1);
  });

  it("estimates the texture memory with mipmaps, and disposes everything", () => {
    const { f, made } = factory();
    const t = new DeckTextures(cards, f);
    t.setSize(370, 2);
    for (let i = 0; i < 7; i++) t.body(i);
    t.frame();
    t.back();
    t.text(0);
    t.text(1);
    for (let i = 0; i < 7; i++) t.chip(i);
    const layer = 740 * 1036 * 4 * 1.33;
    const chip = Math.round(80 * 2 * (370 / 520)) * Math.round(28 * 2 * (370 / 520)) * 4;
    expect(t.estimateBytes()).toBeCloseTo(11 * layer + 7 * chip, -3);
    t.dispose();
    expect(made.every((m) => m.disposed)).toBe(true);
  });
});
