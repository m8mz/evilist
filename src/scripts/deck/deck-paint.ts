// Paints a card's layers into canvases from the career data (deck spec §5). Pure drawing: the
// stage (Plan 2) owns the canvases and textures and calls these when a card needs painting. Every
// painter takes the canvas size it is drawing into and scales from the 520 × 728 reference.
// Colours are the site's tokens (test/deckPalette.test.ts keeps them in sync) plus violet, which
// ADR 0003/0004 allow inside the journey art.
import type { RankLabel } from "../../data/career";
import {
  acquired,
  formatRange,
  setNumber,
  tenure,
  xp,
  xpBlocks,
  type CareerStage,
} from "../../data/career";
import { deckArtById, type DeckArt } from "../../data/deck";

export const CARD_W = 520;
export const CARD_H = 728;
/** The portrait window's share of the card's height. */
export const WINDOW = 0.52;
export const CHIP_W = 80;
export const CHIP_H = 28;

export const COLORS = {
  void: "#000000",
  carbon: "#111111",
  graphite: "#191919",
  iron: "#202020",
  slate: "#3a3a3a",
  steel: "#606060",
  ash: "#848484",
  fog: "#b4b4b4",
  paper: "#eeeeee",
  ember: "#da5c2c",
  violet: "#7040d2",
  /** The card back's carbon, a step darker than the face so the flip reads. */
  back: "#0e0e0e",
} as const;

// Astro's Fonts API registers JetBrains Mono under a hashed family name (e.g.
// "JetBrains Mono-68114cf3b8f830ba"), not this plain one. Canvas can't read CSS custom properties
// itself, so the page reads the real family from the `--font-jetbrains` custom property at runtime
// (Plan 2) and calls `setDeckFontFamily` with it before painting, so canvas text doesn't fall back
// to Menlo for visitors.
let deckFamily = "JetBrains Mono";

export function setDeckFontFamily(family: string): void {
  deckFamily = family;
}

export function deckFontFamily(): string {
  return deckFamily;
}

const fontStack = (family: string): string =>
  `"${family}", ui-monospace, SFMono-Regular, Menlo, monospace`;

export const font = (px: number, weight: 400 | 700 = 400, italic = false): string =>
  `${italic ? "italic " : ""}${weight} ${px}px ${fontStack(deckFamily)}`;

type Ctx = CanvasRenderingContext2D;

/** A corner bracket: two 18 px legs meeting at (x, y), pointing `dx`/`dy` inward. */
function bracket(ctx: Ctx, x: number, y: number, dx: number, dy: number, s: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y + dy * 18 * s);
  ctx.lineTo(x, y);
  ctx.lineTo(x + dx * 18 * s, y);
  ctx.stroke();
}

/** The frame layer: a 1 px iron border, the slate trace frame 6 px in, steel brackets. */
export function paintFrame(ctx: Ctx, w: number, h: number): void {
  const s = w / CARD_W;
  ctx.clearRect(0, 0, w, h);
  ctx.lineWidth = 1;
  ctx.strokeStyle = COLORS.iron;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  ctx.strokeStyle = COLORS.slate;
  ctx.strokeRect(6.5 * s, 6.5 * s, w - 13 * s, h - 13 * s);
  ctx.strokeStyle = COLORS.steel;
  bracket(ctx, 6.5 * s, 6.5 * s, 1, 1, s);
  bracket(ctx, w - 6.5 * s, h - 6.5 * s, -1, -1, s);
}

