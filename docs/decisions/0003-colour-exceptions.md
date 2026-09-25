# 0003 — Two colour exceptions: the logo and the journey art

- **Status:** Accepted
- **Date:** 2026-09-24
- **Decider:** Marcus Hancock-Gaillard
- **Amends:** [0002](0002-axiom-design-system.md) (Accent, Imagery)

## Context

ADR 0002 gives the site one accent, ember, in a closed list of places, and keeps imagery
near-monochrome. Two of Marcus's requests for the hero and journey redesign
(`docs/superpowers/specs/2026-09-24-hero-journey-redesign-design.md`) need colour outside that:
his own logo, which is yellow, and a journey character with the colour and power of Jujutsu Kaisen
and Solo Leveling.

## Decisions

| Area        | Decision                                                                                                                                                                                                                                           |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Logo        | `src/images/evil_logo.webp` appears in the header in its original yellow. Yellow exists only inside that image: never a token, a CSS colour or a second accent.                                                                                    |
| Journey art | The journey's art (Higgsfield flat-vector renders traced into one SVG scene, and the timeline composites rendered from it) is anime illustration, with violet shadow energy that grows with rank. Violet exists only inside that art, never in UI. |
| Ember       | Its list gains the hero network's lit nodes, edges and echoes, and loses the topology pulse (removed in Phase 2) and the journey SVG scene (removed in Phase 3).                                                                                   |
| Tokens      | Unchanged. `test/tokens.test.ts` and `test/migration.test.ts` stay as they are.                                                                                                                                                                    |

## Consequences

- The UI's colour rules are unchanged: every control, border and status still follows ADR 0002.
- `docs/imagery.md` records the journey's prompts under their own style suffix. The monochrome
  photographic suffixes still govern the rig and rack stills.
