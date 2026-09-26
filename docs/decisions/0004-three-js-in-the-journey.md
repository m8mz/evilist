# 0004 — Three.js, lighting, bloom, glow and smoke inside the journey

- **Status:** Accepted
- **Date:** 2026-09-25
- **Decider:** Marcus Hancock-Gaillard
- **Amends:** [0002](0002-axiom-design-system.md) (Motion, Elevation, Imagery, Budgets) and
  [0003](0003-colour-exceptions.md) (Journey art)

## Context

The journey is the site's main attraction. Marcus chose a deck of seven player cards rendered in
WebGL (`docs/superpowers/specs/2026-09-25-journey-card-deck-design.md`): lit card meshes that
rack, flip and float, with violet smoke that leaves the S+ card. ADR 0002 bans shadows, gradients,
blur, glow and Three.js, and ADR 0003 confines violet to the journey art. The deck needs exceptions
to all of them, in one place.

## Decisions

| Area            | Decision                                                                                                                                                                                                         |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Three.js        | Allowed only for the journey deck. It lives in lazy chunks (`deck-stage`, later `deck-bloom`) that never enter a page's initial graph; the chunk may prefetch after the first scroll. `pnpm size` enforces both. |
| Lighting        | WebGL lighting, an environment reflection and (high tier only) selective bloom are allowed on the deck's meshes. Painted colours stay exact through the emissive recipe with no tone mapping.                    |
| Glow            | Allowed on the S and S+ cards only, as light, bloom and additive sprites. Never CSS `box-shadow`, `filter` or `text-shadow` anywhere on the site.                                                                |
| Smoke, fog      | Violet smoke and fog are allowed from the S and S+ cards only, and may cross the deck column inside the journey section.                                                                                         |
| Violet          | 0003's rule stands, extended: violet also appears in the S RankChip's border on the card, the S and S+ back seams, the eyes' glow mask and the energy, all inside the deck.                                      |
| Section         | The journey section's tone is `void`, so the violet reads on true black.                                                                                                                                         |
| Motion          | 0002's "animate only transform and opacity" governs the DOM; the deck's canvas renders whatever its shaders draw.                                                                                                |
| Everything else | UI outside the section keeps ADR 0002 exactly. `test/tokens.test.ts` and `test/deckPalette.test.ts` hold the line.                                                                                               |

## Consequences

- `three` and `@types/three` are pinned dependencies. The deck's lazy JS has a 170 KB gz budget
  and bloom (Plan 3) a 40 KB one.
- Devices without WebGL2, under reduced motion or save-data, or with two cores or 2 GB get the
  timeline; the deck never mounts there.
- The vector scene, its art pipeline and `scene.svg` are retired in Phase 6 of the deck plan.
