import { describe, expect, it } from "vitest";
import ArrowField from "../../src/components/ui/ArrowField.astro";
import { render } from "../render";

describe("ArrowField", () => {
  it("is decorative and repeats two identical strips for a seamless loop", async () => {
    const html = await render(ArrowField, { props: { rows: 3 } });
    expect(html).toContain('aria-hidden="true"');
    const strips = html.match(/<pre class="arrows__strip[^"]*"[^>]*>[\s\S]*?<\/pre>/g) ?? [];
    expect(strips).toHaveLength(2);
    expect(strips[0]).toBe(strips[1]);
    expect(strips[0]?.split("\n")).toHaveLength(3);
    expect(strips[0]).toContain("&gt; &gt; &gt;");
  });

  it("draws as many arrows per row as `cols` asks for", async () => {
    const html = await render(ArrowField, { props: { rows: 2, cols: 5 } });
    const strip = html.match(/<pre class="arrows__strip[^"]*"[^>]*>([\s\S]*?)<\/pre>/)?.[1] ?? "";
    expect(strip.split("\n")[0]?.match(/&gt;/g)).toHaveLength(5);
  });
});
