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

### Step 2 — stage stills (2026-09-25)

`nano_banana_pro`, 2k (2752×1536), 16:9, concept A (`191aca87…`) as the only `image_references`
input. Two variants per stage, batches of at most 5. Spend: 34 credits (2,978 → 2,944): 14
stills plus 3 targeted re-rolls.

**Picks (Marcus, 2026-09-25, on the recommendations)**, imported with `scripts/import-still.mjs` to
`src/images/journey/<stage-id>.webp` (2400×1340 WebP):

| Rank | Stage id                | Job                                    | Why this one                                     |
| ---- | ----------------------- | -------------------------------------- | ------------------------------------------------ |
| E    | `t1-support`            | `0cabdca9-1529-4507-bde8-5277aa303a4a` | centred; the other sat where the desktop card is |
| D    | `web-concierge`         | `60662bec-678b-4183-aadb-12f154eb48c7` | clean wireframe, clear of the card               |
| C    | `professional-services` | `de7af12e-3695-4958-8ba3-0148eaa4cdeb` | centred, a little more violet                    |
| B    | `t3-support`            | `831e47ab-1c71-4b64-918a-c7a810aa3bd2` | centred against the alert wall                   |
| A    | `sysadmin`              | `8b9881c7-b881-4293-a624-634af954bbe2` | on brief (no S+ cuff piping)                     |
| S    | `linux-engineer`        | `a8cdd5d6-f59d-4c51-9de1-a945e5a0032c` | centred, the long coat closed                    |
| S+   | `systems-architect`     | `0fd768ff-6c8f-4582-a2b2-c7f02b3db58f` | the towering violet shadow racks                 |

Every prompt is the character block, then the stage's scene, then the style suffix.

**Character block:**

> The same original anime character as in the reference image: keep his face, hair, eye colour
> and build exactly. A young adult man in his mid-twenties with a mature face, defined jawline,
> high cheekbones and a calm composed expression; narrow sharp cool steel-grey eyes with small
> crisp highlights and no glow; messy medium-length jet-black hair with loose strands over the
> forehead and shorter tapered sides; tall, lean athletic build, broad shoulders, narrow waist,
> defined but not bulky.

**Style suffix:**

