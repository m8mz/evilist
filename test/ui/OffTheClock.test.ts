import { describe, expect, it } from "vitest";
import OffTheClock from "../../src/components/home/OffTheClock.astro";
import { now } from "../../src/data/now";
import { render } from "../render";

describe("OffTheClock", () => {
  it("heads the three columns rig, playing and watching, each with an icon", async () => {
    const html = await render(OffTheClock);
    const heads = [...html.matchAll(/<h3 class="now-col__head"[^>]*>([\s\S]*?)<\/h3>/g)];
    expect(heads.map((m) => m[1]!.match(/class="tag[^"]*"[^>]*>(\w+)</)?.[1])).toEqual([
      "rig",
      "playing",
      "watching",
    ]);
    for (const head of heads) expect(head[1]).toContain('class="icon');
  });

  it("shows every entry from now.ts", async () => {
    const html = await render(OffTheClock);
    for (const row of now.rig) expect(html).toContain(`>${row.value}<`);
    for (const item of [...now.playing, ...now.watching]) expect(html).toContain(`>${item}<`);
    expect(html).toContain(`>${now.training.line}<`);
  });

  it("draws the training texture and links to /now", async () => {
    const html = await render(OffTheClock);
    expect(html).toContain('aria-label="Illustrative training rhythm"');
    expect(html.match(/class="log-bars__bar"/g)).toHaveLength(12);
    expect(html).toMatch(
      /href="\/now"[^>]*><span aria-hidden="true"[^>]*>→ <\/span>more on \/now</,
    );
  });

  it("keeps list semantics on the playing and watching lists", async () => {
    const html = await render(OffTheClock);
    expect(html.match(/class="now-col__body now-col__list" role="list"/g)).toHaveLength(2);
  });
});
