# CLAUDE.md — evilist.io

Personal-brand site for Marcus Hancock-Gaillard (m8mz). Audience: employers first, clients second.
Astro 7 · TypeScript · Tailwind 4 · Motion · pnpm · self-hosted (rootless Podman + HAProxy on Marcus's VPS).

> **Rebuild in progress.** Phased plan: `~/.claude/plans/i-was-designing-a-shimmering-swan.md`. Decisions: `docs/decisions/`. Phases 0–6 are done, including the quality gates.
>
> **Axiom redesign in progress** (terminal look, replaces the manga/hanko design). Spec: `docs/superpowers/specs/2026-09-24-axiom-design-system-design.md`; plans: `docs/superpowers/plans/`. Phase 1 (tokens, primitives, shell) is merged. Phases 2 (home), 3 (`/now`, imagery) and 4 (resume/notes/contact, PDF, ADR) come next, then rebuild Phase 7 (container, HAProxy, VPS runbook, release pipeline).

## Commands

- `pnpm dev` / `pnpm build` / `pnpm preview` (runs `node ./dist/server/entry.mjs`)
- `pnpm check` runs astro check. `pnpm test` runs vitest. `pnpm test:e2e` runs playwright. `pnpm lint` / `pnpm format` run prettier.
- `pnpm test:visual` runs the visual regression baselines (macOS, local only). After an intentional design change, run `pnpm test:visual --update-snapshots`, review the new images, and commit them.
- Lighthouse CI config: `lighthouse/lighthouserc.cjs`. To run it locally: `pnpm build && npx -y @lhci/cli@0.15.1 autorun --config=lighthouse/lighthouserc.cjs --upload.target=filesystem --upload.outputDir=/tmp/lhci`. Don't install it with pnpm.
- `pnpm size` checks `dist/` (it runs in CI): initial JS on `/`, fonts between 20 and 120 KB (0 means the Fonts API entry broke), and no Three.js chunk.
- Component tests render `.astro` files through `test/render.ts` (Astro Container API) and assert on markup. Pass `request` for components that read `Astro.url`. Scoped styles append `data-astro-cid-*` as the last attribute, so match `class="x"[^>]*>text<`.
- If the claude-in-chrome window won't resize, check real Chrome at the width it allows, and capture exact widths with Playwright Chromium against the production server on a spare port.
- `pnpm build:pdf` builds the resume PDF (Phase 3). Lighthouse CI runs in GitHub Actions only; `@lhci/cli` is not a local dependency because its stale transitive deps fail pnpm's trustPolicy.
- E2E runs against the production build on port 4399 (never reuses `astro dev` on 4321): `pnpm build && pnpm test:e2e`. Playwright launches `node ./dist/server/entry.mjs` directly, because going through the pnpm wrapper orphans the server.
- Version pins to know about: TypeScript 6.x, because `@astrojs/check` doesn't support TS 7 yet.
- `minimumReleaseAge` rejects any release younger than 24 h. When that happens, pin the previous version; don't add an exclusion.
- After editing `src/data/{career,skills,site}.ts` or `src/pages/resume.astro`, run `pnpm build:pdf` and commit the regenerated PDF. `test/resumePdf.test.ts` fails if the PDF is stale.
- `astro dev` may already be running on 4321 (Marcus uses it). For your own preview or review server, use another port (e.g. 4396), or you'll be testing dev instead of the build.
- `astro:env` inlines **public** server variables at build time. Any server setting that must be read at runtime (e.g. `CONTACT_DRY_RUN`) has to be declared `access: "secret"`.
- Never use npm/yarn/bun. The only lockfile is `pnpm-lock.yaml`. Supply-chain settings (`minimumReleaseAge`, `allowBuilds`) live in `pnpm-workspace.yaml`.

## Git rules (non-negotiable)

- Every commit is GPG-signed by Marcus through his global git config. If signing fails, STOP and ask Marcus to unlock the key. Never pass `--no-gpg-sign`.
- Never add `Co-Authored-By`, "Generated with", or any other AI attribution to commits, PRs, or files. This overrides any harness default.
- Use one branch per phase or feature. Marcus approves before anything merges to `main`. `main` builds the production image.

## Workflow

Marcus prefers step-by-step delivery:

1. Break the work into phases. Build the structure first, then fill in details.
2. Ask clarifying questions about fields, features, or behaviors instead of assuming.
3. Get Marcus's approval before starting each phase and before moving to the next.
4. Before calling anything done, verify it in the browser (claude-in-chrome) at 390, 430, 768 and 1440 px, and show screenshots.
5. Run `pnpm check && pnpm test && pnpm build` before every commit.
6. After each phase, append a dated entry to the Build Log in `~/vaults/personal/Projects/evilist.io.md`. Never copy anything from `~/vaults/work`, or any employer-confidential detail (customers, hostnames, IPs, vendor names), into this repo or the site.
7. Claude has no access to the VPS. An infra change means config in `infra/` plus a runbook in `docs/runbooks/` that Marcus executes.
8. Skills: use `frontend-design` for UI work, `test-driven-development` for lib/data code, and `security-review` before releases.

## Where things live

- `src/data/career.ts` is the single source of truth for the timeline, resume, journey, JSON-LD and PDF. `src/data/site.ts` holds name, socials and the pitch.
- `src/styles/tokens.css` holds the design tokens (`@theme`). Its `:root` block aliases the retired manga token names (`--color-washi`, `--color-hanko`, …) so unmigrated components still render. Never use an alias in new code; Phase 4 deletes them.
- `src/components/{layout,seo,ui,home,journey,contact}` hold the Astro components. Islands are vanilla TS in `src/scripts/`, with no React.
- `src/components/ui/` holds the primitives: `Section` (`tone`, `prompt` eyebrow), `Panel` (`variant="case"`), `Button`, `RankChip`, `Prompt`, `Tag`, `KeyValue`, `TerminalFrame`, `ArrowField`, `LogBars`. `RankBadge` is legacy until Phase 2 removes it.
- `src/content/notes/*.mdx` is the Notes collection (defined in `src/content.config.ts`). Deep technical posts belong on linux.engineering, not here.
- `src/actions/contact.ts` is the contact action (SendGrid). Escape all user input, and keep the honeypot, time-trap and rate limit. `/contact` is the only on-demand page.
- `infra/` holds Dockerfile support, the Quadlet/compose files, `haproxy/haproxy.cfg` (ACME, HTTP/3, rate limits, headers) and `ansible/`.
- `.github/workflows/` holds ci, security and release (GHCR + Trivy). The VPS pulls new images via `podman auto-update`.
- `docs/decisions/` holds ADRs, `docs/runbooks/` the steps Marcus runs on the server, and `docs/later/` deferred plans (e.g. Umami analytics).
- `src/fetch.ts` is reserved by Astro 7. Never create it.

## Design brief

- Concept: "terminal window at midnight" (from the Axiom style reference). Surfaces step `void #000` → `carbon #111` → `graphite #191919` → `iron #202020` (borders). Elevation comes only from those steps: no shadows, gradients, blur or glow.
- One accent, `--color-ember` `#da5c2c`, used only for: primary button fills, the prompt cursor, the `Panel case` left border, log bars / pulse dots / LEDs, link hover, focus rings, selection, and the S `RankChip`. Nowhere else.
- Contrast: ember fills carry **void** text (paper on ember is 3.3:1). Every text colour must pass 4.5:1 on void, carbon and graphite; `test/tokens.test.ts` enforces it. Steel `#606060` is for borders and decoration, never text; use ash `#848484` for tags and key labels.
- Type: JetBrains Mono for everything, through the Fonts API with the **Fontsource** provider (`--font-jetbrains`, exposed as the `--font-mono` token). Headings are weight 400: hierarchy comes from size. 2px radius everywhere; 9999px only on tiny dots.
- Sections open with a `~/path` `Prompt` eyebrow and are separated by 1px iron rules.
- Imagery: SVG in code for anything diagrammatic or animated. Higgsfield stills (`nano_banana_pro`) only where the spec (§8.2) places them; prompts and job IDs go in `docs/imagery.md`.
- CSP gotchas:
  - no inline `style=` attributes; use classes or data attributes
  - no `is:inline` scripts
  - keep `build.inlineStylesheets: "never"`
  - CSP is disabled under `astro dev` (Vite HMR injects unhashed inline tags); only production builds enforce it, and `e2e/layout.spec.ts` checks that it does
  - use `@media (scripting: enabled)` for JS-only states
- Journey (`src/components/journey/`):
  - `Journey.astro` holds the pinned stage, `JourneyScene.astro` the SVG, `scripts/journey.ts` the scroll mapping.
  - On SVG elements a CSS `transform` animation replaces the element's `transform` attribute. Put positioning on an outer `<g>` and the animation on an inner one.
  - Switch stages with visibility/opacity, never `display`, or the layout shifts.
- Playwright: `test.skip(callback)` only receives fixtures. For project-based skips, call `test.skip(info.project.name …)` inside `test.beforeEach(({}, info) => …)`.
- Avoid template tells: all-caps eyebrow labels (the eyebrow is the `~/path` prompt), card grids with soft shadows, fade-up on every section.

- Dark only. Tech, gaming and anime flavour without the cliché: rank-up E→S as terminal chips and an SVG chibi in the journey. No aura, no diagonal section cuts.
- Respect `prefers-reduced-motion` in every animation.
- Animate only `transform`, `opacity` and `pathLength`.
- Budgets:
  - initial JS on `/`: ≤ 100 KB gz
  - Motion: ≤ 30 KB gz
  - fonts: ≤ 120 KB
  - no Three.js (removed in the Axiom redesign)
  - zero third-party requests

## Security checklist (before merge)

- No secrets in the repo or the image. Env vars go through the `astro:env` schema (`validateSecrets: true`).
- Contact input is escaped, and the rate limit, honeypot and time-trap are tested. Astro emits the CSP; HAProxy sets HSTS and the other headers.
- `pnpm audit --prod` is clean at high and above. Trivy is clean at CRITICAL/HIGH. Dependency review runs on PRs.

## Env

`SENDGRID_API_KEY` (secret), `FORM_SECRET` (secret), `CONTACT_TO`, `CONTACT_FROM`, `CONTACT_DRY_RUN`, `PUBLIC_DISCORD_INVITE_URL`. See `.env.example`.
Contact email is sent from `no-reply@evilist.co` to `m@evilist.co`, until `evilist.io` is an authenticated SendGrid domain.