> Style: modern shonen TV anime key visual, crisp clean lineart, cel shading with hard-edged
> shadow shapes, a dramatic cool rim light, dark desaturated palette of black, charcoal and cool
> grey; the only saturated colours are warm burnt orange (#da5c2c) from the scene's own small
> lights and, where described, deep violet shadow energy. Wide 16:9 cinematic frame with the
> character in the horizontal centre, his head and upper body inside the middle third of the
> frame and his head well below the top edge; the left third of the frame is darker and quieter.
> A calm, held pose that could loop, no motion blur, no action lines. High-quality anime key
> visual, sharp. No text, no readable screen content, no logos, no watermark, no frame borders,
> no other people, no red eyes, no glowing eyes, no fangs, no sharp teeth, no face markings, no
> tattoos, no scars, no blindfold, no weapons. An original character who does not resemble any
> existing anime or manga character or any real person.

**Scenes** (the outfit and the violet energy rank up with him, spec §7.2):

- **E** (`headset`): a night shift on a support desk; seated in a dim open-plan office, black
  hoodie, headset with boom mic, two monitors glowing burnt orange with only abstract blocks; no
  violet.
- **D** (`wordpress`): at a standing desk with a laptop, hoodie sleeves pushed up, headset round
  his neck, arranging a floating website wireframe (grey blocks, no letters, burnt-orange edges);
  no violet.
- **C** (`migration`): on a path of light between two server towers, holding a glowing burnt-orange
  data cube; black zip jacket; the first faint violet wisps from his fingers.
- **B** (`escalation`): standing firm before a wall of burnt-orange alert lights; black
  high-collar zip jacket; shadows rising round his feet, edged faint violet.
- **A** (`rack`): in the cold aisle, one hand on an open rack; short black high-collar coat; violet
  smoke round his feet and legs.
- **S** (`pipeline`): conducting a pipeline of floating modules while violet shadow hands assemble
  them; long black high-collar coat, closed, no piping.
- **S+** (`datacenter`): between two datacenter halls in the reference outfit (coat open, ember
  piping at the cuffs); a violet shadow army of server racks towers behind him.

| Stage | Variant 1                              | Variant 2                                        |
| ----- | -------------------------------------- | ------------------------------------------------ |
| E     | `c8b9f977-83d8-4a88-a37a-7b2483ab04cf` | `0cabdca9-1529-4507-bde8-5277aa303a4a` (re-roll) |
| D     | `60662bec-678b-4183-aadb-12f154eb48c7` | `60447c01-27be-4482-a66e-efef092049e7` (re-roll) |
| C     | `19a44c14-e247-40b4-a562-0efd8f8b8ecf` | `de7af12e-3695-4958-8ba3-0148eaa4cdeb`           |
| B     | `b1d5550b-5831-4bd6-b763-6fd2fd068791` | `831e47ab-1c71-4b64-918a-c7a810aa3bd2`           |
| A     | `8b9881c7-b881-4293-a624-634af954bbe2` | `18cf970b-cc96-4c7e-ad9f-e16f598d8faa`           |
| S     | `a5071042-5cb6-4aa0-9756-091d6bc62717` | `a8cdd5d6-f59d-4c51-9de1-a945e5a0032c`           |
| S+    | `0fd768ff-6c8f-4582-a2b2-c7f02b3db58f` | `e9c127c0-eee3-454c-bc3a-1cffad44147d` (re-roll) |

Rejected, then re-rolled with an extra negative:

- E `f7cc5179…`: two copies of the character. Re-roll added "exactly one person … no duplicate
  figures, no reflections of him".
- D `643cda36…`: a fruit logo on the laptop lid. Re-roll asked for "a plain unbranded matte-black
  laptop (no logo on its lid)" and "no logos or brand marks on any device".
- S+ `f42c70ee…`: the shadow army came out as human silhouettes. Re-roll described "giant server
  racks made of translucent deep-violet shadow smoke … machines, not people: no human figures, no
  silhouettes".

### Step 3 — clips (2026-09-25)

`seedance_2_0`, 5 s, 1080p, 16:9, `generate_audio: false`, the picked still as both `start_image`
and `end_image` so the loop closes. 45 credits each. Encoded with `scripts/encode-clip.mjs` to
`public/journey/<stage-id>-{1280,640}.{webm,mp4}`.

**Pilot (S+, `2c887ba7-f5d4-4a8f-8759-618bf1a7d777`):** the loop closed and the encodes fit, but
the "very slight push in" came out as a ~1.3× zoom mid-loop, a pulse behind the card. Marcus chose
to re-roll all seven with the camera locked (315 credits); the pilot is not used.

Every prompt is the motion line, then the rank's own motion:

> Subtle, seamless looping motion only; the shot starts and ends on exactly the given frame. The
> camera stays completely locked off: no zoom, no push, no pan, no tilt, no camera movement at
> all. He holds his pose: his hair and clothes stir slightly as if in a gentle draft, he breathes,
> and the small burnt-orange lights blink softly. No cuts, no large movements, no new objects or
> people, no text, no change of lighting or colour, no audio.

| Rank | Stage id                | Rank's motion                                                       | Job                                    |
| ---- | ----------------------- | ------------------------------------------------------------------- | -------------------------------------- |
| E    | `t1-support`            | the monitors' orange glow flickers faintly across his face          | `923f9c62-f568-40eb-b097-b10f2b08adee` |
| D    | `web-concierge`         | the wireframe panels drift a few pixels and settle back             | `5ef30c71-adb3-4291-b479-d78fc1c04bfc` |
| C    | `professional-services` | the data cube pulses gently; the violet wisps curl from his fingers | `8f20f16d-b85b-4ff0-a4f5-2549cbc29caf` |
| B    | `t3-support`            | the alert lights blink in slow waves; the shadows roll like smoke   | `54c88741-8d1d-4769-ac51-428d877f45b8` |
| A    | `sysadmin`              | the violet smoke curls round his legs; the rack's LEDs blink        | `dd4d9d18-1874-44d7-b3a4-9abe78e75cb5` |
| S    | `linux-engineer`        | the modules drift along the pipeline; the shadow hands turn them    | `1682f2df-9dd2-4c4a-a8b3-779f4e0b7077` |
| S+   | `systems-architect`     | his coat stirs; the violet shadow racks waver like smoke            | `4d981057-ba00-43e5-a560-7a0f4ffc5524` |

The first submission of B returned a Higgsfield preset recommendation ("IN THE DARK") instead of a
job; it was resubmitted with the preset declined.

All seven held the locked camera: the motion is hair, cloth, smoke, the cube, the panels and the
lights; the first and last frames match, so each loop closes. Every encode fit at the first CRF
(AV1 34, H.264 24). Sizes in KB (1280 WebM / 1280 MP4 / 640 WebM / 640 MP4):

| Rank | Stage id                | Encodes (KB)          |
| ---- | ----------------------- | --------------------- |
| E    | `t1-support`            | 173 / 219 / 67 / 71   |
| D    | `web-concierge`         | 172 / 272 / 70 / 98   |
| C    | `professional-services` | 227 / 229 / 87 / 75   |
| B    | `t3-support`            | 394 / 618 / 169 / 230 |
| A    | `sysadmin`              | 324 / 398 / 105 / 122 |
| S    | `linux-engineer`        | 314 / 385 / 119 / 141 |
| S+   | `systems-architect`     | 397 / 601 / 174 / 254 |

Spend: 360 credits (2,944 → 2,584): the pilot (45) and the seven locked-camera clips (315).

## Vector journey (2026-09-25)

The clips above are replaced by one traced-and-rigged SVG scene (spec
`docs/superpowers/specs/2026-09-25-vector-journey-design.md`). Every render below is flat vector
art on an off-white canvas, imported with `scripts/import-art.mjs` (outfits through
`scripts/register-outfit.mjs`) into `art/journey/`, and traced by `scripts/build-scene.mjs` with the
palette in `scripts/trace-vector.mjs`. `nano_banana_pro`, 2k (the job metadata reports
`nano_banana_2`).

### Style suffix (appended to every prompt below)

> Flat vector style: solid flat fills only, a limited palette (near-black #0e0e12, charcoal #1e1e24,
> dark grey #303038, grey #484852, mid grey #6e6e78, skin #e0c4b0 with one hard-edged shadow tone
> #b49684, steel-grey eyes #96a0aa, burnt orange #da5c2c and deep violet #7040d2 only where named),
> crisp hard edges, bold simple shapes, minimal detail, hard-edged cel shadows, no outlines inside
> the silhouette except where shapes overlap. No gradients, no textures, no glow, no soft shading,
> no noise. Plain flat off-white #f4f4f0 background and nothing else. No text, no logos, no
> watermark, no frame, no red eyes, no fangs, no face markings. An original character who does not
> resemble any existing anime or manga character or any real person.

### Step 1 — base pose (2026-09-25)

2:3, concept A (`191aca87…`) as the reference. Two variants, 4 credits (2,584 → 2,580).

> The same original character as in the reference image (same face, messy medium-length jet-black
> hair falling over the forehead, calm narrow steel-grey eyes, lean athletic build), drawn as a
> geometric flat vector character for a scroll animation, wearing his base layer only: a fitted
> black long-sleeve technical shirt, dark charcoal tapered trousers, a slim black belt and black
> combat boots, with no coat, no headset, no energy and no props. Full body, front view, standing
> in a neutral A-pose: both arms straight and held slightly away from the body, hands open and
> relaxed, feet shoulder-width apart, so that the head, the torso, each arm and the legs read as
> separate shapes. Head to toe in frame, centred, with even empty space above the head and below
> the feet. Calm composed expression. [suffix]

| Variant | Job                                    | Notes                                                                 |
| ------- | -------------------------------------- | --------------------------------------------------------------------- |
| A       | `06480b30-4272-4965-a458-e35b7477b3b5` | arms slightly out; clean base layer, no stray accents                 |
| B       | `fdeda42a-5ad3-4957-bb8a-707f21f4b2ee` | "about twenty degrees" arms; added orange belt loops and violet boots |

**Picked: A** (Marcus, 2026-09-25) → `art/journey/base.webp` (1000×1500). Measured anchors: crown
56, feet 1457, centre 499; the rig's part polygons and pivots in `src/data/avatar-rig.json` were tuned
against it with `scripts/preview-rig.mjs`. The first trace mottled the trousers (their dark tone sat
midway between two palette greys), so the palette's greys were moved onto the render's own tones
(ink `#0c0c10`, coat `#141418`, shadow `#26262e`, cloth `#383840`, skin `#e0c0ac`): eight clean layers,
24 KB gzipped for the whole figure.

### Step 2 — outfits (2026-09-25)

2:3, the picked base (`ae0bd678…`, uploaded from variant A) as the reference. Two variants per
rank, batches of 5 / 5 / 4, 28 credits (2,580 → 2,552). Every render registered onto the base with
`scripts/register-outfit.mjs` at a residual of 0.03–0.05% (the gate is 2%).

> The same character in exactly the same pose, framing, proportions and position on the canvas as
> the reference image (a flat vector A-pose figure on an off-white background): keep the head, face,
> hair, hands, legs and boots identical and in the same place. Change only the clothing to:
> [outfit]. [suffix]

| Rank | Stage id                | Outfit                                                                             | Variants (job)                                                                       |
| ---- | ----------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| E    | `t1-support`            | plain black hoodie, hood down, black over-ear headset on his head                  | 00 `f07876a1-7a5e-46b9-948d-802b5399126b`, 01 `b8f89d05-b081-49b4-a722-e96545c73509` |
| D    | `web-concierge`         | the hoodie with the sleeves pushed up to the elbows, the headset around his neck   | 02 `b30f303a-3f15-43fc-8fe1-df59c688881a`, 03 `5a319939-e385-419a-96d1-36ee8e4a26f7` |
| C    | `professional-services` | fitted black zip jacket, zipped up, no hood                                        | 04 `2cce1fbf-0570-4bcb-9ba6-b4cf77e882aa`, 05 `b8ed1d5a-250a-4320-9e69-e837e617570b` |
| B    | `t3-support`            | black high-collar zip jacket, collar standing up                                   | 06 `dc48e342-e86a-4fc1-875d-caf0d6a171c8`, 07 `c8a2ca77-2e13-489d-8b3b-aaef3a210d96` |
| A    | `sysadmin`              | short black high-collar coat to the hips, closed                                   | 08 `589ff794-3441-417f-9ac2-5d24cff630cc`, 09 `225d7404-70e7-4771-924f-cce9f7631141` |
| S    | `linux-engineer`        | long black high-collar coat to mid-calf, closed                                    | 10 `beedf12c-ea64-4757-9873-fdaf12e4bd22`, 11 `69d9c4dc-52d4-4c74-b0f7-25be2cd9a774` |
| S+   | `systems-architect`     | the long coat worn open, burnt-orange piping at the cuffs, tails clear of the legs | 12 `68cae372-d23c-49fa-9dbf-ef0586696790`, 13 `8a9b2068-1b0a-42df-99d7-a16b3a60fa8a` |

Off-palette strays: 02's headset rendered red and violet; 06 has a violet zip stripe.

### Step 3 — props and energy (2026-09-25)

1:1, no reference. Two variants per set, batches of 5 / 5 / 5 / 1, 16 credits (2,552 → 2,536).

> Flat vector illustration of props only, arranged around an empty standing space in the centre
> of the canvas where a full-body figure will be placed later: leave the middle third of the canvas
> empty from top to bottom. The props: [props]. [suffix, with the skin and eye colours left out]
> No people, no figures, no silhouettes.

| Rank   | Stage id                | Props                                                                                  | Variants (job)                                                                       |
| ------ | ----------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| E      | `t1-support`            | a low support desk along the bottom, a monitor glowing orange each side, keyboard, mug | 00 `2262916a-fd42-4fb8-8176-9dd4a2d29729`, 01 `21111615-3904-41a9-9ddf-fb15292c2b81` |
| D      | `web-concierge`         | three floating wireframe panels at shoulder height, two left, one right                | 02 `70934e2e-7274-4c92-b547-bd56bc23cdeb`, 03 `aa50665f-4618-4e41-8120-9df2be63adac` |
| C      | `professional-services` | an orange data cube at the left, a curving path of lights to the right, violet wisps   | 04 `499ef4d5-f53c-4c05-bd00-bf726d25e0dc`, 05 `56c4f4cb-3af2-4a8b-9314-0743cfcbe3f6` |
| B      | `t3-support`            | a wall of orange alert lights on both sides, violet shadows rising from the floor      | 06 `5c692d9d-a311-491b-bf67-faab6d488ce6`, 07 `974278b4-d97d-4301-879b-9d05e2db2794` |
| A      | `sysadmin`              | an open server rack at the right with orange LEDs, violet smoke along the floor        | 08 `191b3ff2-3c89-4856-a824-52a883a7d723`, 09 `13074171-f1cc-49e8-b816-1273fbeb0470` |
| S      | `linux-engineer`        | a pipeline of floating modules arcing across the top, two violet shadow hands          | 10 `58c58d68-c686-43b7-8591-998f529f6dda`, 11 `f65a3562-c316-413e-88a4-de5b09a9c329` |
| S+     | `systems-architect`     | rows of tall violet shadow server racks receding on both sides, tops dissolving upward | 12 `24db12eb-05f0-4cb7-b546-34ecde7002f3`, 13 `df638f5f-65b0-4cb3-9337-5b94aa295c84` |
| energy | `energy.webp`           | a full violet aura of shadow energy around an empty centre, densest near the floor     | 14 `352d0232-e9ef-4bd3-afda-16bd9f5b04d6`, 15 `050dee40-a80e-4618-81f8-0fad314ca7b4` |

**Picks (Marcus took the controller's list, 2026-09-25).** Outfits: E 00, D 03, C 04, B 07, A 08,
S 11, S+ 12 → `art/journey/outfit-<stage-id>.webp` (registered, 1000×1500). Props: E 01, D 02, C 04,
B 06, A 09, S 11, S+ 12 → `art/journey/props-<stage-id>.webp`, energy 15 → `art/journey/energy.webp`
(1500×1500). Passed over: outfit 02 (red and violet headset), 06 (violet zip stripe), 13 (tails wider
than the coat masks); props 00 (a headset floating above the desk), 03 (furniture in the centre),
07 (bricks, not lights), 14 (flame filling the centre).
