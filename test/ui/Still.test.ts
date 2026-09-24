import { describe, expect, it } from "vitest";
import Still from "../../src/components/ui/Still.astro";
import rack from "../../src/images/rack.webp";
import { render } from "../render";

const props = { src: rack, subject: "a server rack", sizes: "100vw" };

describe("Still", () => {
  it("labels every still as an illustration", async () => {
    const html = await render(Still, { props });
    expect(html).toMatch(/<img[^>]*alt="Illustration: a server rack"/);
  });

  it("serves AVIF and WebP at 800, 1200 and 1600 px", async () => {
    const html = await render(Still, { props });
    expect(html).toContain("<picture");
    expect(html).toContain('type="image/avif"');
    for (const w of ["800w", "1200w", "1600w"]) expect(html).toContain(w);
  });

  it("lazy-loads by default and loads eagerly with high priority when it is a page's hero", async () => {
    expect(await render(Still, { props })).toMatch(/<img[^>]*loading="lazy"/);
    const hero = await render(Still, { props: { ...props, eager: true } });
    expect(hero).toMatch(/<img[^>]*loading="eager"/);
    expect(hero).toMatch(/<img[^>]*fetchpriority="high"/);
  });
});
