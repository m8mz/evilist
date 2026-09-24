// Wires the hero's live parts. Each init checks reduced motion and pointer type itself.
import { initHtop } from "./htop";

export function initHero(): void {
  const hero = document.querySelector<HTMLElement>("[data-hero]");
  if (!hero) return;
  initHtop(hero);
}
