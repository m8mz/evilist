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

  it("renders every stage card as a case panel with a rank chip and a date tag", async () => {
    const html = await render(Journey);
    expect(html.match(/class="panel panel--case journey__card/g)).toHaveLength(career.length);
    expect(html.match(/class="journey__card-head/g)).toHaveLength(career.length);
    expect(html).not.toContain("seal");
  });
});
