// The deck's canvases and textures (deck spec §9, "Textures and memory"). One body per card,
// painted lazily; one frame and one back, shared; one chip per rank; two text slots that cards
// borrow while presented, so a fast handoff can never show one card's lines on another. The
// factory is injected: the stage passes CanvasTexture, the tests pass a recorder.
import { LinearFilter, SRGBColorSpace, type Texture } from "three";
import {
  CARD_W,
  CHIP_H,
  CHIP_W,
  COLORS,
  paintBack,
  paintBody,
  paintChip,
  paintFrame,
  paintText,
  type CardModel,
} from "./deck-paint";
import { DECK_PARAMS, type DeckParams } from "./deck-params";

/** "text" is the two print-in slots: drawn at their on-screen size and repainted often, so
 * deck-canvas.ts's glFactory skips their mipmaps (deck spec §9, ADR 0004) — the recording that
 * prompted this predates this drive build and didn't reproduce on it (CLAUDE.md). "art" is
 * everything else: bodies, frame, back, chips, the blank, all mipmapped and anisotropic. */
export type TextureKind = "text" | "art";

export interface TextureFactory {
  canvas(width: number, height: number, kind: TextureKind): HTMLCanvasElement;
  texture(canvas: HTMLCanvasElement, kind: TextureKind): Texture;
}

export const MAX_TEXTURE_W = 1040;
const MIPMAP = 1.33;

export function textureSize(cardW: number, dpr: number): { w: number; h: number } {
  const w = Math.min(MAX_TEXTURE_W, Math.round(cardW * dpr));
  return { w, h: Math.round((w * 7) / 5) };
}

interface Layer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: Texture;
  mipmapped: boolean;
}

interface TextSlot {
  layer: Layer;
  owner: number | null;
  lines: number;
  cursor: boolean;
  used: number;
}

export class DeckTextures {
  private size = { w: 0, h: 0 };
  private cardW = 0;
  private dpr = 1;
  private bodies = new Map<number, Layer>();
  private portraits = new Map<number, CanvasImageSource>();
  private chips = new Map<number, Layer>();
  private frameLayer: Layer | null = null;
  private backLayer: Layer | null = null;
  private mark: CanvasImageSource | null = null;
  private slots: TextSlot[] = [];
  private blankLayer: Layer | null = null;
  private placeholderLayer: Layer | null = null;
  private tick = 0;

  constructor(
    private readonly cards: CardModel[],
    private readonly factory: TextureFactory,
    private readonly params: DeckParams = DECK_PARAMS,
  ) {}

  private make(
    w: number,
    h: number,
    kind: TextureKind = "art",
    mipmapped = kind !== "text",
  ): Layer {
    const canvas = this.factory.canvas(w, h, kind);
    // A text slot repaints every ~90ms during a print-in: willReadFrequently keeps its backing
    // store on the CPU, so that repaint is fully resolved (no async GPU readback) before the
    // texture below re-uploads it, however soon after this returns that happens.
    const ctx = canvas.getContext("2d", kind === "text" ? { willReadFrequently: true } : undefined);
    if (!ctx) throw new Error("2D canvas unavailable");
    return { canvas, ctx, texture: this.factory.texture(canvas, kind), mipmapped };
  }

  private dirty(layer: Layer): void {
    layer.texture.needsUpdate = true;
  }

  setSize(cardW: number, dpr: number): boolean {
    const next = textureSize(cardW, dpr);
    const first = this.size.w === 0;
    const changed = Math.abs(next.w - this.size.w) > this.size.w * 0.1;
    this.cardW = cardW;
    this.dpr = dpr;
    if (!first && !changed) return false;
    this.size = next;
    for (const [i, layer] of this.bodies)
      this.resizeLayer(layer, next.w, next.h, () => this.paintBodyInto(layer, i));
    if (this.frameLayer)
      this.resizeLayer(this.frameLayer, next.w, next.h, () =>
        paintFrame(this.frameLayer!.ctx, next.w, next.h),
      );
    if (this.backLayer)
      this.resizeLayer(this.backLayer, next.w, next.h, () =>
        paintBack(this.backLayer!.ctx, next.w, next.h, this.mark),
      );
    for (const slot of this.slots) {
      this.resizeLayer(slot.layer, next.w, next.h, () => {
        if (slot.owner !== null)
          paintText(
            slot.layer.ctx,
            next.w,
            next.h,
            this.cards[slot.owner]!,
            slot.lines,
            slot.cursor,
          );
        else slot.layer.ctx.clearRect(0, 0, next.w, next.h);
      });
    }
    const chip = this.chipSize();
    for (const [i, layer] of this.chips)
      this.resizeLayer(layer, chip.w, chip.h, () =>
        paintChip(layer.ctx, chip.w, chip.h, this.cards[i]!.stage.rankLabel),
      );
    return true;
  }

  private resizeLayer(layer: Layer, w: number, h: number, paint: () => void): void {
    layer.canvas.width = w;
    layer.canvas.height = h;
    paint();
    // Three (r186+) allocates immutable GPU storage on first upload (texStorage2D); disposing
    // before the next upload forces a fresh allocation at the new size instead of a stale one.
    layer.texture.dispose();
    this.dirty(layer);
  }

  private chipSize(): { w: number; h: number } {
    const s = (this.cardW / CARD_W) * this.dpr;
    return { w: Math.max(1, Math.round(CHIP_W * s)), h: Math.max(1, Math.round(CHIP_H * s)) };
  }

  private paintBodyInto(layer: Layer, index: number): void {
    paintBody(
      layer.ctx,
      this.size.w,
      this.size.h,
      this.cards[index]!,
      this.portraits.get(index) ?? null,
    );
  }

