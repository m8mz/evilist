// The hero network's geometry and lighting rules, shared by the server render
// (StackNetwork.astro) and the client (stack-network.ts). Pure: no DOM. Same seed, same picture.

export interface NetworkConfig {
  width: number;
  height: number;
  seed: number;
  margin: number;
  filler: number;
  labels: readonly string[];
}

export interface NetNode {
  id: number;
  x: number;
  y: number;
  label?: string;
}

export interface Network {
  nodes: NetNode[];
  /** Undirected; each pair once, lower id first, sorted. */
  edges: [number, number][];
}

export interface Lighting {
  /** The source and its direct neighbours. */
  lit: number[];
  /** The next hop out, excluding anything already lit. */
  echo: number[];
  litEdges: string[];
  echoEdges: string[];
}

const LABEL_GAP = 96;
const FILLER_GAP = 44;
const TRIES = 400;

/** Deterministic PRNG (mulberry32): the same seed always gives the same sequence in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const edgeKey = (a: number, b: number): string => (a < b ? `${a}-${b}` : `${b}-${a}`);

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

function adjacency(count: number, keys: Iterable<string>): Map<number, number[]> {
  const adj = new Map<number, number[]>();
  for (let i = 0; i < count; i++) adj.set(i, []);
  for (const key of keys) {
    const [a, b] = key.split("-").map(Number) as [number, number];
    adj.get(a)!.push(b);
    adj.get(b)!.push(a);
  }
  return adj;
}

function reach(adj: Map<number, number[]>, from: number): Set<number> {
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

/**
 * Dart-throwing placement (labelled nodes first, at a wider spacing), each node linked to its
 * nearest neighbours (3 for labelled, 2 for fillers), then the shortest links needed to make one
 * connected graph.
 */
export function layoutNetwork(config: NetworkConfig): Network {
  const rand = mulberry32(config.seed);
  const nodes: NetNode[] = [];
  const spanX = config.width - 2 * config.margin;
  const spanY = config.height - 2 * config.margin;

  const place = (gap: number, label?: string) => {
    let best: NetNode | undefined;
    let bestGap = -1;
    for (let t = 0; t < TRIES; t++) {
      const candidate: NetNode = {
        id: nodes.length,
        x: Math.round(config.margin + rand() * spanX),
        y: Math.round(config.margin + rand() * spanY),
        ...(label ? { label } : {}),
      };
      const nearest = nodes.reduce((m, n) => Math.min(m, distance(n, candidate)), Infinity);
      if (nearest >= gap) {
        best = candidate;
        break;
      }
      if (nearest > bestGap) {
        bestGap = nearest;
        best = candidate;
      }
    }
    nodes.push(best!);
  };

  for (const label of config.labels) place(LABEL_GAP, label);
  for (let i = 0; i < config.filler; i++) place(FILLER_GAP);

  const keys = new Set<string>();
  for (const n of nodes) {
    const nearest = nodes
      .filter((m) => m.id !== n.id)
      .sort((p, q) => distance(n, p) - distance(n, q))
      .slice(0, n.label ? 3 : 2);
    for (const m of nearest) keys.add(edgeKey(n.id, m.id));
  }

  for (;;) {
    const reached = reach(adjacency(nodes.length, keys), 0);
    if (reached.size === nodes.length) break;
    let pair: [number, number] = [0, 0];
    let shortest = Infinity;
    for (const a of reached) {
      for (const b of nodes) {
        if (reached.has(b.id)) continue;
        const d = distance(nodes[a]!, b);
        if (d < shortest) {
          shortest = d;
          pair = [a, b.id];
        }
      }
    }
    keys.add(edgeKey(...pair));
  }

  const edges = [...keys]
    .map((k) => k.split("-").map(Number) as [number, number])
    .sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  return { nodes, edges };
}

export function neighboursOf(network: Network): Map<number, number[]> {
  return adjacency(
    network.nodes.length,
    network.edges.map(([a, b]) => edgeKey(a, b)),
  );
}

