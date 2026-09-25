import { describe, expect, it } from "vitest";
import Journey from "../../src/components/journey/Journey.astro";
import { career } from "../../src/data/career";
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

  it("holds the stage with the inline silhouette and no clip markup", async () => {
    const html = await render(Journey);
    const stage = html.match(
      /<div class="journey__scene"[^>]*data-scene[^>]*>[\s\S]*?<\/div>/,
    )?.[0];
    expect(stage).toBeDefined();
    expect(stage).toContain('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1500"');
    expect(stage).toMatch(/<path transform="translate\(300 0\) scale\(4\)" fill="#202020" d="M/);
    expect(html).not.toContain("<video");
    expect(html).not.toContain("journey__poster");
    expect(html).not.toContain("data-src");
    expect(html).not.toContain("style=");
  });

  it('no longer draws the retired Axiom chibi (class="scene")', async () => {
    expect(await render(Journey)).not.toContain('class="scene');
  });
});
