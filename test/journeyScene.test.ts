import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import JourneyScene from "../src/components/journey/JourneyScene.astro";
import { render } from "./render";

const source = readFileSync("src/components/journey/JourneyScene.astro", "utf8");
const markup = source.slice(0, source.indexOf("<style>"));
const style = source.slice(source.indexOf("<style>"), source.indexOf("</style>"));

describe("JourneyScene palette", () => {
  it("uses only design tokens, no hard-coded colours", () => {
    expect(style.match(/#[0-9a-f]{3,8}\b/gi)).toBeNull();
  });

  it("animates only transform and opacity in its keyframes", () => {
    const frames = [...style.matchAll(/@keyframes [\w-]+ \{([\s\S]*?)\n {2}\}/g)].map((m) => m[1]);
    expect(frames.length).toBeGreaterThan(0);
    const props = new Set(frames.flatMap((f) => [...f.matchAll(/([a-z-]+):/g)].map((m) => m[1])));
    expect([...props].sort()).toEqual(["opacity", "transform"]);
  });

  it("styles every colour class the markup uses", () => {
    const used = new Set([...markup.matchAll(/\bc-[a-z-]+/g)].map((m) => m[0]));
    const styled = new Set([...style.matchAll(/\.(c-[a-z-]+)/g)].map((m) => m[1]));
    expect([...used].filter((c) => !styled.has(c))).toEqual([]);
  });
});

describe("JourneyScene avatar", () => {
  it("draws the original dark-rival avatar instead of the old likeness", async () => {
    const html = await render(JourneyScene);
    for (const part of ["hair", "eyes", "marks"]) expect(html).toContain(`data-part="${part}"`);
    expect(html.match(/class="c-iris"/g)).toHaveLength(2);
    for (const old of ["c-scarf", "c-stubble", "c-zip", "c-hoodie"]) {
      expect(html).not.toContain(old);
    }
  });
});
