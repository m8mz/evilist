// Lights the hero network (spec §4.4). The labelled node nearest the cursor (within 120 CSS px)
// lights with its edges and neighbours; the next hop echoes 120 ms later; everything fades when
// the cursor moves on. While no mouse rests on a lit node and the pointer has been still for 3 s
// (always, on touch screens), a random node pulses every 1.25 s, with up to two pulses live at
// once (the second keeps clear of the first's neighbourhood). Reduced motion: no pulses; the
// global rule makes the fades instant.
//
// Only nodes the visitor can see take part: a dot inside the visible part of the pane and clear of
// the portrait. A lit node's label goes on the side away from the portrait if it fits there, else
// the other side, else it stays hidden (.is-unlabelled). Geometry is read when it's used, so a
// resize or a scroll never leaves it stale.
import { inView } from "motion";
import { NETWORK } from "../data/network";
import {
  isDotVisible,
  labelSide,
  layoutNetwork,
  lightingFor,
  nearestLabelled,
  visibleBox,
  type Box,
  type Lighting,
  type Point,
} from "./network";

const REACH_PX = 120;
const ECHO_MS = 120;
const IDLE_MS = 3000;
const PULSE_EVERY_MS = 1250;
const PULSE_HOLD_MS = 1400;
const PULSES_AT_ONCE = 2;
/** Between a dot and its label, in SVG units (the dot scales with the SVG, so does the gap). */
const LABEL_GAP = 10;

/** A mouse or a pen drives the network; a finger only scrolls the page. */
export const tracksPointer = (pointerType: string): boolean => pointerType !== "touch";

/** Nothing covers the network: no dot is inside it, no label overlaps it. */
const NOWHERE: Box = { left: -Infinity, top: -Infinity, right: -Infinity, bottom: -Infinity };

interface Geometry {
  ctm: DOMMatrix;
  pane: Box;
  portrait: Box;
}

