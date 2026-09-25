// Maps scroll progress through the journey track to the active career stage and drives the vector
// scene (vector journey spec §5). Motion's scroll() tracks the journey element; the cards, the
// rail and data-activity switch by class as before. The scene is fetched once, the first time
// the journey is on screen (past the window's bottom 15%) and the page has scrolled at all, so
// nothing loads with the page on any window; until then, and if the fetch fails, the inline
// silhouette holds the stage. Each frame the scene state is written as SVG attributes
// (src/scripts/scene.ts); the idle life is CSS on the scene's inner groups.
import { scroll } from "motion";
import { RIG } from "../data/avatarRig";
import { sceneState, stageForProgress } from "./avatar";
import { applyState, bindScene, type SceneRefs } from "./scene";

export { stageForProgress };

export const SCENE_URL = "/journey/scene.svg";

/** A scene is an SVG document carrying the avatar; a 404 page or a parser error is not. */
export function isSceneDocument(doc: {
  documentElement: { nodeName: string } | null;
  getElementById(id: string): unknown;
}): boolean {
  return doc.documentElement?.nodeName === "svg" && doc.getElementById("avatar") != null;
}

export function initJourney(): void {
  const root = document.querySelector<HTMLElement>("[data-journey]");
  if (!root) return;
  if (!matchMedia("(prefers-reduced-motion: no-preference)").matches) return;

  const cards = [...root.querySelectorAll<HTMLElement>("[data-card]")];
  const nodes = [...root.querySelectorAll<HTMLElement>("[data-node]")];
  const stage = root.querySelector<HTMLElement>("[data-scene]");
  const poses = RIG.ranks.map((rank) => RIG.poses[rank]!);
  let current = 0;
  let onScreen = false;
  let requested = false;
  let refs: SceneRefs | null = null;
  let last = sceneState(0, poses);

  const load = async () => {
    if (requested || !stage) return;
    requested = true;
    let doc: Document | null = null;
    try {
      const response = await fetch(SCENE_URL);
      if (!response.ok) return;
      const parsed = new DOMParser().parseFromString(await response.text(), "image/svg+xml");
      if (!isSceneDocument(parsed)) return;
      doc = parsed;
    } catch {
      // The silhouette stays; the cards and the rail still work.
    }
    if (!doc) return;
    const svg = document.importNode(doc.documentElement, true);
    const bound = bindScene((id) => svg.querySelector(`#${id}`));
    if (!bound) return;
    // Painted at the visitor's current progress, never at rank E, however late it arrives.
    applyState(bound, last);
    stage.replaceChildren(svg);
    refs = bound;
  };

  const maybeLoad = () => {
    if (onScreen && scrollY > 0) void load();
  };

  const show = (index: number) => {
    if (index === current) return;
    current = index;
    root.dataset.activity = cards[index]!.dataset.activity;
    cards.forEach((card, i) => card.classList.toggle("is-active", i === index));
    nodes.forEach((node, i) => {
      node.classList.toggle("is-reached", i <= index);
      node.classList.toggle("is-current", i === index);
    });
  };

  // Ignores the window's bottom 15%: a strip of journey peeking up at load on a tall screen loads nothing.
  new IntersectionObserver(
    (entries) => {
      // The newest entry is the current state: a busy main thread can deliver an enter and a leave together.
      onScreen = entries[entries.length - 1]!.isIntersecting;
      maybeLoad();
    },
    { rootMargin: "0px 0px -15% 0px" },
  ).observe(root);

  // Listens for the page's whole life: stopping on pagehide froze the journey after a
  // back/forward-cache restore.
  scroll(
    (progress: number) => {
      // CSSOM writes are allowed under the CSP (only inline style attributes are blocked).
      root.style.setProperty("--progress", progress.toFixed(4));
      show(stageForProgress(progress, cards.length));
      last = sceneState(progress, poses);
      if (refs) applyState(refs, last);
      maybeLoad();
    },
    { target: root, offset: ["start start", "end end"] },
  );
}
