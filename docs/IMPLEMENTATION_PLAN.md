# DCS Construction — Detailed Project Plan

> **Build status — 2026-07-14:** Phases **0–7 complete and verified**, then **deployed to production** — **🟢 live at https://0718-lome-dcs-construction.vercel.app** (Vercel + Neon Postgres + Vercel Blob). **120 unit/integration tests + 11 Playwright E2E tests passing**, typecheck + lint clean, `next build` green. Local PostgreSQL runs via Docker on host port **5433**, migrated + seeded (8 users incl. the real admin, 14 categories, 5 settings, 28 work requests incl. 2 rich showcase jobs, photos, site visits, estimates, 4 projects). Dev login: `admin@dcs.example` / `Password123!`. Phase-by-phase progress is tracked below and in [DECISIONS.md](DECISIONS.md); deployment details in [DEPLOYMENT.md](DEPLOYMENT.md).
>
> | Phase | State |
> |---|---|
> | 0 — Discovery & documentation | ✅ Complete |
> | 1 — Foundation (scaffold, DB, auth) | ✅ Complete & verified |
> | 2 — Public intake | ✅ Complete & verified |
> | 3 — Internal request management | ✅ Complete & verified |
> | 4 — Scheduling & communication | ✅ Complete & verified |
> | 5 — Admin & configuration | ✅ Complete & verified |
> | 6 — Estimates & projects | ✅ Complete & verified |
> | 7 — Testing & hardening | ✅ Complete & verified |
> | 8 — Deploy + branding/UX polish | ✅ Complete — live on Vercel |

> Work intake & tracking web application (production-ready MVP)
> Source of truth: `project_requirement.txt` (the build prompt) + `DCS Construction Site Map 3 (1).pdf` (original 3-year-old rough concept)
> Plan date: 2026-07-13

---

## 0. How to read this plan

