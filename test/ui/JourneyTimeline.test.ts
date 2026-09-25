import { describe, expect, it } from "vitest";
import JourneyTimeline from "../../src/components/journey/JourneyTimeline.astro";
import { career } from "../../src/data/career";
import { stageArt } from "../../src/data/journeyArt";
import { render } from "../render";

describe("JourneyTimeline", () => {
  it("shows one terminal rank chip per stage, in order", async () => {
    const html = await render(JourneyTimeline);
    const labels = [...html.matchAll(/class="rank-chip[^"]*"[^>]*aria-label="([^"]+)"/g)].map(
      (m) => m[1],
    );
    expect(labels).toEqual(career.map((s) => `Rank ${s.rankLabel}`));
    expect(html).not.toContain("seal");
  });

  it("tags each stage with its date range", async () => {
    const html = await render(JourneyTimeline);
    expect(html.match(/class="tag timeline__dates/g)).toHaveLength(career.length);
  });

  it("keeps list semantics on the timeline", async () => {
    expect(await render(JourneyTimeline)).toMatch(/<ol class="timeline" role="list"/);
  });

  it("shows each rank's still, lazily, as a labelled illustration", async () => {
    const html = await render(JourneyTimeline);
    const figures = html.match(/<figure class="still timeline__still[\s\S]*?<\/figure>/g) ?? [];
    expect(figures).toHaveLength(career.length);
    for (const [i, figure] of figures.entries()) {
      const { subject } = stageArt[career[i].id];
      expect(figure).toContain(`alt="Illustration: ${subject}"`);
      expect(figure).toMatch(/<img[^>]*loading="lazy"/);
    }
  });
});
