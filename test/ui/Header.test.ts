import { describe, expect, it } from "vitest";
import Header from "../../src/components/layout/Header.astro";
import { render } from "../render";

const at = (path: string) => ({ request: new Request(`https://evilist.io${path}`) });

describe("Header", () => {
  it("shows the ~evilist text wordmark instead of an image", async () => {
    const html = await render(Header, at("/"));
    // WCAG 2.5.3: the accessible name must contain the visible label ("evilist").
    expect(html).toMatch(/class="brand"[^>]*aria-label="evilist, Marcus Hancock-Gaillard, home"/);
    expect(html).toMatch(/class="brand__tilde" aria-hidden="true"[^>]*>~</);
    expect(html).toMatch(/class="brand__name"[^>]*>evilist</);
    expect(html).not.toContain("<img");
  });

  it("marks only the current page in the nav", async () => {
    const html = await render(Header, at("/notes/ten-years-t1-to-architect/"));
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