This is the master execution plan. It defines **what** gets built, **in what order**, **how each phase is verified**, and — per the explicit instruction — **which Claude model to use for each kind of work so we always pay the cheapest rate that still holds quality**. See [§2 Model Cost Strategy](#2-model-cost-strategy).

The prompt also asks for these companion docs, which this plan drives the creation of:
`README.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/SECURITY.md`, `docs/TEST_PLAN.md`, `docs/DECISIONS.md`, and this `docs/IMPLEMENTATION_PLAN.md`.

---

## 1. What the two source documents tell us

### 1.1 From the original PDF (the "rough idea", ~3 years old)
The PDF is a 3-screen mobile site map. It establishes the *business intent*, not the final UX:

| PDF concept | What we keep | What we modernize |
|---|---|---|
| iOS app, home page with 3 areas: Construction, Handyman, Consultation | Multi-service intent | Build a **responsive web app**, lead with Construction, design nav so Handyman/Consultation slot in later |
| Construction screen → Residential & Commercial galleries → "Schedule Site Visit" | Galleries + site-visit CTA | Modern responsive gallery w/ accessible lightbox |
| Intake form: Name, Phone, Email, Street Address, Project Category (dropdown ~10-13), description, photo upload | All fields | Add server+client validation, more fields, real upload pipeline |
| Thank-you screen + confirmation email ("within 48 hours") | Confirmation UX + email | 48 **business** hours SLA, email logged & abstracted |
| Admin list: sortable Name / Date / Contact / Description; click row → full request; click photo → enlarge | Dashboard + detail + lightbox | Full filtering/search/pagination, status workflow, timeline |
| Principal Admin: all requests + master Project Category list | Admin area + category management | DB-driven categories, user mgmt, audit log, settings |
| Marketing/subscription upsell in email | Restrained marketing section | Keep it subordinate to the confirmation |

**Project categories from the PDF** (these become seed data, DB-driven): Home Remodel, Kitchen Remodel, Bathroom Remodel, Interior Construction, Interior Painting, Exterior Painting, Deck Construction, Construction Consulting, Interior Repairs, Exterior Repairs, Electrical Upgrades, Plumbing Upgrades, Minor Repairs (Handyman), + "Other".

### 1.2 From the build prompt
Expands the rough idea into a full lifecycle: submit → confirm → employee review → qualify → schedule site visit → assign → estimate/project tracking → status updates → customer notifications → complete/cancel/archive. Three user groups (public customer, employee, principal admin) plus a Manager role in between. Single-company MVP, architected so multi-tenancy *could* be added later.

### 1.3 Project classification
**New greenfield project.** The directory contains only the two source docs — no existing code. So: no migration/compatibility constraints; we adopt the preferred stack directly.

---

## 2. Model Cost Strategy

**Principle (per instruction): always downgrade to the cheapest model that does not degrade quality.**

Relative cost/capability of available models (cheapest → most expensive):

`Haiku 4.5`  <  `Sonnet 5`  <  `Opus 4.8`

- **Haiku 4.5** — cheapest & fastest. Use for mechanical, low-ambiguity, well-specified work where a mistake is cheap to catch (lint/type errors surface it immediately).
- **Sonnet 5** — mid tier. The **default workhorse** for standard feature implementation. Strong coding quality at a fraction of Opus cost.
- **Opus 4.8** — most expensive & most capable. Reserve for high-leverage, high-ambiguity, or high-blast-radius decisions where a wrong call is expensive to unwind (schema, security, auth, tricky concurrency).
- **Fable 5** — creative/writing-oriented Claude 5 model. **Not recommended** for this engineering build; no cost justification over Sonnet for code.

### 2.1 Model-per-task routing table

| Work type | Model | Why this is the cheapest safe choice |
|---|---|---|
| **Data model / Prisma schema, ERD** | **Opus 4.8** | Schema mistakes propagate through every layer and migrations are costly to reverse. Highest leverage — pay once, up front. |
| **Security design & authz model** (RBAC, signed URLs, IDOR, rate limiting) | **Opus 4.8** | Security defects are the most expensive class of bug. Do not economize here. |
| **Status-transition state machine + notification decision logic** | **Opus 4.8 → Sonnet 5** | Design the state machine on Opus once; implement the transitions on Sonnet. |
| **Architecture doc & phase interfaces** | **Opus 4.8** | Sets contracts everything else depends on. |
| Standard feature implementation (forms, dashboard, detail page, CRUD server actions/API routes, most React/UI) | **Sonnet 5** | Default. Fully specified in the prompt; Sonnet handles it cleanly. |
| Prisma queries, filters, pagination, search wiring | **Sonnet 5** | Mechanical once the schema exists. |
| Email templates + email-service abstraction | **Sonnet 5** | Standard integration work. |
| Zod schemas, request-number generator, validation helpers | **Sonnet 5 → Haiku 4.5** | Author on Sonnet; expand variants/edge cases on Haiku. |
| Unit tests, integration test scaffolding | **Sonnet 5** | Needs to understand intent; still cheaper than Opus. |
| Playwright E2E flows (using stable selectors) | **Sonnet 5** | Multi-step reasoning about journeys. |
| **Boilerplate**: config files, `.env.example`, tsconfig, tailwind/shadcn setup, CI yaml | **Haiku 4.5** | Rote, verified instantly by tooling. |
| **Seed data** generation (25+ fake requests, users, etc.) | **Haiku 4.5** | Pattern-fill work, no ambiguity. |
| Docs prose (README, user guide, deployment guide) | **Haiku 4.5 → Sonnet 5** | Haiku drafts; Sonnet only if structure is subtle. |
| Lint/type-error fixups, mechanical refactors, renames | **Haiku 4.5** | Compiler tells you if it's wrong. |
| Cross-phase review / "is the repo coherent?" checkpoints | **Opus 4.8** | Cheap insurance at phase boundaries; catches drift before it compounds. |

### 2.2 Operating rule
Start each task at the **lowest tier in the table**. Escalate one tier only if the model stalls, loops, or produces work that fails lint/type/test. Downgrade again for the next task. Never run boilerplate or seed data on Opus.

> Note on *this* session: I (Opus 4.8) am producing the plan. I can't silently switch my own model mid-session — model changes are driven from the Claude Code UI / `/model`. The routing table above is the instruction set for *executing* the phases; apply it by selecting the model before each work block.

---

## 3. Technology Stack (locked)

- **Framework**: Next.js (App Router) + TypeScript strict
- **UI**: React + Tailwind CSS + shadcn/ui
- **DB**: PostgreSQL + Prisma ORM (UUID PKs + human-readable request numbers)
- **Auth**: Auth.js (Credentials + optional email) — internal users only; customers use magic-link status access, not accounts
- **Object storage**: Vercel Blob (private) for uploaded photos — DB stores metadata + keys only
- **Email**: Resend behind a `MailService` abstraction; dev = preview/log mode
- **Validation**: Zod (shared client/server) + React Hook Form
- **Testing**: Vitest (unit/integration) + Playwright (E2E)
- **Deploy**: Vercel-compatible; secrets via env vars
- **Rate limiting / bot**: abstraction on public form (Upstash-ratelimit-style interface + CAPTCHA seam)

Decisions & alternatives recorded in `docs/DECISIONS.md`.

---

## 4. Phased Execution Plan

Each phase ends with the **gate**: lint → typecheck → relevant tests → fix → update docs → commit. *Never leave the repo broken between phases.*

### Phase 0 — Discovery & Documentation  ✅ Complete
**Model: Opus 4.8** (schema/security/arch) + **Haiku 4.5** (doc scaffolding)
- [x] Read PDF (all pages) + prompt
- [ ] Write `PRODUCT_REQUIREMENTS.md`, `ARCHITECTURE.md`, `DATA_MODEL.md` (Prisma + Mermaid ERD), `SECURITY.md`, `TEST_PLAN.md`, `DECISIONS.md`
- **Exit gate**: architecture + data model reviewed and documented **before** any broad coding.

### Phase 1 — Planning & Foundation  ✅ Complete
**Model: Haiku 4.5** (scaffold/config) → **Opus 4.8** (schema) → **Sonnet 5** (auth)
- Scaffold Next.js app, Tailwind, shadcn/ui, ESLint/Prettier, Vitest, Playwright, CI
- Prisma schema + first migration (all entities from §14)
- Auth.js setup; Role model (Employee / Manager / Principal Admin); server-side authz helpers
- `.env.example`, health-check endpoint, structured logging + correlation IDs
- **Exit**: app boots, DB migrates, seed skeleton runs, auth login works, gate passes.

### Phase 2 — Public Intake  ✅ Complete
**Model: Sonnet 5** (features) + **Haiku 4.5** (static content/galleries seed)
- Landing page (hero, services, galleries, CTA, contact, service area, footer)
- Construction Services page + responsive gallery with accessible lightbox
- Work Request form (all required/optional fields, DB-driven categories)
- Photo upload pipeline: multi-file, drag-drop + mobile camera, progress, thumbnails, remove, MIME/type/size validation, filename sanitize, count limit, compress, private Blob storage
- Submission processing: client+server validation, DB transaction, request number `DCS-YYYY-NNNNNN`, status-history + timeline seed, **idempotency key** to block double-submit
- Confirmation page + confirmation email (via MailService, logged)
- **Exit**: a customer can submit w/ photos, gets confirmation page + email, record persists; email failure does **not** fail the submission.

### Phase 3 — Internal Request Management  ✅ Complete
**Model: Sonnet 5** (dashboard/detail) + **Opus 4.8** (status state machine)
- Employee dashboard: summary cards, work-request table (sort/filter/search/paginate, mobile cards, empty/loading/error states)
- Filters + cross-field search per prompt §7; default view surfaces new + overdue
- Request detail page (stable URL, not a popup): customer info, location, project info, **photo lightbox**, internal management panel
- Internal notes vs customer-visible notes; activity timeline; status history
- Status workflow: full internal statuses + customer-facing mapping; record who/when/reason; invalid-transition guards
- Assignment, priority, follow-up/due dates, tasks, contact attempts; 48-business-hour SLA/overdue indicator
- **Exit**: employee can find, open, annotate, re-status, and assign requests; every change is on the timeline.

### Phase 4 — Scheduling & Communication  ✅ Complete
**Model: Sonnet 5**
- [x] Site-visit scheduling (fields + appointment statuses + reschedule history), internal calendar view, double-booking guard
- [x] Customer + assigned-employee notifications on schedule/change/cancel
- [x] Communication log; follow-up tasks
- [x] Calendar integration boundary (Google/Outlook) stubbed — **not** blocking (iCal `.ics` export seam + `CalendarProvider` interface)
- **Exit**: visits schedulable, notifications fire & are logged, timeline updated. ✅

**What shipped:**
- `lib/domain/scheduling.ts` — pure helpers: `visitWindow`, `rangesOverlap`, `combineDateTime`, active-status set (unit-tested).
- `lib/services/scheduling.ts` — `scheduleSiteVisit` / `rescheduleSiteVisit` / `cancelSiteVisit` / `completeSiteVisit`. Each records `SiteVisitHistory`, a `WorkRequestActivity`, advances the request status through the guarded state machine (no double-email), and fires customer + assigned-employee notifications post-commit (non-fatal). Double-booking guard via `findVisitConflict`.
- `lib/services/communication.ts` — `logCommunication`, `createTask`, `toggleTask`.
- `lib/services/schedulingQueries.ts` — `listSiteVisits` for the calendar.
- `lib/services/calendarSync.ts` — `CalendarProvider` interface, no-op provider, `buildICalEvent` (.ics). Downloaded via `GET /api/calendar/[siteVisitId]`.
- UI: `SchedulePanel`, `CommunicationForm`, `TaskList` on the request detail page; new `/calendar` internal view + nav link.
- Email templates: `renderSiteVisitScheduled` / `Rescheduled` / `Cancelled` + `renderEmployeeVisitAssignment`.
- Tests: `tests/unit/scheduling.test.ts`, `tests/integration/scheduling.test.ts` (schedule, double-booking, reschedule, cancel, complete, notification logging, communication + tasks).

### Phase 5 — Admin & Configuration  ✅ Complete
**Model: Sonnet 5** + **Opus 4.8** (audit-log correctness spot check)
- [x] User management (invite/edit/role/activate/deactivate/resend)
- [x] Project category management (add/rename/reorder/activate; block delete when referenced; preserve history)
- [x] Company settings (profile, service area, response message, intake recipients, upload limits)
- [x] Workflow settings (default status/priority, response target, notification/assignment rules)
- [x] Audit log capturing the §13 event list
- **Exit**: admin manages users + categories + settings; audit log records events; server authz blocks non-admins (verified by URL manipulation test). ✅

**What shipped:**
- `lib/services/audit.ts` — `recordAudit(entry, tx?)`: append-only audit writer with a stable `AuditAction` taxonomy; never breaks the action it records (swallows write errors outside a transaction, propagates inside one for atomicity).
- `lib/services/settings.ts` — typed `getSetting` / `getAllSettings` / `updateSetting` over `CompanySetting`, each value validated against its Zod schema before persistence; audits `settings.update`.
- `lib/services/userAdmin.ts` — `listUsers` / `inviteUser` / `updateUser` / `setUserActive` / `resendInvite`. Invites create a bcrypt-hashed temporary password + email the invite (log mode); guards prevent removing the last active principal admin and self-deactivation. Audits create/update/role_change/activate/deactivate/invite_resend.
- `lib/services/categoryAdmin.ts` — `listCategories` (with request counts) / `createCategory` / `updateCategory` / `setCategoryActive` / `reorderCategory` (neighbor swap) / `deleteCategory` (blocked when referenced — deactivate to preserve history). Audits every mutation.
- `lib/services/auditQueries.ts` — `listAuditLogs` paginated, newest first, actor joined.
- `lib/validation/admin.ts` — Zod schemas for invites, edits, categories, and each settings key (`SETTING_SCHEMAS`).
- `auth.ts` now records an `auth.login` audit event on successful sign-in.
- `lib/services/requestService.ts` — intake alert recipients now resolve from the admin-managed `intake_notify_emails` setting, falling back to `INTAKE_NOTIFY_EMAILS` env.
- UI: `/admin` overview + `/admin/users`, `/admin/categories`, `/admin/settings`, `/admin/audit` (server components) with `AdminNav`, `UsersManager`, `CategoriesManager`, `SettingsManager` clients; all guarded by `requireCan("admin:*")` and edge middleware.
- Email template: `renderUserInvite`.
- Tests: `tests/unit/adminValidation.test.ts` (schemas), `tests/integration/admin.test.ts` (invite/role/activate/last-admin guard/resend, category CRUD + reorder + referenced-delete block, settings validate/persist/audit). Runtime-verified: admin renders all four pages; an EMPLOYEE is 307-redirected from every `/admin` route (URL-manipulation check).

### Phase 6 — Estimates & Projects  ✅ Complete
**Model: Sonnet 5**
- [x] Estimate section (number, status Draft→Revised, amounts, dates, attachment placeholder)
- [x] Project conversion on approval (name, dates planned/actual, PM, contract amount, milestones, progress)
- **Exit**: estimate lifecycle + project record + milestones tracked. ✅

**What shipped:**
- `lib/domain/estimateStatus.ts` — estimate state machine (`DRAFT → UNDER_REVIEW → SENT → ACCEPTED/DECLINED/EXPIRED`, with `REVISED` supersession; `ACCEPTED`/`REVISED` terminal), editability rule, labels (unit-tested).
- `lib/domain/projectStatus.ts` — project state machine (`PLANNED → IN_PROGRESS ↔ ON_HOLD → COMPLETED/CANCELLED`), `requestStatusForProject` mapping to mirror onto the parent request, labels (unit-tested).
- `lib/services/statusAdvance.ts` — shared `advanceRequestStatusTx` helper: best-effort, guarded advance of a work request inside a transaction (records status history + timeline activity, no email side-effect).
- `lib/services/estimates.ts` — `createEstimate` / `updateEstimate` (draft/under-review only) / `changeEstimateStatus` (SENT stamps `sentAt`, advances request to ESTIMATE_SENT, emails the customer post-commit; ACCEPTED → APPROVED; DECLINED → DECLINED) / `reviseEstimate` (flips the original to REVISED, opens a fresh DRAFT copying figures). Estimate numbers `EST-YYYY-NNNNNN` allocated via the new **`EstimateCounter`** table. Every mutation audited.
- `lib/services/projects.ts` — `createProjectFromEstimate` (guarded: estimate must be ACCEPTED, one project per request; advances request to PROJECT_SCHEDULED; contract defaults from the estimate) / `updateProject` (whitelisted fields) / `changeProjectStatus` (mirrors onto the request; auto-stamps actual start/end; archives on cancel) / `addMilestone` / `toggleMilestone` / `deleteMilestone`. Every mutation audited.
- `lib/services/projectQueries.ts` — `listProjects` paginated with status/manager filters + milestone progress.
- `lib/validation/estimate.ts` — Zod schemas (money + date formats) for estimate, project create/update, and milestone.
- Schema: added `EstimateCounter`; extended `AuditAction` (estimate.*/project.*) and the `estimate:manage`/`project:manage` role actions (MANAGER+). Migration `20260714061931_estimate_counter`. Seed advances the estimate counter past seeded numbers.
- UI: `EstimatesPanel` + `ProjectPanel` on the request detail page (`app/requests/[id]`), a manager-only cross-project `/projects` list page, a `Projects` nav link, `formatMoney` util, and the `renderEstimateSent` email template.
- Tests: `tests/unit/estimateStatus.test.ts`, `tests/unit/projectStatus.test.ts`, `tests/integration/estimatesProjects.test.ts` (create/edit/send+email/accept/convert/milestones/status-mirror/revise + guard cases).

### Phase 7 — Testing & Hardening  ✅ Complete
**Model: Sonnet 5** (tests) + **Opus 4.8** (security review) + **Haiku 4.5** (doc polish)
- [x] Unit tests (validation, request-number, status transitions, authz helpers, notification decisions, status mapping, file rules) — 9 unit files
- [x] Integration tests (creation/transaction, image metadata, assignment, status history, site visits, email log, categories, permissions, estimates/projects) — 5 integration files
- [x] Playwright journeys: Customer Intake, Employee Processing, Manager Assignment, Principal Admin, Authorization (5 negative cases) — `tests/e2e/`
- [x] Accessibility notes (WCAG 2.1 AA; 375 / 768 / 1440px) + security review — see [SECURITY.md](SECURITY.md) and [VALIDATION_REPORT.md](VALIDATION_REPORT.md)
- [x] Deployment guide, user guide, final validation report
- **Exit = Definition of Done** (prompt §24): all gates green, no known critical/high security issues. ✅

**What shipped:**
- `tests/e2e/helpers.ts` (real credentials sign-in), `tests/e2e/auth.spec.ts` (5 authorization negatives: unauth → sign-in on dashboard + request URL, invalid-login error, employee blocked from `/admin` and `/projects`), `tests/e2e/customer-journey.spec.ts` (serial: public intake → confirmation number → admin status change + note → estimate draft/send/accept → project conversion + milestone → cross-project view), `tests/e2e/admin.spec.ts` (users list + category create). All 10 pass headless against a dev server.
- Security review pass folded into `SECURITY.md` (estimate/project authz, IDOR posture, money handling, audit coverage).
- New docs: `DEPLOYMENT.md`, `USER_GUIDE.md`, `VALIDATION_REPORT.md`.

### Phase 8 — Deploy + branding/UX polish  ✅ Complete (live)
**Post-plan work done after the feature build.**
- [x] **Deployed to Vercel** — **live at https://0718-lome-dcs-construction.vercel.app**. **Neon Postgres** via the Vercel Marketplace; **public Vercel Blob** store for photos (`BLOB_MODE=vercel`). Build (`vercel.json`) runs `prisma migrate deploy` (using `DATABASE_URL_UNPOOLED`) + an idempotent `scripts/createAdmin.ts` + `next build`. Production seeded via a one-time guarded seed step; real admin `rpulagala@gmail.com`.
- [x] **Public home page rebuilt to mirror dcsconstructs.com** (services, consultation, facilities maintenance, why-choose, contact); every Contact/estimate CTA → `/request`, `Staff` → `/signin`.
- [x] **Branding** — Source Sans 3 brand font; navy `#024988` / red `#cd0e0e` tokens; navy site + console headers; public centered / internal left-aligned.
- [x] **Dashboard split from Requests** (`/dashboard` overview + explainer; `/requests` list). **Week-grid calendar** color-coded per employee. **Request-detail sections color-coded** (`lib/ui/tone.ts`); notes + communication grouped into single cards.
- [x] **Richer seed** — two full-lifecycle showcase requests→projects (`DCS-2026-000027`, `DCS-2026-000028`); seeded photos use remote placeholder images.
- [x] **Client delivery report** — `DCS_Construction_Delivery_Report.pdf` (in repo root).
- **Not yet wired in prod (backlog):** real email (Resend key + verified domain), custom domain, self-service password change, deactivating the demo `@dcs.example` accounts, private-blob signed URLs.

---

## 5. Data Model (targets for `docs/DATA_MODEL.md`)
Entities: User, Role, Customer, Address, WorkRequest, ProjectCategory, WorkRequestPhoto, WorkRequestAttachment, WorkRequestStatusHistory, WorkRequestAssignmentHistory, WorkRequestNote, WorkRequestActivity, Task, SiteVisit, SiteVisitHistory, Communication, Estimate, Project, ProjectMilestone, Notification, EmailLog, CustomerAccessToken, CompanySetting, AuditLog.

Rules: UUID/non-sequential internal IDs; separate human-readable request number; `createdAt`/`updatedAt` everywhere; soft-delete/archival for business records; preserve historical statuses/assignments; proper indexes; no "everything in one JSON blob"; UTC storage, company-tz display; no hard-delete of customer submissions via normal UI. Deliver Prisma schema + **Mermaid ERD**.

---

## 6. Cross-cutting requirements (apply in every phase)
- **Security** (prompt §16): server-side RBAC, input validation, output encoding, CSRF, rate limiting, secure uploads (MIME verify, size limits, randomized keys, signed URLs), IDOR/SQLi/XSS protection, security headers, safe errors, secret management, audit logs, least-privilege DB, retention docs. Never log secrets/tokens/session cookies/file contents.
- **Accessibility/Responsive** (§17): labels, keyboard nav, focus states, semantic HTML, accessible modals, alt text, contrast, error summaries, touch targets, responsive tables/cards.
- **Observability** (§20): structured logs, error-tracking abstraction, health check, DB check, email/upload failure logging, correlation IDs.
- **UX** (§22): consistent status badges, destructive-action confirmations, toasts as *secondary* signals, stable linkable URLs for request details.

---

## 7. Seed data (Phase 1/2) — **Haiku 4.5**
1 principal admin, 2 managers, 4 employees, ≥25 customer requests across multiple statuses, all categories, requests with & without photos, scheduled & completed site visits, overdue + unassigned requests, estimates in varied stages, 2 active projects. No real PII. Dev credentials via local-only seed process; no committed prod secrets.

---

## 8. Risks & mitigations
| Risk | Mitigation |
|---|---|
| Photo upload security (malware, IDOR) | Private Blob + signed URLs + MIME verify + randomized keys; Opus-designed upload authz |
| Email delivery failure blocking intake | Submission succeeds first; email is post-commit, logged, admin-alerted |
| Status workflow allowing invalid transitions | Opus-designed state machine w/ guarded transitions + unit tests |
| Over-building beyond MVP (§23 boundaries) | No accounting/payments/native apps/chat; keep extension seams only |
| Model-cost creep | Enforce §2.2 rule: start lowest tier, escalate only on failure |

## 9. Definition of Done
The prompt §24 checklist — customer submit-with-photos → stored → confirmation + email → internal notified → employees search/open/enlarge → assign/prioritize/status → schedule/track visits → managers track across employees → admin manages users/categories → every change in timeline/audit → server authz enforced → critical flows tested → responsive & accessible → setup/deploy documented → no critical/high security issues → lint/typecheck/unit/Playwright all pass.

---

## 10. Immediate next actions
1. Confirm stack choices in §3 (or accept defaults).
2. **[Opus 4.8]** Write `DATA_MODEL.md` (Prisma + Mermaid) and `SECURITY.md`.
3. **[Haiku 4.5]** Scaffold `ARCHITECTURE.md`, `PRODUCT_REQUIREMENTS.md`, `TEST_PLAN.md`, `DECISIONS.md`, `README.md`.
4. **[Haiku 4.5]** Scaffold the Next.js app + tooling (Phase 1 foundation).
5. Proceed phase-by-phase, honoring the exit gate each time.
