# DCS Construction — Work Intake & Tracking

Production-ready MVP web application for **DCS Construction**: prospective customers submit construction work requests with photos; DCS staff review, qualify, schedule, assign, track, and complete them through the full lifecycle.

> **🟢 Live in production (2026-07-14):** **https://0718-lome-dcs-construction.vercel.app**
> Deployed on **Vercel** with a **Neon** Postgres database and a **Vercel Blob** store for photos. Production is seeded with demo data plus a real principal-admin account. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the full setup.
>
> Status (2026-07-14): **Phases 0–7 complete and verified, then deployed + a post-launch branding/UX pass — feature-complete MVP, live.** Public marketing site (mirrors dcsconstructs.com) + online intake, plus the internal console — a **dashboard** overview (with a Requests-vs-Projects explainer) separate from the **Requests** list (filter/search/paginate), request detail with color-coded sections, photo lightbox, notes, status workflow, and assignment — plus **site-visit scheduling** (appointment statuses, reschedule history, double-booking guard, notifications), a **communication log**, follow-up tasks, and an internal **week-grid calendar** (Google-style day/time layout, per-employee color coding, click-to-filter) with iCal export. The **principal-admin area** covers user management, project categories, company + workflow settings, and an **audit log**. The **estimate lifecycle** (draft → send → accept/decline/expire → revise, `EST-YYYY-NNNNNN`, customer email on send) and **project conversion** (accepted estimate → tracked project with PM, contract, dates, milestones, and a cross-project `/projects` view) are complete. **159 unit/integration tests + 14 Playwright E2E tests passing** (the count includes the client-portal suites through C7), typecheck + lint clean, `next build` green. See [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md).
>
> **Branding/UX:** brand typeface **Source Sans 3** (a free match for the client's Freight Sans), brand colors navy `#024988` + red `#cd0e0e`; navy console menu bar; public pages centered, internal pages left-aligned; request-detail sections color-coded (blue/green/gray/orange). A client-facing [delivery report PDF](DCS_Construction_Delivery_Report.pdf) is included.
>
> **📱 Client app (customer portal) — tracking + request creation + messaging + estimate decisions built, local only:** a separate mobile-first, iPhone-style PWA for customers under **`/app`**. Phases **C0–C7 complete** — `CustomerAccount` + passwordless email-code auth, a mobile app shell (bottom tab bar, sign-in, Profile), PWA install/offline, the **account-scoped tracking screens** (Home dashboard, Active/Completed Projects list, and a request/project detail with milestone progress, dates, team, photos, sent estimates, site visits, and updates — with strict per-customer data isolation), an **in-app multi-step "New request" flow** (prefilled from the account, photo upload, confirmation) that lands straight in the staff console, **two-way messaging** (per-request `ClientMessage` threads with photo attachments and read state — customers chat in-app, staff reply from the console, near-real-time via polling), and **in-app estimate accept/decline** (a signed-in customer accepts or declines a SENT estimate — accept auto-converts it to a tracked project — all account-scoped/IDOR-proof and audited, reflected instantly in the staff console); plus a **PWA/dark-mode/accessibility polish pass (C6)** and a **data-isolation/IDOR + E2E hardening pass (C7)**. Not launched for real customers yet; only **C8 (real email + notifications)** remains — the demo runs on on-screen login codes. Plan + status: [`docs/CLIENT_APP_PLAN.md`](docs/CLIENT_APP_PLAN.md).
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
- [Client app plan](docs/CLIENT_APP_PLAN.md) — customer portal (iPhone-style PWA); C0/C1/C2/C3/C4/C5 built

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
