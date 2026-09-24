// The hero's rotating title (spec §4.5), a port of the old site's: a 4 s CSS fade-and-slide loop
// (Hero.astro), and on each loop the next title. Reduced motion or no JS: the first title, still.
export const nextIndex = (index: number, length: number): number => (index + 1) % length;

export function initTitleRotator(root: ParentNode = document): void {
  const el = root.querySelector<HTMLElement>("[data-title-rotator]");
  if (!el || !matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
  const titles = JSON.parse(el.dataset.titles ?? "[]") as string[];
  if (titles.length < 2) return;
  let index = 0;
  el.addEventListener("animationiteration", () => {
    index = nextIndex(index, titles.length);
    el.textContent = titles[index]!;
  });
}
