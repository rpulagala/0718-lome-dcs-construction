<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# DCS Construction — project context

Construction work intake & tracking web app (production-ready MVP). Full requirements: `project_requirement.txt`; original concept: `DCS Construction Site Map 3 (1).pdf`. Read `docs/` before making changes — especially [IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) (phases + status), [DATA_MODEL.md](docs/DATA_MODEL.md), [ARCHITECTURE.md](docs/ARCHITECTURE.md), [SECURITY.md](docs/SECURITY.md), and [DECISIONS.md](docs/DECISIONS.md).

## Status — 2026-07-14
**🟢 Live in production: https://0718-lome-dcs-construction.vercel.app** — Phases **0–7 complete and verified**, then **deployed** + a post-launch branding/UX pass. **120 unit/integration tests + 11 Playwright E2E tests passing**, typecheck + lint clean, `next build` green.

**Deployment (Vercel + Neon + Blob).** Hosted on Vercel; DB is **Neon Postgres** (Marketplace integration — its connection strings are *sensitive* and can't be `vercel env pull`-ed, so migrations/seed run in the build). Photos use a **public Vercel Blob** store (`BLOB_MODE=vercel`). Build command in [vercel.json](vercel.json): `prisma migrate deploy && tsx scripts/createAdmin.ts && next build` — migrations use `DATABASE_URL_UNPOOLED` (pooled/PgBouncer breaks Migrate). First admin comes from [scripts/createAdmin.ts](scripts/createAdmin.ts) (idempotent, reads `INITIAL_ADMIN_*` env). Production admin: `rpulagala@gmail.com`. To (re)seed production, temporarily set `SEED_ON_BUILD=1` and add a guarded seed step to `vercel.json`, deploy, then remove both. Env set in Vercel: `AUTH_SECRET`, `AUTH_TRUST_HOST`, `APP_BASE_URL`, `NEXTAUTH_URL`, `BLOB_MODE`, plus the Neon + Blob integration vars.

**Post-launch branding/UX.** Brand font **Source Sans 3** (`--font-brand`, default app-wide) matching the client's Freight Sans; brand tokens `brand-navy #024988` / `brand-red #cd0e0e` / `brand-ink` in [app/globals.css](app/globals.css). The public home page ([app/page.tsx](app/page.tsx)) now **mirrors dcsconstructs.com** (services, consultation, facilities, why-choose, contact); `SiteHeader`/`SiteFooter` are navy; all "Contact"/estimate CTAs → `/request`, `Staff` → `/signin`. Console menu bar (`AppHeader`) is navy with uppercase links. **Public pages are centered, internal pages left-aligned.** The **dashboard** was split from the request list — `/dashboard` = overview cards + a Requests-vs-Projects explainer; `/requests` = the filterable list. Request-detail sections are **color-coded** ([lib/ui/tone.ts](lib/ui/tone.ts): blue/green/gray/orange); the note and communication sub-sections are grouped into single cards. Seed now includes **two rich showcase requests→projects** (`DCS-2026-000027` Whitfield Kitchen, `DCS-2026-000028` Beckman & Rowe Office Buildout) exercising every relation; seeded photos use remote placeholder image URLs so they display without local storage. A client [delivery report PDF](DCS_Construction_Delivery_Report.pdf) is in the repo root.

The `/calendar` page is a **week-grid view** ([app/calendar/page.tsx](app/calendar/page.tsx) + [components/calendar/WeekGrid.tsx](components/calendar/WeekGrid.tsx)): site visits laid out by day/time, **color-coded per employee** (palette in [lib/domain/calendarView.ts](lib/domain/calendarView.ts)), with prev/next/today week nav and a legend that **filters to one employee** (or unassigned) via the `?assigned=` query param. Calendar time math uses local `Date` getters (MVP treats server-local as company tz).

Phase 5 added the principal-admin area: user management (invite/edit/role/activate/deactivate/resend, last-admin guard), project-category management (add/rename/reorder/activate; delete blocked when referenced), company + workflow settings (validated per key), and an append-only audit log. Services in `lib/services/{audit,settings,userAdmin,categoryAdmin,auditQueries}.ts`; UI under `/admin/*` with `requireCan("admin:*")` + edge-middleware guards.

Phase 6 added **estimates & projects**. Estimate lifecycle in `lib/services/estimates.ts` (state machine `lib/domain/estimateStatus.ts`): draft → send (stamps `sentAt`, advances request to ESTIMATE_SENT, emails the customer) → accept (→ APPROVED) / decline / expire / revise (supersedes with a fresh draft). Estimate numbers `EST-YYYY-NNNNNN` via the new `EstimateCounter` table (allocated like `RequestCounter`). Project conversion in `lib/services/projects.ts` (state machine `lib/domain/projectStatus.ts`): convert an ACCEPTED estimate to a project (PM, contract amount, planned/actual dates, milestones); project status changes mirror onto the parent request via the shared `lib/services/statusAdvance.ts` helper. UI: `EstimatesPanel` + `ProjectPanel` on the request detail page, a manager-only cross-project `/projects` list, and a `Projects` nav link. New actions gated by `requireCan("estimate:manage" | "project:manage")` (MANAGER+).

Phase 7 added the Playwright E2E journeys (`tests/e2e/`: auth negatives, customer intake → estimate → project, admin area), a security-review pass (see [docs/SECURITY.md](docs/SECURITY.md)), and the [deployment](docs/DEPLOYMENT.md) + [user](docs/USER_GUIDE.md) guides + [validation report](docs/VALIDATION_REPORT.md).

Run E2E with `npm run test:e2e` (Playwright reuses a dev server on :3000; **restart the dev server after `prisma generate`** or it serves a stale client).

## Stack (installed)
Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind v4 · shadcn/ui (`@base-ui/react`) · PostgreSQL (Neon in prod) · Prisma 7 (pg driver adapter; client at `lib/generated/prisma`) · Auth.js v5 · Vercel Blob (local stub in dev; public store in prod) · Resend (log mode — email not yet wired in prod) · Zod 4 · React Hook Form · Vitest · Playwright · deployed on Vercel.

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
