import { describe, expect, it } from "vitest";
import Tag from "../../src/components/ui/Tag.astro";
import { render } from "../render";

describe("Tag", () => {
  it("renders its slot in a span with the tag class", async () => {
    const html = await render(Tag, { slots: { default: "automation" } });
    expect(html).toMatch(/<span class="tag[^"]*"[^>]*>automation<\/span>/);
  });
});