export function lightingFor(network: Network, source: number): Lighting {
  const adj = neighboursOf(network);
  const first = adj.get(source) ?? [];
  const lit = [source, ...first];
  const litSet = new Set(lit);
  const echo = [...new Set(first.flatMap((n) => adj.get(n) ?? []))]
    .filter((n) => !litSet.has(n))
    .sort((a, b) => a - b);
  const echoSet = new Set(echo);
  const echoEdges = new Set<string>();
  for (const n of first)
    for (const m of adj.get(n) ?? []) if (echoSet.has(m)) echoEdges.add(edgeKey(n, m));
  return {
    lit,
    echo,
    litEdges: first.map((n) => edgeKey(source, n)),
    echoEdges: [...echoEdges].sort(),
  };
}

/** The labelled node nearest (x, y) within `maxDistance`, among those `accept` lets through. */
export function nearestLabelled(
  network: Network,
  x: number,
  y: number,
  maxDistance: number,
  accept: (id: number) => boolean = () => true,
): number | null {
  let best: number | null = null;
  let bestDistance = maxDistance;
  for (const n of network.nodes) {
    if (!n.label) continue;
    const d = Math.hypot(n.x - x, n.y - y);
    if (d <= bestDistance && accept(n.id)) {
      bestDistance = d;
      best = n.id;
    }
  }
  return best;
}

// ---------- What the visitor can see (screen geometry, CSS px) ----------

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Point {
  x: number;
  y: number;
}

/** "start": the label runs right from the dot; "end": it ends left of the dot. */
export type LabelSide = "start" | "end";

const grow = (b: Box, by: number): Box => ({
  left: b.left - by,
  top: b.top - by,
  right: b.right + by,
  bottom: b.bottom + by,
});

const holds = (b: Box, p: Point) =>
  p.x >= b.left && p.x <= b.right && p.y >= b.top && p.y <= b.bottom;

const encloses = (outer: Box, inner: Box) =>
  inner.left >= outer.left &&
  inner.right <= outer.right &&
  inner.top >= outer.top &&
  inner.bottom <= outer.bottom;

const overlaps = (a: Box, b: Box) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

/** The part of `pane` inside a `width` × `height` viewport, inset by `inset` on every side. */
export function visibleBox(pane: Box, width: number, height: number, inset = 4): Box {
  return {
    left: Math.max(pane.left, 0) + inset,
    top: Math.max(pane.top, 0) + inset,
    right: Math.min(pane.right, width) - inset,
    bottom: Math.min(pane.bottom, height) - inset,
  };
}

/** A dot the visitor can see: inside the visible pane and clear of the portrait (+ `margin`). */
export function isDotVisible(dot: Point, pane: Box, portrait: Box, margin = 8): boolean {
  return holds(pane, dot) && !holds(grow(portrait, margin), dot);
}

/**
 * Where a `labelWidth` × `labelHeight` label beside `dot` can go: preferably on the side away from
 * the portrait's centre, else the other side, as long as it stays inside the visible pane and
 * clear of the portrait (+ `margin`); null when neither side fits.
 */
export function labelSide(
  dot: Point,
  labelWidth: number,
  labelHeight: number,
  pane: Box,
  portrait: Box,
  gap = 10,
  margin = 8,
): LabelSide | null {
  const keepOut = grow(portrait, margin);
  const top = dot.y - labelHeight / 2;
  const bottom = dot.y + labelHeight / 2;
  const box = (side: LabelSide): Box =>
    side === "start"
      ? { left: dot.x + gap, right: dot.x + gap + labelWidth, top, bottom }
      : { left: dot.x - gap - labelWidth, right: dot.x - gap, top, bottom };
  const preferred: LabelSide = dot.x >= (portrait.left + portrait.right) / 2 ? "start" : "end";
  const other: LabelSide = preferred === "start" ? "end" : "start";
  for (const side of [preferred, other]) {
    const b = box(side);
    if (encloses(pane, b) && !overlaps(b, keepOut)) return side;
  }
  return null;
}