  body(index: number): Texture {
    let layer = this.bodies.get(index);
    if (!layer) {
      layer = this.make(this.size.w, this.size.h);
      this.bodies.set(index, layer);
      this.paintBodyInto(layer, index);
      this.dirty(layer);
    }
    return layer.texture;
  }

  hasBody(index: number): boolean {
    return this.bodies.has(index);
  }

  /** The 4 × 4 carbon stand-in every body shows until its own paints: sRGB like the bodies, no
   * mipmaps, one for the deck and counted once. */
  placeholder(): Texture {
    if (!this.placeholderLayer) {
      const layer = (this.placeholderLayer = this.make(4, 4, "art", false));
      layer.ctx.fillStyle = COLORS.carbon;
      layer.ctx.fillRect(0, 0, 4, 4);
      layer.texture.colorSpace = SRGBColorSpace;
      layer.texture.generateMipmaps = false;
      layer.texture.minFilter = LinearFilter;
      this.dirty(layer);
    }
    return this.placeholderLayer.texture;
  }

  setPortrait(index: number, image: CanvasImageSource | null): void {
    if (image) this.portraits.set(index, image);
    else this.portraits.delete(index);
    const layer = this.bodies.get(index);
    if (!layer) return;
    this.paintBodyInto(layer, index);
    this.dirty(layer);
  }

  frame(): Texture {
    if (!this.frameLayer) {
      this.frameLayer = this.make(this.size.w, this.size.h);
      paintFrame(this.frameLayer.ctx, this.size.w, this.size.h);
      this.dirty(this.frameLayer);
    }
    return this.frameLayer.texture;
  }

  back(): Texture {
    if (!this.backLayer) {
      this.backLayer = this.make(this.size.w, this.size.h);
      paintBack(this.backLayer.ctx, this.size.w, this.size.h, this.mark);
      this.dirty(this.backLayer);
    }
    return this.backLayer.texture;
  }

  setMark(image: CanvasImageSource | null): void {
    this.mark = image;
    if (!this.backLayer) return;
    paintBack(this.backLayer.ctx, this.size.w, this.size.h, this.mark);
    this.dirty(this.backLayer);
  }

  chip(index: number): Texture {
    let layer = this.chips.get(index);
    if (!layer) {
      const { w, h } = this.chipSize();
      layer = this.make(w, h, "art", false);
      this.chips.set(index, layer);
      paintChip(layer.ctx, w, h, this.cards[index]!.stage.rankLabel);
      this.dirty(layer);
    }
    return layer.texture;
  }

  private slotFor(index: number): TextSlot {
    const owned = this.slots.find((s) => s.owner === index);
    if (owned) {
      owned.used = ++this.tick;
      return owned;
    }
    let slot = this.slots.find((s) => s.owner === null);
    if (!slot && this.slots.length < 2) {
      slot = {
        layer: this.make(this.size.w, this.size.h, "text"),
        owner: null,
        lines: 0,
        cursor: false,
        used: 0,
      };
      this.slots.push(slot);
    }
    if (!slot) slot = this.slots.reduce((a, b) => (a.used <= b.used ? a : b));
    slot.owner = index;
    slot.lines = 0;
    slot.cursor = false;
    slot.used = ++this.tick;
    slot.layer.ctx.clearRect(0, 0, this.size.w, this.size.h);
    this.dirty(slot.layer);
    return slot;
  }

  /** A 1 × 1 transparent texture: a text plane shows it whenever its card owns no slot. */
  blank(): Texture {
    if (!this.blankLayer) {
      this.blankLayer = this.make(1, 1, "art", false);
      this.blankLayer.ctx.clearRect(0, 0, 1, 1);
      this.dirty(this.blankLayer);
    }
    return this.blankLayer.texture;
  }

  text(index: number): Texture {
    return this.slotFor(index).layer.texture;
  }

  paintText(index: number, lines: number, cursor: boolean): boolean {
    const slot = this.slotFor(index);
    if (slot.lines === lines && slot.cursor === cursor) return false;
    slot.lines = lines;
    slot.cursor = cursor;
    paintText(slot.layer.ctx, this.size.w, this.size.h, this.cards[index]!, lines, cursor);
    this.dirty(slot.layer);
    return true;
  }

  releaseText(index: number): void {
    const slot = this.slots.find((s) => s.owner === index);
    if (!slot) return;
    slot.owner = null;
    slot.lines = 0;
    slot.cursor = false;
    slot.layer.ctx.clearRect(0, 0, this.size.w, this.size.h);
    this.dirty(slot.layer);
  }

  ownerOfSlot(slot: 0 | 1): number | null {
    return this.slots[slot]?.owner ?? null;
  }

  estimateBytes(): number {
    const bytes = (layer: Layer) =>
      layer.canvas.width * layer.canvas.height * 4 * (layer.mipmapped ? MIPMAP : 1);
    let total = 0;
    for (const layer of this.bodies.values()) total += bytes(layer);
    for (const layer of this.chips.values()) total += bytes(layer);
    for (const slot of this.slots) total += bytes(slot.layer);
    if (this.frameLayer) total += bytes(this.frameLayer);
    if (this.backLayer) total += bytes(this.backLayer);
    if (this.placeholderLayer) total += bytes(this.placeholderLayer);
    return total;
  }

  dispose(): void {
    const all = [
      ...this.bodies.values(),
      ...this.chips.values(),
      ...this.slots.map((s) => s.layer),
      this.frameLayer,
      this.backLayer,
      this.blankLayer,
      this.placeholderLayer,
    ];
    for (const layer of all) layer?.texture.dispose();
    this.bodies.clear();
    this.chips.clear();
    this.slots = [];
    this.frameLayer = null;
    this.backLayer = null;
    this.blankLayer = null;
    this.placeholderLayer = null;
  }
}
