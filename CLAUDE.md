@AGENTS.md

> **Status:** the phased build (Phases 0–7) is complete and the app is **live in production** on Vercel — https://0718-lome-dcs-construction.vercel.app. A second workstream, the **client app / customer portal** (iPhone-style PWA under `/app`), has **C0/C1/C2/C3 built and verified locally** (customer accounts, passwordless auth, mobile app shell + PWA, the account-scoped Home/Projects/request-detail tracking screens, and in-app "New request" creation) — plan/status in [docs/CLIENT_APP_PLAN.md](docs/CLIENT_APP_PLAN.md); not deployed. Full context/status is in [AGENTS.md](AGENTS.md) (imported above) and [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md). The phase-completion protocol below applies whenever a substantial chunk of work lands.

# Working agreement

**Phase-by-phase, with an intentional context purge between phases.** After a phase is
implemented and its gate passes (lint + typecheck + tests green, app boots), follow the
**Phase completion protocol in [AGENTS.md](AGENTS.md)**:

1. Update status in **all** `.md` files (`README.md`, `AGENTS.md`, `docs/*.md`).
2. Commit the phase.
3. `/clear` to purge context.
4. `/init` **only if** `CLAUDE.md` is missing/stale (it rewrites this file — re-add the
   `@AGENTS.md` import and this section if so).
5. In the fresh session, read [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)
   and build the next phase.

Keep the `.md` files accurate — a purged session can only resume from what they record.
