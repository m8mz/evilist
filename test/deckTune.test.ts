import { describe, expect, it } from "vitest";
import { DECK_PARAMS } from "../src/scripts/deck/deck-params";
import { ROWS } from "../src/scripts/deck/deck-tune";

function resolve(path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], DECK_PARAMS);
}

describe("the tuning panel's rows", () => {
  it("resolves every path to a finite default inside its own [min, max], with a positive step", () => {
    for (const [, path, min, max, step] of ROWS) {
      const value = resolve(path);
      expect(typeof value === "number" && Number.isFinite(value), path).toBe(true);
      expect(min, path).toBeLessThan(max);
      expect(step, path).toBeGreaterThan(0);
      expect(value as number, path).toBeGreaterThanOrEqual(min);
      expect(value as number, path).toBeLessThanOrEqual(max);
    }
  });
});
