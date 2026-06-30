<!-- scaffold:injection:verification -->
# Verifying a module — the green bar

## Gate sequence (run in order; all must pass)

1. `pnpm gen:coc` — must exit 0 with no diff in `apps/web/manifest/_generated/`. A dirty generated file means a manifest edit was not followed by a codegen run. Never hand-edit `_generated/*`.
2. `pnpm lint` — ESLint across `apps/web` and `packages/*`.
3. `pnpm test` — Vitest unit + integration (`--passWithNoTests`). Runs `pnpm gen:coc` automatically via `pretest` hook.
4. `pnpm test:e2e` — Playwright specs under `e2e/` against a Docker Postgres/Redis (runs db push + seed first).

**Paste real command output. Do not claim green from memory or by reasoning about the code.**

## Per-criterion anchoring

Every acceptance criterion maps to a passing test anchor. An unanchored criterion is not "done" — find the test or write it.

## Party-scoping (manual — there is NO RLS)

Isolation is a manual `where: { partyId }` scoped by `session.currentPartyId` (`party_id` is `Int`, not uuid). For an owner-scoped table, a Vitest service/repository test must prove it: a query as party A returns only A's rows (assert contents, not status), and a lookup of party B's row id as A returns empty/denied. A missing cross-party test is a hard fail, not a minor gap.

## Evidence rule

State what you ran and what you did NOT verify. A gate you skipped is not satisfied by disclosing the skip.
