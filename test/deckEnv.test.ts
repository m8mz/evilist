import { describe, expect, it } from "vitest";
import { ENV_H, ENV_W, paintEnvironment } from "../src/scripts/deck/deck-env";
import { fakeContext } from "./helpers/fakeCanvas";

describe("paintEnvironment", () => {
  it("fills near-black, then a key bar upper-left and a violet bar right, as gradients", () => {
    const ctx = fakeContext();
    paintEnvironment(ctx, ENV_W, ENV_H);
    const fills = ctx.rects();
    expect(fills[0]).toEqual({ x: 0, y: 0, w: ENV_W, h: ENV_H, color: "#050505" });
    const gradients = ctx.ops.filter((o) => o.op === "fillRect" && o.fillStyle === "gradient");
    expect(gradients).toHaveLength(2);
    const [key, violet] = gradients.map((o) => o.args as number[]);
    expect(key![0]! + key![2]! / 2).toBeLessThan(ENV_W / 2); // the key sits left of centre
    expect(key![1]! + key![3]! / 2).toBeLessThan(ENV_H / 2); // and above it
    expect(violet![0]! + violet![2]! / 2).toBeGreaterThan(ENV_W * 0.7); // the violet sits right
  });
});
