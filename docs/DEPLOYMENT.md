# DCS Construction — Deployment Guide

Production-ready MVP. Target platform: **Vercel** (Next.js App Router) with a managed **PostgreSQL** database, **Vercel Blob** for photos, and **Resend** for email. Nothing here is Vercel-locked — any Node host + Postgres works.

## 0. Current production deployment (2026-07-14) — 🟢 LIVE

- **URL:** https://0718-lome-dcs-construction.vercel.app  ·  **Vercel project:** `raj-pulagala-s-projects/0718-lome-dcs-construction`
- **Database:** **Neon Postgres** added via the Vercel Marketplace (Storage tab). It injects `DATABASE_URL` (pooled) + `DATABASE_URL_UNPOOLED` (direct) + `POSTGRES_*`. These are **sensitive** — `vercel env pull` returns them blank, so migrations and seeding run **inside the Vercel build**, not locally.
- **Photos:** a **public Vercel Blob** store (`dcs-photos`) is linked; `BLOB_MODE=vercel` and `BLOB_READ_WRITE_TOKEN` are set. Uploaded photos serve directly from Blob URLs.
- **Build command** (`vercel.json`): `prisma migrate deploy && tsx scripts/createAdmin.ts && next build`. Migrations use `DATABASE_URL_UNPOOLED` (pooled/PgBouncer breaks Prisma Migrate's advisory locks — see `prisma.config.ts`).
- **First admin:** `scripts/createAdmin.ts` (idempotent) creates a `PRINCIPAL_ADMIN` from `INITIAL_ADMIN_NAME` / `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` env vars, then those were removed. Production admin: **`rpulagala@gmail.com`**.
- **Env vars set in Vercel:** `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, `APP_BASE_URL`, `NEXTAUTH_URL`, `BLOB_MODE=vercel`, plus the Neon + Blob integration vars.
- **Seeding production:** set `SEED_ON_BUILD=1` and add a guarded step to the build (`sh -c 'if [ "$SEED_ON_BUILD" = "1" ]; then DATABASE_URL="$DATABASE_URL_UNPOOLED" tsx prisma/seed.ts; fi'`), deploy, then **remove both** so a normal deploy can never wipe prod. The seed upserts demo users and rebuilds transactional data; it does **not** delete the real admin.
- **Backlog (not yet wired):** real email (Resend key + verified domain — also unblocks staff password resets), custom domain, self-service password change, deactivating the demo `@dcs.example` accounts, private-blob signed URLs.

> ⚠️ Production currently contains demo staff accounts (`@dcs.example`, password `Password123!`) from the seed — deactivate them via **Admin → Users** before real-world use.

### Client app (customer portal) — not yet deployed
The `/app` customer portal (C0/C1 foundation) runs **locally only**. Its migration (`client_portal_accounts`) is already part of `prisma migrate deploy`, so deploying the current `main` would create the tables in production without exposing the portal beyond the `/app` routes. Before deploying the portal for real customers: wire real passwordless email delivery (**Resend key + verified domain** — currently log-mode; this is deferred to **C8**), and complete the **data-isolation/IDOR test gate** (C7). See [CLIENT_APP_PLAN.md](CLIENT_APP_PLAN.md).

## 1. Prerequisites
- Node.js 20+ and npm.
- A PostgreSQL 15+ database (Neon, Supabase, RDS, or self-hosted).
- A Resend account + verified sending domain (for real email).
- A Vercel Blob store (or another S3-compatible bucket if you swap the storage adapter).

## 2. Environment variables
Set these in the host's environment (Vercel → Project → Settings → Environment Variables). See [`.env.example`](../.env.example) for the full list.

| Variable | Purpose | Prod value |
|---|---|---|
| `DATABASE_URL` | Postgres connection string | managed Postgres URL (SSL) |
| `AUTH_SECRET` | Auth.js session encryption | `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | Trust the deployment host | `true` |
| `NEXTAUTH_URL` / `APP_BASE_URL` | Canonical app URL | `https://app.dcs.example` |
| `COMPANY_TIMEZONE` | Display timezone | e.g. `America/Los_Angeles` |
| `EMAIL_MODE` | `log` or `resend` | `resend` |
| `RESEND_API_KEY` | Resend API key | secret |
| `EMAIL_FROM` | From header | `DCS Construction <noreply@dcs.example>` |
| `INTAKE_NOTIFY_EMAILS` | Fallback intake alert recipients | comma list (also editable in Admin → Settings) |
| `BLOB_MODE` | `local` or `vercel` | `vercel` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob RW token | secret |
| `MAX_UPLOAD_FILES` / `MAX_UPLOAD_MB` | Upload limits | `10` / `10` |

> **Secrets never go in git.** `.env` is git-ignored; only `.env.example` (keys, no values) is committed.

## 3. Database migration
Run Prisma migrations against the production database as a **deploy step** (do not use `migrate dev` in prod):

```bash
npx prisma migrate deploy
```

On Vercel, add this to the build (or a release phase). The Prisma client is generated automatically via the `postinstall` script.

- **Do not run `npm run seed` in production** — the seed wipes transactional data and inserts demo records. Instead, create the first principal admin manually (a one-off script or SQL insert with a bcrypt hash), then invite the rest of the team from **Admin → Users**.

## 4. Build & deploy
```bash
npm ci
npm run build      # next build (Turbopack) — must be green
```
On Vercel this is automatic on push. The included checks that must pass before deploy:
```bash
npm run lint && npm run typecheck && npm run test
```

## 5. First-run checklist
1. Visit `/api/health` — expect `{"status":"ok","db":"ok"}`.
2. Sign in as the principal admin.
3. **Admin → Settings**: set company profile, service area, response message, intake recipients, upload limits.
4. **Admin → Users**: invite managers/employees.
5. **Admin → Categories**: confirm the project-category list.
6. Submit a test request through the public `/request` form; confirm the confirmation email is logged/sent and the request appears on the dashboard.

## 6. Post-deploy hardening (recommended)
- Restrict the DB runtime role to DML (no DDL/superuser).
- Wire the CAPTCHA/bot seam on the public form and confirm rate limits under load.
- Add the security headers listed in [SECURITY.md](SECURITY.md) (CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`).
- Configure log drains + error tracking (the app emits structured logs with correlation IDs).

## 7. Rollback
Vercel keeps immutable deployments — promote a previous deployment to roll back the app. Database migrations are forward-only; keep a backup/snapshot before `migrate deploy` so schema changes can be restored if needed.
