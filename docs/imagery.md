# Imagery

The site's generated stills (spec §8.2). Each is an **illustration**: the alt text says so, and
none of them depicts Marcus's own hardware or any employer's datacenter.

- Model: `nano_banana_pro` (Google Nano Banana Pro, via the Higgsfield MCP), resolution `2k`.
- Three variants per shot; Marcus picks one; the rest are discarded. Higgsfield runs at most 5
  jobs at a time, so submit batches of 5 or fewer.
- The job metadata reports the model as `nano_banana_2` although `nano_banana_pro` was requested.
- Import: `node scripts/import-still.mjs <download> src/images/<name>.webp` (≤ 2400 px WebP).
  `astro:assets` serves AVIF/WebP at 800/1200/1600 via the `Still` component.

## Shared suffix (appended to every prompt)

Photographic, near-monochrome palette of pure black, charcoal and soft grey. Exactly one light
source: a warm burnt-orange glow (#da5c2c) from a single LED strip; no other colour anywhere, no
RGB rainbow lighting, no blue. Shallow depth of field, 35mm lens, f/2, ISO 800 grain, slight
vignette. No text, no logos, no brand marks, no people, no hands, no screens showing content.
Matte surfaces, no lens flare, no bloom, no glow halos.

## Shot 1 — rig (`/now` header), 21:9 → `src/images/rig.webp`

A custom-built gaming PC in a dual-chamber ATX tower with a tempered-glass side panel,
photographed at night on a dark wooden desk. Through the glass: a large three-fan graphics card
mounted horizontally, a tower air cooler, clean black braided cable runs, and a single horizontal
orange LED strip along the bottom edge of the chamber. The tower sits in the right two-thirds of
the frame; the left third is empty dark desk fading to black for text overlay. Camera slightly
below the case's midline, three-quarter angle.

## Shared suffix v2 (rack and terminal, from 2026-09-24 round 2)

Photographic, near-monochrome palette of pure black, charcoal and soft grey. The only colour
anywhere is warm burnt orange (#da5c2c) from the scene's own small lights; no other colour, no
RGB rainbow lighting, no blue or green. Shallow depth of field, 35mm lens, f/2, ISO 800 grain,
slight vignette. No logos, no brand names, no people, no hands. Matte surfaces, no lens flare, no
bloom, no glow halos.

## Shot 2 — rack (`~/built`), 16:9 → `src/images/rack.webp` (round 2, Marcus's direction)

Round 1 (a single half-empty rack) was rejected. Round 2 prompt, followed by suffix v2:

Inside a colocation cage at night: a row of full-height 48U server racks seen from the cold aisle
at a three-quarter angle, the nearest rack in sharp focus and filling the frame from floor to top.
The nearest rack is fully populated from top to bottom: a top-of-rack network switch with a neat
fan of patch cables, a pair of 1U firewalls, a pair of 1U load balancers, a stack of 2U compute
servers with drive bays across their fronts, and a 4U backup storage server with rows of hot-swap
drive trays near the bottom. Black patch cables are dressed through vertical cable managers on
both sides and horizontal managers between the switches. Small orange status LEDs glow across the
front of every device. The racks beyond fall away into darkness. Rack frames matte black, raised
floor tiles dark grey, camera at eye level. No readable text, no labels, no model numbers, no
vendor names anywhere on the equipment.

## Shot 3 — social card background (dropped)

Two rounds (an empty terminal, then a `dnf upgrade` on a monitor) were rejected: Marcus wants the
site itself to feel like a terminal, not a photo of one. The terminal is now drawn in code (the
htop band, spec §6.1a), with the site's own font and tokens, and the social card is rendered from
it. Rejected jobs: `1b902d64`, `7781c95b` (round 1); `3d993304`, `72d3ac6a`, `0cbd7dc4` (round 2).

## Chosen renders

| Shot           | File                   | Higgsfield job ID                      | Generated  |
| -------------- | ---------------------- | -------------------------------------- | ---------- |
| rig            | `src/images/rig.webp`  | `271fa556-626f-4a71-b954-389b972baea7` | 2026-09-24 |
| rack (round 2) | `src/images/rack.webp` | `62c3a55a-ebcf-403e-8304-c59efab498dc` | 2026-09-24 |

Rejected rack jobs: `b318e2a9`, `7a90abbe` (round 1); `1e99d06a`, `ffabe4a7` (round 2). Rig
alternatives: `c4315162`, `0012e60c`. Spend: 26 credits for 13 renders.
