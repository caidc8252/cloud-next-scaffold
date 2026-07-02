---
name: coding
description: Use after /logic-converge, when ready to implement the active task's module.
disable-model-invocation: true
---

# /coding

- **Prototype work → `mock-app`, not here.** A prototype (foundation artifact / HTML prototype) → `mock-app` owns the prototype→Next transform. Come back to `/coding` only for the non-prototype logic it hands off.
- **Inputs:** consume **all of** the raw inputs **and** `logic.md` together — `logic.md` is a *supplement* (converged decisions on top of the inputs), not a substitute. Read the specs / prototype / data-model / existing code as usual, and layer `logic.md`'s decisions over them. `dir = .work/logics/<cat>/<name>`; `logic.md` lives there.
- **Freshness gate:** producing `logic.md` is `/logic-converge`'s job — `/coding` never self-runs it. Stop and tell the operator to run `/logic-converge` first if any of: `logic.md` is missing · `<name>.groom.md` still has `待处理` 碎片 · `logic.md`'s `## 2 Open` section is non-empty (unresolved conflicts — you'd be forced to guess). Otherwise plan.
- `superpowers:writing-plans`, don't brainstorm. Plan tasks reference the converged decisions (`C-n`) and the inputs they implement — these are *references*, not a work-queue: there is no status to flip and nothing to drain.
  - The plan must also include a create/update-`modules/<cat>/<mod>/overview.md` task (per `.claude/context/injections/references/coding-rules/module-layout.md`) — a mechanical deliverable.
- **Never write `logic.md`** — it has a single writer, `/logic-converge`. If coding surfaces something that should change a decision, route it back through the loop (below); do not hand-edit the supplement.
- **Exit:** pipeline surfaced findings → `/logic-groom` (findings become `待处理` 碎片) → `/logic-converge` re-loop → `/coding` again; clean run → `/submit-work`.
- Don't write back to FeiShu or open a PR — that's `/submit-work`.
