// Dev-only tuning panel (deck spec §9): sliders bound to DECK_PARAMS, a live FPS/VRAM readout, and
// a "copy JSON" button. Loads only under `astro dev` with `?tune`. Styles go through the CSSOM,
// never `setAttribute("style", …)`; colours route through the tokens (`deckPalette.test.ts` scans).
import { COLORS, deckFontFamily } from "./deck-paint";
import { DECK_PARAMS } from "./deck-params";

type Row = [label: string, path: string, min: number, max: number, step: number];

export const ROWS: Row[] = [
  ["transition (ms)", "drive.durationMs", 300, 2000, 50],
  ["hysteresis", "drive.hysteresis", 0, 0.45, 0.01],
  ["overshoot", "pull.overshoot", 0, 3, 0.05],
  ["lift z (px)", "pull.liftZ", 0, 200, 2],
  ["lift peak", "pull.liftPeak", 0, 4, 0.1],
  ["rack rotY (°)", "pull.rackRotY", 80, 130, 1],
  ["tilt max X (°)", "tilt.maxX", 0, 20, 0.5],
  ["tilt max Y (°)", "tilt.maxY", 0, 20, 0.5],
  ["tilt τ (ms)", "tilt.tau", 0, 400, 5],
  ["float y (px)", "float.y.amp", 0, 12, 0.5],
  ["float rotY (°)", "float.rotY.amp", 0, 4, 0.1],
  ["hover z (px)", "hover.z", 0, 20, 1],
  ["intro deal (ms)", "intro.dealMs", 100, 1200, 10],
  ["intro stagger (ms)", "intro.staggerMs", 0, 200, 5],
  ["intro pull (ms)", "intro.pullMs", 200, 2000, 10],
  ["print step (ms)", "print.stepMs", 20, 300, 5],
  ["camera fov (°)", "camera.fov", 15, 45, 0.5],
  ["camera parallax", "camera.parallax", 0, 0.5, 0.01],
  ["card height ratio", "layout.cardHRatio", 0.4, 0.8, 0.01],
  ["slot gap", "layout.slotGap", 0.08, 0.25, 0.005],
  ["rack gap", "layout.gap", 0.1, 0.6, 0.01],
  ["energy S", "energy.s", 0, 1, 0.01],
  ["energy S+ base", "energy.sPlusBase", 0, 1, 0.01],
  ["energy S+ ramp", "energy.sPlusRamp", 0, 1, 0.01],
  ["flare ms", "light.flareMs", 100, 1200, 10],
  ["smoke rate S", "smoke.rateS", 0, 2, 0.05],
  ["smoke rate S+ base", "smoke.rateSPlusBase", 0, 4, 0.05],
  ["smoke rate S+ ramp", "smoke.rateSPlusRamp", 0, 10, 0.1],
  ["smoke opacity max", "smoke.opacityMax", 0, 0.6, 0.01],
  ["smoke side speed", "smoke.sideSpeed", 0, 4, 0.1],
  ["fog strength S+", "fog.strengthSPlus", 0, 1, 0.01],
  ["fog radius S+ ramp", "fog.radiusSPlusRamp", 0, 6, 0.1],
  ["glow gain", "glow.gain", 0, 3, 0.05],
  ["aura S", "aura.s", 0, 1, 0.01],
  ["aura S+ base", "aura.sPlusBase", 0, 1, 0.01],
  ["aura S+ ramp", "aura.sPlusRamp", 0, 1, 0.01],
  ["aura fade from", "aura.fadeFrom", 0.3, 0.88, 0.01],
  ["aura fade to", "aura.fadeTo", 0.74, 1, 0.01],
  ["seam S+ max", "seam.sPlusMax", 0, 1, 0.01],
  ["bloom strength", "bloom.strength", 0, 3, 0.05],
  ["bloom radius", "bloom.radius", 0, 1.5, 0.01],
  ["bloom threshold", "bloom.threshold", 0, 1, 0.01],
  ["aura τ (ms)", "aura.tauMs", 0, 600, 10],
  ["light ambient", "light.ambient", 0, 1, 0.01],
  ["light key", "light.key", 0, 5, 0.05],
  ["light rim", "light.rim", 0, 3, 0.05],
  ["fog strength S", "fog.strengthS", 0, 0.5, 0.01],
  ["fog radius S", "fog.radiusS", 0, 4, 0.05],
  ["fog radius S+ base", "fog.radiusSPlusBase", 0, 4, 0.05],
  ["smoke opacity min", "smoke.opacityMin", 0, 0.5, 0.01],
  ["smoke burst S", "smoke.burstS", 0, 60, 1],
  ["smoke burst S+", "smoke.burstSPlus", 0, 120, 1],
  ["orientation gain", "gestures.orientationGain", 0, 2, 0.05],
  ["seam S max", "seam.sMax", 0, 1, 0.01],
  ["clearcoat", "material.clearcoat", 0, 1, 0.05], // next material refresh
  ["env intensity", "material.envMapIntensity", 0, 2, 0.05], // next material refresh
  ["card max height", "layout.cardHMax", 320, 800, 10],
  ["energy pulling", "energy.pulling", 0, 0.5, 0.01],
];

