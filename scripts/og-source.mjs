// Everything the social card is rendered from. If one changes, public/og-default.png is stale:
// test/ogCard.test.ts fails until `pnpm build:og` rebuilds it.
import { fingerprint } from "./fingerprint.mjs";

export const OG_SOURCES = [
  "src/pages/og-card.astro",
  "src/components/home/Htop.astro",
  "src/components/ui/Prompt.astro",
  "src/components/ui/TerminalFrame.astro",
  "src/data/htop.ts",
  "src/data/site.ts",
  "src/scripts/htop.ts",
  "src/styles/tokens.css",
  "src/styles/global.css",
];
export const OG_PATH = "public/og-default.png";
export const OG_FINGERPRINT_PATH = "scripts/og-card.source-sha256";
export const ogFingerprint = (root = ".") => fingerprint(OG_SOURCES, root);
