import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import HtopScreen from "../../src/components/home/HtopScreen.astro";
import { htop } from "../../src/data/htop";
import { METER_WIDTH } from "../../src/scripts/htop";
import { render } from "../render";

describe("HtopScreen", () => {
  it("draws a meter per core, each exactly as wide as the others", async () => {
    const html = await render(HtopScreen);
    const bars = [...html.matchAll(/data-core="[^"]*"[\s\S]*?class="htop__bar"[^>]*>([^<]*)</g)];
    expect(bars).toHaveLength(htop.cores.length);
    expect(new Set(bars.map((m) => m[1]!.length))).toEqual(new Set([METER_WIDTH]));
  });

  it("lists every process and selects the first", async () => {
    const html = await render(HtopScreen);
    for (const p of htop.processes) expect(html).toContain(`>${p.command}<`);
    expect(html.match(/<tr class="is-selected/g)).toHaveLength(1);
  });

  it("marks cores at 75% or more hot, at the client's meter width", async () => {
    const html = await render(HtopScreen, {
      props: { snapshot: { ...htop, cores: [80, 20, 74.9, 75] } },
    });
    expect(html.match(/class="htop__line is-hot"/g)).toHaveLength(2);
  });

  it("is hidden from assistive tech, carries the drift hook and takes a class", async () => {
    const html = await render(HtopScreen, { props: { class: "hero__htop" } });
    expect(html).toMatch(/class="htop__screen hero__htop"[^>]*aria-hidden="true"[^>]*data-htop/);
    expect(readFileSync("src/components/home/HtopScreen.astro", "utf8")).not.toContain("<script");
  });
});
