// Paints a card's layers into canvases from the career data (deck spec §5). Pure drawing: the
// stage (Plan 2) owns the canvases and textures and calls these when a card needs painting. Every
// painter takes the canvas size it is drawing into and scales from the 520 × 728 reference.
// Colours are the site's tokens (test/deckPalette.test.ts keeps them in sync) plus violet, which
// ADR 0003/0004 allow inside the journey art.
import type { RankLabel } from "../../data/career";

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

export const FONT = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

export const font = (px: number, weight: 400 | 700 = 400, italic = false): string =>
  `${italic ? "italic " : ""}${weight} ${px}px ${FONT}`;

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
