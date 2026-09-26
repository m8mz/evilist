import { describe, expect, it } from "vitest";
import {
  CARD_H,
  CARD_W,
  CHIP_H,
  CHIP_W,
  COLORS,
  deckFontFamily,
  font,
  paintBack,
  paintBody,
  paintChip,
  paintFrame,
  paintPlaceholder,
  paintPuff,
  paintRadial,
  paintSeam,
  paintText,
  PRINT_STEPS,
  PUFF_SIZE,
  RADIAL_SIZE,
  cardModel,
  setDeckFontFamily,
  wrapText,
  xpGlyphs,
  WINDOW,
} from "../src/scripts/deck/deck-paint";
import { career } from "../src/data/career";
import { mulberry32 } from "../src/scripts/deck/deck-util";
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

  it("builds from the family the page registers, not a hardcoded one", () => {
    expect(deckFontFamily()).toBe("JetBrains Mono");
    try {
      setDeckFontFamily("JetBrains Mono-abc123");
      expect(deckFontFamily()).toBe("JetBrains Mono-abc123");
      expect(font(14)).toBe(
        '400 14px "JetBrains Mono-abc123", ui-monospace, SFMono-Regular, Menlo, monospace',
      );
      expect(font(14)).toMatch(/^400 14px "JetBrains Mono-abc123"/);
    } finally {
      setDeckFontFamily("JetBrains Mono");
    }
    expect(font(14)).toBe(
      '400 14px "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
    );
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

const NOW = new Date(2026, 8, 25);
const byId = (id: string) =>
  cardModel(
    career.find((s) => s.id === id)!,
    NOW,
  );

describe("cardModel", () => {
  it("assembles everything the card prints", () => {
    const s = byId("linux-engineer");
    expect(s.art.rank).toBe("S");
    expect(s.dates).toBe("Oct 2019 – May 2021");
    expect(s.tenure).toBe("19 months");
    expect(s.xp).toBeCloseTo(57 / 115, 6);
    expect(s.blocks).toBe(5);
    expect(s.acquired).toHaveLength(9);
    expect(s.setNumber).toBe("EVL-06/07");
  });
});

describe("wrapText and xpGlyphs", () => {
  it("wraps greedily by words within the width", () => {
    const ctx = fakeContext();
    ctx.font = font(10);
    // 0.6 em advance: 10 px font → 6 px per character; 60 px fits ten characters.
    expect(wrapText(ctx, "one two three four", 60)).toEqual(["one two", "three four"]);
    expect(wrapText(ctx, "supercalifragilistic", 60)).toEqual(["supercalifragilistic"]);
    expect(wrapText(ctx, "", 60)).toEqual([]);
  });

  it("lights the blocks from the left", () => {
    expect(xpGlyphs(5)).toEqual({ lit: "▮▮▮▮▮", dark: "▯▯▯▯▯" });
    expect(xpGlyphs(10)).toEqual({ lit: "▮▮▮▮▮▮▮▮▮▮", dark: "" });
    expect(xpGlyphs(0)).toEqual({ lit: "", dark: "▯▯▯▯▯▯▯▯▯▯" });
  });
});

describe("paintBody", () => {
  it("paints carbon, a void window, the divider and the placeholder when there is no portrait", () => {
    const ctx = fakeContext();
    paintBody(ctx, CARD_W, CARD_H, byId("t1-support"), null);
    const fills = ctx.rects();
    expect(fills[0]).toEqual({ x: 0, y: 0, w: CARD_W, h: CARD_H, color: COLORS.carbon });
    expect(fills[1]).toEqual({ x: 0, y: 0, w: CARD_W, h: CARD_H * WINDOW, color: COLORS.void });
    expect(ctx.ops.some((o) => o.op === "ellipse")).toBe(true);
    expect(ctx.fillsWith("#6b4a2f").length).toBeGreaterThan(0);
    const divider = fills.find((r) => r.color === COLORS.iron && r.h === 1);
    expect(divider).toEqual({ x: 0, y: CARD_H * WINDOW, w: CARD_W, h: 1, color: COLORS.iron });
    expectInside(ctx.ops, CARD_W, CARD_H);
  });

  it("cover-fits a 3:2 portrait into the 11:8 window, anchored top-centre, under a scrim", () => {
    const ctx = fakeContext();
    paintBody(ctx, CARD_W, CARD_H, byId("linux-engineer"), fakeImage(800, 533));
    const draw = ctx.ops.find((o) => o.op === "drawImage")!;
    const [, dx, dy, dw, dh] = draw.args as [unknown, number, number, number, number];
    const winH = CARD_H * WINDOW;
    const scale = Math.max(CARD_W / 800, winH / 533);
    expect(dw).toBeCloseTo(800 * scale, 6);
    expect(dh).toBeCloseTo(533 * scale, 6);
    expect(dy).toBe(0);
    expect(dx + dw / 2).toBeCloseTo(CARD_W / 2, 6);
    expect(ctx.ops.some((o) => o.op === "clip")).toBe(true);
    expect(ctx.ops.some((o) => o.op === "ellipse")).toBe(false);
    const scrim = ctx.ops.filter((o) => o.op === "fillRect" && o.fillStyle === "gradient");
    expect(scrim).toHaveLength(1);
    const [sx, sy, sw, sh] = scrim[0]!.args as number[];
    expect([sx, sy, sw, sh]).toEqual([0, winH * 0.7, CARD_W, winH * 0.3]);
  });
});

describe("paintText", () => {
  it("draws nothing at 0 lines and everything at 7, in print order", () => {
    const none = fakeContext();
    expect(paintText(none, CARD_W, CARD_H, byId("linux-engineer"), 0).bottom).toBe(0);
    expect(none.texts()).toEqual([]);

    const all = fakeContext();
    paintText(all, CARD_W, CARD_H, byId("linux-engineer"), PRINT_STEPS);
    const texts = all.texts();
    const idx = (needle: string) => texts.findIndex((t) => t.includes(needle));
    expect(idx("Linux Engineer")).toBeGreaterThanOrEqual(0);
    expect(idx("Caris Life Sciences · Oct 2019 – May 2021")).toBeGreaterThan(idx("Linux Engineer"));
    expect(idx("status --rank 6")).toBeGreaterThan(idx("Caris"));
    expect(idx("on_arrival")).toBeGreaterThan(idx("status"));
    expect(idx("acquired")).toBeGreaterThan(idx("on_arrival"));
    expect(idx("xp")).toBeGreaterThan(idx("acquired"));
    expect(idx("tenure")).toBeGreaterThan(idx("xp"));
    expect(idx("EVL-06/07")).toBeGreaterThan(idx("tenure"));
    expect(texts.at(-1)).toBe("S");
  });

  it("puts the quote in the window, right-aligned, italic fog, within 42% of the width", () => {
    const ctx = fakeContext();
    paintText(ctx, CARD_W, CARD_H, byId("linux-engineer"), 1);
    const quote = ctx.ops.filter((o) => o.op === "fillText" && o.textAlign === "right");
    expect(quote.length).toBeGreaterThanOrEqual(2);
    expect(quote.join("")).toBeDefined();
    const words = quote.map((o) => String(o.args[0]));
    expect(words[0]!.startsWith("“")).toBe(true);
    expect(words.at(-1)!.endsWith("”")).toBe(true);
    for (const o of quote) {
      expect(o.font).toMatch(/^italic 400 10px/);
      expect(o.fillStyle).toBe(COLORS.fog);
      expect(o.args[1]).toBe(CARD_W - 14);
      expect(String(o.args[0]).length * 6).toBeLessThanOrEqual(CARD_W * 0.42);
      expect(o.args[2] as number).toBeLessThan(CARD_H * WINDOW - 40);
    }
  });

  it("prints each acquired skill in a slate box, eight of them and +6 for S", () => {
    const ctx = fakeContext();
    paintText(ctx, CARD_W, CARD_H, byId("linux-engineer"), 4);
    const boxes = ctx.rects("strokeRect").filter((r) => r.color === COLORS.slate);
    expect(boxes).toHaveLength(9);
    expect(ctx.texts()).toContain("+6");
    expect(ctx.texts()).toContain("Ansible");
  });

  it("lights the xp blocks in ember and the rest in slate, then the percentage", () => {
    const ctx = fakeContext();
    paintText(ctx, CARD_W, CARD_H, byId("linux-engineer"), 5);
    const lit = ctx.ops.find((o) => o.op === "fillText" && o.args[0] === "▮▮▮▮▮")!;
    const dark = ctx.ops.find((o) => o.op === "fillText" && o.args[0] === "▯▯▯▯▯")!;
    expect(lit.fillStyle).toBe(COLORS.ember);
    expect(dark.fillStyle).toBe(COLORS.slate);
    expect(ctx.texts()).toContain("50%");
  });

  it("adds the ember cursor after the tenure only when asked", () => {
    const off = fakeContext();
    paintText(off, CARD_W, CARD_H, byId("linux-engineer"), 6, false);
    expect(off.texts()).not.toContain("▮");
    const on = fakeContext();
    paintText(on, CARD_W, CARD_H, byId("linux-engineer"), 6, true);
    const cursor = on.ops.filter((o) => o.op === "fillText" && o.args[0] === "▮");
    expect(cursor).toHaveLength(1);
    expect(cursor[0]!.fillStyle).toBe(COLORS.ember);
    expect(on.texts().indexOf("▮")).toBe(on.texts().indexOf("19 months") + 1);
  });

  it("stays inside the card and above the footer for every stage at the smallest size", () => {
    const w = Math.round(320 * (5 / 7));
    const h = 320;
    for (const stage of career) {
      for (const lines of [0, 1, 2, 3, 4, 5, 6, 7]) {
        const ctx = fakeContext();
        const { bottom } = paintText(ctx, w, h, cardModel(stage, NOW), lines, true);
        expectInside(ctx.ops, w, h);
        if (lines >= 2 && lines < PRINT_STEPS) {
          expect(bottom, `${stage.id} at ${lines} lines`).toBeLessThanOrEqual(
            h - 20 * (w / CARD_W),
          );
        }
      }
    }
  });

  it("stays inside the card at the reference and double sizes too", () => {
    for (const [w, h] of [
      [CARD_W, CARD_H],
      [CARD_W * 2, CARD_H * 2],
    ]) {
      for (const stage of career) {
        const ctx = fakeContext();
        paintText(ctx, w!, h!, cardModel(stage, NOW), PRINT_STEPS, true);
        expectInside(ctx.ops, w!, h!);
        const body = fakeContext();
        paintBody(body, w!, h!, cardModel(stage, NOW), fakeImage(800, 533));
        expectInside(body.ops, w!, h!);
      }
    }
  });
});

describe("paintPuff, paintRadial, paintSeam", () => {
  it("paints a puff as nine soft white blobs on a cleared square", () => {
    const ctx = fakeContext();
    paintPuff(ctx, PUFF_SIZE, mulberry32(1));
    expect(ctx.ops[0]?.op).toBe("clearRect");
    expect(ctx.ops.filter((o) => o.op === "arc")).toHaveLength(9);
    expect(ctx.ops.filter((o) => o.op === "fill" && o.fillStyle === "gradient")).toHaveLength(9);
    for (const o of ctx.ops.filter((o) => o.op === "arc")) {
      const [x, y, r] = o.args as number[];
      expect(x! - r!).toBeGreaterThanOrEqual(-PUFF_SIZE * 0.05);
      expect(x! + r!).toBeLessThanOrEqual(PUFF_SIZE * 1.05);
      expect(y! - r!).toBeGreaterThanOrEqual(-PUFF_SIZE * 0.05);
      expect(y! + r!).toBeLessThanOrEqual(PUFF_SIZE * 1.05);
    }
  });
  it("paints different puffs from different seeds and the same from the same", () => {
    const a = fakeContext();
    const b = fakeContext();
    const c = fakeContext();
    paintPuff(a, PUFF_SIZE, mulberry32(1));
    paintPuff(b, PUFF_SIZE, mulberry32(2));
    paintPuff(c, PUFF_SIZE, mulberry32(1));
    expect(JSON.stringify(a.ops)).not.toBe(JSON.stringify(b.ops));
    expect(JSON.stringify(a.ops)).toBe(JSON.stringify(c.ops));
  });
  it("paints a radial disc from the colour to transparent, filling the whole square", () => {
    const ctx = fakeContext();
    paintRadial(ctx, RADIAL_SIZE, COLORS.violet, 1);
    const fills = ctx.rects("fillRect");
    expect(fills).toEqual([{ x: 0, y: 0, w: RADIAL_SIZE, h: RADIAL_SIZE, color: "gradient" }]);
  });
  it("paints the seam as one violet rounded outline 6 px in at the card's scale", () => {
    const ctx = fakeContext();
    paintSeam(ctx, CARD_W * 2, CARD_H * 2);
    expect(ctx.ops[0]?.op).toBe("clearRect");
    const stroke = ctx.ops.find((o) => o.op === "stroke");
    expect(stroke?.strokeStyle).toBe(COLORS.violet);
    expect(ctx.lineWidth).toBeCloseTo(3, 6); // 1.5 px at 2×
    const arcs = ctx.ops.filter((o) => o.op === "arc");
    expect(arcs).toHaveLength(4);
    const xs = arcs.map((o) => (o.args as number[])[0]!);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(12);
    expect(Math.max(...xs)).toBeLessThanOrEqual(CARD_W * 2 - 12);
    expect(ctx.ops.filter((o) => o.op === "fillRect")).toHaveLength(0);
  });
});
