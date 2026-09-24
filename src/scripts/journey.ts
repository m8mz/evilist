// Maps scroll progress through the journey track to the active career stage.
// Motion's scroll() uses the native ScrollTimeline where available, so this stays off the main
// thread's critical path; all visual changes are CSS transitions on transform/opacity.
import { scroll } from "motion";

export function stageForProgress(progress: number, stages: number): number {
  if (!Number.isFinite(progress) || progress <= 0) return 0;
  return Math.min(stages - 1, Math.floor(progress * stages));
}

export function initJourney(): void {
  const root = document.querySelector<HTMLElement>("[data-journey]");
  if (!root) return;
  if (!matchMedia("(prefers-reduced-motion: no-preference)").matches) return;

  const cards = [...root.querySelectorAll<HTMLElement>("[data-card]")];
  const nodes = [...root.querySelectorAll<HTMLElement>("[data-node]")];
  let current = 0;

  const show = (index: number) => {
    if (index === current) return;
    current = index;
    root.dataset.activity = cards[index].dataset.activity;
    cards.forEach((card, i) => card.classList.toggle("is-active", i === index));
    nodes.forEach((node, i) => {
      node.classList.toggle("is-reached", i <= index);
      node.classList.toggle("is-current", i === index);
    });
  };

  const stop = scroll(
    (progress: number) => {
      // CSSOM writes are allowed under the CSP (only inline style attributes are blocked).
      root.style.setProperty("--progress", progress.toFixed(4));
      show(stageForProgress(progress, cards.length));
    },
    { target: root, offset: ["start start", "end end"] },
  );

  addEventListener("pagehide", () => stop(), { once: true });
}
