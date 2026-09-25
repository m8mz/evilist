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

Served full bleed by `src/components/home/ParallaxBand.astro`, the band after `~/built` (hero v2
Phase 2; it was a `Still` inside Work before). Renditions: AVIF/WebP at 800/1200/1600/2000 px,
quality 60, each under 100 KB.

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

## Journey (hero and journey redesign, spec §7)

Anime illustration, not photography: the monochrome suffixes above do not apply. Violet lives only
inside this art (ADR 0003). The character is original: never a likeness of Marcus or of any
existing character.

### Step 1 — character sheet (2026-09-24)

Three concepts, `nano_banana_pro`, 2k, 16:9, one batch. The job metadata reports
`nano_banana_2`, as for the stills above. Spend: 6 credits (2,984 → 2,978).

**Chosen: concept A**, job `191aca87-8cd1-4f98-96b6-ed73c931e243`. It is the reference image for
every stage still. Its prompt:

> Three-panel character sheet on one wide canvas: left panel a full-body front view of the
> character standing upright with arms relaxed at his sides, head to toe with both feet visible;
> centre panel a full-body three-quarter view of the same character standing; right panel a tight
> chest-up close-up portrait of the same character. Identical original male character in all three
> panels, exactly one figure per panel, plain flat charcoal grey seamless background, professional
> anime model-sheet presentation. A young adult man in his mid-twenties with a mature adult face:
> defined jawline, high cheekbones, straight nose, thin calm mouth, calm composed expression, a
> dark and mysterious presence. Narrow sharp cool steel-grey eyes with small crisp highlights and
> no glow, straight dark brows. Messy medium-length jet-black hair with loose strands falling
> across the forehead and just over the eyes, shorter tapered sides, matte finish with a faint
> blue-black sheen. Tall, lean athletic build like a sprinter or climber: broad shoulders, narrow
> waist, defined but not bulky muscles, natural anatomy. Wearing a long black high-collar coat
> reaching mid-calf, worn open, with thin burnt-orange (#da5c2c) piping only at the cuffs, a fitted
> black technical long-sleeve shirt, dark charcoal tapered trousers, a slim black belt, black
> leather combat boots, no jewelry. Faint deep-violet shadow energy curls like smoke from his right
> hand; violet and the small burnt-orange accents are the only saturated colours. Modern shonen TV
> anime key-visual style: crisp clean lineart, cel shading with hard-edged shadow shapes and subtle
> soft gradients in the shadows, dark desaturated palette of black, charcoal and cool grey, a
> dramatic cool rim light from behind and an even soft front fill so the design reads clearly.
> High-quality anime key visual, sharp, 4K. No text, no watermark, no logos, no frame borders, no
> panel labels, no other characters, no duplicate figures, no props, no weapons, no red eyes, no
> glowing eyes, no fangs, no sharp teeth, no face markings, no tattoos, no scars, no blindfold, no
> eyepatch, no blood, no babyface. An original character who does not resemble any existing anime
> or manga character or any real person.

Alternatives (same prompt with the hair, outfit and energy swapped):

- B, `12574efd-0600-4a05-82a8-392bee3f393f`: swept-back hair, cropped high-collar tech jacket
  with an ember zip stripe, cargo trousers, high-tops, a silver ear cuff; violet smoke at the feet.
- C, `c6e0c748-6d17-4edf-a2b7-90b125560a09`: shaggy layered hair; asked for a coat draped like a
  cape over a sleeveless turtleneck, rendered as a long sleeved coat with fingerless gloves and
  ember stitching; violet on both forearms. Close to A.
