<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# DCS Construction — project context

Construction work intake & tracking web app (production-ready MVP). Full requirements: `project_requirement.txt`; original concept: `DCS Construction Site Map 3 (1).pdf`. Read `docs/` before making changes — especially [IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) (phases + status), [DATA_MODEL.md](docs/DATA_MODEL.md), [ARCHITECTURE.md](docs/ARCHITECTURE.md), [SECURITY.md](docs/SECURITY.md), and [DECISIONS.md](docs/DECISIONS.md).

## Status — 2026-07-14
Phases **0–4 complete and verified**; **Phase 5 (Admin & Configuration) is next**. 68 tests passing, typecheck + lint clean, `next build` green. Phase 4 added site-visit scheduling (double-booking guard, reschedule/cancel/complete + history), customer/employee notifications, communication log, follow-up tasks, an internal `/calendar` view, and an iCal export seam (`/api/calendar/[siteVisitId]`).

## Stack (installed)
Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind v4 · shadcn/ui (`@base-ui/react`) · PostgreSQL · Prisma 7 (pg driver adapter; client at `lib/generated/prisma`) · Auth.js v5 · Vercel Blob (local stub in dev) · Resend (log mode in dev) · Zod 4 · React Hook Form · Vitest · Playwright.

## Local workflow
- DB: PostgreSQL via Docker on host port **5433** — `npm run db:up`, then `npm run db:migrate` and `npm run seed`.
- Dev server: `npm run dev` (http://localhost:3000). Dev login: `admin@dcs.example` / `Password123!` (all seeded users share this password).
- Gate after every phase: `npm run lint && npm run typecheck && npm run test`. Do not leave the repo broken between phases.

## Conventions
- Business logic lives in `lib/services` and `lib/domain`; server actions / route handlers stay thin.
- Authorization is enforced server-side via `can(role, action)` in `lib/auth/roles.ts` — hiding UI is never the control.
- Photos store metadata + a randomized key only; bytes go to storage, served through the auth-guarded `/api/files` route.
- Prefer server components; use `data-testid` for test selectors.

## Phase completion protocol (run after EVERY phase)

This build is done **one phase at a time with a context purge between phases** — each phase starts from a fresh session that rehydrates state from these Markdown files. That keeps context small and reliable, so the docs MUST stay the single source of truth for progress.

When a phase's implementation is done **and** its gate passes (lint + typecheck + tests green, app boots):

1. **Update status in every status-bearing `.md` file** — `README.md`, `AGENTS.md` (this file), and all `docs/*.md`. Flip the finished phase to ✅, mark the next phase as "Next", and refresh the date + test count. This snapshot is the handoff a fresh session reads.
2. **Commit the phase** (recommended): `git add -A && git commit -m "Phase N: <summary>"`.
3. **Purge context**: run `/clear` for a clean session. *(User-run — the assistant cannot invoke `/clear` or `/init`; `/clear` wipes the running session.)*
4. **Re-orient the new session**: usually just start it — `CLAUDE.md → AGENTS.md → docs/` already carry full state. Run `/init` **only if `CLAUDE.md` is missing or stale**. ⚠️ `/init` rewrites `CLAUDE.md`; if you run it, re-add the `@AGENTS.md` import and keep this protocol reachable.
5. **Build the next phase**: open [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) — its status table names the next phase and the model-cost strategy — implement it, then return to step 1.

Suggested resume prompt for the fresh session: *“Read docs/IMPLEMENTATION_PLAN.md and continue with the next phase.”*
