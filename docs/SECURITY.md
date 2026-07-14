# DCS Construction — Security & Privacy

> **Status — 2026-07-13 (through Phase 2):**
> **Implemented & verified** — bcrypt (cost 12) credentials auth; deactivated-user rejection; server-side RBAC via `can(action)`; split edge/Node auth config; upload magic-byte validation + size/count limits + filename sanitization + randomized storage keys + private storage behind the auth-guarded `/api/files` route (401 without a session); per-IP rate limiting on the public upload/submit endpoints; idempotency on submission; safe user-facing error messages; secrets via env vars (`.env` git-ignored); structured logging that omits secrets.
> Phase 3 adds **server-side authorization on every internal mutation** — status change, assignment, priority, and notes go through server actions gated by `requireCan(...)`; the state machine rejects invalid transitions server-side; internal photos are served only to authenticated staff.
> **Pending (later phases)** — full `AuditLog` coverage (Phase 5), signed/expiring customer status links (Phase 4/5), CAPTCHA/bot provider wiring (seam only today), security-header hardening + least-privilege DB role + the full security review (Phase 7).

## Threat model summary
Public-facing intake form (unauthenticated, accepts file uploads) + internal RBAC console holding customer PII. Primary risks: spam/abuse of the public form, malicious uploads, IDOR on request/photo access, privilege escalation, PII leakage.

## Authentication
- Internal users: Auth.js Credentials provider, passwords hashed with **bcrypt** (cost ≥ 12). Sessions via secure, httpOnly, sameSite cookies.
- Deactivated users (`User.isActive = false`) are rejected at sign-in and on every request (checked in session callback / middleware).
- Customers do **not** get accounts in the MVP. Request-status access is via a **signed, expiring, single-use magic link** — the raw token is emailed; only a hash (`CustomerAccessToken.tokenHash`) is stored.

## Authorization (server-enforced)
- Role hierarchy: `EMPLOYEE < MANAGER < PRINCIPAL_ADMIN`.
- Central `authorize(session, action, resource)` helper used in every server action / route handler. **Hiding a UI button is never the control.**
- Route groups: `/(public)`, `/(app)` (employee+), `/(app)/admin` (principal admin only). Enforced in middleware **and** re-checked in each server action.
- IDOR protection: every request/photo/estimate fetch is scoped by role; employees only see authorized requests; customers only reach data tied to their validated token.

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
