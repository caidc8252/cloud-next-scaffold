---
name: coding
description: Use after /start-work to build the active task's module. Preflight router — offers prerequisites (/sync-db-model, /logic-converge) in-session and hands prototype work to mock-app, then plans + implements.
disable-model-invocation: true
---

# /coding

Module-build entry point **and preflight router**. Base guard: needs `current_task`; `dir = .work/logics/<cat>/<name>`. Coding **never writes `logic.md`** — sole writer is `/logic-converge`.

## 1. Preflight — offer each unmet step in-session, never silently run it
**Never** subagent the interactive steps (subagents can't hold operator dialogue); autonomous work — the implementation and the review audit — may use subagents.
1. **Data-model drift** — `data_model_docs` baseline exists and `../pep-data-model-docs` HEAD ≠ it → offer **`/sync-db-model`** then **`/logic-converge`** (sync materializes the DDL into Prisma; only converge advances the baseline that clears this gate). First run (no baseline) → skip; gate 2 covers it.
2. **Converge freshness** — `logic.md` missing · groom has `待处理` 碎片 · `logic.md` `## 2 Open` non-empty · a doc repo HEAD moved past its workbench baseline → offer **`/logic-converge`**. `## 3 Deferred` does **not** block.
3. **Prototype** — prototype + UI work → hand off to **`mock-app`** (prototype→Next); return for the non-prototype logic.

These are gates, not mere suggestions: offering is how you satisfy them in-session, but if the operator declines a genuinely-required prerequisite (`logic.md` missing / `## 2 Open` non-empty), **stop — don't build on unconverged conflicts**.

## 2. Plan (native plan mode, **not** `superpowers:writing-plans`)
`EnterPlanMode` → read `.claude/context/injections/references/coding-rules.md` → research specs + prototype + data-model + existing code + `logic.md` → write the plan → `ExitPlanMode` → implement.
- **Settle every decision here** — resolve each ambiguity/conflict with the operator (cross-source conflicts via `/logic-converge`) before `ExitPlanMode`.
- Plan tasks reference converged decisions (`C-n`) + inputs — references, not a work-queue.
- **On a re-run:** re-verify already-shipped code against any `## 1 Converged` entry tagged `⟲ re-check impl` (converge's flag that a shipped decision was superseded — green tests don't prove the old behavior was rolled back), and report which you re-verified so converge can clear the tag.
- **If a `## 1 Converged` decision contradicts the current inputs**, treat it as stale — don't implement it; loop back to `/logic-converge`.

The plan must cover:
- create/update the module's `overview.md` (per `.claude/context/injections/references/coding-rules/module-layout.md`);
- authorization negatives per party-scoped table — list scoping, resource denial, wrong-party write, nested-write backstop, fail-closed;
- `@e2e-cell` marker + matching `e2e/<feature>.spec.ts` per route / middleware / auth-boundary;
- **review** — a subagent audits the diff against `coding-rules.md`; fix findings;
- **verify (paste real output)** — `pnpm gen:coc` clean → `pnpm lint` → `pnpm test` → `pnpm test:e2e`.

## 3. Exit
- Clean → **`/submit-work`** (no FeiShu write-back or PR here).
- Findings (review or verify) → **drive the loop**: `/logic-groom` → `/logic-converge` → resume `/coding`.
