# DCS Construction — Test Plan

> **Status — 2026-07-14: 120 unit/integration tests (14 files) + 11 Playwright E2E tests passing**, typecheck + lint clean, `next build` green.
> **Unit (done):** request-number format/parse, status-transition machine, **estimate + project state machines**, role/`can()` authorization, customer-visible status mapping, business-hours SLA, file validation (magic bytes / size / filename sanitize), scheduling helpers, admin validation schemas (invite/category/settings).
> **Integration (done):** `createWorkRequest` (persistence + email logging + idempotency); request mutations (`changeStatus` valid/invalid-transition guard + history, `assignRequest` + history, `addNote`, `setPriority`); scheduling (schedule/double-booking/reschedule/cancel/complete + notifications, communication + tasks); admin (user invite/role-change/activate/last-admin guard/resend, category CRUD + reorder + referenced-delete block, settings validate/persist/audit); **estimates & projects** (create/edit-guard/send+email/accept/decline/revise; convert-to-project + one-project guard; milestone add/complete/delete + sort order; project status mirrored onto the request).
> **E2E (done, Phase 7):** all 5 journeys below, 10 specs, green headless against a dev server (`npm run test:e2e`).
> **Runtime-verified:** admin renders `/admin/*`; an EMPLOYEE is redirected from every `/admin` route and from `/projects` (URL-manipulation authz check); the full public-intake → estimate → project pipeline works through the real UI.

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

## Playwright E2E journeys (`tests/e2e/`, all green)
1. **Customer Intake** (`customer-journey.spec.ts`): request form → fill → submit → confirmation screen shows an `DCS-YYYY-NNNNNN` number.
2. **Employee/Admin Processing** (`customer-journey.spec.ts`): sign in → search + open the new request → change status → add internal note → confirm the timeline entry.
3. **Estimate → Project** (`customer-journey.spec.ts`): draft an estimate → send (customer email) → accept → convert to a project → add a milestone → confirm it appears on the cross-project `/projects` view. (Covers the manager/estimate journey.)
4. **Principal Administrator** (`admin.spec.ts`): sign in (admin) → view users → add a project category.
5. **Authorization (negatives)** (`auth.spec.ts`, 5 cases): unauthenticated → redirected from dashboard and from a request-detail URL; invalid credentials show an error; an employee is redirected from `/admin`; an employee is redirected from `/projects`.
6. **Week calendar** (`calendar.spec.ts`): the grid + color legend render; clicking an employee chip filters the view (URL carries `assigned=`); week navigation preserves the filter.

> **E2E ops note:** Playwright reuses an existing dev server on port 3000 (`reuseExistingServer` when not in CI). After `prisma generate`, **restart the dev server** — a long-running dev process bundles a stale Prisma client and will throw on new models (this bit us once with `EstimateCounter`).

## Accessibility
- Keyboard nav, focus states, labels, accessible modals/lightbox, alt text, contrast, error summaries.
- Manual + automated checks at 375 / 768 / 1440 px.

## Per-phase gate
After each phase: `lint` → `typecheck` → relevant `test` → fix → update docs → commit. Repo never left broken.

## Definition of Done (test-related)
Lint, typecheck, unit, integration, and Playwright all green; no known critical/high security issues; final validation report produced.
