import { describe, expect, it } from "vitest";
import Panel from "../../src/components/ui/Panel.astro";
import { render } from "../render";

describe("Panel", () => {
  it("renders a plain panel by default", async () => {
    const html = await render(Panel, { slots: { default: "body" } });
    expect(html).toMatch(/<div class="panel[^"]*"[^>]*>/);
    expect(html).not.toContain("panel--case");
    expect(html).toContain("body");
  });

  it("marks case cards and forwards attributes", async () => {
    const html = await render(Panel, {
      props: { variant: "case", id: "work-1", class: "extra" },
      slots: { default: "body" },
    });
    expect(html).toContain("panel--case");
    expect(html).toContain('id="work-1"');
    expect(html).toContain("extra");
  });
});
