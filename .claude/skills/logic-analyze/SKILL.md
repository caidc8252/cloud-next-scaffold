---
name: logic-analyze
description: /logic-analyze —— 针对当前活跃任务,读取需求 specs + 高保真原型 + 数据模型 + 现有模块代码,把 specs/原型都没说、但写代码必须知道的「技术逻辑与缺口」沉淀成 coding 可逐条消费的 logic.md 台账。逻辑来自三路输入(澄清/差异/groom 沉淀),不自己猜;未澄清直接问操作员。
---

# logic-analyze

针对 `workbench.current_task` 指向的模块，把「需求 + 原型 + 数据模型 + 现有代码 + groom 沉淀」读齐、对齐、补缺，产出 `logic.md`——`/coding` 的唯一交接物。

> **核心原则**：`specs/` 是业务语义的真理、原型是展现的真理，二者**已经很详细**。`logic.md` **不复述业务**，只装「两份真理都没说、但 coding 写代码必须知道」的**实现逻辑与缺口**。
> **逻辑不是猜的**，来自三路输入：① 逻辑不足/冲突 → 经操作员澄清后提取；② 文档增量差异；③ `<name>.groom.md` 沉淀。

## 职责分工：判断归 AI，记账归助手

- **判断**（分析缺口、提炼逻辑、与操作员澄清）→ 本 SKILL 散文负责。
- **机械记账**（发号、翻状态、保留未消费条目、取代/作废、渲染、finalize 检查）→ **一律走 `ledger.mjs`**（路线乙）。
  - 真相在 `.work/logics/<cat>/<name>/logic.items.json`；`logic.md` 由助手**渲染产出**。
  - **任何人(含本 SKILL、coding)都不得手改 `logic.md` / `logic.items.json`**——只通过助手命令改，每次自动重渲染。这是「A/B/C 被重产冲掉」类 bug 的物理防线。
  - 命令：`node .claude/skills/logic-analyze/ledger.mjs <init|meta|digest|add|status|list|render|finalize> <dir> [...]`（`add/meta/digest` 从 stdin 收 JSON）。

## 两条游标（别混）

- **分析游标** = `workbench.{specs,prototype,data_model}_docs.last_commit_id`：logic-analyze 已分析到哪个 commit。**仅本轮成功完成后推进**。
- **实现游标** = `logic.items.json` 里每条 `L-n` 的状态：coding 实现到哪了。
- 二者独立、靠 `L-n` 当桥。基线推进只决定"下轮去哪找新差异追加"，**绝不决定删什么**。

## 前置

- 读 `.work/workbench.json`；`current_task` 为空 → **报错退出**（无活跃任务，先 `/start-work`）。
- 取 `cat / name / task_id`。`dir = .work/logics/<cat>/<name>`；若 `logic.items.json` 不存在 → `ledger.mjs init <dir> <cat> <name>`。

## 路径约定

| 类型 | 仓库 | 本地路径 | 模块内定位 |
|---|---|---|---|
| 需求 specs | `pep-webapp-docs` | `../pep-webapp-docs` | `specs/<cat>/<name>/{rules,processes,states}/` |
| 原型 prototype | `pep-webapp-docs` | `../pep-webapp-docs` | `handoffs/design/<cat>/<name>.html`（仅此规范文件,变体忽略） |
| 数据模型 data-model | `pep-data-model-docs` | `../pep-data-model-docs` | `specs/{logical-model,physical-model,json-schema,enums}/` |
| groom 沉淀 | 本仓库 | — | `.work/logics/<cat>/<name>/<name>.groom.md`（由 grooming skill 产出,可能不存在） |

> **文档仓库本地不存在则自动 `git clone`**（克隆到与本仓同级目录）：
> - 需求空间（specs + prototype）→ `../pep-webapp-docs`：`git clone https://github.com/Newland-Payment-Technology-US-Co-Ltd/pep-webapp-docs.git`
> - 数据模型空间 → `../pep-data-model-docs`：`git clone https://github.com/Newland-Payment-Technology-US-Co-Ltd/pep-data-model-docs.git`
>
> 私有仓，clone/pull 需本机已配 GitHub 访问凭证；失败 → 阻塞提示操作员，不静默跳过。

## Step 1 — 拉文档 + 抓基线 commit

对每个文档仓库：切 `develop` 并 `git pull` 到最新。然后：
- **抓本轮分析的 commit**：记下各仓库**此刻**的 HEAD（specs/prototype 同属 pep-webapp-docs，commit 相同；但按各自路径分别 diff）。**这就是本轮要写回 workbench 的基线值**——结尾别重新查 HEAD（远端可能已前进，那段没分析过）。
- **读取**：需求模块目录、原型规范文件、数据模型四目录。
- **差异检测**：用 workbench 里对应 `last_commit_id` 对本轮 HEAD 跑 `git diff <base>..<head> -- <模块路径>`：
  - 命中本模块 → 总结差异（原型差异要连同上下文看）；命中别处 → 标"无影响"以示已查。
  - workbench 无基线（首次）→ 全量读，差异为"首次全量"。

## Step 2 — 读现有代码

- 全局认识：遍历 `apps/web/modules/<cat>/<mod>/overview.md`、`apps/web/commons/<mod>/overview.md`（内容约定见 `.claude/docs/module-overview.md`；缺失则按现有代码自行建立认识，本 skill 只读不写 overview）。
- 当前模块：读 `apps/web/modules/<cat>/<name>/` 下全部文件（不存在 → 全新模块）。

