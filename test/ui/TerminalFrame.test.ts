import { describe, expect, it } from "vitest";
import TerminalFrame from "../../src/components/ui/TerminalFrame.astro";
import { render } from "../render";

describe("TerminalFrame", () => {
  it("renders chrome with three decorative dots, a title and the body", async () => {
    const html = await render(TerminalFrame, {
      props: { title: "marcus@evilist:~" },
      slots: { default: "<img alt='' />" },
    });
    expect(html).toContain('class="term__dots" aria-hidden="true"');
    expect((html.match(/term__dot"/g) ?? []).length).toBe(3);
    expect(html).toMatch(/class="term__title"[^>]*>marcus@evilist:~</);
    expect(html).toContain("<img alt='' />");
  });

  it("renders the aside slot inside the chrome", async () => {
    const html = await render(TerminalFrame, {
      props: { title: "bash" },
      slots: { default: "x", aside: "<b>S</b>" },
    });
    expect(html).toMatch(/class="term__aside"[^>]*>\s*<b>S<\/b>/);
  });
});
