# DCS Construction — Decisions & Assumptions (ADR log)

> **Status — 2026-07-13:** Entries reflect Phases 0–2 (foundation + public intake). Actual installed stack: Next.js 16 · React 19 · Tailwind v4 · Prisma 7 (pg driver adapter) · Auth.js v5 · shadcn/ui on `@base-ui/react`. New decisions are appended as later phases proceed.

Format: decision — rationale. Assumptions are MVP defaults; revisit if the client specifies otherwise.

## Stack
- **Next.js App Router + TypeScript strict** — matches prompt; server-first fits RBAC + secure data access.
- **Auth.js (Credentials)** — internal-only auth; no per-customer accounts in MVP. *(Clerk was an option; Auth.js chosen to avoid external dependency for MVP. Swap seam preserved.)*
- **PostgreSQL + Prisma** — normalized relational model per prompt §14.
- **Vercel Blob (private)** — photo storage; DB stores metadata + keys only; signed URLs for access.
- **Resend behind `MailService`** — provider-agnostic; dev uses preview/log mode.
- **Vitest + Playwright** — unit/integration + E2E.
- **npm** (pnpm not installed locally); **Docker PostgreSQL** for local dev DB (psql not installed).

## Modeling
- **Role as enum** (`EMPLOYEE|MANAGER|PRINCIPAL_ADMIN`) rather than a Role table — sufficient for MVP; migrate to table if granular permissions are needed later.
- **`categoryNameSnapshot` on WorkRequest** — preserves historical label if a category is renamed/deactivated; satisfies "preserve historical category values" without blocking rename.
- **RequestCounter table** — per-year row-locked counter for `DCS-YYYY-NNNNNN`, avoiding sequential UUID exposure.
- **Customer magic-link status access** — signed, expiring, single-use token; only the hash stored.
- **Soft delete via `archivedAt`** on business records; no hard delete through normal UI.

## Assumptions (MVP defaults)
- Single company (DCS); no multi-tenancy, but schema/services structured so it could be added.
- SLA = 48 **business** hours for first contact; response target configurable in settings.
- Upload limits: 10 files/request, 10 MB/file, image types only — configurable in company settings.
- Company timezone: America/Los_Angeles (PDF addresses are CA); stored UTC, displayed in company tz.
- Lead with Construction; Handyman/Consultation nav present but deferred (per PDF's 3 areas).
- Galleries seeded with placeholder projects/images (no real project photos yet).
- Testimonials, logo, exact service-area copy are placeholders pending client content.
- CAPTCHA and external calendar are interface seams only in MVP (rate limiting + idempotency active).
- Email "from" domain, Resend/Blob API keys, and DB connection are provided via env at deploy time.

## Deviations from the old PDF (intentional improvements)
- Web app, not iOS native.
- Row click opens a **stable-URL detail page**, not an unmanaged popup.
- Photo enlarge preserved as an **accessible lightbox** (PDF's "click image → larger view").
- Full status workflow + assignment + estimates/projects added beyond the PDF's intake-only scope.
- Marketing/subscription content from the PDF email kept restrained and subordinate to the confirmation.

## Phase 2 notes
- **shadcn/ui uses `@base-ui/react`** (current shadcn default) rather than Radix. For the one intake dropdown and consent checkboxes we use styled **native `<select>`/`<input type=checkbox>`** bound directly to React Hook Form — lower integration risk than wiring base-ui controlled inputs, fully accessible. shadcn `Input/Textarea/Label/Card/Badge` are used elsewhere. Can upgrade to base-ui Select later.
- **Photo upload flow**: client uploads each file to `POST /api/upload` (rate-limited, magic-byte validated, randomized key, private storage) and shows per-file progress; the form then submits field values + returned photo metadata via a **server action**. All reads go through the auth-guarded `/api/files/[...key]` route.
- **Idempotency**: the form generates a UUID `idempotencyKey` on mount; the server short-circuits duplicates and also catches the unique-constraint race.
- **Next 16 rename**: `middleware.ts` triggers a "use proxy.ts" deprecation warning. Behavior is unchanged; rename deferred to Phase 7 cleanup.

## Phase 3 notes
- **Dashboard filtering is a server-rendered GET form** (searchParams-driven) — no client state, shareable/bookmarkable URLs, works without JS. The request table is a server component; only the mutation controls (`ManagePanel`, `NoteForm`) and the photo lightbox are client components.
- **Mutations go through server actions** (`app/requests/[id]/actions.ts`) gated by `requireCan(...)`, calling `lib/services/requestMutations`. Client controls use `useTransition` + `router.refresh()`; actions call `revalidatePath`.
- **Status changes are guarded by the state machine** server-side and record `WorkRequestStatusHistory` + a timeline `WorkRequestActivity`; customer-facing statuses trigger a `status_update` email.
- **Seed advances `RequestCounter`** to the number of seeded requests so newly submitted requests don't collide with seeded request numbers.
- **Internal photos** render via `/api/files/<storageKey>` (auth-guarded); seed writes a shared placeholder image to `.storage/seed/`.

## Phase 4 notes
- **Double-booking guard** is time-window based: a conflict is any *active* (`PROPOSED`/`CONFIRMED`/`RESCHEDULED`) visit for the same employee whose window overlaps. Visits with no end time assume a 60-minute default duration (`DEFAULT_VISIT_MINUTES`). Adjacent/touching windows do **not** conflict (half-open `[start, end)`).
- **Status advancement is decoupled from the generic status email.** Scheduling helpers advance the request status inside the same transaction (`advanceStatusTx`) but send a *dedicated* site-visit email rather than routing through `changeStatus` — this avoids double-notifying the customer for the same event. `advanceStatusTx` is a no-op when the transition isn't allowed by the state machine, so scheduling never breaks on an unexpected status.
- **Cancelling the last active visit** moves the request back to `SITE_VISIT_TO_SCHEDULE` (guarded by the state machine); cancelling while another visit is still active leaves the status untouched.
- **Reschedule** sets the visit's `AppointmentStatus` to `RESCHEDULED` and records a `SiteVisitHistory` row with previous/new dates; it does not change the request-level status.
- **Times & timezone**: form inputs are `YYYY-MM-DD` + `HH:MM` strings combined via `combineDateTime` in the server's local time, which the MVP treats as the company tz. Display uses `formatInCompanyTz` (Intl with `COMPANY_TIMEZONE`). A tz-aware picker is deferred.
- **Calendar integration is a seam, not a sync**: `CalendarProvider` interface + `noopCalendarProvider`, plus a real, standards-compliant `.ics` export (`buildICalEvent`) served from `GET /api/calendar/[siteVisitId]` (auth-guarded). No external Google/Outlook calls in the MVP — non-blocking as planned.
- **`/signin` Suspense fix** (incidental): wrapped the `useSearchParams` form in `<Suspense>` so `next build` prerenders it — the build previously failed here. Unrelated to scheduling but required to keep the repo's build green.

## Open questions (non-blocking; proceeding with defaults)
- Real project gallery content and brand assets (logo, colors) from client.
- Exact service area boundaries.
- Whether customers should eventually get full accounts (Phase 2 backlog).
- Preferred production Postgres provider (Neon/Supabase) — chosen at deploy.
