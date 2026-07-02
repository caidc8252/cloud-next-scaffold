---
name: logic-converge
description: /logic-converge — for the active task, read all inputs (requirement specs + hi-fi prototype + data-model + existing module code + groom fragments), converge every cross-source conflict with the operator, and record the decisions in logic.md — a living supplement layered on top of the inputs that /coding consumes alongside them. Never guesses; unresolved conflicts are parked and the operator is asked.
---

# logic-converge

`logic.md` is a **supplement** on top of the raw inputs (never a substitute; `/coding` reads all inputs AND `logic.md`). Reconcile what the sources *do* say; not gap-hunting for what none mention. **Out of scope:** cross-module dependency / stubs (`/coding` owns it, 铁律 8) and commons 上提 (flag to the operator) — converge does neither; but a genuine **source conflict** that happens to involve another module **is** still converged here.

## Preconditions
- Read `.work/workbench.json`; `current_task` empty → **error out** (run `/start-work`).
- `cat / name / task_id` ← `current_task`. `dir = .work/logics/<cat>/<name>`; output `<dir>/logic.md`.

## Procedure

### 1. Pull + record baselines
For each doc repo: checkout `develop`, `git pull`; record this pass's HEAD per repo as the baseline to write back in step 6 — don't re-read HEAD later (remote may have moved). Missing repo → auto `git clone`; clone/pull failure → block and tell the operator.
> Clone URLs: `https://github.com/Newland-Payment-Technology-US-Co-Ltd/pep-webapp-docs.git` · `.../pep-data-model-docs.git` (private; needs local GitHub credentials).

### 2. Read all inputs — navigate each repo by its own README, never a hardcoded path
| Input | Repo (local) | How to locate |
|---|---|---|
| specs | `pep-webapp-docs` (`../pep-webapp-docs`) | `specs/README.md` → resolve authoritative `<CATEGORY>/<MODULE>` via `specs/00-module-registry.md` (mirrors 飞书「所属模块」) → read module `{rules,processes,states}/` **plus inherited shared layers** global `specs/_common/` + category `<CATEGORY>/_common/` → `specs/glossary.md`. |
| prototype | `pep-webapp-docs` | `handoffs/design/`, exact path per `.claude/rules/prototype-loop.md`. Absent → "no prototype", don't fabricate. |
| data-model | `pep-data-model-docs` (`../pep-data-model-docs`) | Navigate via its own README. |
| existing code | this repo | `apps/web/modules/<cat>/<name>/` (absent → new module). |
| overview | this repo | `apps/web/modules/**/overview.md`, `apps/web/commons/**/overview.md` — **read-only** global awareness. |
| groom fragments | this repo | `<dir>/<name>.groom.md` `# 原始碎片` rows with `处理状态=待处理` (may not exist). |

Unresolvable / unregistered module → **stop and ask**, never invent.

### 3. Diff since baseline
For each input, `git diff <workbench baseline>..<this-pass HEAD>` over the resolved paths. First run (no baseline) = full read.

### 4. Converge each conflict — never guess
One lens per source pairing: **do they agree on one implementable truth?** Every place they don't is a conflict:
- **hard contradiction** — A says X, B says not-X;
- **soft diff / ambiguity** — same thing, described differently or at different granularity;
- **blocking silence** — one source specifies, another is silent where implementation needs it — *only* when that silence would force coding to guess.

Surface each (including groom `待处理` fragments) and get the operator's decision. Before converging an area, read existing `## 1/2/3` entries touching it — don't re-ask; supersede when a later input overrides an earlier decision. Route: resolved → `## 1 Converged`; still needs a decision → `## 2 Open`; consciously punted → `## 3 Deferred`.

### 5. Write `logic.md` — you are its only writer
Always emit the file (even with zero conflicts — at minimum `## 0 Provenance` — so `/coding`'s gate passes).
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
- `C-n` is a reference handle, not a status. Tag an entry `⟲ re-check impl` when you revise/supersede a decision `/coding` may already have shipped.
- **Cumulative-but-living**, module-level, not cleared by `/submit-work`. Prune a `## 1 Converged` entry **only** when its conflict is gone from the inputs; a decision still bridging a live disagreement is kept or superseded, never dropped (its resolution isn't in the inputs — losing it forces coding to guess).
- Mark a groom fragment `待处理 → 已整理` once its content is captured as a `## 1/2/3` entry.

### 6. Advance the baseline — clean pass only
Write `docs_flash_time` + the three `*_docs` from the HEAD recorded in step 1. Parked `## 2 Open` / `## 3 Deferred` items persist as content. Abort/error → do **not** advance (next pass re-diffs the range). Never touch `current_task` / `start_time`.

### 7. Handoff
`logic.md` ready → suggest the operator run `/coding` (a suggestion, not an auto-jump). This is a loop: coding's findings re-enter via `/logic-groom` → `/logic-converge`.
