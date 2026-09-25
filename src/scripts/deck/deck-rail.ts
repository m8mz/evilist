// The rank rail (deck spec §3): seven buttons with aria-pressed on the presented rank, a roving
// tabindex with arrow keys, the counter, the hint and the aria-live announcement. The pure helpers
// are tested; the DOM wiring is exercised by the e2e suite.
import type { CareerStage } from "../../data/career";

export function rankAfterKey(current: number, key: string, count: number): number | null {
  const last = count - 1;
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return Math.min(last, current + 1);
    case "ArrowLeft":
    case "ArrowUp":
      return Math.max(0, current - 1);
    case "Home":
      return 0;
    case "End":
      return last;
    default:
      return null;
  }
}

/** The page's scroll position that puts the journey in the middle of rank `index`'s stretch. */
export function scrollTargetFor(
  trackTop: number,
  trackHeight: number,
  viewportHeight: number,
  headerPx: number,
  index: number,
  count: number,
): number {
  const span = trackHeight - (viewportHeight - headerPx);
  return trackTop - headerPx + span * ((index + 0.5) / count);
}

export const counterText = (index: number, count: number): string =>
  `${String(index + 1).padStart(2, "0")} / ${String(count).padStart(2, "0")}`;

export const liveText = (stage: CareerStage): string =>
  `Rank ${stage.rankLabel}, ${stage.shortTitle ?? stage.title}, ${stage.org}`;

export interface Rail {
  buttons: HTMLButtonElement[];
  setPresented(index: number): void;
  setProgress(p: number): void;
  showHint(): void;
  hideHint(): void;
}

function headerPx(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--header-h").trim();
  const px = raw.endsWith("rem") ? Number.parseFloat(raw) * 16 : Number.parseFloat(raw);
  return Number.isFinite(px) ? px : 64;
}

export function scrollToRank(
  track: HTMLElement,
  index: number,
  count: number,
  reduced: boolean,
): void {
  const top = scrollTargetFor(
    track.getBoundingClientRect().top + scrollY,
    track.offsetHeight,
    innerHeight,
    headerPx(),
    index,
    count,
  );
  scrollTo({ top, behavior: reduced ? "instant" : "smooth" });
}

export function initRail(
  track: HTMLElement,
  stages: readonly CareerStage[],
  onJump: (index: number) => void,
): Rail {
  const buttons = [...track.querySelectorAll<HTMLButtonElement>("[data-deck-rank]")];
  const counter = track.querySelector<HTMLElement>("[data-deck-counter]");
  const hint = track.querySelector<HTMLElement>("[data-deck-hint]");
  const live = track.querySelector<HTMLElement>("[data-deck-live]");
  let presented = 0;
  let hintTimer: ReturnType<typeof setTimeout> | undefined;

  const focusRank = (index: number) => {
    buttons.forEach((b, i) => b.setAttribute("tabindex", i === index ? "0" : "-1"));
    buttons[index]?.focus();
  };

  buttons.forEach((button, i) => {
    button.addEventListener("click", () => onJump(i));
    button.addEventListener("keydown", (event) => {
      const next = rankAfterKey(i, event.key, buttons.length);
      if (next === null) return;
      event.preventDefault();
      focusRank(next);
    });
  });

  return {
    buttons,
    setPresented(index) {
      if (index === presented && buttons[index]?.getAttribute("aria-pressed") === "true") return;
      presented = index;
      const stage = stages[index];
      buttons.forEach((b, i) => {
        b.setAttribute("aria-pressed", i === index ? "true" : "false");
        b.classList.toggle("is-reached", i <= index);
        // Keep the roving tabindex on the presented rank unless the visitor is using the rail.
        if (!track.contains(document.activeElement) || document.activeElement === track) {
          b.setAttribute("tabindex", i === index ? "0" : "-1");
        }
      });
      if (counter) counter.textContent = counterText(index, buttons.length);
      if (live && stage) live.textContent = liveText(stage);
    },
    setProgress(p) {
      // CSSOM writes are allowed under the CSP (only inline style attributes are blocked).
      track.style.setProperty("--progress", p.toFixed(4));
    },
    showHint() {
      hint?.classList.add("is-shown");
      clearTimeout(hintTimer);
      hintTimer = setTimeout(() => hint?.classList.remove("is-shown"), 8000);
    },
    hideHint() {
      clearTimeout(hintTimer);
      hint?.classList.remove("is-shown");
    },
  };
}
