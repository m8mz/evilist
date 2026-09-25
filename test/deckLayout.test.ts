import { describe, expect, it } from "vitest";
import { CARD_ASPECT, columnFor, deckLayout } from "../src/scripts/deck/deck-layout";

const HEADER = 64;
const desktop = (width: number, height: number) => {
  const column = columnFor(width);
  return deckLayout({
    stageW: width,
    stageH: height - HEADER,
    columnLeft: column.left,
    columnW: column.width,
    mode: "desktop",
  });
};
const phone = (width: number, height: number) =>
  deckLayout({
    stageW: width,
    stageH: height - HEADER,
    columnLeft: 0,
    columnW: width,
    mode: "phone",
  });

describe("columnFor", () => {
  it("is 78% of the stage, capped at 1200 px, centred", () => {
    expect(columnFor(1440).width).toBeCloseTo(1123.2, 6);
    expect(columnFor(1440).left).toBeCloseTo((1440 - 1123.2) / 2, 6);
    expect(columnFor(2560)).toEqual({ left: 680, width: 1200 });
  });
});

describe("deckLayout on desktop", () => {
  it("sizes the card at 62% of the stage height on a 1440 × 900 window", () => {
    const l = desktop(1440, 900);
    expect(l.cardH).toBeCloseTo(0.62 * 836, 5);
    expect(l.cardW).toBeCloseTo(l.cardH * CARD_ASPECT, 5);
    expect(l.slots).toHaveLength(7);
  });

  it("centres the rack-gap-card composition in the column and keeps it inside", () => {
    const l = desktop(1440, 900);
    const column = columnFor(1440);
    const compositionLeft = l.slots[0]!.x - 0.11 * l.cardW;
    const compositionRight = l.presented.x + l.cardW / 2;
    expect(compositionLeft - column.left).toBeCloseTo(
      column.left + column.width - compositionRight,
      5,
    );
    expect(compositionLeft).toBeGreaterThan(column.left);
    expect(compositionRight).toBeLessThan(column.left + column.width);
  });

  it("spaces the slots at 14% of the card width and never lets the rack touch the card", () => {
    const l = desktop(1440, 900);
    for (let i = 1; i < 7; i++) {
      expect(l.slots[i]!.x - l.slots[i - 1]!.x).toBeCloseTo(0.14 * l.cardW, 5);
    }
    const rackRight = l.slots[6]!.x + 0.11 * l.cardW;
    expect(l.presented.x - l.cardW / 2 - rackRight).toBeCloseTo(0.3 * l.cardW, 5);
  });

  it("puts the presented card above the rail and the rack 30 px lower on the floor", () => {
    const l = desktop(1440, 900);
    const stageH = 836;
    expect(l.baseY).toBeCloseTo((stageH - 88) / 2 + l.cardH / 2, 5);
    expect(l.presented.y).toBeCloseTo(l.baseY - l.cardH / 2, 5);
    expect(l.slots[0]!.y).toBeCloseTo(l.baseY + 30 - l.cardH / 2, 5);
    expect(l.floorY).toBeCloseTo(l.baseY + 30 + 8, 5);
    expect(l.floorY).toBeLessThan(stageH - 88);
  });

  it("shrinks the card so the composition fits a narrow column", () => {
    const l = desktop(1024, 700);
    const column = columnFor(1024);
    expect(l.cardW).toBeLessThanOrEqual(column.width / 2.36 + 1e-6);
    expect(l.presented.x + l.cardW / 2).toBeLessThanOrEqual(column.left + column.width + 1e-6);
  });

  it("caps the card at 560 px tall on very large windows", () => {
    const l = desktop(2560, 1300);
    expect(l.cardH).toBe(560);
    expect(l.cardW).toBeCloseTo(400, 5);
  });

  it("never drops under 320 px tall, even on a 400 px stage", () => {
    const l = desktop(960, 400 + HEADER);
    expect(l.cardH).toBe(320);
  });
});

describe("deckLayout on phones", () => {
  it("fits the card inside a 390 px stage with 24 px margins and centres it", () => {
    const l = phone(390, 844);
    expect(l.cardW).toBe(390 - 48);
    expect(l.cardH).toBeCloseTo(342 / CARD_ASPECT, 5);
    expect(l.presented.x).toBe(195);
    expect(l.slots).toEqual([]);
  });

  it("parks the next card 24 px inside the right edge and played cards off the left", () => {
    const l = phone(390, 844);
    expect(l.next!.x).toBeCloseTo(390 - 24 + l.cardW / 2, 5);
    expect(l.exit!.x).toBeCloseTo(-0.6 * l.cardW, 5);
    expect(l.next!.y).toBe(l.exit!.y);
    expect(l.next!.y).toBeCloseTo(l.presented.y + 30, 5);
  });

  it("lets the width rule win on a tall 430 px phone", () => {
    const l = phone(430, 932);
    expect(l.cardW).toBe(430 - 48);
    expect(l.cardH).toBeCloseTo(382 / CARD_ASPECT, 5);
  });

  it("uses the height rule when the width is not the limit", () => {
    const l = phone(430, 700);
    expect(l.cardH).toBeCloseTo(0.62 * (700 - HEADER), 5);
    expect(l.cardW).toBeLessThanOrEqual(430 - 48);
  });

  it("keeps the minimum height on a small 320 px phone, inside the width", () => {
    const l = phone(320, 568);
    expect(l.cardH).toBe(320);
    expect(l.cardW).toBeLessThanOrEqual(320 - 48);
    expect(Number.isFinite(l.floorY)).toBe(true);
  });
});
