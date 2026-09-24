import { describe, expect, it } from "vitest";
import { NETWORK } from "../src/data/network";
import {
  edgeKey,
  layoutNetwork,
  lightingFor,
  mulberry32,
  nearestLabelled,
  neighboursOf,
  type Network,
} from "../src/scripts/network";

const net = layoutNetwork(NETWORK);

function reachable(network: Network, from: number): Set<number> {
  const adj = neighboursOf(network);
  const seen = new Set([from]);
  const queue = [from];
  while (queue.length) {
    for (const n of adj.get(queue.shift()!) ?? []) {
      if (!seen.has(n)) {
        seen.add(n);
        queue.push(n);
      }
    }
  }
  return seen;
}

describe("mulberry32", () => {
  it("repeats for a seed and differs across seeds", () => {
    const a = mulberry32(7),
      b = mulberry32(7),
      c = mulberry32(8);
    const seqA = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(seqA);
    expect([c(), c(), c()]).not.toEqual(seqA);
    for (const v of seqA) expect(v >= 0 && v < 1).toBe(true);
  });
});

describe("layoutNetwork", () => {
  it("draws the same picture every time", () => {
    expect(layoutNetwork(NETWORK)).toEqual(net);
  });

  it("places every label once, in order, plus the fillers", () => {
    expect(net.nodes).toHaveLength(NETWORK.labels.length + NETWORK.filler);
    expect(net.nodes.filter((n) => n.label).map((n) => n.label)).toEqual([...NETWORK.labels]);
    net.nodes.forEach((n, i) => expect(n.id).toBe(i));
  });

  it("keeps every node inside the margins", () => {
    for (const n of net.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(NETWORK.margin);
      expect(n.x).toBeLessThanOrEqual(NETWORK.width - NETWORK.margin);
      expect(n.y).toBeGreaterThanOrEqual(NETWORK.margin);
      expect(n.y).toBeLessThanOrEqual(NETWORK.height - NETWORK.margin);
    }
  });

  it("spaces labelled nodes so their labels don't collide", () => {
    // If this fails after a layout change, change NETWORK.seed, not this number.
    const labelled = net.nodes.filter((n) => n.label);
    for (const a of labelled)
      for (const b of labelled)
        if (a.id < b.id)
          expect(Math.hypot(a.x - b.x, a.y - b.y), `${a.label}/${b.label}`).toBeGreaterThanOrEqual(
            80,
          );
  });

  it("links each pair once, lower id first, with no self-links", () => {
    const keys = net.edges.map(([a, b]) => edgeKey(a, b));
    expect(new Set(keys).size).toBe(keys.length);
    for (const [a, b] of net.edges) expect(a).toBeLessThan(b);
  });

  it("is one connected graph", () => {
    expect(reachable(net, 0).size).toBe(net.nodes.length);
  });
});

// A hand-made graph: 0 — 1 — 2 — 3, and 1 — 4. Nodes 1 and 3 are labelled.
const tiny: Network = {
  nodes: [
    { id: 0, x: 0, y: 0 },
    { id: 1, x: 100, y: 0, label: "Linux" },
    { id: 2, x: 200, y: 0 },
    { id: 3, x: 300, y: 0, label: "Go" },
    { id: 4, x: 100, y: 100 },
  ],
  edges: [
    [0, 1],
    [1, 2],
    [1, 4],
    [2, 3],
  ],
};

describe("lightingFor", () => {
  it("lights the source and its neighbours, and echoes the next hop", () => {
    const l = lightingFor(tiny, 1);
    expect(new Set(l.lit)).toEqual(new Set([1, 0, 2, 4]));
    expect(l.echo).toEqual([3]);
    expect(new Set(l.litEdges)).toEqual(new Set(["0-1", "1-2", "1-4"]));
    expect(l.echoEdges).toEqual(["2-3"]);
  });

  it("never echoes a node it already lit", () => {
    for (const n of net.nodes) {
      const l = lightingFor(net, n.id);
      for (const id of l.echo) expect(l.lit).not.toContain(id);
    }
  });
});

describe("nearestLabelled", () => {
  it("finds the closest labelled node within reach, ignoring fillers", () => {
    expect(nearestLabelled(tiny, 105, 5, 50)).toBe(1);
    expect(nearestLabelled(tiny, 0, 0, 150)).toBe(1); // node 0 is closer but unlabelled
    expect(nearestLabelled(tiny, 290, 0, 50)).toBe(3);
  });

  it("returns null when nothing labelled is within reach", () => {
    expect(nearestLabelled(tiny, 200, 200, 50)).toBeNull();
  });
});