export function initStackNetwork(hero: HTMLElement): void {
  const svg = hero.querySelector<SVGSVGElement>("[data-network]");
  if (!svg) return;
  const portraitEl = hero.querySelector<HTMLElement>(".hero__portrait");
  const network = layoutNetwork(NETWORK);
  const nodes = new Map(
    [...svg.querySelectorAll<SVGGElement>("[data-net-node]")].map(
      (el) => [Number(el.dataset.netNode), el] as const,
    ),
  );
  const edges = new Map(
    [...svg.querySelectorAll<SVGGElement>("[data-net-edge]")].map(
      (el) => [el.dataset.netEdge!, el] as const,
    ),
  );
  const labelled = network.nodes.filter((n) => n.label).map((n) => n.id);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Labels render at 14px on screen whatever the SVG's scale (StackNetwork.astro divides by it).
  const setScale = () => {
    const ctm = svg.getScreenCTM();
    if (ctm && ctm.a > 0) svg.style.setProperty("--net-scale", String(ctm.a));
  };
  setScale();
  new ResizeObserver(setScale).observe(svg);

  const geometry = (): Geometry | null => {
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    return {
      ctm,
      pane: visibleBox(svg.getBoundingClientRect(), window.innerWidth, window.innerHeight),
      portrait: portraitEl?.getBoundingClientRect() ?? NOWHERE,
    };
  };

  const dotOf = (id: number, ctm: DOMMatrix): Point => {
    const n = network.nodes[id]!;
    return new DOMPoint(n.x, n.y).matrixTransform(ctm);
  };

  const visible = (id: number, g: Geometry) => isDotVisible(dotOf(id, g.ctm), g.pane, g.portrait);

  /** Where `id`'s label fits; `undefined` when labels aren't shown at this width. */
  const sideFor = (id: number, g: Geometry) => {
    const text = nodes.get(id)?.querySelector<SVGTextElement>(".net__label");
    const box = text?.getBoundingClientRect();
    if (!box || box.width === 0) return undefined;
    return labelSide(
      dotOf(id, g.ctm),
      box.width,
      box.height,
      g.pane,
      g.portrait,
      LABEL_GAP * g.ctm.a,
    );
  };

  const placeLabel = (id: number) => {
    const g = geometry();
    const el = nodes.get(id);
    const text = el?.querySelector<SVGTextElement>(".net__label");
    if (!g || !el || !text) return;
    const side = sideFor(id, g);
    if (side === undefined) return;
    el.classList.toggle("is-unlabelled", side === null);
    if (side === null) return;
    const x = network.nodes[id]!.x;
    text.setAttribute("x", String(side === "start" ? x + LABEL_GAP : x - LABEL_GAP));
    text.setAttribute("text-anchor", side);
  };

  /** A lit source: its lighting, whether its echo has fired, and its timers. */
  interface Source {
    lighting: Lighting;
    echoed: boolean;
    echoTimer: number;
    holdTimer: number;
  }
  // Up to two idle pulses can be live at once; the pointer is exclusive and drops them all.
  const active = new Map<number, Source>();
  let byPointer = false;
  let lastMove = 0;

  /** Repaints every node and edge from the union of the live sources (lit outranks echo). */
  const render = () => {
    const sources = new Set<number>();
    const lit = new Set<number>();
    const echo = new Set<number>();
    const litEdges = new Set<string>();
    const echoEdges = new Set<string>();
    for (const [id, s] of active) {
      sources.add(id);
      for (const n of s.lighting.lit) lit.add(n);
      for (const key of s.lighting.litEdges) litEdges.add(key);
      if (!s.echoed) continue;
      for (const n of s.lighting.echo) echo.add(n);
      for (const key of s.lighting.echoEdges) echoEdges.add(key);
    }
    for (const [id, el] of nodes) {
      el.classList.toggle("is-source", sources.has(id));
      el.classList.toggle("is-lit", lit.has(id));
      el.classList.toggle("is-echo", echo.has(id) && !lit.has(id));
    }
    for (const [key, el] of edges) {
      el.classList.toggle("is-lit", litEdges.has(key));
      el.classList.toggle("is-echo", echoEdges.has(key) && !litEdges.has(key));
    }
  };

  const drop = (id: number) => {
    const s = active.get(id);
    if (!s) return;
    window.clearTimeout(s.echoTimer);
    window.clearTimeout(s.holdTimer);
    active.delete(id);
    nodes.get(id)?.classList.remove("is-unlabelled");
    render();
  };

  const clear = () => {
    byPointer = false;
    for (const id of [...active.keys()]) drop(id);
  };

  const light = (source: number, fromPointer: boolean) => {
    if (fromPointer) {
      byPointer = true;
      for (const id of [...active.keys()]) if (id !== source) drop(id);
      // A pointer landing on a node that's already lit — even mid-pulse — takes ownership,
      // so the pulse's hold timer never blanks the node out from under the cursor.
      const held = active.get(source);
      if (held) window.clearTimeout(held.holdTimer);
    }
    if (active.has(source)) return;
    const s: Source = {
      lighting: lightingFor(network, source),
      echoed: reduced,
      echoTimer: 0,
      holdTimer: 0,
    };
    active.set(source, s);
    placeLabel(source);
    if (!reduced) {
      s.echoTimer = window.setTimeout(() => {
        s.echoed = true;
        render();
      }, ECHO_MS);
    }
    render();
  };

  let frame = 0;
  hero.addEventListener("pointermove", (event) => {
    if (!tracksPointer(event.pointerType)) return;
    lastMove = Date.now();
    const { clientX, clientY } = event;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const g = geometry();
      if (!g) return;
      const p = new DOMPoint(clientX, clientY).matrixTransform(g.ctm.inverse());
      const hit = nearestLabelled(network, p.x, p.y, REACH_PX / g.ctm.a, (id) => visible(id, g));
      if (hit === null) clear();
      else light(hit, true);
    });
  });
  hero.addEventListener("pointerleave", () => {
    cancelAnimationFrame(frame);
    clear();
  });

  if (reduced) return;
  /** Nodes a pulse may light: on screen, and (where labels show) with room for the label. */
  const pulseable = () => {
    const g = geometry();
    if (!g) return [];
    return labelled.filter((id) => visible(id, g) && sideFor(id, g) !== null);
  };
  inView(hero, () => {
    const timer = window.setInterval(() => {
      if (document.hidden || byPointer || Date.now() - lastMove < IDLE_MS) return;
      if (active.size >= PULSES_AT_ONCE) return;
      // A second pulse keeps clear of the first's lit neighbourhood, so two labels never crowd.
      const taken = new Set<number>();
      for (const [id, s] of active) {
        taken.add(id);
        for (const n of s.lighting.lit) taken.add(n);
        for (const n of s.lighting.echo) taken.add(n);
      }
      const picks = pulseable().filter((id) => !taken.has(id));
      if (picks.length === 0) return;
      const pick = picks[Math.floor(Math.random() * picks.length)]!;
      light(pick, false);
      const s = active.get(pick);
      if (s) s.holdTimer = window.setTimeout(() => drop(pick), PULSE_HOLD_MS);
    }, PULSE_EVERY_MS);
    return () => {
      window.clearInterval(timer);
      clear();
    };
  });
}
