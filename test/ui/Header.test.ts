import { describe, expect, it } from "vitest";
import Header from "../../src/components/layout/Header.astro";
import { render } from "../render";

const at = (path: string) => ({ request: new Request(`https://evilist.io${path}`) });

describe("Header", () => {
  it("links home through the evil_logo image, named by the link", async () => {
    const html = await render(Header, at("/"));
    // WCAG 2.5.3: the accessible name contains the logo's visible word ("evilist").
    expect(html).toMatch(/class="brand"[^>]*aria-label="evilist, Marcus Hancock-Gaillard, home"/);
    const img = html.match(/<img[^>]*brand__logo[^>]*>/)?.[0];
    expect(img).toBeDefined();
    // Astro serializes an empty-string attribute as bare `alt` (runtime/server/render/util.js),
    // the HTML equivalent of alt="": no alt text, decorative image.
    expect(img).toMatch(/\salt(?:=""|[\s>])/);
    expect(img).toContain('height="36"');
    expect(html).not.toContain("brand__tilde");
  });

  it("marks only the current page in the nav", async () => {
    const html = await render(Header, at("/notes/ten-years-t1-to-architect"));
    expect(html).toMatch(/href="\/notes" aria-current="page"/);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });

  it("lists Resume, Now, Notes and Contact, in that order", async () => {
    const html = await render(Header, at("/"));
    const labels = [...html.matchAll(/<a href="\/(resume|now|notes|contact)"[^>]*>([^<]+)</g)].map(
      (m) => m[2]!.trim(),
    );
    expect(labels).toEqual(["Resume", "Now", "Notes", "Contact"]);
  });
});
