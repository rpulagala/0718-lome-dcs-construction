# DCS Construction — Decisions & Assumptions (ADR log)

> **Status — 2026-07-14:** Entries reflect Phases 0–5 (foundation + public intake + internal management + scheduling + admin). Actual installed stack: Next.js 16 · React 19 · Tailwind v4 · Prisma 7 (pg driver adapter) · Auth.js v5 · shadcn/ui on `@base-ui/react`. New decisions are appended as later phases proceed.

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

## Phase 5 notes
- **Audit is append-only and non-fatal.** `recordAudit(entry, tx?)` writes an `AuditLog` row; outside a transaction a write failure is logged and swallowed so it can never break the action being audited, but when a `tx` is supplied it re-throws so the audit is atomic with the mutation. Action names are a fixed `AuditAction` string union — stored verbatim and mapped to friendly labels in the audit view.
- **Settings are typed JSON, validated per key.** Each `CompanySetting` key has a matching Zod schema in `SETTING_SCHEMAS`; `updateSetting` validates before upsert and `getAllSettings` fills missing keys from `SETTING_DEFAULTS`, so callers always get a well-formed shape. Intake alert recipients now resolve from the `intake_notify_emails` setting, falling back to the `INTAKE_NOTIFY_EMAILS` env list.
- **Last-admin & self-lockout guards.** `updateUser` (role change away from admin) and `setUserActive` (deactivate) both refuse when the target is the only remaining active principal admin; you also cannot deactivate your own account. This prevents locking the org out of the admin area.
- **Invites use a rotating temporary password**, not a reset-token flow (no customer-style magic link for staff in the MVP). `inviteUser`/`resendInvite` generate a high-entropy temp password, store its bcrypt hash, and email it in log/preview mode. A proper "set your password" flow is deferred.
- **Categories: deactivate over delete.** `deleteCategory` is blocked whenever any `WorkRequest` references the category (history preservation); reorder swaps `sortOrder` with the adjacent category (boundary moves are no-ops). New categories append to the end of the ordering.
- **Two-layer admin authz.** Edge middleware (`auth.config.ts`) redirects non-`PRINCIPAL_ADMIN` users away from `/admin/*`, and every admin page/server action independently calls `requireCan("admin:*")` — hiding UI is never the control. Verified at runtime: an EMPLOYEE session is 307-redirected from all `/admin` routes.

## Phase 6 notes
- **Estimate numbers get their own counter.** Added an `EstimateCounter` table (year-keyed, row-locked in a txn) rather than reusing `RequestCounter` — estimates and requests each own an independent `NNNNNN` sequence, so numbers stay clean and collision-free. The seed advances `EstimateCounter` past the seeded estimate numbers (which reuse the request sequence) to avoid collisions with new drafts.
- **Two small state machines, shared advance helper.** Estimate (`estimateStatus.ts`) and project (`projectStatus.ts`) transitions are guarded pure functions with unit tests, mirroring the request state machine. Estimate/project services mirror their status onto the parent `WorkRequest` through a new shared `advanceRequestStatusTx` (`lib/services/statusAdvance.ts`) — a **best-effort, guarded** advance: it's a no-op when the request can't legally move, so estimate/project actions never fail on an unexpected request status. (Scheduling keeps its own equivalent private helper; not refactored to avoid churn.)
- **Estimate lifecycle chosen:** `DRAFT → UNDER_REVIEW → SENT → ACCEPTED / DECLINED / EXPIRED`, with `REVISED` as a supersession path. Sending stamps `sentAt`, advances the request to `ESTIMATE_SENT`, and emails the customer post-commit (non-fatal). `reviseEstimate` flips the original to `REVISED` and opens a fresh `DRAFT` copying the figures, preserving the numbered history. Edits are refused once an estimate leaves draft/under-review.
- **Project conversion is estimate-driven.** A project is created only from an `ACCEPTED` estimate, one per request (`Project.workRequestId` is unique — enforced in code with a friendly error). Contract amount defaults from the estimate when omitted. `changeProjectStatus` auto-stamps `actualStartDate`/`actualEndDate`, archives on cancel, and mirrors onto the request (`PLANNED→PROJECT_SCHEDULED`, `IN_PROGRESS→IN_PROGRESS`, etc.).
- **Money as Decimal strings.** Amounts are validated with a `^\d{1,10}(\.\d{1,2})?$` Zod pattern and passed to Prisma `Decimal(12,2)` as strings — never JS floats. `formatMoney` (Intl currency) renders them; Decimals are converted to strings in the server component before crossing into client components (no non-serializable props).
- **Authz:** new `estimate:manage` / `project:manage` actions require **MANAGER+**. A cross-project `/projects` page is manager/admin-only (server-side `redirect` for employees, verified by E2E).

## Phase 7 notes
- **E2E covers the critical journeys with real sign-in** (`tests/e2e/`): authorization negatives, the full public-intake → estimate → project pipeline (serial), and the admin area. Playwright reuses a running dev server on :3000.
- **Stale-dev-server gotcha (documented in AGENTS/TEST_PLAN):** a long-running Next dev process bundles the generated Prisma client; after `prisma generate` adds a model, the old process throws `Cannot read properties of undefined` on it. Restart the dev server after regenerating. This surfaced as an E2E failure and is a real operational note, not a code bug (unit/integration tests use a fresh client and passed).
- **Security review = no critical/high findings.** Reviewed the Phase-6 surfaces for authz/IDOR/injection/secret-logging; details in [SECURITY.md](SECURITY.md) and [VALIDATION_REPORT.md](VALIDATION_REPORT.md).

