# DCS Construction — Product Requirements (MVP)

> **Status — 2026-07-14:** **Public customer experience complete** (Phases 0–2), **Internal request management complete** (Phase 3), **Scheduling & communication complete** (Phase 4), and **Admin & configuration complete** (Phase 5): principal-admin area for user management (invite/role/activate/deactivate/resend), project-category management (add/rename/reorder/activate, referenced-delete guard), company + workflow settings, and an audit log — all server-authorized (`requireCan("admin:*")` + edge middleware). **Still pending:** estimates/projects UI (Phase 6) and Phase 7 hardening.

## Vision
A responsive web app for DCS Construction that lets prospective customers submit construction work requests (with photos) and lets DCS staff review, qualify, schedule, assign, track, and complete those requests through their full lifecycle.

## Users
1. **Public customer** — submits a request, receives confirmation + email, optionally checks status via magic link.
2. **Employee** — works assigned/authorized requests: notes, status, site visits, tasks, communication.
3. **Manager** — employee powers + assign/reassign, view all active, schedules, estimates, reports, reopen/archive.
4. **Principal Administrator** — manager powers + user management, categories, statuses/notification settings, company profile, audit logs, exports.

## Lifecycle
Submit → Confirmation → Employee review/qualify → Site visit scheduled → Assigned → Estimate/project tracked → Status updates → Customer notified → Completed / Cancelled / Archived.

## Functional requirements (by area)
### Public
- Landing page (branding, hero, services summary, residential/commercial galleries, "Request a Site Visit" CTA, contact, service area, testimonials placeholder, footer w/ privacy + terms).
- Construction Services page with responsive gallery + accessible lightbox.
- Work Request form — required: name, phone, email, street, city, state, zip, category, description, preferred contact, permission to contact, consent. Optional: unit, preferred visit dates, budget range, start timeframe, referral source, notes.
- Photo upload: multiple, drag-drop + mobile camera, progress, thumbnails, remove-before-submit, type/size validation, filename sanitize, count limit, compression.
- Submission: client+server validation, DB transaction, request number `DCS-YYYY-NNNNNN`, status-history + activity, confirmation email + internal alert, confirmation page, duplicate-submit prevention (idempotency).
- Customer status view via signed expiring link (no account): request number, category, submission date, customer-visible status, scheduled visit, contact info, public timeline; may add photos/messages. Never exposes internal notes/costs/other customers.

### Internal
- Dashboard: summary cards (new, awaiting first contact, visits to schedule, visits today, estimates pending, active projects, overdue, completed this month).
- Work-request table: columns per prompt §7.2; sort/filter/search/paginate; mobile cards; empty/loading/error states; default surfaces new + overdue.
- Request detail (stable URL): customer info, location (+map link, service-area indicator), project info, **photo gallery with accessible lightbox** (prev/next, zoom, download for authorized), internal management (notes internal vs customer-visible, activity timeline, status/assignment history, site visits, tasks, attachments, communication log, estimate summary, audit).
- Status workflow: full internal statuses + customer mapping; record who/when/reason; guard invalid transitions; notify on selected changes.
- Assignment/follow-up: assign/reassign, priority (Low/Normal/High/Urgent), follow-up + due dates, tasks, contact attempts, overdue detection, 48-business-hour SLA indicator.
- Site visits: fields + appointment statuses (Proposed/Confirmed/Completed/Rescheduled/Cancelled/No-show), reschedule history, notifications, double-booking guard, internal calendar view.
- Estimates: number, status (Draft→Revised), amount, dates, notes, attachment placeholder. Project conversion on approval with milestones + progress.

### Admin
- User management (invite/edit/role/activate/deactivate/resend, recent activity).
- Category management (add/rename/describe/reorder/activate; block delete when referenced; preserve history).
- Company settings (name, logo, contact, address, service area, response message, intake recipients, email templates, upload limits).
- Workflow settings (default status/priority, response target, notification rules, assignment defaults).
- Audit log viewer.

## Non-functional
- Responsive (test 375 / 768 / 1440 px); WCAG 2.1 AA where practical.
- Server-enforced authorization; secure uploads; rate limiting; audit trail.
- Observability: structured logs, correlation IDs, health check, email/upload failure logging.

## Out of scope (MVP)
Full accounting, payroll, inventory, complex scheduling, subcontractor marketplace, full CRM marketing automation, automated pricing, payments, native apps, real-time chat, document signing. Keep extension seams only.

## Assumptions
Tracked in `DECISIONS.md`.
