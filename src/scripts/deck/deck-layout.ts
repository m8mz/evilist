// Where the deck's cards sit for a given stage size (deck spec §6). Pure: CSS px in, CSS px out,
// origin at the stage's top-left, y down, every position a card's centre. The stage converts to
// world units; the pose model (deck-pose.ts) moves cards between these anchors.
import { DECK_PARAMS, type LayoutParams } from "./deck-params";

export type DeckMode = "desktop" | "phone";

export interface Point {
  x: number;
  y: number;
}

export interface LayoutInput {
  stageW: number;
  stageH: number;
  columnLeft: number;
  columnW: number;
  mode: DeckMode;
  /** How many cards; seven ranks. */
  count?: number;
}

export interface DeckLayout {
  mode: DeckMode;
  cardW: number;
  cardH: number;
  /** Desktop: the rack slots' centres, one per rank. Phone: empty. */
  slots: Point[];
  presented: Point;
  /** Phone: where the next card waits, and where played cards go. */
  next: Point | null;
  exit: Point | null;
  /** The presented card's bottom edge and the floor line under the rack. */
  baseY: number;
  floorY: number;
}

export const CARD_ASPECT = 5 / 7;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The deck column: 78% of the stage, at most 1200 px, centred. */
export function columnFor(
  stageW: number,
  params: LayoutParams = DECK_PARAMS.layout,
): { left: number; width: number } {
  const width = Math.min(stageW * params.columnFraction, params.columnMax);
  return { left: (stageW - width) / 2, width };
}

export function deckLayout(
  input: LayoutInput,
  params: LayoutParams = DECK_PARAMS.layout,
): DeckLayout {
  const { stageW, stageH, columnLeft, columnW, mode } = input;
  const count = input.count ?? 7;
  const p = params;

  let cardH = clamp(p.cardHRatio * stageH, p.cardHMin, p.cardHMax);
  let cardW = cardH * CARD_ASPECT;
  // The desktop composition, in card widths: six gaps, one projected back, the gap, the card.
  const compositionUnits = (count - 1) * p.slotGap + p.backProjection + p.gap + 1;
  const maxW = mode === "desktop" ? columnW / compositionUnits : stageW - 2 * p.pad;
  if (cardW > maxW) {
    cardW = Math.max(1, maxW);
    cardH = cardW / CARD_ASPECT;
  }

  const baseY = (stageH - p.railH) / 2 + cardH / 2;
  const rackBottom = baseY + p.presentedLift;
  const floorY = rackBottom + p.floorOffset;
  const rackY = rackBottom - cardH / 2;
  const presentedY = baseY - cardH / 2;

  if (mode === "desktop") {
    const slotGap = p.slotGap * cardW;
    const backW = p.backProjection * cardW;
    const rackW = (count - 1) * slotGap + backW;
    const gap = p.gap * cardW;
    const rackX0 = columnLeft + (columnW - (rackW + gap + cardW)) / 2;
    const slots = Array.from({ length: count }, (_, i) => ({
      x: rackX0 + backW / 2 + i * slotGap,
      y: rackY,
    }));
    return {
      mode,
      cardW,
      cardH,
      slots,
      presented: { x: rackX0 + rackW + gap + cardW / 2, y: presentedY },
      next: null,
      exit: null,
      baseY,
      floorY,
    };
  }

  // The next card waits back-to-viewer at phoneNextRotY (-80°): its projected width is
  // |cos(rotY)| × cardW, a thin sliver rather than the full card, so its far edge — not an
  // unrotated card's — is what sits `phoneNextInset` inside the stage's right edge.
  const projected = Math.abs(Math.cos((p.phoneNextRotY * Math.PI) / 180)) * cardW;
  return {
    mode,
    cardW,
    cardH,
    slots: [],
    presented: { x: stageW / 2, y: presentedY },
    next: { x: stageW - p.phoneNextInset - projected / 2, y: rackY },
    exit: { x: p.phoneExitX * cardW, y: rackY },
    baseY,
    floorY,
  };
}
