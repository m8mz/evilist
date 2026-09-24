// Lights the hero network (spec §4.4). The labelled node nearest the cursor (within 120 CSS px)
// lights with its edges and neighbours; the next hop echoes 120 ms later; everything fades when
// the cursor moves on. While no mouse rests on a lit node and the pointer has been still for 3 s
// (always, on touch screens), a random node pulses every 2.5 s. Reduced motion: no pulses; the
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
  type Point,
} from "./network";

const REACH_PX = 120;
const ECHO_MS = 120;
const IDLE_MS = 3000;
const PULSE_EVERY_MS = 2500;
const PULSE_HOLD_MS = 1400;
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

  let current: number | null = null;
  let byPointer = false;
  let echoTimer = 0;
  let holdTimer = 0;
  let lastMove = 0;

  const clear = () => {
    window.clearTimeout(echoTimer);
    window.clearTimeout(holdTimer);
    byPointer = false;
    if (current === null) return;
    for (const el of [...nodes.values(), ...edges.values()])
      el.classList.remove("is-source", "is-lit", "is-echo", "is-unlabelled");
    current = null;
  };

  const light = (source: number, fromPointer: boolean) => {
    if (fromPointer) {
      // A pointer landing on a node that's already lit — even mid-pulse — takes ownership,
      // so the pulse's hold timer never blanks the node out from under the cursor.
      window.clearTimeout(holdTimer);
      byPointer = true;
    }
    if (source === current) return;
    clear();
    current = source;
    byPointer = fromPointer;
    placeLabel(source);
    const l = lightingFor(network, source);
    nodes.get(source)?.classList.add("is-source");
    for (const id of l.lit) nodes.get(id)?.classList.add("is-lit");
    for (const key of l.litEdges) edges.get(key)?.classList.add("is-lit");
    const echo = () => {
      for (const id of l.echo) nodes.get(id)?.classList.add("is-echo");
      for (const key of l.echoEdges) edges.get(key)?.classList.add("is-echo");
    };
    if (reduced) echo();
    else echoTimer = window.setTimeout(echo, ECHO_MS);
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
      const picks = pulseable();
      if (picks.length === 0) return;
      light(picks[Math.floor(Math.random() * picks.length)]!, false);
      window.clearTimeout(holdTimer);
      holdTimer = window.setTimeout(clear, PULSE_HOLD_MS);
    }, PULSE_EVERY_MS);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(holdTimer);
      clear();
    };
  });
}
