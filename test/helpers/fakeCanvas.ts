/**
 * A recording stand-in for CanvasRenderingContext2D. The painters only draw; the tests read the
 * recorded operations back. measureText assumes a 0.6 em advance, the monospace face's width.
 */
export interface Op {
  op: string;
  args: unknown[];
  font: string;
  fillStyle: string;
  strokeStyle: string;
  textAlign: string;
  globalAlpha: number;
}

class FakeGradient {
  stops: [number, string][] = [];
  addColorStop(offset: number, color: string): void {
    this.stops.push([offset, color]);
  }
}

export class FakeContext {
  ops: Op[] = [];
  font = "10px sans-serif";
  fillStyle: string | FakeGradient = "#000000";
  strokeStyle: string | FakeGradient = "#000000";
  lineWidth = 1;
  textAlign = "left";
  textBaseline = "alphabetic";
  globalAlpha = 1;
  shadowColor = "transparent";
  shadowBlur = 0;
  imageSmoothingEnabled = true;

  private record(op: string, ...args: unknown[]): void {
    this.ops.push({
      op,
      args,
      font: this.font,
      fillStyle: typeof this.fillStyle === "string" ? this.fillStyle : "gradient",
      strokeStyle: typeof this.strokeStyle === "string" ? this.strokeStyle : "gradient",
      textAlign: this.textAlign,
      globalAlpha: this.globalAlpha,
    });
  }

  private fontPx(): number {
    return Number(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? 10);
  }

  save(): void {
    this.record("save");
  }
  restore(): void {
    this.record("restore");
  }
  clearRect(...a: number[]): void {
    this.record("clearRect", ...a);
  }
  fillRect(...a: number[]): void {
    this.record("fillRect", ...a);
  }
  strokeRect(...a: number[]): void {
    this.record("strokeRect", ...a);
  }
  fillText(text: string, x: number, y: number): void {
    this.record("fillText", text, x, y);
  }
  measureText(text: string): { width: number } {
    return { width: text.length * this.fontPx() * 0.6 };
  }
  beginPath(): void {
    this.record("beginPath");
  }
  closePath(): void {
    this.record("closePath");
  }
  moveTo(...a: number[]): void {
    this.record("moveTo", ...a);
  }
  lineTo(...a: number[]): void {
    this.record("lineTo", ...a);
  }
  rect(...a: number[]): void {
    this.record("rect", ...a);
  }
  arc(...a: number[]): void {
    this.record("arc", ...a);
  }
  ellipse(...a: number[]): void {
    this.record("ellipse", ...a);
  }
  stroke(): void {
    this.record("stroke");
  }
  fill(): void {
    this.record("fill");
  }
  clip(): void {
    this.record("clip");
  }
  translate(...a: number[]): void {
    this.record("translate", ...a);
  }
  scale(...a: number[]): void {
    this.record("scale", ...a);
  }
  drawImage(image: unknown, ...a: number[]): void {
    this.record("drawImage", image, ...a);
  }
  createLinearGradient(): FakeGradient {
    return new FakeGradient();
  }
  createRadialGradient(): FakeGradient {
    return new FakeGradient();
  }

  /** Every drawn string, in order. */
  texts(): string[] {
    return this.ops.filter((o) => o.op === "fillText").map((o) => String(o.args[0]));
  }
  /** The fillRect and strokeRect calls as boxes. */
  rects(
    op: "fillRect" | "strokeRect" = "fillRect",
  ): { x: number; y: number; w: number; h: number; color: string }[] {
    return this.ops
      .filter((o) => o.op === op)
      .map((o) => ({
        x: o.args[0] as number,
        y: o.args[1] as number,
        w: o.args[2] as number,
        h: o.args[3] as number,
        color: op === "fillRect" ? o.fillStyle : o.strokeStyle,
      }));
  }
  /** fillRect and fillText operations painted in a colour. */
  fillsWith(color: string): Op[] {
    return this.ops.filter(
      (o) =>
        (o.op === "fillRect" || o.op === "fillText" || o.op === "fill") && o.fillStyle === color,
    );
  }
}

export const fakeContext = (): CanvasRenderingContext2D & FakeContext =>
  new FakeContext() as unknown as CanvasRenderingContext2D & FakeContext;

/** A stand-in for an image: the painters only read width and height. */
export const fakeImage = (width: number, height: number): CanvasImageSource =>
  ({ width, height }) as unknown as CanvasImageSource;
