// Maps scroll progress through the journey track to the active career stage, and runs the clips.
// Motion's scroll() tracks the journey element on scroll events; all visual changes are CSS
// transitions on transform and opacity. Nothing is fetched until the journey is on screen (past
// the window's bottom 15%); until the stage pins, only the active rank loads; once pinned, the
// active rank (after it holds for a quarter of a second) and its neighbours are primed (poster
// shown, clip sources set) and the active clip plays while the journey is on screen. A refused
// play() leaves the rank's still showing.
import { scroll } from "motion";
import { stageForProgress } from "./avatar";

export { stageForProgress };

/** The ranks worth priming around `index`: it and its neighbours, within the journey. */
export function neighbours(index: number, count: number): number[] {
  return [index - 1, index, index + 1].filter((i) => i >= 0 && i < count);
}

/** How long a rank must stay active before its clip loads and plays: a smooth scroll through the
 * journey (the skip link, back to top) passes each rank faster than this and loads none of them. */
const SETTLE_MS = 250;

export function initJourney(): void {
  const root = document.querySelector<HTMLElement>("[data-journey]");
  if (!root) return;
  if (!matchMedia("(prefers-reduced-motion: no-preference)").matches) return;

  const cards = [...root.querySelectorAll<HTMLElement>("[data-card]")];
  const nodes = [...root.querySelectorAll<HTMLElement>("[data-node]")];
  const clips = [...root.querySelectorAll<HTMLElement>("[data-clip]")];
  const videoOf = (i: number) => clips[i]?.querySelector("video") ?? null;
  let current = 0;
  let onScreen = false;
  let pinned = false;
  let settle: ReturnType<typeof setTimeout> | undefined;

  const prime = (index: number, withNeighbours = true) => {
    for (const i of withNeighbours ? neighbours(index, clips.length) : [index]) {
      const clip = clips[i];
      if (clip.classList.contains("is-primed")) continue;
      clip.classList.add("is-primed");
      const video = videoOf(i);
      if (!video) continue;
      for (const source of video.querySelectorAll<HTMLSourceElement>("source[data-src]")) {
        source.src = source.dataset.src!;
      }
      video.addEventListener("playing", () => clip.classList.add("is-playing"));
      video.load();
    }
  };

  const play = (i: number) => {
    // Low Power Mode or a data saver can refuse; the still stays, which is fine.
    videoOf(i)
      ?.play()
      .catch(() => {});
  };

  const pause = (i: number) => videoOf(i)?.pause();

  const show = (index: number) => {
    if (index === current) return;
    const previous = current;
    current = index;
    root.dataset.activity = cards[index].dataset.activity;
    cards.forEach((card, i) => card.classList.toggle("is-active", i === index));
    clips.forEach((clip, i) => clip.classList.toggle("is-active", i === index));
    nodes.forEach((node, i) => {
      node.classList.toggle("is-reached", i <= index);
      node.classList.toggle("is-current", i === index);
    });
    pause(previous);
    clearTimeout(settle);
    settle = setTimeout(() => {
      if (!onScreen) return;
      prime(current);
      play(current);
    }, SETTLE_MS);
  };

  // Ignores the window's bottom 15%: a strip of journey peeking up at load on a tall screen loads nothing.
  new IntersectionObserver(
    (entries) => {
      // The newest entry is the current state: a busy main thread can deliver an enter and a leave together.
      onScreen = entries[entries.length - 1].isIntersecting;
      if (onScreen) {
        prime(current, pinned);
        play(current);
      } else {
        clips.forEach((_, i) => pause(i));
      }
    },
    { rootMargin: "0px 0px -15% 0px" },
  ).observe(root);

  // A back/forward-cache restore can leave the active clip paused, and the observer won't fire again.
  addEventListener("pageshow", (event) => {
    if (event.persisted && onScreen) play(current);
  });

  // Listens for the page's whole life: stopping on pagehide froze the journey after a
  // back/forward-cache restore.
  scroll(
    (progress: number) => {
      // CSSOM writes are allowed under the CSP (only inline style attributes are blocked).
      root.style.setProperty("--progress", progress.toFixed(4));
      if (!pinned && progress > 0) {
        pinned = true;
        if (onScreen) prime(current);
      }
      show(stageForProgress(progress, cards.length));
    },
    { target: root, offset: ["start start", "end end"] },
  );
}
