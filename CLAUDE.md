# CLAUDE.md — evilist.io

Personal-brand site for Marcus Hancock-Gaillard (m8mz). Audience: employers first, clients second.
Astro 7 · TypeScript · Tailwind 4 · Motion · Three.js · pnpm · self-hosted (rootless Podman + HAProxy on Marcus's VPS).

> **Rebuild in progress.** Phased plan: `~/.claude/plans/i-was-designing-a-shimmering-swan.md`. Decisions: `docs/decisions/`. Phases 0–2 are done (tooling, Astro 7, design system). Contact/resume pages still carry legacy markup until Phase 3.

## Commands

- `pnpm dev` / `pnpm build` / `pnpm preview` (runs `node ./dist/server/entry.mjs`)
- `pnpm check` runs astro check. `pnpm test` runs vitest. `pnpm test:e2e` runs playwright. `pnpm lint` / `pnpm format` run prettier.
- `pnpm build:pdf` builds the resume PDF (Phase 3). Lighthouse CI runs in GitHub Actions only; `@lhci/cli` is not a local dependency because its stale transitive deps fail pnpm's trustPolicy.
- E2E runs against the production build: `pnpm build && pnpm test:e2e`. Playwright launches `node ./dist/server/entry.mjs` directly, because going through the pnpm wrapper orphans the server.
- Version pins to know about: TypeScript 6.x, because `@astrojs/check` doesn't support TS 7 yet.
- `minimumReleaseAge` rejects any release younger than 24 h. When that happens, pin the previous version; don't add an exclusion.
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
- `src/styles/tokens.css` holds the design tokens (`@theme`) and follows 60/30/10: ink base, charcoal surfaces, red accent (`--color-accent`). Use the accent only for CTAs, active states, rank badges and focus.
- `src/components/{layout,seo,ui,hero,journey,home,notes,contact}` hold the Astro components. Islands are vanilla TS in `src/scripts/`, with no React.
- `src/content/notes/*.mdx` is the Notes collection (defined in `src/content.config.ts`). Deep technical posts belong on linux.engineering, not here.
- `src/actions/contact.ts` is the contact action (SendGrid). Escape all user input, and keep the honeypot, time-trap and rate limit. `/contact` is the only on-demand page.
- `infra/` holds Dockerfile support, the Quadlet/compose files, `haproxy/haproxy.cfg` (ACME, HTTP/3, rate limits, headers) and `ansible/`.
- `.github/workflows/` holds ci, security and release (GHCR + Trivy). The VPS pulls new images via `podman auto-update`.
- `docs/decisions/` holds ADRs, `docs/runbooks/` the steps Marcus runs on the server, and `docs/later/` deferred plans (e.g. Umami analytics).
- `src/fetch.ts` is reserved by Astro 7. Never create it.

## Design brief

- Concept: "manga panel at night, stamped with a hanko seal". Night indigo `#0F1320` base, washi text, hanko crimson. The rank seal (`RankBadge`) is the one bold element; keep everything else quiet.
- Crimson roles: `--color-hanko` for graphics only (3.7:1), `--color-hanko-ink` for fills that carry text, `--color-hanko-hot` for red text, links and focus.
- Fonts: Dela Gothic One for display, Zen Kaku Gothic New for body. Both come through the Fonts API with the **Fontsource** provider; Google's provider ships hundreds of CJK slices.
- CSP gotchas:
  - no inline `style=` attributes; use classes or data attributes
  - no `is:inline` scripts
  - keep `build.inlineStylesheets: "never"`
  - use `@media (scripting: enabled)` for JS-only states
- Avoid template tells: all-caps eyebrow labels, arrows on buttons, card grids with soft shadows, fade-up on every section.

- Dark only. Anime-inspired but professional: rank-up E→S, aura glow, diagonal section cuts, an SVG chibi avatar.
- Respect `prefers-reduced-motion` in every animation.
- Animate only `transform`, `opacity` and `pathLength`.
- Budgets:
  - initial JS on `/`: ≤ 100 KB gz
  - Motion: ≤ 30 KB gz
  - Three.js: lazy, ≤ 170 KB gz, never in the LCP path
  - zero third-party requests

## Security checklist (before merge)

- No secrets in the repo or the image. Env vars go through the `astro:env` schema (`validateSecrets: true`).
- Contact input is escaped, and the rate limit, honeypot and time-trap are tested. Astro emits the CSP; HAProxy sets HSTS and the other headers.
- `pnpm audit --prod` is clean at high and above. Trivy is clean at CRITICAL/HIGH. Dependency review runs on PRs.

## Env

`SENDGRID_API_KEY` (secret), `FORM_SECRET` (secret), `CONTACT_TO`, `CONTACT_FROM`, `CONTACT_DRY_RUN`, `GITHUB_TOKEN` (optional, used at build time), `PUBLIC_DISCORD_INVITE_URL`. See `.env.example`.
Contact email is sent from `no-reply@evilist.co` to `m@evilist.co`, until `evilist.io` is an authenticated SendGrid domain.
