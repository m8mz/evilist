import { describe, expect, it } from "vitest";
import Hero from "../../src/components/home/Hero.astro";
import { site } from "../../src/data/site";
import { render } from "../render";

describe("Hero", () => {
  it("drops the facts rows and the arrow texture", async () => {
    const html = await render(Hero);
    expect(html).not.toContain("kv__key");
    expect(html).not.toContain("hero__arrows");
  });

  it("gives assistive tech the current role, and shows the first title", async () => {
    const html = await render(Hero);
    expect(html).toMatch(/class="visually-hidden"[^>]*>Sr\. Systems Architect</);
    const rotator = html.match(/<span[^>]*data-title-rotator[^>]*>([^<]*)</)!;
    expect(rotator[0]).toContain('aria-hidden="true"');
    expect(rotator[1]!.trim()).toBe("Sr. Systems Architect");
    const titles = JSON.parse(
      rotator[0].match(/data-titles="([^"]*)"/)![1]!.replaceAll("&quot;", '"'),
    );
    expect(titles).toEqual([...site.titles]);
  });

  it("puts the location on its own line and says a decade", async () => {
    const html = await render(Hero);
    expect(html).toMatch(/class="hero__location"[^>]*>Mesa, Arizona</);
    expect(html).toMatch(
      /class="hero__pitch"[^>]*>(A decade|Over a decade) in Linux infrastructure\./,
    );
  });

  it("runs the htop behind the copy and the network behind the portrait, both decorative", async () => {
    const html = await render(Hero);
    expect(html).toMatch(/class="hero__pane hero__pane--term"[^>]*aria-hidden="true"/);
    expect(html).toMatch(/class="hero__pane hero__pane--net"[^>]*aria-hidden="true"/);
    expect(html).toContain("htop__screen hero__htop");
    expect(html).toContain('<svg class="net"');
    expect(html).not.toContain("<figcaption");
  });

  it("makes both panes inert, so contrast checks skip the dimmed backdrop", async () => {
    const html = await render(Hero);
    expect(html).toMatch(/class="hero__pane hero__pane--term"[^>]*\sinert(?:=""|[\s>])/);
    expect(html).toMatch(/class="hero__pane hero__pane--net"[^>]*\sinert(?:=""|[\s>])/);
  });

  it("keeps the framed portrait with the S+ chip, ready to tilt", async () => {
    const html = await render(Hero);
    expect(html).toContain("marcus@evilist:~");
    expect(html).toContain("S+ rank: Sr. Systems Architect");
    expect(html).toMatch(/<figure class="hero__portrait"[^>]*data-tilt/);
    expect(html).not.toContain("style=");
  });
});
