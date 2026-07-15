# DCS Construction — Security & Privacy

> **📱 Client app (2026-07-14, foundation):** the customer portal under `/app` uses a **separate passwordless auth** (email one-time code) with its own HMAC-signed httpOnly session cookie, distinct from the staff Auth.js session. Codes are 6-digit, hashed at rest (HMAC), single-use, 10-minute expiry, attempt-capped (5), and rate-limited per IP + per email; the request-code endpoint never reveals whether an account exists. Portal data access is scoped to the signed-in `customerAccountId`. **Data isolation is the top priority for C2+** — every customer-facing query must be account-scoped with dedicated IDOR/isolation tests before the portal ships to production (currently local only).
>
> **🟢 Production (2026-07-14):** deployed on Vercel with **Neon Postgres** + a **public Vercel Blob** store. Secrets (`AUTH_SECRET`, DB URLs, Blob token) are Vercel-managed env vars, never in the repo; Neon's connection strings are *sensitive* (not pullable locally). HTTPS is enforced by Vercel. **Two accepted-risk items in the current prod instance:** (1) the seed loaded **demo `@dcs.example` staff accounts** (shared password `Password123!`) — deactivate them via Admin → Users before real use; (2) Blob is **public-access**, so a photo URL is reachable by anyone who has the (random) URL — move to private blobs + signed URLs if strict privacy is required.
>
> **Status — 2026-07-14 (through Phase 7 — security review complete):**
> **Implemented & verified** — bcrypt (cost 12) credentials auth; deactivated-user rejection; server-side RBAC via `can(action)`; split edge/Node auth config; upload magic-byte validation + size/count limits + filename sanitization + randomized storage keys + private storage behind the auth-guarded `/api/files` route (401 without a session); per-IP rate limiting on the public upload/submit endpoints; idempotency on submission; safe user-facing error messages; secrets via env vars (`.env` git-ignored); structured logging that omits secrets.
> Phase 3 adds **server-side authorization on every internal mutation** — status change, assignment, priority, and notes go through server actions gated by `requireCan(...)`; the state machine rejects invalid transitions server-side; internal photos are served only to authenticated staff.
> Phase 5 adds the **admin area** — every user/category/settings mutation is gated by `requireCan("admin:*")` and edge middleware (an EMPLOYEE is redirected from all `/admin` routes; verified), guarded against removing the last active principal admin and self-deactivation, and writes an **`AuditLog`** entry (login, user create/role-change/activate/deactivate/invite-resend, category create/update/reorder/activate/deactivate/delete, settings update) via the append-only `recordAudit` writer.
> Phase 6 adds **estimates & projects** — every estimate/project/milestone mutation goes through a server action gated by `requireCan("estimate:manage" | "project:manage")` (MANAGER+; an EMPLOYEE has neither and is blocked, verified by E2E) and writes an `AuditLog` entry (`estimate.*`, `project.*`). Estimate/project **state machines reject invalid transitions server-side**; edits are refused once an estimate leaves draft/under-review. Money is stored and moved as **`Decimal` strings** (Zod-validated `^\d{1,10}(\.\d{1,2})?$`) — no floats. `updateProject` writes only a **whitelisted field set** (no mass-assignment). These surfaces are entirely staff-internal (no customer-facing route), so cross-request access by a trusted MANAGER is within the single-company trust boundary, not an IDOR.
> **Phase 7 security review (complete):** reviewed the estimate/project code paths for authz, IDOR, injection (Prisma parameterized only), and secret/PII logging — **no critical/high findings**. Playwright authorization negatives codify the server-side checks (unauth redirects; employee blocked from `/admin` and `/projects`). See [VALIDATION_REPORT.md](VALIDATION_REPORT.md).
> **Pending / accepted for post-MVP** — signed/expiring customer status links, CAPTCHA/bot provider wiring (seam only today), security-header hardening, and a least-privilege DB role. AuditLog coverage of assignment/status changes still relies on the per-request history tables plus the timeline.

## Threat model summary
Public-facing intake form (unauthenticated, accepts file uploads) + internal RBAC console holding customer PII. Primary risks: spam/abuse of the public form, malicious uploads, IDOR on request/photo access, privilege escalation, PII leakage.

