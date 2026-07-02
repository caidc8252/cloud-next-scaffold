---
name: coding
description: Use after /start-work to build the active task's module. Preflight router — offers prerequisites (/sync-db-model, /logic-converge) in-session and hands prototype work to mock-app, then plans + implements.
disable-model-invocation: true
---

# /coding

Module-build entry point **and preflight router**: before planning, walk the ladder and **offer** each unmet step in-session (never silently run it), so the operator drives one command instead of remembering the chain. Interactive steps hand off to their own skill with the operator in the loop — **never** subagent them; only the autonomous implementation uses subagents. Base guard: needs `current_task`; `dir = .work/logics/<cat>/<name>`.

## Preflight ladder (in order, before planning)
1. **Data-model drift** — `../pep-data-model-docs` HEAD ≠ workbench `data_model_docs` baseline → offer **`/sync-db-model`** (the schema change must land in Prisma, and it's a converge trigger, so it precedes step 2).
2. **Converge freshness** — any of: `logic.md` missing · groom has `待处理` 碎片 · `logic.md` `## 2 Open` non-empty · a doc repo HEAD moved past its workbench baseline → offer **`/logic-converge`** ("logic.md is stale — converge now?"; offer, don't auto-run). `## 3 Deferred` does **not** block — honor its dispositions.
3. **Prototype** — prototype present + UI work → hand off to **`mock-app`** (prototype→Next); return for the non-prototype logic.
4. **Clear → build.**

## Plan → implement → review → verify
- Consume **all** raw inputs **and** `logic.md` (a supplement on top of the inputs, not a substitute).
- **Flow** (native plan mode, **not** `superpowers:writing-plans`): `EnterPlanMode` → read `.claude/context/injections/references/coding-rules.md` → research specs + prototype + data-model + existing code (+ `logic.md`) → write the plan → `ExitPlanMode` → implement → review → verify → `/submit-work`.
- **The plan must cover:**
  - create/update the module's `overview.md` (per `.claude/context/injections/references/coding-rules/module-layout.md`);
  - authorization negatives per party-scoped table — list scoping, resource denial, wrong-party write, fail-closed;
  - `@e2e-cell` marker + matching `e2e/<feature>.spec.ts` per route / middleware / auth-boundary;
  - **Review** — a subagent audits the diff against `coding-rules.md`; fix findings;
  - **Verify (paste real output)** — `pnpm gen:coc` clean → `pnpm lint` → `pnpm test` → `pnpm test:e2e`.
- **Resolve during planning, not execution.** Surface every ambiguity/conflict and settle it with the operator (cross-source conflicts via `/logic-converge`) *before* `ExitPlanMode` — the approved plan must need no further decisions.
- **Execution makes no new decisions.** If executing reveals something the plan didn't cover — a gap, or a newly-surfaced conflict — stop and loop back (re-plan for a plan gap; `/logic-groom` → `/logic-converge` for a logic/spec conflict); never guess, never decide ad-hoc.
- Plan tasks reference converged decisions (`C-n`) + inputs — references, not a work-queue.
- **Re-run after a re-converge:** re-verify already-shipped code against any `## 1 Converged` entry tagged `⟲ re-check impl` — green tests don't prove a superseded decision was rolled back.
- **Never write `logic.md`** — sole writer is `/logic-converge`; route decision changes back through the loop.

## Exit
- Findings (review or pipeline) → **drive the loop, announcing each hop**: `/logic-groom` → `/logic-converge` → resume `/coding`.
- Clean run → **`/submit-work`**. Don't write back to FeiShu or open a PR — that's `/submit-work`.
