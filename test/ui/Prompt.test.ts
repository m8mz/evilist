import { describe, expect, it } from "vitest";
import Prompt from "../../src/components/ui/Prompt.astro";
import { render } from "../render";

describe("Prompt", () => {
  it("renders ~/ and the path", async () => {
    const html = await render(Prompt, { props: { path: "journey" } });
    // Components with a <style> get a data-astro-cid-* attribute on every element, so match
    // "attribute … > text <" with [^>]* between them.
    expect(html).toMatch(/class="prompt__prefix" aria-hidden="true"[^>]*>~\/</);
    expect(html).toMatch(/class="prompt__path"[^>]*>journey</);
    expect(html).not.toContain("prompt__cursor");
  });

  it("adds a decorative cursor on request", async () => {
    const html = await render(Prompt, { props: { path: "marcus", cursor: true } });
    expect(html).toContain('class="prompt__cursor" aria-hidden="true"');
  });
});