/** The rank chip, mirroring RankChip.astro: S+ ember on void; S paper with a violet border. */
export function paintChip(ctx: Ctx, w: number, h: number, rank: RankLabel): void {
  const s = w / CHIP_W;
  ctx.clearRect(0, 0, w, h);
  const top = rank === "S+";
  ctx.fillStyle = top ? COLORS.ember : COLORS.graphite;
  ctx.fillRect(0, 0, w, h);
  ctx.lineWidth = 1;
  ctx.strokeStyle = top ? COLORS.ember : rank === "S" ? COLORS.violet : COLORS.slate;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  ctx.font = font(12 * s, 700);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = top ? COLORS.void : COLORS.paper;
  ctx.fillText(`[ ${rank} ]`, w / 2, h / 2);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

/** Letter-spaced text: canvas has no letter-spacing everywhere, so draw a glyph at a time. */
function spaced(ctx: Ctx, text: string, cx: number, y: number, px: number, spacing: number): void {
  const advance = px * 0.6 + spacing;
  let x = cx - (advance * text.length - spacing) / 2;
  for (const ch of text) {
    ctx.fillText(ch, x, y);
    x += advance;
  }
}

/** The card back: darker carbon, the trace frame, the devil mark and the wordmark. */
export function paintBack(ctx: Ctx, w: number, h: number, mark: CanvasImageSource | null): void {
  const s = w / CARD_W;
  ctx.fillStyle = COLORS.back;
  ctx.fillRect(0, 0, w, h);
  ctx.lineWidth = 1;
  ctx.strokeStyle = COLORS.iron;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  ctx.strokeStyle = "#2a2a2a";
  ctx.strokeRect(6.5 * s, 6.5 * s, w - 13 * s, h - 13 * s);
  if (mark) {
    const size = 84 * s;
    const iw = (mark as { width: number }).width;
    const ih = (mark as { height: number }).height;
    const mh = size;
    const mw = (size * iw) / ih;
    ctx.drawImage(mark, w / 2 - mw / 2, h / 2 - mh / 2, mw, mh);
  }
  ctx.fillStyle = COLORS.slate;
  ctx.font = font(9 * s);
  spaced(ctx, "EVILIST · JOURNEY", w / 2, h - 16 * s, 9 * s, 9 * s * 0.28);
}

/**
 * The placeholder portrait while a rank's render is missing: a head and shoulders on a faint
 * violet field, two eyes in the rank's colour. Draws inside the box (x, y, w, h).
 */
export function paintPlaceholder(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  eyeColor: string,
): void {
  const cx = x + w / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const field = ctx.createRadialGradient(cx, y + h * 0.3, w * 0.05, cx, y + h * 0.3, w * 0.6);
  field.addColorStop(0, "#1b1526");
  field.addColorStop(0.7, "#0b0b0b");
  field.addColorStop(1, COLORS.void);
  ctx.fillStyle = field;
  ctx.fillRect(x, y, w, h);
  const headR = w * 0.085;
  const headY = y + h * 0.42;
  ctx.fillStyle = "#0d0d0d";
  // Shoulders: an ellipse centred just above the window's bottom edge; the clip trims the rest.
  ctx.beginPath();
  ctx.ellipse(cx, y + h * 0.98, w * 0.32, w * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, headY, headR, headR * 1.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = eyeColor;
  for (const dx of [-headR * 0.42, headR * 0.42]) {
    ctx.beginPath();
    ctx.ellipse(cx + dx, headY + headR * 0.05, headR * 0.22, headR * 0.075, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export interface CardModel {
  stage: CareerStage;
  art: DeckArt;
  dates: string;
  tenure: string;
  xp: number;
  blocks: number;
  acquired: string[];
  setNumber: string;
}

/** Everything a card prints, computed once per stage for a fixed `now` (the build date). */
export function cardModel(stage: CareerStage, now: Date): CardModel {
  const art = deckArtById[stage.id];
  if (!art) throw new Error(`No deck art for ${stage.id}`);
  const value = xp(stage, now);
  return {
    stage,
    art,
    dates: formatRange(stage.start, stage.end),
    tenure: tenure(stage, now),
    xp: value,
    blocks: xpBlocks(value),
    acquired: acquired(stage),
    setNumber: setNumber(stage),
  };
}

/** The print-in's steps: name plate, header, on_arrival, acquired, xp, tenure, footer. */
export const PRINT_STEPS = 7;

/** Greedy word wrap by the context's current font. */
export function wrapText(ctx: Ctx, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function xpGlyphs(blocks: number, total = 10): { lit: string; dark: string } {
  const lit = Math.min(total, Math.max(0, blocks));
  return { lit: "▮".repeat(lit), dark: "▯".repeat(total - lit) };
}

/**
 * The body layer: carbon, the void window with the portrait cover-fitted (or the placeholder),
 * a scrim over the window's bottom 30% so the name plate reads, and the divider.
 */
export function paintBody(
  ctx: Ctx,
  w: number,
  h: number,
  card: CardModel,
  portrait: CanvasImageSource | null,
): void {
  const winH = h * WINDOW;
  ctx.fillStyle = COLORS.carbon;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = COLORS.void;
  ctx.fillRect(0, 0, w, winH);
  if (portrait) {
    const iw = (portrait as { width: number }).width;
    const ih = (portrait as { height: number }).height;
    const scale = Math.max(w / iw, winH / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, winH);
    ctx.clip();
    ctx.drawImage(portrait, (w - dw) / 2, 0, dw, dh);
    ctx.restore();
  } else {
    paintPlaceholder(ctx, 0, 0, w, winH, card.art.eyeColor);
  }
  const scrim = ctx.createLinearGradient(0, winH * 0.7, 0, winH);
  scrim.addColorStop(0, "rgba(0,0,0,0)");
  scrim.addColorStop(1, "rgba(0,0,0,0.7)");
  ctx.fillStyle = scrim;
  ctx.fillRect(0, winH * 0.7, w, winH * 0.3);
  ctx.fillStyle = COLORS.iron;
  ctx.fillRect(0, winH, w, 1);
}

/** `$ key` in ember and ash at (x, y); returns the x after the key. */
function key(ctx: Ctx, label: string, x: number, y: number, px: number): number {
  ctx.font = font(px);
  ctx.fillStyle = COLORS.ember;
  ctx.fillText("$", x, y);
  const dollar = ctx.measureText("$ ").width;
  ctx.fillStyle = COLORS.ash;
  ctx.fillText(label, x + dollar, y);
  return x + dollar + ctx.measureText(label).width;
}

/**
 * The text layer for the first `lines` print steps (0–7). Clears first. Returns the lowest y it
 * drew, so a caller (and the tests) can see whether the sheet fits.
 */
export function paintText(
  ctx: Ctx,
  w: number,
  h: number,
  card: CardModel,
  lines: number,
  cursor = false,
): { bottom: number } {
  const s = w / CARD_W;
  const winH = h * WINDOW;
  const left = 12 * s;
  const right = w - 12 * s;
  ctx.clearRect(0, 0, w, h);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  let bottom = 0;
  if (lines < 1) return { bottom };

  // 1. The name plate and the quote, in the window.
  ctx.fillStyle = COLORS.paper;
  ctx.font = font(14 * s);
  ctx.fillText(card.stage.shortTitle ?? card.stage.title, left, winH - 26 * s);
  ctx.fillStyle = COLORS.fog;
  ctx.font = font(10 * s);
  ctx.fillText(`${card.stage.org} · ${card.dates}`, left, winH - 12 * s);
  ctx.font = font(10 * s, 400, true);
  ctx.textAlign = "right";
  ctx.shadowColor = COLORS.void;
  ctx.shadowBlur = 8 * s;
  let qy = 48 * s;
  for (const line of wrapText(ctx, `“${card.stage.log}”`, w * 0.42)) {
    ctx.fillText(line, w - 14 * s, qy);
    qy += 14 * s;
  }
  ctx.shadowBlur = 0;
  ctx.textAlign = "left";
  bottom = winH - 12 * s;
  if (lines < 2) return { bottom };

  // 2. The header.
  let y = winH + 20 * s;
  ctx.font = font(9 * s);
  ctx.fillStyle = COLORS.ash;
  ctx.fillText("~/journey", left, y);
  const after = left + ctx.measureText("~/journey ").width;
  key(ctx, `status --rank ${card.stage.rank}`, after, y, 9 * s);
  bottom = y;
  if (lines < 3) return { bottom };

  // 3. on_arrival
  y += 14 * s;
  key(ctx, "on_arrival", left, y, 9 * s);
  y += 12 * s;
  ctx.font = font(10 * s);
  ctx.fillStyle = COLORS.fog;
  for (const line of wrapText(ctx, card.stage.summary, right - left)) {
    ctx.fillText(line, left, y);
    y += 15 * s;
  }
  bottom = y - 15 * s;
  if (lines < 4) return { bottom };

  // 4. acquired: tags in slate boxes, wrapping.
  y += 2 * s;
  key(ctx, "acquired", left, y, 9 * s);
  y += 13 * s;
  ctx.font = font(9 * s);
  ctx.lineWidth = 1;
  ctx.strokeStyle = COLORS.slate;
  let tx = left;
  for (const tag of card.acquired) {
    const tw = ctx.measureText(tag).width + 8 * s;
    if (tx + tw > right) {
      tx = left;
      y += 14 * s;
    }
    ctx.strokeRect(tx + 0.5, y - 9.5 * s, tw, 12 * s);
    ctx.fillStyle = COLORS.ash;
    ctx.fillText(tag, tx + 4 * s, y);
    tx += tw + 3 * s;
  }
  bottom = y + 2.5 * s;
  if (lines < 5) return { bottom };

  // 5. xp
  y += 16 * s;
  const glyphs = xpGlyphs(card.blocks);
  let gx = key(ctx, "xp", left, y, 9 * s) + 6 * s;
  ctx.font = font(10 * s);
  ctx.fillStyle = COLORS.ember;
  if (glyphs.lit) ctx.fillText(glyphs.lit, gx, y);
  gx += ctx.measureText(glyphs.lit).width;
  ctx.fillStyle = COLORS.slate;
  if (glyphs.dark) ctx.fillText(glyphs.dark, gx, y);
  gx += ctx.measureText(glyphs.dark).width + 6 * s;
  ctx.font = font(9 * s);
  ctx.fillStyle = COLORS.ash;
  ctx.fillText(`${Math.round(card.xp * 100)}%`, gx, y);
  bottom = y;
  if (lines < 6) return { bottom };

  // 6. tenure, with the cursor.
  y += 14 * s;
  const vx = key(ctx, "tenure", left, y, 9 * s) + 6 * s;
  ctx.font = font(10 * s);
  ctx.fillStyle = COLORS.paper;
  ctx.fillText(card.tenure, vx, y);
  if (cursor) {
    ctx.fillStyle = COLORS.ember;
    ctx.fillText("▮", vx + ctx.measureText(`${card.tenure} `).width, y);
  }
  bottom = y;
  if (lines < 7) return { bottom };

  // 7. The footer.
  ctx.font = font(9 * s);
  ctx.fillStyle = COLORS.steel;
  ctx.fillText(card.setNumber, left, h - 12 * s);
  ctx.textAlign = "right";
  ctx.fillText(card.stage.rankLabel, right, h - 12 * s);
  ctx.textAlign = "left";
  return { bottom: h - 12 * s };
}
