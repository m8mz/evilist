import { describe, expect, it } from "vitest";
import Header from "../../src/components/layout/Header.astro";
import { render } from "../render";

const at = (path: string) => ({ request: new Request(`https://evilist.io${path}`) });

describe("Header", () => {
  it("links home through the lettering and devil images, named by the link", async () => {
    const html = await render(Header, at("/"));
    // WCAG 2.5.3: the accessible name contains the logo's visible word ("evilist").
    expect(html).toMatch(/class="brand"[^>]*aria-label="evilist, Marcus Hancock-Gaillard, home"/);
    const lettering = html.match(/<img[^>]*brand__lettering[^>]*>/)?.[0];
    const devil = html.match(/<img[^>]*brand__devil[^>]*>/)?.[0];
    expect(lettering).toBeDefined();
    expect(devil).toBeDefined();
    // Astro serializes an empty-string attribute as bare `alt` (runtime/server/render/util.js),
    // the HTML equivalent of alt="": no alt text, decorative image.
    expect(lettering).toMatch(/\salt(?:=""|[\s>])/);
    expect(devil).toMatch(/\salt(?:=""|[\s>])/);
    expect(lettering).toContain('height="27"');
    expect(devil).toContain('height="50"');
    expect(html).not.toContain("brand__logo");
    expect(html).not.toContain("brand__tilde");
  });

  it("marks only the current page in the nav", async () => {
    const html = await render(Header, at("/notes/ten-years-t1-to-architect"));
    expect(html).toMatch(/href="\/notes" aria-current="page"/);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });

  it("marks home current only at the root, not on every path", async () => {
    const html = await render(Header, at("/resume"));
    expect(html).toMatch(/href="\/resume" aria-current="page"/);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });

  it("lists home, resume, now, notes and contact, in that order, as root paths", async () => {
    const html = await render(Header, at("/"));
    const nav = html.match(/<nav id="site-nav"[\s\S]*?<\/nav>/)?.[0] ?? "";
    const labels = [
      ...nav.matchAll(/<a href="[^"]*"[^>]*><span aria-hidden="true"[^>]*>\/<\/span>([^<]+)</g),
    ].map((m) => m[1]!.trim());
    expect(labels).toEqual(["home", "resume", "now", "notes", "contact"]);
  });
});
