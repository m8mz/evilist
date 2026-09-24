import { describe, expect, it } from "vitest";
import Skills from "../../src/components/home/Skills.astro";
import { skillDomains } from "../../src/data/skills";
import { render } from "../render";

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

describe("Skills", () => {
  it("renders one panel per domain, headed by the domain as a tag", async () => {
    const html = await render(Skills);
    expect(html.match(/class="panel skills__panel/g)).toHaveLength(skillDomains.length);
    for (const domain of skillDomains) {
      expect(html).toMatch(new RegExp(`class="tag[^"]*"[^>]*>${escapeRegExp(domain.name)}<`));
    }
    expect(html).not.toContain("<dl");
  });

  it("lists every tool as its own item", async () => {
    const html = await render(Skills);
    for (const item of skillDomains.flatMap((d) => d.items)) {
      expect(html).toMatch(new RegExp(`<li[^>]*>${escapeRegExp(item)}</li>`));
    }
  });
});
