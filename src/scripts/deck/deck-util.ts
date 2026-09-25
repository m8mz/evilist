// Small pure helpers shared by the deck's page script and its stage.

/** Exponential approach toward `target` with time constant `tauMs`; snaps when within 5e-4. */
export function smooth(current: number, target: number, dtMs: number, tauMs: number): number {
  if (!Number.isFinite(dtMs) || dtMs <= 0) return current;
  const next = current + (target - current) * (1 - Math.exp(-dtMs / tauMs));
  return Math.abs(target - next) < 5e-4 ? target : next;
}

export interface Freeze {
  /** The fixed clock, ms since the epoch. */
  time: number;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `?deck-freeze=YYYY-MM-DD` fixes the clock, the RNG and the frame (deck spec §9). */
export function parseFreeze(search: string): Freeze | null {
  const value = new URLSearchParams(search).get("deck-freeze");
  const m = value ? ISO_DATE.exec(value) : null;
  if (!m) return null;
  return { time: new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime() };
}

/** The 2× rendition from 1.5× up, the 1× below, whichever exists. */
export function pickRendition(dpr: number, x1: string | null, x2: string | null): string | null {
  const preferred = dpr >= 1.5 ? x2 : x1;
  return preferred ?? x2 ?? x1;
}

/** A small deterministic RNG (the smoke and the visual baselines rely on it). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function once<T extends (...args: never[]) => void>(fn: T): T {
  let done = false;
  return ((...args: never[]) => {
    if (done) return;
    done = true;
    fn(...args);
  }) as T;
}

/** Runs `fn` when the browser is idle, or after `timeoutMs` at the latest. */
export function idle(fn: () => void, timeoutMs = 1500): void {
  const w =
    typeof window === "undefined"
      ? undefined
      : (window as Window & {
          requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
        });
  if (typeof w?.requestIdleCallback === "function") {
    w.requestIdleCallback(fn, { timeout: timeoutMs });
  } else {
    // Safari has no idle callback (and node/SSR has no window at all), so run soon but never
    // later than the caller's ceiling.
    setTimeout(fn, Math.min(200, timeoutMs));
  }
}

/** The build date the page carries as `data-now`, as local midnight; today when it is missing. */
export function nowFrom(iso: string | undefined): Date {
  const m = iso ? ISO_DATE.exec(iso) : null;
  if (!m) return new Date();
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}
