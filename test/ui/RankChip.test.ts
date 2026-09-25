import { describe, expect, it } from "vitest";
import RankChip from "../../src/components/ui/RankChip.astro";
import { render } from "../render";

const RANKS = ["E", "D", "C", "B", "A", "S", "S+"] as const;

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

  it("gives only the top rank, S+, the accent modifier", async () => {
    expect(await render(RankChip, { props: { rank: "S+" } })).toContain("rank-chip--top");
    for (const rank of RANKS.filter((r) => r !== "S+")) {
      expect(await render(RankChip, { props: { rank } }), rank).not.toContain("rank-chip--top");
    }
  });

  it("accepts a custom label and size", async () => {
    const html = await render(RankChip, {
      props: { rank: "S+", size: "sm", label: "S+ rank: Sr. Systems Architect" },
    });
    expect(html).toContain('aria-label="S+ rank: Sr. Systems Architect"');
    expect(html).toContain("rank-chip--sm");
  });
});
