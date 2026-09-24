# 0001 — Domain, stack and hosting for the evilist.io rebuild

- **Status:** Accepted
- **Date:** 2026-09-24
- **Decider:** Marcus Hancock-Gaillard

## Context

The old site (Astro 5, npm, hosted on Vercel at www.evilist.co) was unfinished:
- blog and resume pages were stubs
- the contact form never submitted
- there was no SEO metadata and no tests or CI

The rebuild's audience is employers first and prospective clients second. It needs to present ten years of career history clearly and quickly, and on mobile.

## Decisions

| Area | Decision |
|---|---|
| Primary domain | **evilist.io** is the personal brand. evilist.co and evilist.org 301 to it. |
| Other domains | **linux.engineering** will be a separate future site for the technical blog and a consulting storefront. m8mz.com and m8mz.io stay parked. |
| Package manager | **pnpm 12**, with `minimumReleaseAge`, blocked lifecycle scripts (`allowBuilds`) and `trustPolicy: no-downgrade` |
| Framework | **Astro 7**. React is removed. Islands are vanilla TypeScript. |
| Rendering | Prerendered static pages plus the `@astrojs/node` adapter. Only `/contact` and `/_actions/*` render on demand. |
| Animation | **Motion** drives the scroll-driven career journey. **Three.js** is limited to one lazy-loaded hero effect. |
| Design | Dark theme using 60/30/10 with a red accent. Moderate anime influence (rank-up E→S, aura glow, diagonal cuts, an SVG chibi avatar), kept professional. |
| Blog | A small Notes collection lives here. Deep technical content goes to linux.engineering. |
| Email | Stay on SendGrid. Input is escaped, and the form has a honeypot, a time-trap and a rate limit. |
| Hosting | Self-hosted on Marcus's existing VPS with rootless Podman. Claude writes configs and runbooks; Marcus runs them on the server. |
| Edge | HAProxy 3.3 container: native ACME, HTTP/3, stick-table rate limiting, security headers |
| Deploy | GitHub Actions builds, tests and scans, then pushes to `ghcr.io/m8mz/evilist`. The VPS pulls through `podman auto-update`, so CI holds no SSH secrets. |
| Analytics | Deferred. Plan: self-hosted Umami (`docs/later/analytics-umami.md`). |
| Git | Every commit is GPG-signed by Marcus. No AI attribution trailers. |

## Consequences

- Vercel is retired after DNS cutover to the VPS, once a week of clean traffic confirms the move.
- The `evilist.co` apex A record, currently pointing at 192.168.0.1, gets fixed during cutover.
- Marcus owns uptime, TLS and patching for the site. The Ansible roles and runbooks keep that repeatable.
- Linking to linux.engineering from evilist.io keeps the SEO focus of each site separate.
