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

## Build
- Consume **all** raw inputs **and** `logic.md` (a supplement on top of the inputs, not a substitute).
- `superpowers:writing-plans`, don't brainstorm. Plan tasks reference converged decisions (`C-n`) + inputs — references, not a work-queue. Include a create/update `modules/<cat>/<mod>/overview.md` task (per `.claude/context/injections/references/coding-rules/module-layout.md`).
- **Re-run after a re-converge:** re-verify already-shipped code against any `## 1 Converged` entry tagged `⟲ re-check impl` — green tests don't prove a superseded decision was rolled back.
- **Never write `logic.md`** — sole writer is `/logic-converge`; route decision changes back through the loop.

## Exit
- Findings → **drive the loop, announcing each hop** (operator inputs at each; don't make them re-type): `/logic-groom` → `/logic-converge` → resume `/coding`.
- Clean run → **`/submit-work`**. Don't write back to FeiShu or open a PR — that's `/submit-work`.
