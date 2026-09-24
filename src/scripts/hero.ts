// Wires the hero's live parts. Each init checks reduced motion and pointer type itself.
import { initHtop } from "./htop";
import { initStackNetwork } from "./stack-network";
import { initTitleRotator } from "./title-rotator";
import { initTilt } from "./tilt";

export function initHero(): void {
  const hero = document.querySelector<HTMLElement>("[data-hero]");
  if (!hero) return;
  initHtop(hero);
  initTitleRotator(hero);
  initTilt(hero);
  initStackNetwork(hero);
}
