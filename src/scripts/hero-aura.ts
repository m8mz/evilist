// Loader for the hero aura. Tiny and always loaded; Three.js itself is only fetched
// (dynamic import) on capable devices, after the visitor's first interaction, so it never
// competes with first paint or shows up in a Lighthouse run.

export interface AuraEnv {
  reducedMotion: boolean;
  saveData: boolean;
  /** GB, from navigator.deviceMemory; undefined where the browser doesn't expose it. */
  deviceMemory: number | undefined;
  cores: number;
  webgl2: boolean;
}

export function shouldRunAura(env: AuraEnv): boolean {
  if (env.reducedMotion || env.saveData || !env.webgl2) return false;
  if (env.deviceMemory !== undefined && env.deviceMemory < 4) return false;
  return env.cores >= 4;
}

function readEnv(): AuraEnv {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  let webgl2 = false;
  try {
    webgl2 = !!document.createElement("canvas").getContext("webgl2");
  } catch {
    webgl2 = false;
  }
  return {
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    saveData: nav.connection?.saveData === true,
    deviceMemory: nav.deviceMemory,
    cores: nav.hardwareConcurrency ?? 0,
    webgl2,
  };
}

export function initHeroAura(): void {
  const host = document.querySelector<HTMLElement>("[data-hero-aura]");
  if (!host || !shouldRunAura(readEnv())) return;

  const events = ["pointermove", "scroll", "touchstart", "keydown"] as const;
  const start = () => {
    for (const e of events) removeEventListener(e, start);
    import("./hero-aura-scene")
      .then(({ mountAura }) => mountAura(host))
      .catch(() => {
        // The CSS glow underneath stays; the aura is decoration.
      });
  };
  for (const e of events) addEventListener(e, start, { once: true, passive: true });
}
