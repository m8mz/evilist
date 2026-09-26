// The deck's portrait sources, whichever exist yet: src/images/deck/<stage-id>.webp and its
// -glow mask (deck spec §10, imported by scripts/import-portrait.mjs). A missing file simply
// returns undefined: the stage paints its placeholder and the timeline keeps the old still.
import type { ImageMetadata } from "astro";

const files = import.meta.glob<ImageMetadata>("../images/deck/*.webp", {
  eager: true,
  import: "default",
});

export const deckPortrait = (id: string): ImageMetadata | undefined =>
  files[`../images/deck/${id}.webp`];

export const deckGlow = (id: string): ImageMetadata | undefined =>
  files[`../images/deck/${id}-glow.webp`];
