import { describe, expect, it } from "vitest";
import ParallaxBand from "../../src/components/home/ParallaxBand.astro";
import { render } from "../render";

const ALT =
  "Illustration: a colocation rack row at night, fully populated and lit by orange status lights";

describe("ParallaxBand", () => {
  it("shows the rack as a lazy, labelled illustration and puts no text on the band", async () => {
    const html = await render(ParallaxBand);
    expect(html).toMatch(/<div class="parallax"[^>]*data-parallax/);
    expect(html).toMatch(/<div class="parallax__media"/);
    expect(html).toMatch(new RegExp(`<img[^>]*alt="${ALT}"`));
    expect(html).toMatch(/<img[^>]*loading="lazy"/);
    expect(html.replace(/<[^>]*>/g, "").trim()).toBe("");
  });

  it("serves AVIF and WebP from 800 to 2000 px, sized for cover-cropping on tall screens", async () => {
    const html = await render(ParallaxBand);
    expect(html).toContain('type="image/avif"');
    expect(html).toContain('type="image/webp"');
    for (const w of ["800w", "1200w", "1600w", "2000w"]) expect(html).toContain(w);
    expect(html).not.toContain("2400w");
    expect(html).toContain('sizes="(orientation: portrait) 200vw, 100vw"');
  });
});
