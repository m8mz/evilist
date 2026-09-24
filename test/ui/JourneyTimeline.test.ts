import { describe, expect, it } from "vitest";
import JourneyTimeline from "../../src/components/journey/JourneyTimeline.astro";
import { career } from "../../src/data/career";
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
});