## Authentication
- Internal users: Auth.js Credentials provider, passwords hashed with **bcrypt** (cost ≥ 12). Sessions via secure, httpOnly, sameSite cookies.
- Deactivated users (`User.isActive = false`) are rejected at sign-in and on every request (checked in session callback / middleware).
- Request-status access (staff-triggered, no login) is via a **signed, expiring, single-use magic link** — the raw token is emailed; only a hash (`CustomerAccessToken.tokenHash`) is stored.
- **Client portal (customer app, `/app`)** — customers sign in with a **passwordless 6-digit email code** (`CustomerLoginCode`, hashed at rest, single-use, expiring, rate-limited/attempt-capped) and hold a **self-contained HMAC-signed session cookie** ([lib/portal/session.ts](../lib/portal/session.ts)) that is entirely **separate from the staff Auth.js session**. The code request never reveals whether an account exists.

## Authorization (server-enforced)
- Role hierarchy: `EMPLOYEE < MANAGER < PRINCIPAL_ADMIN`.
- Central `authorize(session, action, resource)` helper used in every server action / route handler. **Hiding a UI button is never the control.**
- Route groups: `/(public)`, `/(app)` (employee+), `/(app)/admin` (principal admin only). Enforced in middleware **and** re-checked in each server action.
- IDOR protection: every request/photo/estimate fetch is scoped by role; employees only see authorized requests; customers only reach data tied to their validated token.
- **Client portal isolation** — every portal read goes through [lib/services/portalData.ts](../lib/services/portalData.ts) scoped to the signed-in `customerAccountId`; detail lookups use `findFirst({ where: { id, customerAccountId } })` so an id the customer doesn't own resolves to **404**, never another customer's data. Responses are shaped to **least-data** (only `CUSTOMER_VISIBLE` notes, only **sent** estimates, customer-facing status labels — never internal notes/statuses/staff assignments). Portal photos stream through a **separate, ownership-checked** route ([app/api/portal/files/[...key]/route.ts](../app/api/portal/files/%5B...key%5D/route.ts)) that serves a key only when it belongs to a request linked to the account — the staff `/api/files` route is never trusted for portal access. Codified by the `tests/integration/portalData.test.ts` isolation suite (list scoping, detail-ownership IDOR negative, notes/estimate least-data). The one portal **write** path (in-app "New request", [app/app/projects/new/actions.ts](../app/app/projects/new/actions.ts)) is session-guarded and rate-limited, forces the request's email to the **authenticated account's** canonical email (client-supplied email/consent are never trusted), and stamps `customerAccountId` server-side — covered by `tests/integration/portalRequests.test.ts`.

## Input validation & output handling
- **Zod** schemas shared client + server; server is authoritative.
- Output encoding by default via React; no `dangerouslySetInnerHTML` on user content.
- Parameterized queries only (Prisma) — no raw string SQL.
- CSRF: Auth.js built-in protection; server actions are same-origin + token-checked.

## File upload security
- Accept only image MIME types (`image/jpeg`, `image/png`, `image/webp`, `image/heic`); verify by magic-bytes, not just extension.
- Reject executables/unsupported types; enforce per-file size limit (default 10 MB) and per-request count limit (default 10).
- Sanitize filenames; store under **randomized storage keys**; never trust client-provided paths.
- Private Vercel Blob; downloads via **short-lived signed URLs** only. No public bucket listing.
- Strip/ignore uploaded file when validation fails; log the rejection (not the file bytes).

## Public-form abuse controls
- **Rate limiting** abstraction on the submission endpoint (per-IP + per-email sliding window).
- **CAPTCHA/bot** abstraction seam (pluggable; off in dev, on in prod).
- **Idempotency key** prevents double-submit from double-click/retry.

## Transport & headers
- HTTPS only (Vercel). Security headers: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security`.

## Secrets
- All secrets via environment variables; `.env` git-ignored; `.env.example` documents keys with no values.
- No secrets, tokens, session cookies, or file contents in logs.

## Logging / PII
- Structured logs with correlation IDs. **Never log**: auth secrets, access tokens, full session cookies, uploaded-file contents, or customer PII beyond what's needed for the event.
- Customer address/phone/email never exposed through public URLs or client bundles not required by the current user.

## Audit
- `AuditLog` records: login, user creation/role change, assignment, status change, customer-data edits, file access/deletion, settings changes, exports, archive/restore.

## Data retention
- Business records soft-deleted/archived (`archivedAt`), never hard-deleted through normal UI. Retention policy documented for future automated purge.

## Database access
- Application connects with a least-privilege role (DML only; no DDL/superuser in runtime).

## Known accepted risks (MVP)
- CAPTCHA provider not wired (seam only) — acceptable behind rate limiting for MVP; flagged for Phase 2 backlog.
- External calendar integration deferred (no OAuth scopes stored).