## Phase 8 notes (deploy + branding/UX)
- **Migrations & seed run in the Vercel build, not locally.** Neon's connection strings are marked *sensitive*, so `vercel env pull` returns them blank — there's no way to run `prisma migrate deploy`/seed from a laptop. The build command (`vercel.json`) runs them where the env vars are live. Migrations use `DATABASE_URL_UNPOOLED` (`prisma.config.ts`) because the pooled/PgBouncer endpoint breaks Prisma Migrate's advisory locks.
- **First admin via env-driven idempotent script.** `scripts/createAdmin.ts` creates a `PRINCIPAL_ADMIN` from `INITIAL_ADMIN_*` env vars and no-ops if unset or already present — so the password never lives in the repo and redeploys don't clobber it. Runs in the build after migrate.
- **Production seeding is a deliberate, guarded one-off.** Re-seeding is gated behind `SEED_ON_BUILD=1` + a temporary `vercel.json` step, removed immediately after, so a routine deploy can't wipe prod. The seed preserves the real admin (it upserts only the demo users).
- **Photos: public Blob + remote seed placeholders.** Vercel Blob store is `access: public`; the gallery uses remote image URLs directly (falling back to `/api/files` for local keys). Seeded photos point at on-brand `placehold.co` URLs so they display without any local storage. Trade-off: public blob URLs are directly reachable if the (random) URL is known — acceptable for the MVP; private blobs + signed URLs are a future hardening.
- **Home page mirrors the client's real site.** `app/page.tsx` reproduces dcsconstructs.com's content (services, consultation, facilities, why-choose, contact). All Contact/estimate CTAs and the nav "Contact" point to our `/request` form; `Staff` → `/signin`.
- **Brand system.** Source Sans 3 as `--font-brand` (default app-wide) approximates the client's Adobe Freight Sans; brand tokens `#024988` navy / `#cd0e0e` red / `#1c1c1c` ink in `globals.css`. **Public pages centered, internal pages left-aligned** (deliberate: marketing site vs. dense staff console). Request-detail sections are color-coded via `lib/ui/tone.ts` for scannability.
- **Dashboard split from the request list.** `/dashboard` is an overview (stat cards + a Requests-vs-Projects explainer); `/requests` is the searchable list. `/requests` used to redirect to `/dashboard`.

## Client app (C2–C5) notes
- **Read-mostly, account-scoped portal (C2).** Every portal query is filtered by `customerAccountId`; detail lookups use `findFirst({ where: { id, customerAccountId } })` so an unowned id resolves to `null` (404), never a leak. Least-data shaping surfaces only customer-visible notes, **SENT** estimates, customer-facing status labels, and "your team lead". Photos stream through an ownership-checked portal route.
- **Request creation reuses the shared pipeline (C3).** The in-app "New request" flow calls the same `createWorkRequest` service (extended with an optional `customerAccountId`) using the **account's canonical email** (never a client value), so a portal request appears in both the app and the staff console with one source of truth.
- **Messaging authz at both layers (C4).** `ClientMessage` threads: customer calls re-check `customerAccountId` ownership; staff calls are gated by the `request:message` permission. One shared thread, near-real-time via ~8s polling.
- **Estimate accept/decline auto-converts (C5).** A customer can accept or decline a **SENT** estimate from the portal (`respondToPortalEstimate`, account-scoped/IDOR-proof, guarded on `SENT`/not-expired). **Accept auto-creates the project** (chosen over "mark approved, staff converts") in one atomic transaction — default project name = the request's category, which staff can rename in the console — reusing a shared `createProjectFromEstimateTx` extracted from `projects.ts`; decline flips the estimate + request to `DECLINED`. Customer actions are audited with `actorId: null` (customers aren't staff `User`s; `AuditLog.actorId`/`changedById` are nullable) and the account id in `metadata` (new actions `estimate.customer_accept`/`_decline`). **Documents/PDF surfacing deferred** to a later polish pass; accept/decline email notifications land in C6.

## Client app (C0/C1) notes
- **Separate, self-contained portal session** rather than folding customers into staff Auth.js. The portal uses an HMAC-signed httpOnly cookie (`lib/portal/session.ts`, keyed on `AUTH_SECRET`, no new deps) so customer and staff auth never mix roles/sessions.
- **Passwordless email one-time code** (locked decision): 6-digit, hashed at rest, single-use, 10-min expiry, attempt-capped, rate-limited; request-code never reveals whether an account exists.
- **Canonical `CustomerAccount` + lazy linking.** Intake still creates a per-submission `Customer` (contact snapshot); the account is created on first sign-in and **claims that customer's existing requests by matching email** (`updateMany` after resolving customer ids, since relation filters aren't allowed in `updateMany`).
- **Same app, new route group** (`app/app/`, `/app`) — reuses DB/services/brand; a phone-width shell + bottom tab bar + PWA (manifest scoped to `/app`, minimal service worker) gives the iPhone feel without a native build.
- **Data isolation is the gating concern for C2+**: every customer-facing query must be scoped to `customerAccountId`, with a dedicated IDOR test suite before the portal is deployed.

## Open questions (non-blocking; proceeding with defaults)
- Real project gallery content and brand assets (logo, colors) from client.
- Exact service area boundaries.
- Whether customers should eventually get full accounts (Phase 2 backlog).
- Preferred production Postgres provider (Neon/Supabase) — chosen at deploy.
