import { describe, expect, it } from "vitest";
import Work from "../../src/components/home/Work.astro";
import { sharedRepos, work } from "../../src/data/work";
import { render } from "../render";

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

describe("Work", () => {
  it("renders every case as a case panel with its stack as a key: value row", async () => {
    const html = await render(Work);
    expect(html.match(/class="panel panel--case work__card/g)).toHaveLength(work.length);
    for (const item of work) expect(html).toContain(item.title);
    expect(html.match(/>stack:</g)).toHaveLength(work.length);
  });

  it("links each shared repo with a hidden arrow, as rel=me", async () => {
    const html = await render(Work);
    for (const repo of sharedRepos) {
      expect(html).toMatch(
        new RegExp(
          `href="${escapeRegExp(repo.href)}" rel="me noopener" target="_blank"[^>]*><span aria-hidden="true"[^>]*>→ </span>${repo.name}</a>`,
        ),
      );
    }
  });

  it("shows the topology diagram", async () => {
    expect(await render(Work)).toContain(
      'aria-label="Two datacenters with BGP failover behind HAProxy"',
    );
  });

  it("shows the rack illustration next to the topology", async () => {
    const html = await render(Work);
    expect(html).toMatch(/<figure class="still[^"]*"[\s\S]*alt="Illustration: a colocation rack/);
  });
});