## Step 3 — 读 groom + 现有台账

- 读 `<name>.groom.md`（若有）：`# 原始碎片` 表、`# 问题账` 表。
- `ledger.mjs list <dir>` 看现有 `L-n`（含未消费/blocked/需返工），作为本轮基线，避免重复。

## Step 4 — 分析、澄清、沉淀（生成程序）

1. **扫碎片**：取 groom `# 原始碎片` 中 `处理状态=待处理` 的，统合分析；有疑问 → 写入 groom `# 问题账`（来源 `groom#n`）。
   - **碎片是 coding-review finding（既有 `L-n` 实现有缺陷）时**：定位对应 `L-n`，用 `supersedes:<旧id>` 落修正条目（助手自动把旧条目标 `需返工`，交 coding 回滚重做），**不新开与原 `L-n` 脱钩的需求条目**。
2. **AI 分析缺口/冲突**：从 specs/原型/data-model/代码 找"两份真理都没说"的技术缺口与冲突 → 也写入 `# 问题账`（来源 `logic-analyze`）。
   - 若无 groom.md：创建仅含 `# 问题账` 的骨架 `<name>.groom.md`（`# 原始碎片` 区归 grooming skill，本 skill 不造碎片）。
3. **增量差异**：非首次则结合代码整理 Step 1 的差异逻辑。
4. **澄清循环**：对 `问题账 状态=待处理` 逐条与操作员对话——**不猜**；冲突需复核代码/逻辑、确认真实存在后详述再请决策。循环至清空，剩余给终态（`已解决|本轮放弃|转出 TASK-x`），`已解决` 写 durable 落点（= 落到哪条 `L-n`）。
5. **跨模块预检**：分析本模块引用到的其它模块，检查 `apps/web/modules|commons` 下**是否存在/契约齐全**；缺失 → `ledger.mjs add` 一条 `类型:跨模块依赖` 的 `L-n`（其它依赖它的条目用 `deps` 指向它），coding 会据此 `blocked(missing-dependency-contract)`。
6. **commons 上提候选**（best-effort，主责在 coding / commons 维护 skill）：发现某逻辑被多处复用宜上提 → **向操作员说明并申请授权**；授权则交由 commons 维护流程处理，logic-analyze 不自行搬。需 coding 知道的复用约束，写进对应 `L-n` 的 `desc/judge`。
7. **沉淀**（全部经助手，不手改文件）：
   - `ledger.mjs meta <dir>` ← 写 task/各 commit/groom/code_exists/mode。
   - `ledger.mjs digest <dir>` ← 写本轮 Δ（瞬态，覆盖）。
   - `ledger.mjs add <dir>` ← 每条已澄清逻辑落成 `L-n`（含 `type/source/anchors/judge/desc`，必要时 `deps/supersedes`）。
     - **supersede**：新差异推翻旧条目时给 `supersedes:<旧id>`——助手会把旧条目自动标 `作废`（若旧条目已被 coding 标 `已处理` 则标 `需返工`，提示回滚）。`需返工` 作为交接信号交给 coding，由 coding 回滚后置 `作废`（属 coding 回写职责，logic-analyze 不消化）。
   - 回写 groom：碎片 `待处理→已整理`、问题账给终态（groom 为 markdown，本 skill 直接编辑其表格）。
8. **回写 workbench 基线（仅成功时）**：`docs_flash_time` + 三个 `*_docs` = Step 1 抓的 commit 信息（符合 `.work/workbench.schema.json`）。**中止/阻塞则不推进基线**（下轮重算这段差异）。不碰 `current_task/start_time`。
9. **finalize 闸门**：`ledger.mjs finalize <dir>`（依赖/取代链完整、无遗留 `blocked`）**且** groom 全部碎片=已整理、问题账无"待处理"。`待实现`/`需返工` 是交给 coding 的合法交接态，**不拦**（`blocked` 才是"缺契约、没法交接"）。不过 → 不算完成，回去处理。

## 关键规则

- **锚点要细**：specs 指到 `R-n/P-n/SM-n` 并带依据 commit（`#R-2 @<commit>`）；原型指到**具体界面/区块**（如 `<name>.html#上传版本弹窗`）。**禁止让 coding 回读整份 html / 整个语料**——logic.md 是蒸馏交接物，coding 按锚点回读那一小片。
- **字段级所有权/并发**：logic-analyze 重跑期间不可同时 coding。助手层面：`add/digest/meta` 归 logic-analyze；`status` 归 coding（`待实现↔已处理`，并按交接信号置 `作废`〔回滚 `需返工` 后〕/`blocked`〔缺契约〕）。谁都不手改渲染产物。
- **生命周期**：`logic.md` 是**模块级、跨 task 累积**，**不随 `/submit-work` 清空**（submit 只清 workbench）；条目按状态(待实现/已处理/blocked/需返工/作废)长期留在台账。

## I/O contract

- **Input**：`workbench.current_task`；三类文档仓库（自动 clone/pull）；现有模块代码；`<name>.groom.md`；现有 `logic.items.json`。
- **Output**：`logic.md`（渲染产物）+ `logic.items.json`（真相）；回写 groom 状态；回写 workbench `docs_flash_time` + 三个 `*_docs`。
- **Idempotent**：可重复运行；基于最新 commit 增量追加/更新 `L-n`，**绝不删除未消费条目**，基线只在成功后推进。
- **Failure**：无活跃任务 → 报错退出；有未澄清的阻断问题 → 不强行产出，先问操作员，且**不推进基线**。
