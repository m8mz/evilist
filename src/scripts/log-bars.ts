// LogBars helpers and the stream-in behaviour: when a bar row scrolls into view, each bar gets
// `.is-live` 30 ms after the previous one (CSS animates scaleY). Reduced motion: nothing happens
// and the bars render at full height.
import { inView } from "motion";

export interface LogBarsEnv {
  reducedMotion: boolean;
}

/** Height in SVG units for a 0–1 value. Bad input renders as the 1px floor, never as negative. */
export function barHeight(value: number, max: number): number {
  const v = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  return Math.max(1, Math.round(v * max));
}

export function shouldStream(env: LogBarsEnv): boolean {
  return !env.reducedMotion;
}

export function initLogBars(root: ParentNode = document): void {
  if (!shouldStream({ reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches })) {
    return;
  }
  for (const svg of root.querySelectorAll<SVGSVGElement>("[data-log-bars]")) {
    inView(
      svg,
      () => {
        svg.querySelectorAll<SVGRectElement>(".log-bars__bar").forEach((bar, i) => {
          setTimeout(() => bar.classList.add("is-live"), i * 30);
        });
      },
      { amount: 0.5 },
    );
  }
}
