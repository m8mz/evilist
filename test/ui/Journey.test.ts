import { describe, expect, it } from "vitest";
import Journey from "../../src/components/journey/Journey.astro";
import { career } from "../../src/data/career";
import { clipSources } from "../../src/data/journeyArt";
import { render } from "../render";

describe("Journey", () => {
  it("puts a rank chip on every rail node", async () => {
    const html = await render(Journey);
    const nodes = html.match(/<li class="journey__node[^>]*>[\s\S]*?<\/li>/g) ?? [];
    expect(nodes).toHaveLength(career.length);
    for (const node of nodes) expect(node).toContain('class="rank-chip');
  });

  it("renders every stage card as a case panel with up to three highlights", async () => {
    const html = await render(Journey);
    expect(html.match(/class="panel panel--case journey__card/g)).toHaveLength(career.length);
    const lists = html.match(/<ul class="journey__highlights"[\s\S]*?<\/ul>/g) ?? [];
    expect(lists).toHaveLength(career.length);
    for (const [i, list] of lists.entries()) {
      expect(list.match(/<li/g)).toHaveLength(Math.min(3, career[i].highlights.length));
    }
  });

  it("gives every stage a layer with a lazy poster and a silent, unloaded looping clip", async () => {
    const html = await render(Journey);
    const layers = html.match(/<div class="journey__clip[\s\S]*?<\/video>/g) ?? [];
    expect(layers).toHaveLength(career.length);
    for (const [i, layer] of layers.entries()) {
      expect(layer).toMatch(/<picture class="journey__poster"/);
      expect(layer).toMatch(/<img[^>]*loading="lazy"/);
      expect(layer).toMatch(
        /<video class="journey__video"[^>]*muted[^>]*loop[^>]*playsinline[^>]*preload="none"[^>]*disablepictureinpicture[^>]*disableremoteplayback/,
      );
      const sources = [...layer.matchAll(/<source data-src="([^"]+)"/g)].map((m) => m[1]);
      expect(sources).toEqual(clipSources(career[i].id).map((s) => s.src));
      expect(layer).not.toMatch(/<source src=/);
    }
    expect(layers[0]).toMatch(/class="journey__clip is-active"/);
  });

  it("no longer draws the SVG scene", async () => {
    expect(await render(Journey)).not.toContain('class="scene');
  });
});
