import { describe, expect, it } from "vitest";
import Footer from "../../src/components/layout/Footer.astro";
import { render } from "../render";

describe("Footer", () => {
  it("renders arrow links whose arrow is hidden from assistive tech", async () => {
    const html = await render(Footer);
    for (const label of ["github", "linkedin", "rss"]) {
      expect(html).toMatch(new RegExp(`<span aria-hidden="true"[^>]*>→ </span>${label}</a>`));
    }
  });

  it("keeps the social hrefs and marks external links rel=me", async () => {
    const html = await render(Footer);
    expect(html).toMatch(/href="https:\/\/github.com\/m8mz" rel="me noopener" target="_blank"/);
    expect(html).toContain('href="https://www.linkedin.com/in/m8mz/"');
    expect(html).toContain('href="/rss.xml"');
  });

  it("states how the site is hosted", async () => {
    const html = await render(Footer);
    expect(html).toContain("self-hosted on Linux behind HAProxy · built with Astro");
  });

  it("keeps list semantics on its links", async () => {
    expect(await render(Footer)).toMatch(/<ul class="site-footer__links" role="list"/);
  });
});
