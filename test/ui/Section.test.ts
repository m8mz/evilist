import { describe, expect, it } from "vitest";
import Section from "../../src/components/ui/Section.astro";
import { render } from "../render";

describe("Section", () => {
  it("renders a void band with the content column by default", async () => {
    const html = await render(Section, {
      props: { id: "about" },
      slots: { default: "<h2>How I work</h2>" },
    });
    expect(html).toMatch(/<section class="band band--void[^"]*" id="about"/);
    expect(html).toContain('class="wrap"');
    expect(html).toContain("<h2>How I work</h2>");
  });

  it("renders no prompt when none is given", async () => {
    const html = await render(Section, { slots: { default: "x" } });
    expect(html).not.toContain("prompt");
  });

  it("lifts to carbon and shows the prompt eyebrow", async () => {
    const html = await render(Section, {
      props: { tone: "carbon", prompt: "journey" },
      slots: { default: "x" },
    });
    expect(html).toContain("band--carbon");
    expect(html).toMatch(/class="prompt__path"[^>]*>journey</);
  });

  it("renders a bleed slot after the content column, full width", async () => {
    const html = await render(Section, {
      slots: { default: "<p>column</p>", bleed: "<div>wide</div>" },
    });
    expect(html).toMatch(
      /<div class="wrap"[^>]*>[\s\S]*<p>column<\/p>\s*<\/div>\s*<div>wide<\/div>/,
    );
  });
});
