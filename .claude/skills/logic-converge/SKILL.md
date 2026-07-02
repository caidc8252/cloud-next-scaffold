---
name: logic-converge
description: /logic-converge — for the active task, read all inputs (requirement specs + hi-fi prototype + data-model + existing module code + groom fragments), converge every cross-source conflict with the operator, and record the decisions in logic.md — a living supplement layered on top of the inputs that /coding consumes alongside them. Never guesses; unresolved conflicts are parked and the operator is asked.
---

# logic-converge

> **logic.md is a supplement** — converged decisions layered *on top of* the raw inputs, never a substitute. `/coding` reads **all the inputs AND `logic.md`**. Converge reconciles what the sources *do* say; not gap-hunting for what none of them mention (out of scope).

## The loop
`/logic-converge → /coding → /logic-groom → /logic-converge → … → /submit-work`.

## Preconditions
- Read `.work/workbench.json`; `current_task` empty → **error out** (no active task, run `/start-work`).
- `cat / name / task_id` ← `current_task`. `dir = .work/logics/<cat>/<name>`; output `<dir>/logic.md`.

## The single "conflict" lens
Apply one question to every source pairing: **do they agree on one implementable truth?** Every place they don't is a **conflict** to converge:
- **hard contradiction** — A says X, B says not-X;
- **soft diff / ambiguity** — same thing described differently or at different granularity;
- **blocking silence** — one source specifies something, another is silent where implementation needs it — *only* when that silence would force coding to guess.
Resolved → `## 1 Converged`. Still needs a decision → `## 2 Open`. Consciously punted → `## 3 Deferred`. **Never guess** — every conflict is the operator's call.

## Input navigation — read each repo's self-describing README, never a hardcoded path
Missing repos → auto `git clone` (URLs below); clone/pull failure → block and tell the operator, never silently skip. Unresolvable / unregistered module → **stop and ask**, never invent.

| Input | Repo (local) | How to locate |
|---|---|---|
| specs | `pep-webapp-docs` (`../pep-webapp-docs`) | Read `specs/README.md` (self-describing entry) → resolve authoritative `<CATEGORY>/<MODULE>` via `specs/00-module-registry.md` (mirrors 飞书「所属模块」) → read module `{rules,processes,states}/` **plus inherited shared layers** global `specs/_common/` + category `<CATEGORY>/_common/` → `specs/glossary.md` for terms. |
| prototype | `pep-webapp-docs` | Land zone `handoffs/design/`, exact path per repo's `.claude/rules/prototype-loop.md`. Absent (foundation off / not projected) → "no prototype", do not fabricate. |
| data-model | `pep-data-model-docs` (`../pep-data-model-docs`) | Auto-clone if missing, then navigate via its own README. |
| existing code | this repo | `apps/web/modules/<cat>/<name>/` (absent → new module). |
| overview | this repo | `apps/web/modules/**/overview.md`, `apps/web/commons/**/overview.md` — **read-only** global awareness. |
| groom fragments | this repo | `<dir>/<name>.groom.md` `# 原始碎片` rows with `处理状态=待处理` (may not exist). |

> Clone URLs: `https://github.com/Newland-Payment-Technology-US-Co-Ltd/pep-webapp-docs.git` · `.../pep-data-model-docs.git`. Private repos; clone/pull needs local GitHub credentials.

## Steps
1. **Pull + baselines.** For each doc repo: checkout `develop`, `git pull`. Record this pass's HEAD per repo as the baseline to write back at the end (do **not** re-read HEAD later; remote may have moved).
2. **Read all inputs** per the table above.
3. **Incremental diff.** For each input, `git diff <workbench baseline>..<this-pass HEAD>` over the resolved paths. First run (no baseline) = full read.
4. **Converge.** For every conflict (cross-source divergence, diffs, or groom fragments), surface it and get the operator's decision. Before converging an area, read existing `## 1/2/3` entries touching it (don't re-ask; supersede when a later input overrides an earlier decision).
5. **Write/update `logic.md`** (you are its **only** writer). **Always emit the file** — even with zero conflicts, at minimum `## 0 Provenance` — so `/coding`'s gate passes. Route each conflict: resolved → `## 1 Converged` (add / revise / supersede in place); still needs an operator decision → `## 2 Open`; consciously punted → `## 3 Deferred`. When you revise/supersede a decision `/coding` may already have implemented, tag the entry `⟲ re-check impl` with what changed. Mark a groom fragment `待处理 → 已整理` once its content is captured as a `## 1/2/3` entry (that entry now tracks it).
6. **Advance the baseline — clean pass only.** Parked `## 2 Open` / `## 3 Deferred` items persist as content. Abort/error → do **not** advance (next pass re-diffs the range). Write `docs_flash_time` + the three `*_docs` from the HEAD captured in step 1. Never touch `current_task` / `start_time`.
7. **Handoff.** `logic.md` ready → tell the operator to run `/coding`.

## logic.md structure (this skill authors it directly; keep it lean)
```
# Logic (supplement): <cat>/<name>
> Supplement on top of the raw inputs — /coding reads the inputs AND this file. Sole writer: /logic-converge.

## 0 Provenance
- specs / prototype / data-model commit ids · groom ref · code_exists · mode

## 1 Converged
### C-1 〔sources: specs#R-2 @<c> ✕ data-model:… @<c>〕 [⟲ re-check impl — only if revised after coding shipped it]
- Decision: …
- Why: …

## 2 Open        (blocks /coding and /submit-work until decided)
- <conflict> — which sources, what's undecided, what's needed to decide

## 3 Deferred    (consciously punted; does NOT block gates)
- <conflict> — disposition: 转出 TASK-x / out-of-scope this task / coding uses <fallback> until decided
```
- `C-n` is a **reference handle**, not a status.
- **Cumulative-but-living**, module-level, not cleared by `/submit-work`. Prune a `## 1 Converged` entry **only** when its conflict is gone from the inputs (sources now agree, or the element was dropped). A decision still bridging a live disagreement is kept or superseded, **never dropped** — its resolution isn't in the inputs; losing it forces coding to guess.

## Out of scope (owned elsewhere)
- **Cross-module dependency / stubs** — `/coding` owns stub-vs-block (AGENTS.md 铁律 8). Converge runs no predecheck; only a genuine *source conflict* involving another module is converged here.
- **commons 上提** — flag to the operator; the commons maintenance skill moves code.

## AUTONOMOUS_MODE
- **Never guess.** No divergence resolved without the operator. No active task / blocking clone failure / unregistered module → stop and surface; don't advance the baseline.
