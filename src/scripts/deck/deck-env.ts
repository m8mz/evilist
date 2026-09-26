// The reflection environment for the laminated cards (deck spec §8, "Environment"): a painted
// equirectangular canvas, near-black, with one soft white bar where the key light is (upper-left)
// and a dim violet bar to the right. The stage runs it through PMREMGenerator once.
export const ENV_W = 512;
export const ENV_H = 256;

export function paintEnvironment(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, w, h);

  // Key light: a soft white bar, upper-left of the front hemisphere.
  const key = ctx.createRadialGradient(w * 0.3, h * 0.3, 0, w * 0.3, h * 0.3, w * 0.16);
  key.addColorStop(0, "rgba(255,255,255,0.95)");
  key.addColorStop(0.5, "rgba(255,255,255,0.35)");
  key.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = key;
  ctx.fillRect(w * 0.14, h * 0.14, w * 0.32, h * 0.32);

  // Rim: a dim violet bar on the right.
  const rim = ctx.createRadialGradient(w * 0.85, h * 0.5, 0, w * 0.85, h * 0.5, w * 0.12);
  rim.addColorStop(0, "rgba(112,64,210,0.6)");
  rim.addColorStop(1, "rgba(112,64,210,0)");
  ctx.fillStyle = rim;
  ctx.fillRect(w * 0.73, h * 0.26, w * 0.24, h * 0.48);
}
