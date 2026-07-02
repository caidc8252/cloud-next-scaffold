# logic-converge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the scaffold's `/logic-analyze` (ledger-backed `logic.md` work-queue) with `/logic-converge`, where `logic.md` is a living *supplement* of converged cross-source decisions and `/coding` consumes all raw inputs plus that supplement.

**Architecture:** A prose/skills sweep across `.claude/skills/*`, `AGENTS.md`, `.work/workbench.schema.json`, and a handful of injection/doc files. Create one new English SKILL; delete the old skill and its `ledger.mjs`; retool `coding` / `logic-groom` / `submit-work`; rename references everywhere else. No application code changes; no build/test impact (skills and docs are not compiled).

**Tech Stack:** Claude Code `SKILL.md` Markdown files (YAML frontmatter + prose), JSON Schema (`workbench.schema.json`), git. Verification is `grep`-based consistency checking — there is no runnable behavior to unit-test.

**Design doc:** `docs/superpowers/specs/2026-07-02-logic-converge-design.md` (authoritative; consult for rationale).

## Global Constraints

- **Language policy:** `.claude/skills/logic-converge/SKILL.md` is written in **English**. Every *other* edited file **keeps its current language** — do NOT translate. Current languages: English → `coding/SKILL.md`, `mock-app/SKILL.md`, `injections/finishing.md`, `coding-rules/commons.md`, `coding-rules/module-layout.md`. Chinese → `logic-groom/SKILL.md`, `submit-work/SKILL.md`, `AGENTS.md`, `.claude/docs/module-overview.md`, `apps/web/commons/README.md`, `start-work/SKILL.md`.
- **No ledger, ever.** Do not reintroduce `ledger.mjs`, `logic.items.json`, `L-n` ids/statuses, coding status-flips, or an item-based finalize gate.
- **`logic.md` is a supplement with a single writer** (`/logic-converge`). `/coding` and `/logic-groom` never write it.
- **Input navigation is README/rule-driven** — never hardcode a doc-repo path table as truth.
- **`logic-analyze` is retained, not deleted** (operator decision, superseding the design's "delete now"): its `SKILL.md` + `ledger.mjs` stay on disk as a transitional, unwired reference. Everything else points to `/logic-converge`; nothing *outside* that dir may reference `logic-analyze` / `ledger.mjs`.
- **Sweep completeness (verified in Task 9):** after this plan, the tokens `logic-analyze`, `ledger`, `logic.items`, `唯一交接物`, `问题账` must appear **nowhere** in the repo **except the intentionally-retained `.claude/skills/logic-analyze/` files** (also excluding `node_modules`, `.git`, `docs/superpowers/`). The token `台账` must survive **only** in `.claude/skills/sync-db-model/SKILL.md` and the retained `.claude/skills/logic-analyze/` files.
- **Commits:** these files are outside `docs/`, so normal `git add`. (Only files under `docs/` need `git add -f` in this repo — that applies to this plan/spec, not to the sweep edits.)

---

## File Structure

| File | Action | Responsibility after change |
|---|---|---|
| `.claude/skills/logic-converge/SKILL.md` | **Create** (English) | The converge skill: read all inputs, converge conflicts, author `logic.md` supplement, advance workbench baseline. |
| `.claude/skills/logic-analyze/SKILL.md` | **Keep** (retained, unwired) | Left on disk as a transitional reference; no longer pointed to by any other file. |
| `.claude/skills/logic-analyze/ledger.mjs` | **Keep** (retained, unwired) | Left on disk with its SKILL; nothing outside this dir references it. |
| `.claude/skills/coding/SKILL.md` | Rewrite (English) | Consume all inputs + `logic.md`; new freshness gate; no ledger; loop exit. |
| `.claude/skills/logic-groom/SKILL.md` | Retool (Chinese) | Pure fragment capture; `# 问题账` retired; points to `/logic-converge`. |
| `.claude/skills/submit-work/SKILL.md` | Edit (Chinese) | Residue gate = groom `待处理` + `logic.md ## 2 Open`; drop `# 问题账`; drop `logic.items.json`. |
| `AGENTS.md` | Edit (Chinese) | Workflow §4/§5, line 14, the accumulation note. |
| `.work/workbench.schema.json` | Edit | Descriptions only: `/logic-analyze` → `/logic-converge`. |
| `.claude/context/injections/finishing.md` | Edit (English) | Loop rename. |
| `.claude/context/injections/references/coding-rules/commons.md` | Edit (English) | Rename (×2). |
| `.claude/context/injections/references/coding-rules/module-layout.md` | Edit (English) | Rename. |
| `.claude/docs/module-overview.md` | Edit (Chinese) | Rename (×3) + drop `L-n 台账项` aside. |
| `apps/web/commons/README.md` | Edit (Chinese) | Rename (×2). |
| `.claude/skills/start-work/SKILL.md` | Edit (Chinese) | Rename + soften "路径约定表" → README-driven. |
| `.claude/skills/mock-app/SKILL.md` | Edit (English) | Rename (×2). |

---

## Task 1: Create the `logic-converge` skill

**Files:**
- Create: `.claude/skills/logic-converge/SKILL.md`

**Interfaces:**
- Produces: the `/logic-converge` command (skill name `logic-converge`); output artifact `.work/logics/<cat>/<name>/logic.md` with sections `## 0 Provenance`, `## 1 Converged`, `## 2 Open`; writes back `workbench` `docs_flash_time` + `specs_docs`/`prototype_docs`/`data_model_docs`. Consumed by Tasks 3 (coding gate), 5 (submit gate), 6 (AGENTS workflow).

- [ ] **Step 1: Create the file with this exact content**

````markdown
---
name: logic-converge
description: /logic-converge — for the active task, read all inputs (requirement specs + hi-fi prototype + data-model + existing module code + groom fragments), converge every cross-source conflict with the operator, and record the decisions in logic.md — a living supplement layered on top of the inputs that /coding consumes alongside them. Never guesses; unresolved conflicts are parked and the operator is asked.
---

# logic-converge

For the module `workbench.current_task` points at, **converge** the sources of truth: read them all, find every place they disagree on an implementable truth, decide each with the operator, and record the decisions in `logic.md`.

> **What logic.md is:** a **supplement** — converged decisions layered *on top of* the raw inputs, never a substitute for them. `/coding` reads **all the inputs AND `logic.md`**. It is **not** a task list, **not** a ledger, **not** a restatement of business.
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
> Supplement layered on top of the raw inputs — /coding reads the inputs AND this file. Not a task list, not a ledger. Sole writer: /logic-converge.

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
````

- [ ] **Step 2: Verify frontmatter + required sections present**

Run:
```bash
cd .claude/skills/logic-converge
grep -q '^name: logic-converge$' SKILL.md && echo "name OK"
grep -qE '^## 1 Converged|Converged' SKILL.md && echo "sections OK"
grep -c 'logic-analyze\|ledger\|logic.items\|L-n' SKILL.md
```
Expected: `name OK`, `sections OK`, and count `0` (the new skill must contain none of the old ledger vocabulary).

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/logic-converge/SKILL.md
git commit -m "feat(skills): add logic-converge (supplement model, replaces logic-analyze)"
```

---

## Task 2: Retain `logic-analyze` and its ledger (no action)

**Operator decision** (supersedes the design's "delete now"): do **not** delete
`.claude/skills/logic-analyze/{SKILL.md,ledger.mjs}`. They stay on disk as a
transitional, unwired reference. **No file edits, no deletion, no commit for this
task.** The only requirement — verified in Task 9 — is that nothing *outside* that
directory still references `logic-analyze` / `ledger.mjs` after the sweep.

---

## Task 3: Rewrite `coding/SKILL.md` (all inputs + logic.md, no ledger)

**Files:**
- Modify: `.claude/skills/coding/SKILL.md` (full replace)

**Interfaces:**
- Consumes: `logic.md` + all inputs from Task 1; groom `待处理` fragments from Task 4.
- Produces: the coding freshness gate referenced by AGENTS §5 (Task 6).

- [ ] **Step 1: Replace the whole file with this exact content**

````markdown
---
name: coding
description: Use after /logic-converge, when ready to implement the active task's module.
disable-model-invocation: true
---

# /coding

- **Prototype work → `mock-app`, not here.** A prototype (foundation artifact / HTML prototype) → `mock-app` owns the prototype→Next transform. Come back to `/coding` only for the non-prototype logic it hands off.
- **Inputs:** consume **all of** the raw inputs **and** `logic.md` together — `logic.md` is a *supplement* (converged decisions on top of the inputs), not a substitute. Read the specs / prototype / data-model / existing code as usual, and layer `logic.md`'s decisions over them. `dir = .work/logics/<cat>/<name>`; `logic.md` lives there.
- **Freshness gate:** producing `logic.md` is `/logic-converge`'s job — `/coding` never self-runs it. Stop and tell the operator to run `/logic-converge` first if any of: `logic.md` is missing · `<name>.groom.md` still has `待处理` 碎片 · `logic.md`'s `## 2 Open` section is non-empty (unresolved conflicts — you'd be forced to guess). Otherwise plan.
- `superpowers:writing-plans`, don't brainstorm. Plan tasks reference the converged decisions (`C-n`) and the inputs they implement — these are *references*, not a ledger: there is no status to flip and nothing to drain.
  - The plan must also include a create/update-`modules/<cat>/<mod>/overview.md` task (per `.claude/context/injections/references/coding-rules/module-layout.md`) — a mechanical deliverable.
- **Never write `logic.md`** — it has a single writer, `/logic-converge`. If coding surfaces something that should change a decision, route it back through the loop (below); do not hand-edit the supplement.
- **Exit:** pipeline surfaced findings → `/logic-groom` (findings become `待处理` 碎片) → `/logic-converge` re-loop → `/coding` again; clean run → `/submit-work`.
- Don't write back to FeiShu or open a PR — that's `/submit-work`.
````

- [ ] **Step 2: Verify no old vocabulary remains**

```bash
grep -c 'logic-analyze\|ledger\|logic.items\|L-n\|唯一交接物' .claude/skills/coding/SKILL.md
grep -q '## 2 Open' .claude/skills/coding/SKILL.md && echo "gate OK"
```
Expected: `0`, then `gate OK`.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/coding/SKILL.md
git commit -m "refactor(skills): coding consumes all inputs + logic.md supplement (drop ledger)"
```

---

## Task 4: Retool `logic-groom/SKILL.md` (retire `# 问题账`)

**Files:**
- Modify: `.claude/skills/logic-groom/SKILL.md` (full replace, stays Chinese)

**Interfaces:**
- Produces: `<name>.groom.md` with a `# 原始碎片` table only (no `# 问题账`), consumed by Task 1 (converge) and gated by Task 5 (submit).

- [ ] **Step 1: Replace the whole file with this exact content**

````markdown
---
name: logic-groom
description: /logic-groom —— 当前活跃任务的「碎片捕获入口」。启动后随时接收操作员对需求/实现逻辑/UI调整的零散描述，做意图识别后追加到 .work/logics/<cat>/<name>/<name>.groom.md 的「原始碎片」表（处理状态=待处理），供 /logic-converge 消费。捕获模式持续到 /submit-work 关闭。当操作员要边想边记需求/逻辑/UI 碎片时使用。
---

# logic-groom

把操作员**随口说出的**需求变更、实现逻辑、UI 调整，**低摩擦**地记成「原始碎片」，留给 `/logic-converge` 统合消费。

> **职责边界（硬约束）**：本 skill 只做**捕获 + 意图识别 + 追加落表**。
> **不分析、不澄清、不去重、不产 `logic.md`、不做收敛决策**——那些是 `/logic-converge`（收敛/决策）与 `/coding`（代码）的职责。未决的收敛问题记在 `logic.md` 的 `## 2 Open`（由 `/logic-converge` 维护），**不在 groom**。
> 真相文件：`.work/logics/<cat>/<name>/<name>.groom.md` 的 `# 原始碎片` 表。

## 前置
- 读 `.work/workbench.json`；`current_task` 为空 → **报错退出**（无活跃任务，先 `/start-work`）。
- 取 `cat/name` ← `current_task.module.{category,name}`；`dir = .work/logics/<cat>/<name>`；`groom = <dir>/<name>.groom.md`。
- `groom` 不存在 → 创建骨架：仅 `# 原始碎片`（表头）。**不再建 `# 问题账`**（已废弃——未决收敛进 `logic.md` 的 `## 2 Open`）。

## 捕获循环（启动后持续，直到 /submit-work 或操作员喊停）
对操作员的**每一条输入**：
1. **意图识别**，归入下列之一：
   - `需求` —— 功能/业务规则的新增或变更。
   - `实现逻辑` —— 代码实现层面的约定、算法、边界、数据处理。
   - `UI调整` —— 界面/交互/展现的调整。
   - **其它**（闲聊、提问、要跑别的命令、与本任务无关）→ **不落表**，简短回应即可。
   - 归类不确定 → **问操作员**归哪类 / 是否要记，**不臆断**。
2. 命中前三类 → 向 `# 原始碎片` **追加一行**，`处理状态=待处理`。
3. 一句话回执「已记 #n（意图类型）」，**不展开分析、不追问澄清**。

## 原始碎片表结构（**只追加**，勿改既有行）
```
# 原始碎片
| 碎片号 | 意图类型 | 内容 | 处理状态 | 记录时间 |
|---|---|---|---|---|
```
- `碎片号`：从 1 递增（`/logic-converge` 以 `groom#n` 引用，勿复用/重排）。
- `意图类型`：`需求` | `实现逻辑` | `UI调整`。
- `内容`：把口语精炼成一句**可消费**的描述；保留关键信息，**不臆测、不补全没说的**。
- `处理状态`：新行一律 `待处理`；→ `已整理` 由 `/logic-converge` 消费后回写（**本 skill 不改**）。
- `记录时间`：`yyyy-MM-dd HH:mm:ss`（取系统真实时间）。

## I/O contract
- **Input**：操作员零散输入；`workbench.current_task`。
- **Output**：仅向 `<name>.groom.md` 的 `# 原始碎片` 表**追加**待处理碎片。不写 `logic.md`，不改 `workbench`。
- **Idempotent**：纯追加；不去重（避免误删信息），重复与否由操作员判断。

## 关闭
- 捕获入口持续到操作员执行 `/submit-work`（提交闭环）→ 关闭；或操作员显式喊停。
- 碎片攒够、想让它们进 `logic.md` → 跑 `/logic-converge` 消费（本 skill 只捕获，不自动移交）。

## AUTONOMOUS_MODE
- 无自动决策：意图不清宁可问，不臆断；无操作员输入不编造碎片。
````

- [ ] **Step 2: Verify `# 问题账` fully retired + rename done**

```bash
grep -c '问题账\|logic-analyze' .claude/skills/logic-groom/SKILL.md
grep -c 'logic-converge' .claude/skills/logic-groom/SKILL.md
```
Expected: first `0`; second `≥ 3`.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/logic-groom/SKILL.md
git commit -m "refactor(skills): logic-groom is pure capture, retire 问题账, point to logic-converge"
```

---

## Task 5: Update `submit-work/SKILL.md` gates

**Files:**
- Modify: `.claude/skills/submit-work/SKILL.md` (targeted edits, stays Chinese)

- [ ] **Step 1: Replace Step 1 (the groom gate) — old → new**

Old (the whole numbered item 1 block, lines ~15-19):
```markdown
1. **groom 残留闸门（硬闸门）** —— 读 `.work/logics/<cat>/<name>/<name>.groom.md`：
   - `# 原始碎片` 仍有 `处理状态=待处理`，**或** `# 问题账` 仍有 `待处理` → **拦截提交**，列出残留条目，提示「先跑 `/logic-analyze` 把碎片/问题消费完再提交」。**本 skill 不自己分析/消费**（那是 `/logic-analyze` 的职责）。
   - 无残留（或无 groom 文件）→ 通过。

   > **收尾顺序**：submit 前应先「停止 `/logic-groom` 输入 → 跑 `/logic-analyze` 把最新碎片清成 `已整理` → 再 `/submit-work`」。若 analyze 后又 groom 出新碎片，本闸门会再次拦截——这是有意的强制闭合。
```

New:
```markdown
1. **残留闸门（硬闸门）** —— 确认无未消费的收敛输入：
   - 读 `.work/logics/<cat>/<name>/<name>.groom.md`：`# 原始碎片` 仍有 `处理状态=待处理` → **拦截提交**，列出残留碎片。
   - 读 `.work/logics/<cat>/<name>/logic.md`：`## 2 Open` 区仍有未决收敛条目 → **拦截提交**，列出未决项。
   - 二者皆空（或无 groom / 无 logic.md）→ 通过。**本 skill 不自己分析/消费/收敛**（那是 `/logic-converge` 的职责）。

   > **收尾顺序**：submit 前应先「停止 `/logic-groom` 输入 → 跑 `/logic-converge` 把最新碎片清成 `已整理`、把冲突收敛到 `## 1 Converged`（`## 2 Open` 清空）→ 再 `/submit-work`」。若 converge 后又 groom 出新碎片，本闸门会再次拦截——这是有意的强制闭合。
```

- [ ] **Step 2: Fix the accumulation note in Step 5 — old → new**

Old (line ~41):
```markdown
   - **不清** `.work/logics/<cat>/<name>/`（`logic.md`/`logic.items.json`/`<name>.groom.md` 是**模块级累积**，跨 task 保留）。
```
New:
```markdown
   - **不清** `.work/logics/<cat>/<name>/`（`logic.md` / `<name>.groom.md` 是**模块级累积**，跨 task 保留）。
```

- [ ] **Step 3: Fix the I/O contract line — old → new**

Old (line ~45):
```markdown
- **Output**：代码 `commit`（+ 可选三仓 PR 到 `develop`）；`workbench.json → {}`；groom 入口关闭。`logic.*` 与 groom 文件**保留**。
```
New:
```markdown
- **Output**：代码 `commit`（+ 可选三仓 PR 到 `develop`）；`workbench.json → {}`；groom 入口关闭。`logic.md` 与 groom 文件**保留**。
```

- [ ] **Step 4: Verify**

```bash
grep -c '问题账\|logic-analyze\|logic.items\|logic\.\*' .claude/skills/submit-work/SKILL.md
grep -q '## 2 Open' .claude/skills/submit-work/SKILL.md && echo "open gate OK"
```
Expected: `0`, then `open gate OK`.

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/submit-work/SKILL.md
git commit -m "refactor(skills): submit-work gates on logic.md ## Open, drop 问题账/ledger refs"
```

---

## Task 6: Update `AGENTS.md` (workflow + notes)

**Files:**
- Modify: `AGENTS.md` (lines 14, 72, 73, 76 — stays Chinese)

- [ ] **Step 1: Line 14 — old → new**

Old:
```markdown
脚手架层（AI 逻辑）已**正式生产接入**：`/sync`、`/start-work` 接真实飞书（FeiShu Project MCP）；`/logic-analyze`、`/submit-work` 接真实文档 repo（需求空间 + 数据模型空间）。完整链路见下方「脚手架工作流」。
```
New:
```markdown
脚手架层（AI 逻辑）已**正式生产接入**：`/sync`、`/start-work` 接真实飞书（FeiShu Project MCP）；`/logic-converge`、`/submit-work` 接真实文档 repo（需求空间 + 数据模型空间）。完整链路见下方「脚手架工作流」。
```

- [ ] **Step 2: Workflow §4 (line 72) — old → new**

Old:
```markdown
4. **`/logic-analyze`** — 读「需求 specs + 原型 + 数据模型 + 现有代码 + groom 碎片」，把「两份真理都没说、但写代码必须知道」的实现逻辑沉淀成 `logic.md`（经 `ledger.mjs` 渲染，是交给编码的唯一交接物），并回写 workbench 文档基线。**只读** `apps/web/commons/<mod>/overview.md` 与各模块 `overview.md` 做全局认识——这些 `overview.md` 由专门的 **commons 维护 skill** 生成/维护（建设中），`/logic-analyze` 不写入它们。
```
New:
```markdown
4. **`/logic-converge`** — 读「需求 specs（含 `_common` 共享层）+ 原型 + 数据模型 + 现有代码 + groom 碎片」，把**跨制品的冲突**（矛盾/差异/阻断实现的沉默）逐条与操作员**收敛**，决策沉淀进 `logic.md`——它是**叠加在各输入之上的补充件（supplement），不是替代**：`/coding` 同时读原始输入与 `logic.md`。文档仓按其自描述 README 导航（不硬编码路径），并回写 workbench 文档基线。**只读** `apps/web/commons/<mod>/overview.md` 与各模块 `overview.md` 做全局认识——这些 `overview.md` 由专门的 **commons 维护 skill** 生成/维护（建设中），`/logic-converge` 不写入它们。
```

- [ ] **Step 3: Workflow §5 (line 73) — old → new**

Old:
```markdown
5. **`/coding`** — 消费 `logic.md`，起 superpowers 流水线（`writing-plans → executing-plans`）生成/改模块（`gen:coc` + 测试全绿）；流水线 review 的 findings → 人工触发 **`/logic-groom`** 回灌为碎片（`待处理`），走 groom→analyze→code 闭环重新消费，不在此就地 debug。不回写飞书、不开 PR（那是 `/submit-work`）。
```
New:
```markdown
5. **`/coding`** — 消费**全部输入 + `logic.md`**（后者是补充件，非唯一来源），起 superpowers 流水线（`writing-plans → executing-plans`）生成/改模块（`gen:coc` + 测试全绿）；流水线 review 的 findings → 人工触发 **`/logic-groom`** 回灌为碎片（`待处理`），走 groom→converge→code 闭环重新消费，不在此就地 debug。不回写飞书、不开 PR（那是 `/submit-work`）。
```

- [ ] **Step 4: The accumulation note (line 76) — old → new**

Old:
```markdown
> `logic.md` / `logic.items.json` / `<name>.groom.md` 是**模块级累积**，跨 task 保留；`/submit-work` 只清 `workbench.json`。台账只经 `ledger.mjs` 改，**任何人（含 skill）不手改** `logic.md` / `logic.items.json`。
```
New:
```markdown
> `logic.md` / `<name>.groom.md` 是**模块级累积**，跨 task 保留；`/submit-work` 只清 `workbench.json`。`logic.md` 是**收敛决策的补充件**（累积但会随输入演进被**修订/取代**，不是只增台账、不是任务清单），**唯一写者是 `/logic-converge`**；任何人（含 `/coding`、`/logic-groom`）不手改。
```

- [ ] **Step 5: Verify**

```bash
grep -c 'logic-analyze\|logic.items\|唯一交接物\|ledger\.mjs\|台账' AGENTS.md
```
Expected: `0`.

- [ ] **Step 6: Commit**

```bash
git add AGENTS.md
git commit -m "docs(agents): rewrite workflow §4/§5 for logic-converge supplement model"
```

---

## Task 7: Update `.work/workbench.schema.json` descriptions

**Files:**
- Modify: `.work/workbench.schema.json` (lines 5, 58, 66 — descriptions only; field structure unchanged)

- [ ] **Step 1: Rename in the three descriptions**

Replace `/logic-analyze` with `/logic-converge` in:
- Line 5 (`title`/`description`): `…/logic-analyze 写 docs_flash_time 与三个 *_docs(commit 信息)…` → `…/logic-converge 写 docs_flash_time 与三个 *_docs(commit 信息)…`
- Line 58 (`docs_flash_time.description`): `执行 /logic-analyze 刷新文档信息的时间…` → `执行 /logic-converge 刷新文档信息的时间…`
- Line 66 (`docRef.description`): `(由 /logic-analyze 写入,用于下次增量差异比对)` → `(由 /logic-converge 写入,用于下次增量差异比对)`

- [ ] **Step 2: Verify still valid JSON + rename done**

```bash
node -e "JSON.parse(require('fs').readFileSync('.work/workbench.schema.json','utf8')); console.log('valid JSON')"
grep -c 'logic-analyze' .work/workbench.schema.json
```
Expected: `valid JSON`, then `0`.

- [ ] **Step 3: Commit**

```bash
git add .work/workbench.schema.json
git commit -m "docs(workbench): schema descriptions reference logic-converge"
```

---

## Task 8: Rename references across injection/doc files

**Files:**
- Modify: `.claude/context/injections/finishing.md`, `.claude/context/injections/references/coding-rules/commons.md`, `.claude/context/injections/references/coding-rules/module-layout.md`, `.claude/docs/module-overview.md`, `apps/web/commons/README.md`, `.claude/skills/start-work/SKILL.md`, `.claude/skills/mock-app/SKILL.md`

- [ ] **Step 1: `finishing.md` — replace token**

In line 10, `groom→`/logic-analyze`→`/coding` loop` → `groom→`/logic-converge`→`/coding` loop` (single `/logic-analyze` → `/logic-converge`).

- [ ] **Step 2: `coding-rules/commons.md` — replace token (×2)**

Lines 9 and 13: `/logic-analyze` → `/logic-converge`.

- [ ] **Step 3: `coding-rules/module-layout.md` — replace token**

Line 18: `/logic-analyze` → `/logic-converge`.

- [ ] **Step 4: `.claude/docs/module-overview.md` — replace tokens (×3) + drop the ledger aside**

- Line 3: `/logic-analyze` → `/logic-converge`.
- Line 7: `/logic-analyze` → `/logic-converge`.
- Line 8: replace `（`writing-plans` 把它作为一项交付物纳入计划，非 `L-n` 台账项）` with `（`writing-plans` 把它作为一项交付物纳入计划）`, and `/logic-analyze` → `/logic-converge`.

- [ ] **Step 5: `apps/web/commons/README.md` — replace token (×2)**

Lines 12 and 15: `/logic-analyze` → `/logic-converge`.

- [ ] **Step 6: `start-work/SKILL.md` — replace tokens + soften path-table phrasing**

- Line 10: `（需求分析见 `/logic-analyze`）` → `（需求分析见 `/logic-converge`）`.
- Line 14: replace `路径/URL 以 `/logic-analyze` 的路径约定表为准` with `路径/URL 见两文档仓各自 README（`/logic-converge` 按 README 导航）`.
- Line 52: replace `按 `/logic-analyze` 路径约定表的 URL `git clone`` with `按下列 URL `git clone``.
- Line 58: `那是 `/logic-analyze` / `/submit-work` 后来才建的` → `那是 `/logic-converge` / `/submit-work` 后来才建的`.
- Line 68: `（那是 `/logic-analyze` 的字段）` → `（那是 `/logic-converge` 的字段）`.

- [ ] **Step 7: `mock-app/SKILL.md` — replace token (×2)**

Lines 126 and 131: `/logic-analyze` → `/logic-converge`.

- [ ] **Step 8: Verify all seven files clean**

```bash
for f in .claude/context/injections/finishing.md \
  .claude/context/injections/references/coding-rules/commons.md \
  .claude/context/injections/references/coding-rules/module-layout.md \
  .claude/docs/module-overview.md apps/web/commons/README.md \
  .claude/skills/start-work/SKILL.md .claude/skills/mock-app/SKILL.md; do
  echo "$f: $(grep -c 'logic-analyze' "$f")"
done
grep -c 'L-n 台账项' .claude/docs/module-overview.md
```
Expected: every file `0`; the last check `0`.

- [ ] **Step 9: Commit**

```bash
git add .claude/context/injections/finishing.md \
  .claude/context/injections/references/coding-rules/commons.md \
  .claude/context/injections/references/coding-rules/module-layout.md \
  .claude/docs/module-overview.md apps/web/commons/README.md \
  .claude/skills/start-work/SKILL.md .claude/skills/mock-app/SKILL.md
git commit -m "docs: rename /logic-analyze references to /logic-converge across scaffold docs"
```

---

## Task 9: Final consistency sweep

**Files:** none (verification only)

- [ ] **Step 1: Forbidden tokens gone everywhere except the retained logic-analyze dir**

```bash
for t in "logic-analyze" "ledger" "logic.items" "唯一交接物" "问题账"; do
  n=$(grep -rn "$t" . 2>/dev/null | grep -v node_modules | grep -v "/.git/" | grep -v "docs/superpowers/" | grep -v ".claude/skills/logic-analyze/" | wc -l)
  echo "$t: $n"
done
```
Expected: **every count `0`.** (The retained `.claude/skills/logic-analyze/` files and `docs/superpowers/` legitimately contain the old vocabulary and are excluded.)

- [ ] **Step 2: `台账` survives only in sync-db-model + retained logic-analyze**

```bash
grep -rln "台账" . 2>/dev/null | grep -v node_modules | grep -v "/.git/" | grep -v "docs/superpowers/"
```
Expected: `.claude/skills/sync-db-model/SKILL.md` and the retained `.claude/skills/logic-analyze/{SKILL.md,ledger.mjs}` — and nothing else.

- [ ] **Step 3: Nothing outside the retained dir references `ledger`**

```bash
grep -rn "ledger" . 2>/dev/null | grep -v node_modules | grep -v "/.git/" | grep -v "docs/superpowers/" | grep -v ".claude/skills/logic-analyze/"
```
Expected: **no output** (external ledger references were rewritten; only the retained logic-analyze dir self-references it).

- [ ] **Step 4: Skill inventory (logic-converge added; logic-analyze retained)**

```bash
ls .claude/skills/ | grep 'logic'
```
Expected: `logic-analyze`, `logic-converge`, and `logic-groom` all present (logic-analyze intentionally retained).

- [ ] **Step 5: If any check failed, fix the offending file and re-run; otherwise nothing to commit**

(No commit if all prior tasks committed cleanly. If a stray reference was found and fixed, commit it: `git commit -am "chore: sweep stray logic-analyze/ledger reference"`.)

---

## Self-Review

**1. Spec coverage** — every design section maps to a task:
- §4 shape/lifecycle/single-writer → Task 1 (logic.md structure + "sole writer") + Task 6 line-76 note.
- §5 single "conflict" lens → Task 1 ("The single conflict lens").
- §6 README-driven navigation → Task 1 (navigation table) + Task 6 §4 ("按自描述 README 导航") + Task 8 start-work path-table softening.
- §7 skill steps → Task 1 (Steps 1-7).
- §8 gates → Task 3 (coding gate) + Task 5 (submit gate).
- §9 full-sweep file changes → Tasks 3-8 (one per file/group); Task 2 is now a no-op (retention).
- §10 delete timing → Task 2 (retain per operator; deletion deferred).
- §11 risks (single-writer convention, prototype may be empty, baseline/Open decoupling) → encoded in Task 1 prose.

**2. Placeholder scan** — no `TBD`/`TODO`/"handle edge cases"/"similar to Task N"; every edit shows exact old→new content or exact tokens; every verify step has a concrete command + expected output.

**3. Type/name consistency** — section names are identical everywhere: `## 0 Provenance`, `## 1 Converged`, `## 2 Open`; command name `logic-converge`; fragment states `待处理`/`已整理`; handle `C-n`. The coding gate (Task 3) and submit gate (Task 5) both key off `## 2 Open`, matching Task 1's output. No dangling references.
