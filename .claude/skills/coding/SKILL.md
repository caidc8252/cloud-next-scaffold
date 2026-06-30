---
name: coding
description: Use after /start-work, when ready to implement the started task's module.
disable-model-invocation: true
---

# /coding

- Run `logic-analyze` → `logic.md`; plan from it.
- `superpowers:writing-plans`, don't brainstorm. Tag each plan task with the `L-n` id(s) it satisfies.
- Flip an `L-n`'s status only via `ledger.mjs status` — never hand-edit `logic.md`/`logic.items.json`. `dir = .work/logics/<cat>/<name>`.
  - `L-n` meets its acceptance criterion, tests green → `node .claude/skills/logic-analyze/ledger.mjs status <dir> <n> 已处理`.
  - an `L-n` auto-flipped to `需返工` (a newer item superseded it) → roll back its impl, then `status <dir> <n> 作废`.
  - can't proceed (e.g. an unsatisfiable cross-module dependency) → `status <dir> <n> blocked` + surface.
- Pipeline findings → `/logic-groom`.
- Don't write back to FeiShu or open a PR — that's `/submit-work`.
