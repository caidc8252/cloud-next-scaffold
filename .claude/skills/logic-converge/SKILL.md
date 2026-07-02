---
name: logic-converge
description: /logic-converge — for the active task, read all inputs (requirement specs + hi-fi prototype + data-model + existing module code + groom fragments), converge every cross-source conflict with the operator, and record the decisions in logic.md — a living supplement layered on top of the inputs that /coding consumes alongside them. Never guesses; unresolved conflicts are parked and the operator is asked.
---

# logic-converge

For the module `workbench.current_task` points at, **converge** the sources of truth: read them all, find every place they disagree on an implementable truth, decide each with the operator, and record the decisions in `logic.md`.

> **What logic.md is:** a **supplement** — converged decisions layered *on top of* the raw inputs, never a substitute for them. `/coding` reads **all the inputs AND `logic.md`**. It is **not** a task list, **not** a status-tracked queue, **not** a restatement of business.
> **What converge is:** reconciling divergence. Not gap-hunting for things no source mentions (out of scope). Decisions are **never guessed** — every conflict is the operator's call.

## The loop
`/logic-converge → /coding → /logic-groom → /logic-converge → … → /submit-work`.
Each converge pass is incremental and cumulative: it folds in new doc commits + new groom fragments, updates `logic.md`, and never re-asks a settled decision.

## Preconditions
- Read `.work/workbench.json`; `current_task` empty → **error out** (no active task, run `/start-work`).
- `cat / name / task_id` ← `current_task`. `dir = .work/logics/<cat>/<name>`; output `<dir>/logic.md`.

## The single "conflict" lens
Apply one question to every source pairing: **do they agree on one implementable truth?** Every place they don't is a **conflict** to converge:
- **hard contradiction** — A says X, B says not-X;
- **soft diff / ambiguity** — same thing described differently or at different granularity;
- **blocking silence** — one source specifies something, another is silent where implementation needs it — *only* when that silence would force coding to guess.
Resolved → `## 1 Converged`. Not resolvable this pass → `## 2 Open`. **Never guess.**

## Input navigation — read each repo's self-describing README, never a hardcoded path
Doc repos evolve; hardcoded paths go stale. Missing repos → auto `git clone` (URLs below); clone/pull failure → block and tell the operator, never silently skip. An unresolvable / unregistered module → **stop and ask**, never invent.

| Input | Repo (local) | How to locate |
|---|---|---|
| specs | `pep-webapp-docs` (`../pep-webapp-docs`) | Read `specs/README.md` (self-describing entry) → resolve authoritative `<CATEGORY>/<MODULE>` via `specs/00-module-registry.md` (mirrors 飞书「所属模块」) → read module `{rules,processes,states}/` **plus inherited shared layers** global `specs/_common/` + category `<CATEGORY>/_common/` → `specs/glossary.md` for terms. |
| prototype | `pep-webapp-docs` | Land zone `handoffs/design/`, exact path per repo's `.claude/rules/prototype-loop.md`. Absent (foundation off / not projected) → "no prototype", do not fabricate. |
| data-model | `pep-data-model-docs` (`../pep-data-model-docs`) | Auto-clone if missing, then navigate via its own README. |
| existing code | this repo | `apps/web/modules/<cat>/<name>/` (absent → new module). |
| overview | this repo | `apps/web/modules/**/overview.md`, `apps/web/commons/**/overview.md` — **read-only** global awareness (written by a dedicated skill, 建设中). |
| groom fragments | this repo | `<dir>/<name>.groom.md` `# 原始碎片` rows with `处理状态=待处理` (may not exist). |

> Clone URLs: `https://github.com/Newland-Payment-Technology-US-Co-Ltd/pep-webapp-docs.git` · `.../pep-data-model-docs.git`. Private repos; clone/pull needs local GitHub credentials.

## Steps
1. **Pull + baselines.** For each doc repo: checkout `develop`, `git pull`. Record this pass's HEAD per repo — that is the baseline to write back at the end (do **not** re-read HEAD later; remote may have moved).
2. **Read all inputs** per the table above.
3. **Incremental diff.** For each input, `git diff <workbench baseline>..<this-pass HEAD>` over the resolved paths. First run (no baseline) = full read.
4. **Converge.** For every conflict (cross-source divergence, diffs, or groom fragments), surface it to the operator and get a decision — never guess. Before converging an area, read existing `## 1 Converged` / `## 2 Open` entries touching it (don't re-ask; supersede when a later input overrides an earlier decision).
5. **Write/update `logic.md`** (you are its **only** writer): resolved → `## 1 Converged` (add / revise / supersede in place); unresolved → `## 2 Open`; refresh `## 0 Provenance`. Mark consumed groom fragments `待处理 → 已整理` (edit the groom markdown table; `# 原始碎片` is the truth).
6. **Advance the workbench baseline — only on a clean pass.** Parked `## 2 Open` items are fine (they persist as content). Abort/error → do **not** advance (next pass re-diffs the range). Write `docs_flash_time` + the three `*_docs` from the HEAD captured in step 1. Never touch `current_task` / `start_time`.
7. **Handoff.** `logic.md` ready → tell the operator to run `/coding`.

## logic.md structure (this skill authors it directly; keep it lean)
```
# Logic (supplement): <cat>/<name>
> Supplement layered on top of the raw inputs — /coding reads the inputs AND this file. Not a task list, not a status-tracked queue. Sole writer: /logic-converge.

## 0 Provenance
- specs / prototype / data-model commit ids · groom ref · code_exists · mode

## 1 Converged
### C-1 〔sources: specs#R-2 @<c> ✕ prototype:handoffs/design/… @<c>〕
- Decision: …
- Why: …

## 2 Open
- <unresolved conflict> — which sources, what's undecided, what's needed to decide
```
`C-n` is a **reference handle only** — not a status, not a queue position. Cumulative-but-living: revise/supersede entries as inputs evolve (safe to prune — coding still reads the raw inputs). Module-level; **not** cleared by `/submit-work`.

## Out of scope (owned elsewhere)
- **Cross-module dependency / stubs** — `/coding` owns stub-vs-block (AGENTS.md 铁律 8). Converge runs no separate predecheck; only a genuine *source conflict* that happens to involve another module is converged here.
- **commons 上提** — flag to the operator; the commons maintenance skill moves code. Converge does not.

## I/O contract
- **Input:** `workbench.current_task`; the doc repos (auto clone/pull); existing module code; `overview.md`s (read-only); `<name>.groom.md`.
- **Output:** `logic.md` (authored here); groom fragment states `→ 已整理`; workbench `docs_flash_time` + three `*_docs` (clean pass only).
- **Idempotent:** rerunnable; incremental from the last baseline; settled decisions never re-asked, obsolete ones revised/superseded.

## AUTONOMOUS_MODE
- **Never guess.** No source-of-truth divergence is resolved without the operator. No active task / blocking clone failure / unregistered module → stop and surface; do not advance the baseline.
