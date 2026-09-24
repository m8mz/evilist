import { describe, expect, it } from "vitest";
import StackNetwork from "../../src/components/home/StackNetwork.astro";
import { NETWORK } from "../../src/data/network";
import { layoutNetwork } from "../../src/scripts/network";
import { render } from "../render";

describe("StackNetwork", () => {
  it("is a decorative SVG that fills its pane", async () => {
    const html = await render(StackNetwork);
    expect(html).toMatch(
      /<svg class="net"[^>]*preserveAspectRatio="xMidYMid slice"[^>]*aria-hidden="true"/,
    );
    expect(html).toContain("data-network");
  });

  it("draws every node and edge of the seeded layout", async () => {
    const html = await render(StackNetwork);
    const net = layoutNetwork(NETWORK);
    expect(html.match(/data-net-node="/g)).toHaveLength(net.nodes.length);
    expect(html.match(/data-net-edge="/g)).toHaveLength(net.edges.length);
  });

  it("labels the real stack", async () => {
    const html = await render(StackNetwork);
    for (const label of NETWORK.labels)
      expect(html, label).toMatch(new RegExp(`class="net__label"[^>]*>\\s*${label}\\s*<`));
  });

  it("uses no inline styles (CSP)", async () => {
    expect(await render(StackNetwork)).not.toContain("style=");
  });
});
