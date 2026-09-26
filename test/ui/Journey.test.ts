import { describe, expect, it } from "vitest";
import Journey from "../../src/components/journey/Journey.astro";
import { career } from "../../src/data/career";
import { deckPortrait } from "../../src/data/deckImages";
import { render } from "../render";

describe("Journey (the card deck's stage)", () => {
  it("renders the track with the build date, the count, the mark and a loading state", async () => {
    const html = await render(Journey);
    const track = html.match(/<div class="journey"[^>]*data-deck[^>]*>/)?.[0];
    expect(track).toBeDefined();
    expect(track).toMatch(/data-now="\d{4}-\d{2}-\d{2}"/);
    expect(track).toContain(`data-count="${career.length}"`);
    // The Container API resolves `?url` imports through the dev image endpoint, not the
    // production `/_astro/…` hash (verified separately with `pnpm build`): assert a real file
    // reference to the mark, not an inlined data: URI.
    expect(track).toMatch(/data-mark="[^"]*devil-mark[^"]*"/);
    expect(track).not.toMatch(/data-mark="data:/);
    expect(track).toContain('data-deck-state="loading"');
    expect(html).toContain('<div class="deck" data-deck-root');
  });

  it("holds one hidden canvas and the layout column inside the sticky stage", async () => {
    const html = await render(Journey);
    expect(html.match(/<canvas /g)).toHaveLength(1);
    expect(html).toMatch(/<canvas class="journey__gl"[^>]*data-deck-gl[^>]*aria-hidden="true"/);
    expect(html).toContain('class="journey__column" data-deck-column');
    expect(html).toMatch(/<div class="journey__stage"/);
  });

  it("renders the rail as a toolbar of seven rank buttons, the first presented and focusable", async () => {
    const html = await render(Journey);
    expect(html).toMatch(
      /<div class="journey__rail"[^>]*data-deck-rail[^>]*role="toolbar"[^>]*aria-label="Ranks"/,
    );
    const buttons = html.match(/<button[^>]*data-deck-rank[^>]*>/g) ?? [];
    expect(buttons).toHaveLength(career.length);
    for (const [i, button] of buttons.entries()) {
      const stage = career[i]!;
      expect(button).toContain(`data-index="${i}"`);
      expect(button).toContain(`data-stage-id="${stage.id}"`);
      expect(button).toContain(
        `aria-label="Rank ${stage.rankLabel}, ${stage.shortTitle ?? stage.title}"`,
      );
      expect(button).toContain(`aria-pressed="${i === 0 ? "true" : "false"}"`);
      expect(button).toContain(`tabindex="${i === 0 ? "0" : "-1"}"`);
      expect(button).toContain('type="button"');
    }
    expect(html.match(/class="rank-chip/g)).toHaveLength(career.length + career.length); // rail + timeline
  });

  it("carries the portrait renditions on the buttons only when the source exists", async () => {
    const html = await render(Journey);
    const first = html.match(/<button[^>]*data-stage-id="t1-support"[^>]*>/)![0];
    if (deckPortrait("t1-support")) {
      // Same Container-API caveat as the mark above: assert a real getImage() rendition, not
      // the production `/_astro/…webp` hash (confirmed separately with `pnpm build`).
      expect(first).toMatch(/data-portrait-1x="[^"]+"/);
      expect(first).toMatch(/data-portrait-2x="[^"]+"/);
      expect(first).not.toMatch(/data-portrait-1x="data:/);
      expect(first).not.toMatch(/data-portrait-2x="data:/);
    } else {
      expect(first).not.toContain("data-portrait-1x");
      expect(first).not.toContain("data-portrait-2x");
      expect(first).not.toContain("data-glow");
    }
  });

  it("renders the counter, the hint and a polite live region", async () => {
    const html = await render(Journey);
    expect(html).toMatch(
      /<p class="journey__counter"[^>]*data-deck-counter[^>]*aria-hidden="true"[^>]*>01 \/ 07</,
    );
    expect(html).toMatch(/<p class="journey__hint"[^>]*data-deck-hint[^>]*aria-hidden="true"/);
    expect(html).toMatch(/<p class="visually-hidden"[^>]*data-deck-live[^>]*aria-live="polite"/);
  });

  it("keeps the timeline as the accessible twin, and the skip link", async () => {
    const html = await render(Journey);
    expect(html).toContain('class="wrap journey-fallback"');
    expect(html.match(/class="timeline__title"/g)).toHaveLength(career.length);
    expect(html).toContain('href="#skills"');
  });

  it("ships no inline styles, no scene and no video", async () => {
    const html = await render(Journey);
    expect(html).not.toContain(" style=");
    expect(html).not.toContain("data-scene");
    expect(html).not.toContain("<video");
    expect(html).not.toContain("<svg");
  });
});
