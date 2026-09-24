import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const CARD = "public/og-default.png";

describe("social card", () => {
  it("exists (run `pnpm build:og` to regenerate it)", () => {
    expect(existsSync(CARD)).toBe(true);
  });

  it("is a 1200×630 PNG", () => {
    const png = readFileSync(CARD);
    expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  });
});
