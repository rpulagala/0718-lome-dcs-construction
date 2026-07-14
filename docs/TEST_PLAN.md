# DCS Construction — Test Plan

> **Status — 2026-07-14: 95 tests passing** (12 files), typecheck + lint clean.
> **Unit (done):** request-number format/parse, status-transition machine, role/`can()` authorization, customer-visible status mapping, business-hours SLA, file validation (magic bytes / size / filename sanitize), scheduling helpers, admin validation schemas (invite/category/settings).
> **Integration (done):** `createWorkRequest` (persistence + email logging + idempotency); request mutations (`changeStatus` valid/invalid-transition guard + history, `assignRequest` + history, `addNote`, `setPriority`); scheduling (schedule/double-booking/reschedule/cancel/complete + notifications, communication + tasks); admin (user invite/role-change/activate/last-admin guard/resend, category CRUD + reorder + referenced-delete block, settings validate/persist/audit).
> **Runtime-verified (Phase 5):** admin renders `/admin`, `/admin/users`, `/admin/categories`, `/admin/settings`, `/admin/audit`; an EMPLOYEE is 307-redirected from every `/admin` route (URL-manipulation authz check); `auth.login` audit event appears in the audit view.
> **Pending:** the 5 Playwright E2E journeys; accessibility + security passes — all scheduled for Phase 7 (Vitest + Playwright configs already in place).

## Tooling
- **Vitest** — unit + integration (Node env, Prisma against a test database).
- **Playwright** — end-to-end across the 5 critical journeys.
- Stable `data-testid` selectors; avoid text-only assertions.

## Unit tests
- Zod validation schemas (request form, edge cases, rejections).
- Request-number generation (format, zero-padding, per-year rollover, concurrency).
- Status-transition rules (valid vs invalid transitions).
- Authorization helpers (role hierarchy, resource scoping).
- Notification decision logic (which status changes notify customer).
- Customer-visible status mapping.
- File-validation rules (MIME/magic-bytes, size, count, filename sanitize).

## Integration tests
- Work-request creation end-to-end (transaction commits all rows).
- Transaction behavior (rollback on failure — no partial writes).
- Image metadata record creation (no bytes in DB).
- Assignment + assignment history.
- Status change + status history.
- Site-visit scheduling + history.
- Email logging (success + failure paths; submission still succeeds on email failure).
- Category management (block delete when referenced; preserve snapshot).
- Role permissions (employee/manager/admin boundaries at the service layer).

## Playwright E2E journeys
1. **Customer Intake**: home → services → request form → fill → upload multiple photos → submit → success screen shows request number → verify record exists (admin UI or DB).
2. **Employee Processing**: sign in (employee) → open newest request → view customer details → open photo in enlarged viewer → add internal note → update status → schedule site visit → confirm timeline entries.
3. **Manager Assignment**: sign in (manager) → find unassigned request → assign to employee → set priority → confirm assignment history.
4. **Principal Administrator**: sign in (admin) → add category → edit category → deactivate category → invite/create employee → change role → view audit log.
5. **Authorization (negatives)**: employee cannot reach admin pages; customer cannot reach internal data; deactivated user cannot sign in; employee cannot perform manager-only action; direct URL manipulation does not bypass authz.

## Accessibility
- Keyboard nav, focus states, labels, accessible modals/lightbox, alt text, contrast, error summaries.
- Manual + automated checks at 375 / 768 / 1440 px.

## Per-phase gate
After each phase: `lint` → `typecheck` → relevant `test` → fix → update docs → commit. Repo never left broken.

## Definition of Done (test-related)
Lint, typecheck, unit, integration, and Playwright all green; no known critical/high security issues; final validation report produced.
