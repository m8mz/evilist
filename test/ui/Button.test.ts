import { describe, expect, it } from "vitest";
import Button from "../../src/components/ui/Button.astro";
import { render } from "../render";

describe("Button", () => {
  it("renders a primary link with the label and a hidden arrow", async () => {
    const html = await render(Button, {
      props: { href: "/resume" },
      slots: { default: "Read the resume" },
    });
    expect(html).toMatch(/<a href="\/resume" class="btn btn--primary[^"]*"/);
    expect(html).toContain("Read the resume");
    expect(html).toMatch(/class="btn__arrow" aria-hidden="true"[^>]*>→</);
  });

  it("hides the arrow from assistive tech so the accessible name is the label alone", async () => {
    const html = await render(Button, { props: { href: "/x" }, slots: { default: "Go" } });
    const arrows = html.match(/→/g) ?? [];
    expect(arrows).toHaveLength(1);
    expect(html).toMatch(/aria-hidden="true"[^>]*>→</);
  });

  it("supports the ghost variant", async () => {
    const html = await render(Button, {
      props: { href: "/x", variant: "ghost" },
      slots: { default: "Go" },
    });
    expect(html).toContain("btn--ghost");
    expect(html).not.toContain("btn--primary");
  });
});
