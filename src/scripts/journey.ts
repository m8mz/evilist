// Maps scroll progress through the journey track to the active career stage, and runs the clips.
// Motion's scroll() tracks the journey element on scroll events; all visual changes are CSS
// transitions on transform and opacity. Nothing is fetched until the journey reaches the screen
// (it starts just below the fold, so a wider margin would load it with the page); then the active
// rank and its neighbours are primed (poster shown, clip sources set) and the active clip plays
// while the journey is on screen. A refused play() leaves the rank's still showing.
import { scroll } from "motion";

export function stageForProgress(progress: number, stages: number): number {
  if (!Number.isFinite(progress) || progress <= 0) return 0;
  return Math.min(stages - 1, Math.floor(progress * stages));
}

/** The ranks worth priming around `index`: it and its neighbours, within the journey. */
export function neighbours(index: number, count: number): number[] {
  return [index - 1, index, index + 1].filter((i) => i >= 0 && i < count);
}

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

  const prime = (index: number) => {
    for (const i of neighbours(index, clips.length)) {
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
    if (onScreen) {
      prime(index);
      pause(previous);
      play(index);
    }
  };

  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (onScreen) {
      prime(current);
      play(current);
    } else {
      clips.forEach((_, i) => pause(i));
    }
  }).observe(root);

  // Listens for the page's whole life: stopping on pagehide froze the journey after a
  // back/forward-cache restore.
  scroll(
    (progress: number) => {
      // CSSOM writes are allowed under the CSP (only inline style attributes are blocked).
      root.style.setProperty("--progress", progress.toFixed(4));
      show(stageForProgress(progress, cards.length));
    },
    { target: root, offset: ["start start", "end end"] },
  );
}
