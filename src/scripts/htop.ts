// The htop band: formatting shared by the server render and the client, plus a gentle live
// update. Every 1.6 s while the band is on screen, core loads and CPU% drift a little. Only text
// changes, at fixed widths, so nothing reflows. Reduced motion: no updates.
import { inView } from "motion";

/** An htop meter body in exactly `width` columns: bars, padding, one space, then the label. */
export function meter(fraction: number, label: string, width: number): string {
  const f = Number.isFinite(fraction) ? Math.min(1, Math.max(0, fraction)) : 0;
  const room = Math.max(0, width - label.length - 1);
  return `${"|".repeat(Math.round(f * room)).padEnd(room)} ${label}`;
}

export const pct = (p: number): string => `${p.toFixed(1)}%`;

/** `value` nudged by up to ±`spread`, clamped to [min, max] and rounded to one decimal. */
export function drift(
  value: number,
  spread: number,
  min: number,
  max: number,
  rand: () => number = Math.random,
): number {
  const next = Math.min(max, Math.max(min, value + (rand() * 2 - 1) * spread));
  return Math.round(next * 10) / 10;
}

const WIDTH = 30;
const HOT = 75;

export function initHtop(root: ParentNode = document): void {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const band = root.querySelector<HTMLElement>("[data-htop]");
  if (!band) return;
  const cores = [...band.querySelectorAll<HTMLElement>("[data-core]")];
  const cpus = [...band.querySelectorAll<HTMLElement>("[data-cpu]")];

  const tick = () => {
    for (const el of cores) {
      const next = drift(Number(el.dataset.core), 9, 3, 96);
      el.dataset.core = String(next);
      el.classList.toggle("is-hot", next >= HOT);
      const bar = el.querySelector<HTMLElement>(".htop__bar");
      if (bar) bar.textContent = meter(next / 100, pct(next), WIDTH);
    }
    for (const el of cpus) {
      const next = drift(Number(el.dataset.cpu), 0.8, 0, 12);
      el.dataset.cpu = String(next);
      el.textContent = next.toFixed(1);
    }
  };

  inView(band, () => {
    const timer = window.setInterval(tick, 1600);
    return () => window.clearInterval(timer);
  });
}
