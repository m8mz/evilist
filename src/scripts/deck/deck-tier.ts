// Which deck a device gets (deck spec §8, "Tiers"): none (the timeline), mid (no bloom, a lower
// pixel ratio, half the smoke) or high. Decided once at script start from readings that cost
// nothing; a missing reading never disqualifies a device.
import { DECK_PARAMS, type DeckParams } from "./deck-params";

export type Tier = "none" | "mid" | "high";

export interface TierEnv {
  reducedMotion: boolean;
  saveData: boolean;
  webgl2: boolean;
  cores: number | undefined;
  memory: number | undefined;
  coarsePointer: boolean;
}

export function detectTier(env: TierEnv): Tier {
  if (env.reducedMotion || env.saveData || !env.webgl2) return "none";
  if ((env.cores ?? 8) <= 2 || (env.memory ?? 8) <= 2) return "none";
  if (env.coarsePointer || (env.cores ?? 8) <= 4 || (env.memory ?? 8) <= 4) return "mid";
  return "high";
}

export function pixelRatioCap(tier: Tier, params: DeckParams = DECK_PARAMS): number {
  if (tier === "high") return params.tiers.dprHigh;
  if (tier === "mid") return params.tiers.dprMid;
  return 1;
}

interface NavigatorReadings extends Navigator {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

/** Reads the tier inputs from the browser. A probe canvas answers the WebGL2 question. */
export function readTierEnv(win: Window = window): TierEnv {
  const nav = win.navigator as NavigatorReadings;
  let webgl2 = false;
  try {
    const probe = win.document.createElement("canvas");
    webgl2 = probe.getContext("webgl2", { failIfMajorPerformanceCaveat: false }) != null;
  } catch {
    webgl2 = false;
  }
  return {
    reducedMotion: win.matchMedia("(prefers-reduced-motion: reduce)").matches,
    saveData: nav.connection?.saveData === true,
    webgl2,
    cores: typeof nav.hardwareConcurrency === "number" ? nav.hardwareConcurrency : undefined,
    memory: typeof nav.deviceMemory === "number" ? nav.deviceMemory : undefined,
    coarsePointer: win.matchMedia("(pointer: coarse)").matches,
  };
}
