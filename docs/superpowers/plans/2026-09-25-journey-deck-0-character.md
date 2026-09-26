# Journey Deck, Plan 0: The Character Implementation Plan

> **For agentic workers:** This plan is run by the controller (the Claude session Marcus is talking to), not by subagents: every step needs Marcus's eye on a render before the next one. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce the deck's original character: an approved reference sheet and seven card portraits (E → S+), imported as `src/images/deck/<stage-id>.webp` with their violet glow masks, documented in `docs/imagery.md`.

**Architecture:** Spec Phase 1 (§10). Everything runs through the connected Higgsfield MCP: the `character-sheet` workflow builds the reference sheet from the bible; the approved sheet becomes a Reference Element so every later prompt locks to it; `nano_banana_pro` renders the seven portraits at 4K in two batches; `scripts/import-portrait.mjs` (Plan 1, Task 13) writes the sources and masks and enforces each rank's glow band. This plan can run alongside Plans 1–2: the deck paints a placeholder until a rank's portrait exists.

**Tech Stack:** Higgsfield MCP (`get_workflow_instructions`, `generate_image_batch`, `jobs_wait`, `show_generation_by_ids`, `show_reference_elements`), `nano_banana_pro`, sharp (through the import script).

**Spec:** `docs/superpowers/specs/2026-09-25-journey-card-deck-design.md` §10. **Depends on:** Plan 1, Task 3 (`src/data/deck.ts`, the bands) and Task 13 (the import script).

## Global Constraints

- At most 5 jobs per Higgsfield batch. Every prompt, job id, pick and credit spend goes in `docs/imagery.md` under a new "Card deck" section. If a submission returns a preset recommendation instead of a job, resubmit with `declined_preset_id`. Never pass `use_unlim` unless Marcus asks to spend his free-trial generations.
- Marcus approves the reference sheet before any portrait is rendered, and each portrait batch before the next. Re-rolls stay inside the batch cap.
- The character is original: the bible's negative list goes into every prompt verbatim. Reference images condition identity, never reproduce someone else's work.
- Imports go through `node scripts/import-portrait.mjs <render> <stage-id>` only; never hand-place files in `src/images/deck/`. A render outside its rank's glow band is re-rolled, not forced through.
- Commits are GPG-signed; no AI attribution; never push (the controller pushes at the end of the plan).

## Review Focus

1. **A sheet whose face drifts between panels** (different jaw, different part): the identity lock would then lock a blur. Pinned by Step 2's side-by-side check before approval.
2. **A portrait that ignores the framing** (full body, character centred, no room for the quote): the card's quote would cover the face. Pinned by the framing check in Step 5 (eye line at 40 %, character in the left two-thirds).
3. **Violet where it should not be** (an E render with glowing eyes, a coat at A): the ramp breaks. Pinned by the import's glow band, which fails the file.
4. **The wrong key light** (lit from the right): the stage's key light comes from the upper left and the reflections would contradict the art. Pinned by Step 5's checklist.
5. **A 4K render that compresses badly** (banding in the black field): the 800 px rendition must stay under 120 KB, which `pnpm size` measures once the renditions ship. Pinned by Step 6.

## The prompt kit

**Bible** (verbatim in every prompt; from spec §10):

