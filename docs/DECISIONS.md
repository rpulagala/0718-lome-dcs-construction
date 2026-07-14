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

## Open questions (non-blocking; proceeding with defaults)
- Real project gallery content and brand assets (logo, colors) from client.
- Exact service area boundaries.
- Whether customers should eventually get full accounts (Phase 2 backlog).
- Preferred production Postgres provider (Neon/Supabase) — chosen at deploy.
