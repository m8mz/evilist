import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const config = readFileSync("astro.config.ts", "utf8");

describe("the deck's dependencies", () => {
  it("pins three and its types exactly, on the same minor", () => {
    const three: string = pkg.dependencies.three;
    const types: string = pkg.devDependencies["@types/three"];
    expect(three).toMatch(/^\d+\.\d+\.\d+$/);
    expect(types).toMatch(/^\d+\.\d+\.\d+$/);
    expect(three.split(".").slice(0, 2)).toEqual(types.split(".").slice(0, 2));
  });

  it("ships JetBrains Mono in normal and italic, 400 and 700, so the card's quote is a real italic", () => {
    expect(config).toMatch(/styles:\s*\["normal",\s*"italic"\]/);
    expect(config).toMatch(/weights:\s*\[400,\s*700\]/);
  });
});
