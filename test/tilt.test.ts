import { describe, expect, it } from "vitest";
import { MAX_TILT, tiltFor } from "../src/scripts/tilt";

// Portrait centre (500, 400) in a 1000 × 800 hero.
const at = (px: number, py: number) => tiltFor(px, py, 500, 400, 1000, 800);

describe("tiltFor", () => {
  it("is flat with the cursor on the portrait's centre", () => {
    expect(at(500, 400)).toEqual({ rotateX: 0, rotateY: 0 });
  });

  it("tilts ±3.5° at half a hero away, in evilist.co's direction", () => {
    expect(at(0, 400)).toEqual({ rotateX: 0, rotateY: MAX_TILT });
    expect(at(1000, 400)).toEqual({ rotateX: 0, rotateY: -MAX_TILT });
    expect(at(500, 0)).toEqual({ rotateX: MAX_TILT, rotateY: 0 });
    expect(at(500, 800)).toEqual({ rotateX: -MAX_TILT, rotateY: 0 });
  });

  it("clamps beyond half a hero", () => {
    expect(at(-5000, 99999)).toEqual({ rotateX: -MAX_TILT, rotateY: MAX_TILT });
  });

  it("scales linearly in between", () => {
    expect(at(750, 400).rotateY).toBeCloseTo(-1.75);
  });
});
