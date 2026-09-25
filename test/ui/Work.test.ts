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

  it("keeps list semantics on the shared repos", async () => {
    expect(await render(Work)).toContain('<ul role="list"');
  });

  it("has no topology diagram and no rack still: the rack has its own band now", async () => {
    const html = await render(Work);
    expect(html).not.toMatch(/class="topo/);
    expect(html).not.toContain("<figure");
    expect(html).not.toContain("work__infra");
    expect(html).not.toContain("Illustration:");
  });
});
