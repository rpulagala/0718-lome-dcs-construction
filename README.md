# DCS Construction — Work Intake & Tracking

Production-ready MVP web application for **DCS Construction**: prospective customers submit construction work requests with photos; DCS staff review, qualify, schedule, assign, track, and complete them through the full lifecycle.

> Status (2026-07-14): **Phases 0–7 complete and verified — feature-complete MVP.** Public intake plus the internal console — employee dashboard (summary cards, filter/search/paginate), request detail with photo lightbox, notes, status workflow, and assignment — plus **site-visit scheduling** (appointment statuses, reschedule history, double-booking guard, customer + employee notifications), a **communication log**, follow-up tasks, and an internal **calendar view** with iCal export. Phase 5 adds the **principal-admin area**: user management (invite/role/activate/deactivate/resend), project-category management (add/rename/reorder/activate, referenced-delete guard), company + workflow settings, and an **audit log**. Phase 6 adds the **estimate lifecycle** (draft → send → accept/decline/expire → revise, with an `EST-YYYY-NNNNNN` number and customer email on send) and **project conversion** (convert an accepted estimate to a tracked project with a project manager, contract amount, planned/actual dates, milestones, and a cross-project `/projects` view). Phase 7 adds the **Playwright E2E journeys**, a security-review pass, and the deployment + user guides. **120 unit/integration tests + 10 Playwright E2E tests passing**, typecheck + lint clean, `next build` green. See [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md).
>
> Local DB runs via Docker on host port **5433** (5432 was already in use). Start it with `npm run db:up`, then `npm run db:migrate` and `npm run seed`.

## Documentation
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md) — phases, model-cost strategy, execution order
- [Product requirements](docs/PRODUCT_REQUIREMENTS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Data model](docs/DATA_MODEL.md) — Prisma schema + Mermaid ERD
- [Security & privacy](docs/SECURITY.md)
- [Test plan](docs/TEST_PLAN.md)
- [Decisions & assumptions](docs/DECISIONS.md)
- [Deployment guide](docs/DEPLOYMENT.md)
- [User guide](docs/USER_GUIDE.md)
- [Validation report](docs/VALIDATION_REPORT.md) — final Definition-of-Done checklist

## Tech stack
Next.js (App Router) · TypeScript (strict) · React · Tailwind CSS · shadcn/ui · PostgreSQL · Prisma · Auth.js · Vercel Blob · Resend · Zod · React Hook Form · Vitest · Playwright.

## Local development
```bash
# 1. Install deps
npm install

# 2. Start local PostgreSQL (Docker, host port 5433)
npm run db:up

# 3. Configure env
cp .env.example .env   # fill in values

# 4. Migrate + seed
npx prisma migrate dev
npm run seed

# 5. Run
npm run dev            # http://localhost:3000
```

## Scripts
| Script | Purpose |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest unit + integration |
| `npm run test:e2e` | Playwright |
| `npm run seed` | Seed dev data |

## User roles
Employee · Manager · Principal Administrator. Public customers submit requests without an account and check status via a secure magic link.

## Security
Server-enforced RBAC, secure upload validation, private storage with signed URLs, rate limiting, audit logging, secrets via env vars. See [`docs/SECURITY.md`](docs/SECURITY.md).
