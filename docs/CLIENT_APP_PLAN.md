# DCS Construction — Client App (Customer Portal) · Project Plan

> **Status (2026-07-14):** **C0 + C1 complete** (foundation shipped). C2 onward pending.
> **Companion to:** the existing staff console + intake system (live at https://0718-lome-dcs-construction.vercel.app). This app reuses the **same database, services, and brand**.
> **Plan date:** 2026-07-14
>
> ### ✅ Phase C0 — Discovery & design (done)
> Data-model + auth + UX decisions locked (see §12). This document is the design artifact.
>
> ### ✅ Phase C1 — Foundation (done, verified locally)
> - **Data model:** `CustomerAccount` (canonical, email-unique) + `CustomerLoginCode` (hashed, short-lived); `WorkRequest.customerAccountId` link. Migration `client_portal_accounts` applied.
> - **Passwordless auth:** HMAC-signed session cookie ([lib/portal/session.ts](../lib/portal/session.ts)); request-code + verify services ([lib/services/portalAuth.ts](../lib/services/portalAuth.ts)) with rate-limiting, single-use/expiring codes, and a 6-digit email template; API routes under `/api/portal/auth/*`. On verify, the account is created and the customer's existing requests are **auto-linked by email**.
> - **Mobile app shell:** `app/app/` route group — phone-width column, bottom tab bar (Home · Projects · Messages · Profile), iOS-style sign-in, gated Home (shows linked-request counts), placeholder Projects/Messages, and Profile with sign-out.
> - **PWA:** scoped `/app` manifest + service worker (installable + offline shell) + app icons + Apple meta.
> - **Verified:** lint + typecheck clean; **129 tests** (9 new portal tests: session round-trip/tamper, code request/verify/link/attempts/expiry); `next build` green; browser walkthrough on a 390×844 viewport (redirect gate → email → code → signed-in Home showing the linked request → Profile).
> - **Not committed to prod / deferred to C2+:** real request tracking UI, messaging, estimate actions, notifications, deployment.

---

## 1. Vision

A **mobile-first, iPhone-style web app** where a DCS Construction customer can log in and, in one place:

- **Create a request** for new work.
- **Track progress** of every request and project — statuses, milestones, dates, photos.
- **See everything shared with them** — estimates, customer-visible notes, scheduled site visits, documents.
- **Message the DCS team** and see the full conversation history.
- Manage **multiple projects at the same time**.

It looks and feels like a native iPhone app (installable to the home screen, bottom tab bar, cards, sheets, smooth transitions) but ships first as a **web app / PWA**. A path to a true native app (App Store / Play Store) is kept open for later.

---

## 2. Who it's for & top scenarios

**User:** a residential or commercial customer of DCS Construction (no construction knowledge assumed).

1. **New lead** installs/opens the app, signs up, and submits a request with photos.
2. **Active customer** opens the app to check "where's my kitchen remodel?" — sees the status, the next milestone, and the latest photos.
3. Customer gets an **estimate**, reviews it in-app, and (stretch) accepts or asks a question.
4. Customer **messages** the team ("can we move the visit to Friday?") and gets a reply.
5. A customer with **two active jobs** switches between them and sees each project's status.

---

## 3. Scope

### In scope (MVP)
- Customer **sign-up / sign-in** (passwordless email code is the recommended default).
- **Home** dashboard: greeting + all of the customer's requests & projects at a glance.
- **Create a request** (pre-filled with the signed-in customer's info) + photo upload.
- **Request detail:** status (customer-friendly labels), timeline, photos, shared notes, and **estimates the customer can view and accept/decline**.
- **Project detail:** status, milestones + progress, planned/actual dates, assigned team, photos.
- **Messages:** two-way thread with the DCS team per project/request, with attachments and read state.
- **Notifications:** email on key events (new estimate, status change, new message, visit scheduled). Web push is a stretch.
- **iPhone look & feel:** installable PWA, bottom tab bar, large-title screens, cards, bottom sheets, skeleton loaders, safe-area handling, smooth transitions.
- **Strict data isolation:** a customer sees ONLY their own data.

### Out of scope (for the MVP)
- Payments / invoicing / online deposits.
- A true native (App Store) binary — PWA now; native wrapper is a later option.
- Customer-to-customer anything, public content, marketing site (that already exists at `/`).
- Editing project data (customers view/track and message; staff manage in the console).
- Real-time chat presence/typing indicators (messages are near-real-time via polling/refresh; live sockets are a stretch).

---

## 4. Screens (information architecture)

Bottom tab bar with 4 tabs (iOS pattern):

| Tab | Screens |
|---|---|
| **Home** | Greeting, "active work" summary cards, quick actions (New request, Message us), recent activity feed. |
| **Projects** | List of all requests + projects (segmented: Active / Completed). → **Detail** (status, milestones, timeline, photos, estimates, shared notes). |
| **Messages** | List of conversation threads (one per project/request). → **Thread** (chat bubbles, attachments, send box). |
| **Profile** | Name/contact, notification preferences, sign out, help/contact info. |

Plus modal/sheet flows: **Sign in / sign up**, **New request** (multi-step sheet), **Photo viewer** (full-screen), **Estimate detail** (sheet, with accept/decline as a stretch).

---

## 5. iPhone-app look & feel (how)

- **PWA:** web app manifest (name, icons, theme color = brand navy, standalone display), a service worker for install + an offline app shell + cached assets. "Add to Home Screen" gives an app icon and a full-screen, chrome-less experience.
- **Design language (iOS-flavored):** large-title headers that collapse on scroll; grouped inset cards; **bottom tab bar**; **bottom sheets/modals** instead of full pages for quick actions; segmented controls; system-style lists with chevrons; pull-to-refresh; skeleton loaders; subtle spring transitions (Framer Motion).
- **Type & color:** system font stack (`-apple-system`/SF on iOS, else Inter) for the native feel; the DCS brand navy/red as accents; light + dark mode.
- **Layout:** mobile-first; on desktop it renders centered in a phone-width column (optional device frame) so it always feels like the phone app.
- **Touch details:** 44px targets, `env(safe-area-inset-*)` padding, momentum scroll, no hover-dependent UI, haptic-style visual feedback on tap.

> **Native later:** the PWA can be wrapped with **Capacitor** to ship to the App Store/Play Store with minimal changes, or rebuilt in React Native/Expo if a fuller native experience is needed. Kept as a Phase-later option, not MVP.

---

## 6. Architecture & fit with the existing system

- **Same Next.js app, new route group.** Add `app/(portal)/…` (e.g. served under `/app` or `/portal`) with its **own mobile layout/shell** (tab bar, PWA), separate from the staff console and marketing site. This reuses the existing DB, Prisma services, storage, and brand with zero duplication.
- **Shared backend, different audience.** The staff console already owns requests, projects, estimates, site visits, communications. The portal is a **customer-scoped, read-mostly** view over the same data, plus request creation and messaging.
- **Two-way data:** when a customer creates a request or sends a message, it appears in the staff console (the console's communication log / request list) — one source of truth.

### Data model changes (the crux)
Today the public intake creates a **new `Customer` row per submission** and customers have **no login**. To support accounts + multiple projects:

- **New `CustomerAccount`** — canonical customer identity: `id`, `email` (unique, verified), `name`, `phone`, auth fields, `createdAt`. This is who logs in.
- **Link work to the account** — add `WorkRequest.customerAccountId` (nullable); set it when a signed-in customer submits, and **backfill** legacy requests by matching email. The portal shows everything for the account via this link (and/or verified-email match).
- **Messaging** — new `ClientMessage` (thread per request/project): `senderType` (CUSTOMER | STAFF), `authorId`, `body`, attachments, `readAt`. Staff see these alongside the existing `Communication` log.
- **Documents (optional)** — a light `SharedDocument` (estimate PDFs, contracts) or reuse Blob + a `visibleToCustomer` flag.
- **Notifications** — reuse the existing `EmailLog`/`Notification` plumbing; add a `PushSubscription` table if web push is built.
- Reuse existing customer-visible flags: **customer-visible notes**, **SENT estimates**, **scheduled site visits** are already modeled — the portal just surfaces them.

### Authentication (customers)
- Separate from staff auth. **Chosen: passwordless email one-time code** — enter email, receive a 6-digit code, sign in. Lowest friction, very "app-like," no password to forget. Auth.js supports adding a customer provider/session distinct from staff; codes are short-lived, single-use, hashed at rest, and rate-limited.
- On first sign-in, verify the email and link to (or create) the `CustomerAccount`, associating any existing requests with that email.

---

## 7. Security & privacy (the #1 priority)

- **Hard data isolation.** Every portal query is scoped to the signed-in `customerAccountId` server-side. A customer can never see another customer's requests, projects, photos, estimates, or messages. This is enforced in the service layer, not the UI.
- **IDOR-proofing.** No customer-facing endpoint trusts an id from the client without checking ownership. Dedicated negative tests: "customer A cannot load customer B's request/project/message/photo."
- **Least data.** The portal exposes only customer-appropriate fields (customer-facing status labels, SENT estimates, customer-visible notes) — never internal notes, internal statuses, staff assignments beyond "your team," or other customers' data.
- **Photos/documents** served through an auth-guarded route scoped to the owner (or signed, short-lived URLs).
- Standard: HTTPS, secure cookies, rate limiting on auth + request creation, audit of customer actions.

---

## 8. Tech stack (reuse where possible)

- **Framework/UI:** Next.js 16 App Router · React 19 · TypeScript strict · Tailwind v4 (existing).
- **Mobile/animation:** PWA (manifest + service worker) · Framer Motion for transitions · a small iOS-flavored component set (tab bar, sheet, large-title, list rows).
- **Data/auth/storage:** Prisma 7 + Neon Postgres (existing) · Auth.js v5 with a customer provider · Vercel Blob (existing).
- **Notifications:** Resend email (existing abstraction) · Web Push API (stretch).
- **Testing:** Vitest (unit/integration) · Playwright (E2E, incl. authorization/isolation).
- **Deploy:** Vercel (same project or a companion project).

---

## 9. Phased execution plan

Each phase ends with the same **gate** used on the main app: `lint → typecheck → tests → build` green, docs updated, commit. Never leave the repo broken.

| Phase | Goal | Model routing* |
|---|---|---|
| **C0 — Discovery & design** | This plan + wireframes, the iOS design system, and the **data-model + auth decisions** locked. | Opus (schema/security/UX contracts) |
| **C1 — Foundation** | `CustomerAccount` + customer **auth** (passwordless), the **portal route group + mobile app shell** (tab bar, PWA manifest/service worker, theme, safe-area), account linking/backfill. | Opus (auth/schema) → Sonnet (shell) |
| **C2 — Home & Projects** | Home dashboard; Projects list (Active/Completed); **project detail** (status, milestones, progress, dates, team, photos); **request detail** (customer view). Strict scoping. | Sonnet |
| **C3 — Create a request** | In-app multi-step "New request" sheet (pre-filled) + photo upload; confirmation; appears in the staff console. | Sonnet |
| **C4 — Messaging** | Two-way `ClientMessage` threads, attachments, read state; staff see them in the console; near-real-time via refresh/polling. | Opus (message model/authz) → Sonnet (UI) |
| **C5 — Shared info & estimates** | Surface SENT estimates, customer-visible notes, scheduled visits, and documents; **view + accept/decline an estimate in-app** (updates the console; accept converts to a project), audited. | Opus (estimate authz) → Sonnet |
| **C6 — Notifications & polish** | Email notifications on key events; PWA offline shell + installability; transitions, dark mode, accessibility (WCAG AA), empty/loading/error states. | Sonnet + Haiku (polish) |
| **C7 — Testing & hardening** | **Data-isolation/IDOR test suite**, E2E journeys (sign-in, create request, track, message), security review, perf, deploy. | Sonnet (tests) + Opus (security review) |

*Routing mirrors the main project's cost strategy: start at the cheapest model that holds quality (Haiku → Sonnet → Opus), escalating only for schema/security/architecture.

---

## 10. Testing strategy

- **Unit/integration:** account linking + email match, request creation from the portal, message send/read, customer-facing status mapping, notification triggers.
- **Authorization (highest priority):** exhaustive **data-isolation** tests — a customer can only read/act on their own records across every endpoint.
- **E2E (Playwright, mobile viewport):** sign-in → create request → see it → open a project → send a message → receive a reply; plus negative isolation cases.
- **PWA:** installability (manifest/service worker), offline app shell, Lighthouse PWA/performance/accessibility checks at iPhone dimensions.

---

## 11. Risks & mitigations

| Risk | Mitigation |
|---|---|
| **Cross-customer data leak (IDOR)** — the biggest risk | Server-side scoping on every query; dedicated isolation test suite; security review gate before launch |
| Legacy `Customer`-per-request + no accounts | Introduce `CustomerAccount`; link new work; backfill legacy by verified email; handle duplicate emails deliberately |
| "Native feel" scope creep | PWA + a small, focused iOS component set; defer true-native (Capacitor/RN) to a later phase |
| Messaging expectations (live chat) | Ship threaded messaging with fast refresh first; real-time sockets/push as a stretch |
| Notification deliverability | Reuse the mail abstraction; wire Resend (also needed by the main app); web push optional |
| Two audiences on one deploy | Separate route group + layout + auth session; clear separation from staff console |

---

## 12. Decisions (locked — 2026-07-14)

1. **Customer login method → Passwordless email one-time code.** Enter email → 6-digit code → signed in. No passwords to manage.
2. **Where it lives → Same app, new route group** (`app/(portal)/…`, under `/app`). Shares the DB, services, storage, and brand directly.
3. **Native path → PWA only for now.** Installable web app; a Capacitor/native wrapper is deferred to a possible later phase (not MVP).
4. **Estimates → Accept / decline in-app (in MVP).** Customers can view *and* accept or decline a sent estimate; the action updates the staff console and (on accept) is what converts to a project. Adds authz + audit around the estimate action.
5. **Branding → Match the DCS brand (navy `#024988` / red `#cd0e0e`) in an iOS style** (default; can revisit).

_All settled — ready to proceed to C0/C1 on approval._

---

## 13. Rough sizing

- **C0–C1** (foundations: accounts, auth, app shell, PWA): the heaviest lift.
- **C2–C5** (the actual screens: projects, requests, messaging, shared info): the bulk of visible value.
- **C6–C7** (notifications, polish, isolation testing, deploy): essential before real customers.

A working, installable MVP is achievable in **7 focused phases**, each independently shippable behind the same phase-gate discipline as the main app.

---

## 14. Definition of Done (MVP)

A customer can install the app, sign in, submit a request with photos, watch it progress through to an active project with milestones, view estimates and shared notes, message the team both ways, and manage multiple projects — all on a mobile-first iPhone-style interface, with airtight data isolation, tests green, and deployed to production.