> An original man in his late twenties, lean athletic build, warm mid-tone skin (#d2a679, hard shadow #a67c52), messy medium-length jet-black hair (#0e0e12) with a fixed left part that falls over the right side of the forehead, narrow eyes under straight dark brows, a small pale scar through the outer right eyebrow. He always wears a small matte-black terminal-cursor pendant on a thin cord, and every outfit has one ember-orange (#da5c2c) stitched seam or cable detail. Anime illustration with clean line art, flat cel shading with one hard shadow tone, a limited palette of near-black, charcoal, grey, the skin tones, ember orange and deep violet (#7040d2) only where named. Plain black (#000000) background and nothing else. No text, no logos, no watermark, no frame. No red eyes, no fangs, no face markings, no weapons, no shadow soldiers, not Sung Jin-Woo, no Solo Leveling costume. He does not resemble any existing anime or manga character or any real person.

**Framing** (verbatim in every portrait prompt):

> 3:2 landscape bust portrait, the eye line at 40% of the image height, the shoulders cut by the bottom edge, the character centred in the left two-thirds of the frame so the right third stays empty black, front-facing with a slight three-quarter turn to the left, one key light from the upper left, the same camera and distance as the reference.

**Ladder rows** (one per portrait; outfit, eyes, expression, posture come from `src/data/deck.ts` and must match it word for word):

| Stage id                | Row                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `t1-support`            | Wearing an oversized grey hoodie hanging loose off narrow shoulders, the hood bunched at the neck, a headset around the neck, a company lanyard. Eyes wide and warm brown (#6b4a2f), no glow. Expression open, eager, a little anxious, the hair falling over his eyes. Slight frame, shoulders rounded and slightly forward, lost in the baggy hoodie.                                           |
| `web-concierge`         | Wearing a black company polo still a size too big, sleeves pushed up, no headset. Eyes slightly narrower with a cold grey glint (#7a8088). Expression focused, the start of a smile, the hair pushed off his brow. Upright, the shoulders starting to square.                                                                                                                                     |
| `professional-services` | Wearing a fitted black shirt, a laptop-bag strap across a broader chest. Eyes steel grey (#96a0aa), alert. Expression determined, the jaw sharper. Head a touch down, eyes up, the frame filling out.                                                                                                                                                                                             |
| `t3-support`            | Wearing a fitted black shirt with the sleeves rolled over solid forearms, a coiled ethernet cable over one shoulder, its RJ45 plug hanging in view. Eyes steel grey with a faint violet rim on the iris. Expression tired but sharp, a hard-won calm. Jaw set, shoulders squared.                                                                                                                 |
| `sysadmin`              | Wearing a fitted black technical shirt over a broad frame, rack keys on a carabiner. Eyes a violet iris (#7040d2), no glow. Expression quiet confidence, a knowing half-smile, the hair swept back with one strand over the brow. Standing tall, squared shoulders, chin level.                                                                                                                   |
| `linux-engineer`        | Wearing a tailored black suit cut close to his figure: a long black coat with sharp lapels over a white shirt buttoned to the collar, no tie, one ember-orange stitched seam along the lapel edge. Eyes a violet iris, glowing (#9d7cf0). Expression calm authority, the hint of a smirk, the hair swept back and sharp. Chin level, slight three-quarter turn, broad shoulders filling the coat. |
| `systems-architect`     | The long black coat open over a black shirt that matches it, violet energy visible inside it and at the shoulders, violet light catching the coat's edges. Eyes white-violet (#e6ddff), the glow breaking past the lids. Expression serene, unbothered, every line of the face sharp. Chin slightly up, energy rising, the frame at its strongest.                                                |

The arc (Marcus, 2026-09-25, after batch one): he should read stronger, better looking and more of a badass with every rank, from baggy clothes and an innocent look to a fitted black suit with a long coat from S. The character stays original; the arc is what the references lend. The rows above are the source of truth in `src/data/deck.ts`.

---

### Step 1: Load the workflow and preflight the cost

- [ ] Call `get_workflow_instructions` with `{ workflow: "character-sheet" }` and follow its slot architecture with the `anime-2d` preset and the **turnaround** composition (front, three-quarter, profile, back), then a second prompt with the **expression sheet** composition (neutral, calm, tired-sharp, serene).
- [ ] Call `models_explore` with `{ action: "get", model_id: "nano_banana_pro" }` and confirm `resolution: "4k"` and `aspect_ratio: "3:2"` are available. Call `generate_image` with `get_cost: true` for one 4K 3:2 job and note the credits per job in `docs/imagery.md` before spending anything.

### Step 2: The reference sheet (one batch of at most 5)

- [ ] Submit with `generate_image_batch`: two turnaround variants and two expression-sheet variants (`nano_banana_pro`, `16:9`, `2k`), prompt = the composition clause + the bible + "identical original character on all views, pure black seamless background, professional character sheet presentation" + the workflow's negative tail. Record the job ids.
- [ ] `jobs_wait` the batch, then one `show_generation_by_ids` call. Show Marcus the results side by side and check the same jaw, part, scar and pendant in every panel.
- [ ] Marcus picks one turnaround (and one expression sheet). If the face drifts, re-roll only the failing sheet with the drift named in the prompt ("the same scar through the outer right eyebrow in every view"), inside the batch cap.
- [ ] Record the pick, the alternatives and the spend in `docs/imagery.md`.

### Step 3: The identity lock

- [ ] Call `show_reference_elements` with `{ action: "create", name: "deck-character", category: "character", medias: [{ id: "<turnaround job id>", type: "image_job", url: "<its result url>" }, { id: "<expression job id>", type: "image_job", url: "<its result url>" }] }`. Record the returned `element_id` in `docs/imagery.md`.
- [ ] Every portrait prompt from here starts with `<<<element_id>>>` (the backend injects the sheet as the identity reference). If Element creation fails, fall back to `medias: [{ value: "<turnaround job id>", role: "image_references" }]` on every job, which is how the current art was kept consistent.

### Step 4: Portraits, batch one (E, D, C, B)

- [ ] Submit four jobs with `generate_image_batch`: `nano_banana_pro`, `aspect_ratio: "3:2"`, `resolution: "4k"`, prompt = `<<<element_id>>> ` + the framing + the ladder row + the bible. One job per rank; indices 0–3.
- [ ] `jobs_wait`, then one `show_generation_by_ids`. Check each against the framing list: eye line at 40 %, character in the left two-thirds, key light from the upper left, the outfit item present, the eye colour right, nothing violet at E–C, a faint rim only at B.
- [ ] Marcus picks per rank. Re-roll only what failed (name the failure in the prompt), inside the cap.

### Step 5: Portraits, batch two (A, S, S+)

- [ ] Submit three jobs the same way; indices 4–6. For S+ add "violet energy as soft light and drifting wisps inside the open coat and at the shoulders, never as a shape that hides the face".
- [ ] Same checks. S must glow only at the eyes; S+ may glow at the eyes and the coat. Marcus picks.

### Step 6: Import, check, document

- [ ] Download each picked render from its result URL to `~/Downloads/deck/<stage-id>.png` (the URL is in the `show_generation_by_ids` output; `curl -L -o` is fine).
- [ ] For each rank: `node scripts/import-portrait.mjs ~/Downloads/deck/<stage-id>.png <stage-id>`. Expected: `<stage-id>: WxH, glow N% (band a–b%)`. A band failure means a re-roll for that rank (Steps 4–5), never a band edit; if every S+ render lands above 8 % because the energy is generous, discuss the band with Marcus and change `src/data/deck-glow-bands.json` in its own commit with the reason.
- [ ] Run `pnpm test` (the `deck.test.ts` bands, `importPortrait.test.ts`) and, once Plan 2 is in, `pnpm build && pnpm size` (the renditions' sizes) and `pnpm test:e2e` (the timeline shows the new portraits with "Illustration:" alts).
- [ ] Add the "Card deck" section to `docs/imagery.md`: the bible, the framing, each rank's prompt row, job ids, picks, alternatives, the element id, spend. Mark the old "Journey" and "Vector journey" sections retired with a pointer to the deck spec.
- [ ] Commit: `git add src/images/deck docs/imagery.md` then `git commit -m "deck: the character's reference sheet and seven portraits"` (and the bands file, if it changed, in its own commit).

### Step 7: Hand back

- [ ] Tell Marcus which ranks are in, the spend, and anything the tuning session should revisit (a portrait whose right third is not quite clear, a glow band that was tight). The controller pushes the branch and writes the Build Log entry.
