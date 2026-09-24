# 0002 — Axiom design system

- **Status:** Accepted
- **Date:** 2026-09-24
- **Decider:** Marcus Hancock-Gaillard
- **Supersedes:** the "Design" and "Animation" rows of [0001](0001-domain-and-hosting.md)

## Context

The rebuilt site shipped a manga/hanko look: a crimson accent, diagonal section cuts, speed lines, a hanko seal and a Three.js aura behind the hero. It read as an anime title card. The audience is employers first and clients second, and Marcus wanted the site to feel like the world he works in: a terminal at midnight. The reference is the Axiom style (styles.refero.design), with Devin as a secondary reference.

## Decisions

| Area          | Decision                                                                                                                                                                                                                                                                                           |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Surfaces      | Void `#000` → carbon `#111` → graphite `#191919` → iron `#202020` (borders). Elevation comes only from stepping surfaces: no shadows, gradients, blur or glow.                                                                                                                                     |
| Accent        | One accent, ember `#da5c2c`, in a closed list of places (primary fills, the prompt cursor, the case-panel border, log bars and LEDs, the htop selected row and hot cores, link hover, focus, selection, the S rank chip). Never for status or errors.                                              |
| Accessibility | Filled ember controls carry **void** text (5.55:1), not paper (3.3:1): a deliberate deviation from Axiom. Ash is lifted from `#7e7e7e` to `#848484` so labels pass on graphite. Every text colour is tested at 4.5:1 on every surface text sits on.                                                |
| Type          | JetBrains Mono for everything, self-hosted through the Fonts API (Fontsource). Headings are weight 400; hierarchy comes from size.                                                                                                                                                                 |
| Shape         | 2px radius everywhere; 9999px only on tiny dots. Sections open with a `~/path` prompt and are separated by 1px iron rules.                                                                                                                                                                         |
| Motion        | Only `transform`, `opacity` and `pathLength` animate, every animation respects reduced motion, and buttons change colour instantly on hover.                                                                                                                                                       |
| Three.js      | **Removed.** The system forbids glow, which was the aura's whole effect, and dropping it removed about 170 KB of lazy JS and the `three` dependency. This reverses rebuild-plan Phase 5.                                                                                                           |
| Imagery       | SVG drawn in code for anything diagrammatic or animated (topology, journey scene, htop band). Higgsfield stills only where the spec places them (the rig, the rack), labelled "Illustration:", with no logos, text, people or vendor marks. Prompts and job IDs are recorded in `docs/imagery.md`. |
| Errors        | Form errors are paper text with an ash `error:` prefix and a paper field border, in the site's `key: value` voice, because ember never marks status.                                                                                                                                               |

## Consequences

- The retired manga token names are deleted, and `test/migration.test.ts` keeps them out.
- Visual baselines are macOS renders and are regenerated once per design phase.
- The social card and the resume PDF are committed build artefacts with source fingerprints. Editing what they are rendered from fails a test until `pnpm build:og` / `pnpm build:pdf` rebuilds them.
- Crimson is gone from the live site: the favicon is black and white, and the social card is the htop band with ember accents.
