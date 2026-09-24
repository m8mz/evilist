// Lights the hero network (spec §4.4). The labelled node nearest the cursor (within 120 CSS px)
// lights with its edges and neighbours; the next hop echoes 120 ms later; everything fades when
// the cursor moves on. While no mouse rests on a lit node and the pointer has been still for 3 s
// (always, on touch screens), a random node pulses every 2.5 s. Reduced motion: no pulses; the
// global rule makes the fades instant.
import { inView } from "motion";
import { NETWORK } from "../data/network";
import { layoutNetwork, lightingFor, nearestLabelled } from "./network";

const REACH_PX = 120;
const ECHO_MS = 120;
const IDLE_MS = 3000;
const PULSE_EVERY_MS = 2500;
const PULSE_HOLD_MS = 1400;

/** A mouse or a pen drives the network; a finger only scrolls the page. */
export const tracksPointer = (pointerType: string): boolean => pointerType !== "touch";

export function initStackNetwork(hero: HTMLElement): void {
  const svg = hero.querySelector<SVGSVGElement>("[data-network]");
  if (!svg) return;
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
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let current: number | null = null;
  let byPointer = false;
  let echoTimer = 0;
  let lastMove = 0;

  const clear = () => {
    window.clearTimeout(echoTimer);
    for (const el of [...nodes.values(), ...edges.values()])
      el.classList.remove("is-source", "is-lit", "is-echo");
    current = null;
    byPointer = false;
  };

  const light = (source: number, fromPointer: boolean) => {
    if (source === current) return;
    clear();
    current = source;
    byPointer = fromPointer;
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
      // Read on every move: a resize or scroll changes the SVG's screen transform.
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
      const hit = nearestLabelled(network, p.x, p.y, REACH_PX / ctm.a);
      if (hit === null) clear();
      else light(hit, true);
    });
  });
  hero.addEventListener("pointerleave", () => {
    cancelAnimationFrame(frame);
    clear();
  });

  if (reduced) return;
  const labelled = network.nodes.filter((n) => n.label).map((n) => n.id);
  inView(hero, () => {
    let hold = 0;
    const timer = window.setInterval(() => {
      if (document.hidden || byPointer || Date.now() - lastMove < IDLE_MS) return;
      light(labelled[Math.floor(Math.random() * labelled.length)]!, false);
      window.clearTimeout(hold);
      hold = window.setTimeout(clear, PULSE_HOLD_MS);
    }, PULSE_EVERY_MS);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(hold);
      clear();
    };
  });
}
