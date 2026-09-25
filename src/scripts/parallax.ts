// The rack band's parallax (spec §5). Motion's scroll() reports how far the band has travelled
// through the viewport, 0 as its top enters at the bottom and 1 as its bottom leaves at the top,
// and the band's CSS turns --parallax into a transform. Under reduced motion it never starts, so
// --parallax keeps its 0.5 default and the image stays centred and still.
import { scroll } from "motion";

export function initParallax(): void {
  if (!matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
  for (const band of document.querySelectorAll<HTMLElement>("[data-parallax]")) {
    // CSSOM writes are allowed under the CSP (only inline style attributes are blocked). The
    // listener lives as long as the page: stopping it on pagehide would leave the band frozen
    // after a back/forward-cache restore.
    scroll((progress: number) => band.style.setProperty("--parallax", progress.toFixed(4)), {
      target: band,
      offset: ["start end", "end start"],
    });
  }
}
