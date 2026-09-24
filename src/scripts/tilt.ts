// Portrait tilt (spec §4.6): the cursor anywhere in the hero tilts the framed portrait up to ±3.5°,
// measured from the portrait's centre, on a spring (evilist.co's values and direction). Fine
// pointers only, never under reduced motion. Transform only, written through the CSSOM (CSP-safe).
import { springValue } from "motion";

export const MAX_TILT = 3.5;

export interface Tilt {
  rotateX: number;
  rotateY: number;
}

const half = (v: number) => Math.min(0.5, Math.max(-0.5, v));

/** Tilt for a pointer at (px, py), from the portrait's centre (cx, cy), over a width × height hero. */
export function tiltFor(
  px: number,
  py: number,
  cx: number,
  cy: number,
  width: number,
  height: number,
): Tilt {
  const x = half((px - cx) / width);
  const y = half((py - cy) / height);
  // `+ 0` turns -0 into 0.
  return { rotateX: -2 * MAX_TILT * y + 0, rotateY: -2 * MAX_TILT * x + 0 };
}

export function initTilt(hero: HTMLElement): void {
  const target = hero.querySelector<HTMLElement>("[data-tilt]");
  if (!target) return;
  if (
    !matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)")
      .matches
  )
    return;

  const spring = { stiffness: 120, damping: 14 };
  const rotateX = springValue<number>(0, spring);
  const rotateY = springValue<number>(0, spring);
  const render = () => {
    target.style.transform = `rotateX(${rotateX.get().toFixed(2)}deg) rotateY(${rotateY.get().toFixed(2)}deg)`;
  };
  rotateX.on("change", render);
  rotateY.on("change", render);

  hero.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch") return;
    // Measured on every move, so a resize or a scroll never leaves stale geometry.
    const area = hero.getBoundingClientRect();
    const box = target.getBoundingClientRect();
    const t = tiltFor(
      event.clientX,
      event.clientY,
      box.left + box.width / 2,
      box.top + box.height / 2,
      area.width,
      area.height,
    );
    rotateX.set(t.rotateX);
    rotateY.set(t.rotateY);
  });
  hero.addEventListener("pointerleave", () => {
    rotateX.set(0);
    rotateY.set(0);
  });
}
