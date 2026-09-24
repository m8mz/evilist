import { describe, expect, it } from "vitest";
import RankChip from "../../src/components/ui/RankChip.astro";
import { render } from "../render";

const RANKS = ["E", "E+", "D", "C", "B", "A", "S"] as const;

describe("RankChip", () => {
  it("renders every rank as an image with an accessible label", async () => {
    for (const rank of RANKS) {
      const html = await render(RankChip, { props: { rank } });
      expect(html).toContain('role="img"');
      expect(html).toContain(`aria-label="Rank ${rank}"`);
      expect(html).toContain(`data-rank="${rank}"`);
      expect(html).toContain(`[ ${rank} ]`);
    }
  });

  it("gives only S the accent modifier", async () => {
    expect(await render(RankChip, { props: { rank: "S" } })).toContain("rank-chip--s");
    expect(await render(RankChip, { props: { rank: "A" } })).not.toContain("rank-chip--s");
  });

  it("accepts a custom label and size", async () => {
    const html = await render(RankChip, {
      props: { rank: "S", size: "sm", label: "S-rank: Sr. Systems Architect" },
    });
    expect(html).toContain('aria-label="S-rank: Sr. Systems Architect"');
    expect(html).toContain("rank-chip--sm");
  });
});
