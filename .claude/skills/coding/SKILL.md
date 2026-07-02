---
name: coding
description: Use after /logic-converge, when ready to implement the active task's module.
disable-model-invocation: true
---

# /coding

- **Prototype work → `mock-app`, not here.** A prototype (foundation artifact / HTML prototype) → `mock-app` owns the prototype→Next transform. Come back to `/coding` for the non-prototype logic it hands off.
- **Inputs:** consume **all of** the raw inputs **and** `logic.md` together — `logic.md` is a *supplement* (converged decisions on top of the inputs), not a substitute. `dir = .work/logics/<cat>/<name>`; `logic.md` lives there.
- **Freshness gate:** producing `logic.md` is `/logic-converge`'s job — `/coding` never self-runs it. Stop and tell the operator to run `/logic-converge` first if any of: `logic.md` is missing · `<name>.groom.md` still has `待处理` 碎片 · `logic.md`'s `## 2 Open` section is non-empty (unresolved conflicts — you'd be forced to guess). `## 3 Deferred` does **not** block — honor each item's disposition. Otherwise plan.
- `superpowers:writing-plans`, don't brainstorm. Plan tasks reference the converged decisions (`C-n`) and the inputs they implement — references, not a work-queue.
  - The plan must include a create/update-`modules/<cat>/<mod>/overview.md` task (per `.claude/context/injections/references/coding-rules/module-layout.md`).
- **Re-run after a re-converge:** re-verify already-shipped code against any `## 1 Converged` entry tagged `⟲ re-check impl` (a superseded decision) — green tests don't prove the old behavior was rolled back.
- **Never write `logic.md`** — single writer is `/logic-converge`. Route anything that should change a decision back through the loop.
- **Exit:** pipeline findings → `/logic-groom` (→ `待处理` 碎片) → `/logic-converge` re-loop → `/coding`; clean run → `/submit-work`.
- Don't write back to FeiShu or open a PR — that's `/submit-work`.
