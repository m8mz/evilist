import { describe, expect, it } from "vitest";
import Htop from "../../src/components/home/Htop.astro";
import { htop } from "../../src/data/htop";
import { METER_WIDTH } from "../../src/scripts/htop";
import { render } from "../render";

describe("Htop", () => {
  it("draws a meter per core, each exactly as wide as the others", async () => {
    const html = await render(Htop);
    const bars = [...html.matchAll(/data-core="[^"]*"[\s\S]*?class="htop__bar"[^>]*>([^<]*)</g)];
    expect(bars).toHaveLength(htop.cores.length);
    expect(new Set(bars.map((m) => m[1]!.length))).toEqual(new Set([30]));
  });

  it("lists every process and selects the first", async () => {
    const html = await render(Htop);
    for (const p of htop.processes) expect(html).toContain(`>${p.command}<`);
    expect(html.match(/<tr class="is-selected/g)).toHaveLength(1);
  });

  it("hides the terminal from assistive tech and says it is simulated", async () => {
    const html = await render(Htop);
    expect(html).toMatch(/class="htop__screen" aria-hidden="true"/);
    expect(html).toMatch(/<figcaption[^>]*>A simulated htop/);
  });

  it("marks cores at 75% or more hot, at the client's meter width", async () => {
    const html = await render(Htop, {
      props: { snapshot: { ...htop, cores: [80, 20, 74.9, 75] } },
    });
    expect(html.match(/class="htop__line is-hot"/g)).toHaveLength(2);
    const bars = [...html.matchAll(/data-core="[^"]*"[\s\S]*?class="htop__bar"[^>]*>([^<]*)</g)];
    expect(new Set(bars.map((m) => m[1]!.length))).toEqual(new Set([METER_WIDTH]));
  });
});
