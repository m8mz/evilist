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

/** Meter body width in columns; the server render and the client tick must agree. */
export const METER_WIDTH = 30;
/** A core at this load or more is drawn hot (ember). */
export const HOT = 75;

/** Every row drifted, then capped at the row above, so the CPU% column stays sorted like htop's. */
export function driftSorted(
  values: readonly number[],
  spread: number,
  min: number,
  max: number,
  rand: () => number = Math.random,
): number[] {
  const out: number[] = [];
  for (const v of values) {
    const next = drift(v, spread, min, max, rand);
    out.push(out.length > 0 ? Math.min(next, out[out.length - 1]!) : next);
  }
  return out;
}

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
      if (bar) bar.textContent = meter(next / 100, pct(next), METER_WIDTH);
    }
    const next = driftSorted(
      cpus.map((el) => Number(el.dataset.cpu)),
      0.8,
      0,
      12,
    );
    cpus.forEach((el, i) => {
      el.dataset.cpu = String(next[i]);
      el.textContent = next[i]!.toFixed(1);
    });
  };

  inView(band, () => {
    const timer = window.setInterval(tick, 1600);
    return () => window.clearInterval(timer);
  });
}