function read(path: string): number {
  return path
    .split(".")
    .reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], DECK_PARAMS) as number;
}

function write(path: string, value: number): void {
  const keys = path.split(".");
  const last = keys.pop() ?? "";
  const target = keys.reduce<Record<string, unknown>>(
    (o, k) => o[k] as Record<string, unknown>,
    DECK_PARAMS as unknown as Record<string, unknown>,
  );
  target[last] = value;
}

export function mountTunePanel(track: HTMLElement): void {
  const panel = document.createElement("div");
  panel.style.cssText = `position:fixed;top:72px;right:12px;z-index:9999;width:280px;max-height:80vh;overflow:auto;background:${COLORS.carbon};border:1px solid ${COLORS.slate};border-radius:2px;padding:10px;color:${COLORS.paper};font:11px/1.5 "${deckFontFamily()}",monospace`;
  const head = document.createElement("div");
  head.style.cssText = `display:flex;justify-content:space-between;margin-bottom:6px;color:${COLORS.ash}`;
  const stats = document.createElement("span");
  const copy = document.createElement("button");
  copy.textContent = "copy JSON";
  copy.style.cssText = `font:inherit;background:${COLORS.graphite};color:${COLORS.paper};border:1px solid ${COLORS.slate};border-radius:2px;padding:0 6px;cursor:pointer`;
  copy.addEventListener("click", () => {
    void navigator.clipboard.writeText(JSON.stringify(DECK_PARAMS, null, 2));
  });
  head.append(stats, copy);
  panel.append(head);

  for (const [label, path, min, max, step] of ROWS) {
    const row = document.createElement("label");
    row.style.cssText =
      "display:grid;grid-template-columns:1fr 90px 44px;gap:6px;align-items:center;margin:2px 0";
    const name = document.createElement("span");
    name.textContent = label;
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(read(path));
    const value = document.createElement("span");
    value.textContent = String(read(path));
    input.addEventListener("input", () => {
      write(path, Number(input.value));
      value.textContent = input.value;
      // The fov and the layout are read at relayout, not per frame; the aura fade rows need no
      // event (deck-effects.ts re-bakes its masks when it sees the values change).
      if (path.startsWith("camera.") || path.startsWith("layout."))
        track.querySelector(".journey__stage")?.dispatchEvent(new Event("deck:relayout"));
    });
    row.append(name, input, value);
    panel.append(row);
  }
  document.body.append(panel);

  let frames = 0;
  let last = performance.now();
  const tick = (now: number) => {
    frames++;
    if (now - last >= 1000) {
      stats.textContent = `${frames} fps · ${track.dataset.deckVram ?? "?"} MB · ${track.dataset.deckRank ?? ""} ${track.dataset.deckPhase ?? ""}`;
      frames = 0;
      last = now;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
