# DCS Construction — Architecture

> **Status — 2026-07-13:** Phases 1–2 are built to this architecture. In place & verified: Prisma singleton (pg adapter) in `lib/db.ts`; service layer (`requestService`, `mailService`, `blobStorage`, `fileValidation`, `rateLimit`, plus domain modules `statusMachine`, `status`, `requestNumber`, `businessHours`); Auth.js split config (`auth.config.ts` + `auth.ts`); routes `/api/health`, `/api/upload`, `/api/files/[...key]`, `/api/auth/[...nextauth]`; public pages (landing, services, request, confirmation) and the `/signin` + `/dashboard` shell. The internal console (Phase 3) is built too: `requestQueries` (dashboard stats, filtered list, detail) and `requestMutations` (status/assignment/priority/notes with history + timeline), the `/dashboard` and `/requests/[id]` screens with server actions, and the auth-guarded internal photo lightbox. Scheduling/calendar (Phase 4), the Admin area (Phase 5), and estimate/project services (Phase 6) are still to come.

## Overview
Single Next.js (App Router) application, server-first, deployed on Vercel. PostgreSQL via Prisma. Private object storage for photos. Transactional email behind a provider-agnostic service.

```
┌─────────────────────────────────────────────────────────┐
│                     Next.js (App Router)                  │
│                                                           │
│  (public)            (app) employee+        (app)/admin   │
│  landing, services,  dashboard, request     users, cats,  │
│  request form,       detail, scheduling,    settings,     │
│  confirmation,       estimates, projects    audit         │
│  status (token)                                           │
│                                                           │
│  Server Actions / Route Handlers ── authorize() guard     │
└───────┬───────────────┬───────────────┬──────────────────┘
        │               │               │
     Prisma          MailService     BlobStorage
        │            (Resend)        (Vercel Blob, private)
     Postgres                         + signed URLs
```

## Layers
- **UI**: React Server Components by default; Client Components only for interactivity (forms, uploads, lightbox, filters). Tailwind + shadcn/ui.
- **Application/services**: `lib/services/*` — `requestService`, `statusMachine`, `assignmentService`, `siteVisitService`, `estimateService`, `mailService`, `blobStorage`, `auditService`, `rateLimit`, `notificationService`. Server actions and route handlers are thin; logic lives in services.
- **Data**: Prisma client (singleton), transactions for multi-write operations (submission, status change + history + activity).
- **Auth**: Auth.js config in `auth.ts`; `middleware.ts` guards route groups; `authorize()` re-checks in actions.

## Key flows
- **Submission** (transaction): validate → upsert Customer/Address → allocate request number (RequestCounter, row-locked) → create WorkRequest + Photo rows (metadata) → StatusHistory(NEW) → Activity(SUBMITTED) → commit → *then* fire confirmation + internal emails (post-commit, failures logged, not fatal).
- **Status change**: `statusMachine.canTransition(from,to)` guard → update → append StatusHistory + Activity → conditionally enqueue notification.
- **Photo view**: authz check → generate short-lived signed URL → return to client lightbox.

## Status state machine
Central `lib/services/statusMachine.ts` defines allowed transitions and which transitions emit customer notifications. Invalid transitions rejected server-side. Customer-facing mapping in same module (see DATA_MODEL.md).

## Integration boundaries (stubbed, non-blocking)
- Calendar (Google/Outlook): `CalendarProvider` interface, no-op impl in MVP.
- CAPTCHA: `BotProtection` interface, no-op in dev.
- Error tracking: `errorReporter` interface (console in dev, seam for Sentry).

## Observability
- `lib/logger.ts` structured JSON logs + per-request correlation ID (middleware-generated).
- `/api/health` returns app + DB connectivity status.
- Email/upload failures logged to `EmailLog` / structured logs.

## Environments
- **Local**: Docker PostgreSQL, MailService in preview/log mode, Blob via token or local stub.
- **Prod**: Vercel, managed Postgres (Marketplace/Neon), Resend, Vercel Blob.

## Directory layout (target)
```
app/
  (public)/            landing, services, request, confirmation, status
  (app)/               dashboard, requests/[id], schedule, estimates, projects
  (app)/admin/         users, categories, settings, audit
  api/                 health, upload, webhooks
components/ ui/ (shadcn) + feature components
lib/ services/ validation/ auth/ logger.ts db.ts
prisma/ schema.prisma seed.ts
tests/ unit/ integration/ e2e/
docs/
```
