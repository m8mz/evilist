import { describe, expect, it } from "vitest";
import {
  CARD_H,
  CARD_W,
  CHIP_H,
  CHIP_W,
  COLORS,
  font,
  paintBack,
  paintChip,
  paintFrame,
  paintPlaceholder,
} from "../src/scripts/deck/deck-paint";
import { fakeContext, fakeImage, type Op } from "./helpers/fakeCanvas";

/** Every recorded box and text anchor lies inside a w × h canvas. */
function expectInside(ops: Op[], w: number, h: number): void {
  for (const o of ops) {
    if (o.op === "fillRect" || o.op === "strokeRect" || o.op === "rect") {
      const [x, y, bw, bh] = o.args as number[];
      expect(x, `${o.op} x`).toBeGreaterThanOrEqual(-1);
      expect(y, `${o.op} y`).toBeGreaterThanOrEqual(-1);
      expect(x! + bw!, `${o.op} right`).toBeLessThanOrEqual(w + 1);
      expect(y! + bh!, `${o.op} bottom`).toBeLessThanOrEqual(h + 1);
    }
    if (o.op === "fillText") {
      const [, x, y] = o.args as [string, number, number];
      expect(x, `text x ${o.args[0]}`).toBeGreaterThanOrEqual(0);
      expect(x, `text x ${o.args[0]}`).toBeLessThanOrEqual(w);
      expect(y, `text y ${o.args[0]}`).toBeGreaterThan(0);
      expect(y, `text y ${o.args[0]}`).toBeLessThanOrEqual(h);
    }
  }
}

describe("font", () => {
  it("builds a JetBrains Mono font string, 400 by default, italic on request", () => {
    expect(font(14)).toBe(
      '400 14px "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
    );
    expect(font(12, 700)).toMatch(/^700 12px/);
    expect(font(10, 400, true)).toMatch(/^italic 400 10px/);
  });
});

describe("paintFrame", () => {
  it("draws the iron border, the slate inner frame and two steel brackets, scaled", () => {
    const ctx = fakeContext();
    paintFrame(ctx, CARD_W, CARD_H);
    const strokes = ctx.rects("strokeRect");
    expect(strokes[0]).toEqual({
      x: 0.5,
      y: 0.5,
      w: CARD_W - 1,
      h: CARD_H - 1,
      color: COLORS.iron,
    });
    expect(strokes[1]).toEqual({
      x: 6.5,
      y: 6.5,
      w: CARD_W - 13,
      h: CARD_H - 13,
      color: COLORS.slate,
    });
    const brackets = ctx.ops.filter((o) => o.op === "stroke" && o.strokeStyle === COLORS.steel);
    expect(brackets).toHaveLength(2);
    expectInside(ctx.ops, CARD_W, CARD_H);

    const big = fakeContext();
    paintFrame(big, CARD_W * 2, CARD_H * 2);
    expect(big.rects("strokeRect")[1]!.x).toBe(13);
  });
});

describe("paintChip", () => {
  it("fills S+ with ember and void text, borders S in violet, and the rest in slate", () => {
    const top = fakeContext();
    paintChip(top, CHIP_W, CHIP_H, "S+");
    expect(top.rects()[0]!.color).toBe(COLORS.ember);
    expect(top.ops.find((o) => o.op === "fillText")!.fillStyle).toBe(COLORS.void);
    expect(top.texts()).toEqual(["[ S+ ]"]);

    const s = fakeContext();
    paintChip(s, CHIP_W, CHIP_H, "S");
    expect(s.rects()[0]!.color).toBe(COLORS.graphite);
    expect(s.rects("strokeRect")[0]!.color).toBe(COLORS.violet);
    expect(s.ops.find((o) => o.op === "fillText")!.fillStyle).toBe(COLORS.paper);

    const e = fakeContext();
    paintChip(e, CHIP_W, CHIP_H, "E");
    expect(e.rects("strokeRect")[0]!.color).toBe(COLORS.slate);
    expect(e.ops.find((o) => o.op === "fillText")!.font).toMatch(/^700 12px/);
    expectInside(e.ops, CHIP_W, CHIP_H);
  });
});

describe("paintBack", () => {
  it("paints carbon, the inner frame, the mark centred at 84 px and the letter-spaced wordmark", () => {
    const ctx = fakeContext();
    const mark = fakeImage(226, 242);
    paintBack(ctx, CARD_W, CARD_H, mark);
    expect(ctx.rects()[0]).toEqual({ x: 0, y: 0, w: CARD_W, h: CARD_H, color: COLORS.back });
    expect(ctx.rects("strokeRect")[1]!.color).toBe("#2a2a2a");
    const draw = ctx.ops.find((o) => o.op === "drawImage")!;
    const [, x, y, w, h] = draw.args as [unknown, number, number, number, number];
    expect(h).toBeCloseTo(84, 6);
    expect(w).toBeCloseTo((84 * 226) / 242, 6);
    expect(x + w / 2).toBeCloseTo(CARD_W / 2, 6);
    expect(y + h / 2).toBeCloseTo(CARD_H / 2, 6);
    expect(ctx.texts().join("")).toBe("EVILIST · JOURNEY");
    expect(ctx.ops.find((o) => o.op === "fillText")!.fillStyle).toBe(COLORS.slate);
    expectInside(ctx.ops, CARD_W, CARD_H);
  });

  it("paints without the mark while it is still loading", () => {
    const ctx = fakeContext();
    paintBack(ctx, CARD_W, CARD_H, null);
    expect(ctx.ops.some((o) => o.op === "drawImage")).toBe(false);
    expect(ctx.texts().join("")).toBe("EVILIST · JOURNEY");
  });
});

describe("paintPlaceholder", () => {
  it("draws a head, shoulders and two eyes in the rank's colour, inside the window", () => {
    const ctx = fakeContext();
    paintPlaceholder(ctx, 0, 0, CARD_W, CARD_H * 0.52, "#9d7cf0");
    const ellipses = ctx.ops.filter((o) => o.op === "ellipse");
    expect(ellipses.length).toBeGreaterThanOrEqual(3);
    expect(ctx.fillsWith("#9d7cf0").length).toBeGreaterThanOrEqual(1);
    for (const e of ellipses) {
      const [cx, cy] = e.args as number[];
      expect(cx).toBeGreaterThan(0);
      expect(cx).toBeLessThan(CARD_W);
      expect(cy).toBeGreaterThan(0);
      expect(cy).toBeLessThan(CARD_H * 0.52);
    }
  });
});
