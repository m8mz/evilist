import { describe, expect, it } from "vitest";
import JourneyTimeline from "../../src/components/journey/JourneyTimeline.astro";
import { career } from "../../src/data/career";
import { deckArtById } from "../../src/data/deck";
import { deckPortrait } from "../../src/data/deckImages";
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
      const id = career[i]!.id;
      const { subject } = deckPortrait(id) ? deckArtById[id]! : stageArt[id]!;
      expect(figure).toContain(`alt="Illustration: ${subject}"`);
      expect(figure).toMatch(/<img[^>]*loading="lazy"/);
    }
  });
});

describe("JourneyTimeline as the deck's twin", () => {
  const props = { now: "2026-09-25" };

  it("prints tenure and XP for every stage against the build date", async () => {
    const html = await render(JourneyTimeline, { props });
    // Container-rendered scoped styles append a data-astro-cid-* attribute to every element
    // (see CLAUDE.md), so a bare tag can't match exactly: match the content with the tag open.
    expect(html.match(/class="timeline__stats"/g)).toHaveLength(career.length);
    expect(html).toMatch(/<dd[^>]*>19 months<\/dd>/);
    expect(html).toMatch(/<dd[^>]*>4 years, 10 months<\/dd>/);
    expect(html).toMatch(/<dd[^>]*>50%<\/dd>/);
    expect(html).toMatch(/<dd[^>]*>100%<\/dd>/);
  });

  it("lists the acquired skills, capped at eight plus the rest", async () => {
    const html = await render(JourneyTimeline, { props });
    const lists = html.match(/<ul class="timeline__skills"[\s\S]*?<\/ul>/g) ?? [];
    expect(lists).toHaveLength(career.length);
    expect(lists[5]!.match(/<li/g)).toHaveLength(9);
    expect(lists[5]).toContain(">+6<");
  });

  it("quotes each stage's log line", async () => {
    const html = await render(JourneyTimeline, { props });
    // The container escapes text content, turning an apostrophe (t3-support's "couldn't") into
    // &#39;: match the same way the renderer would.
    for (const stage of career) {
      expect(html).toContain(`“${stage.log.replace(/'/g, "&#39;")}”`);
    }
  });

  it("uses the deck portrait and its subject once it exists, and the old still until then", async () => {
    const html = await render(JourneyTimeline, { props });
    for (const stage of career) {
      const subject = deckPortrait(stage.id)
        ? deckArtById[stage.id]!.subject
        : stageArt[stage.id]!.subject;
      expect(html).toContain(`alt="Illustration: ${subject}"`);
    }
  });
});
