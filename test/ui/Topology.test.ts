import { describe, expect, it } from "vitest";
import Topology from "../../src/components/home/Topology.astro";
import { render } from "../render";

describe("Topology", () => {
  it("is one labelled image of the edge and both datacenters", async () => {
    const html = await render(Topology);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Two datacenters with BGP failover behind HAProxy"');
    for (const label of ["internet", "haproxy", "primary", "dr", "bgp"]) {
      expect(html).toMatch(new RegExp(`class="topo__label"[^>]*>${label}<`));
    }
    expect(html.match(/class="topo__pulse"/g)).toHaveLength(1);
  });

  it("stays small: under 4 KB of markup", async () => {
    expect((await render(Topology)).length).toBeLessThan(4096);
  });
});
