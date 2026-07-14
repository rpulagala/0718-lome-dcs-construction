@AGENTS.md

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
