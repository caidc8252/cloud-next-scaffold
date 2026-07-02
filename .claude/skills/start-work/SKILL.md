---
name: start-work
description: /start-work {task编号} —— 开始一个新任务。校验唯一活跃任务锁、从真实飞书(FeiShu Project MCP)按编号同步任务信息、把三仓(本代码仓 + 两文档仓)都对齐到 feature/task-{task编号} 并与云端同步、准备本地 git 工作分支(基于 develop),最后登记到 .work/workbench.json。当操作员要开始一项新工作时使用。
---

# start-work

操作员开始一项新工作的入口。用法：`/start-work {task编号}`（例：`/start-work PEP-501-01`）。

职责：**确认可以开工 → 把三仓对齐到工作分支 → 落活跃任务锁**。本技能只做工作流编排与 git/状态准备，不读需求、不写代码（需求分析见 `/logic-converge`）。

> **顺序铁律**：步骤 1–7 全是只读校验与 git 操作；**只有全部成功，才在步骤 8 写入 `workbench.json`**。任何一步失败/被操作员中止 → 直接退出，**不留下半启动的脏 workbench**（git 副作用——如已 stash/切换的仓——留给操作员接管，不回滚）。
>
> **三仓对齐**：本代码仓 + 两文档仓（需求空间 `../pep-webapp-docs`、数据模型空间 `../pep-data-model-docs`，各仓路径/URL 以其自描述 README 为准）。**两文档仓（步骤 6）全部对齐成功，才创建本地代码仓分支（步骤 7）**。

## 飞书数据源（真实 MCP 接入）

步骤 2「按 task_id 同步任务信息」从**真实飞书**拉取（FeiShu Project MCP，参照 `/sync` 的工具前缀 `mcp__FeishuProjectMcp__*`）：

- **配置**：空间/类型/字段·节点·角色 key 全部以 `.claude/feishu/feishu.config.json` 为准（`space.project_key`、`work_item_type_key`、`field_mapping`、`stage_mapping`），**不得编造**。
- **加载工具**：先用 `ToolSearch` 加载 `search_by_mql` / `search_user_info`（按需 `get_node_detail` / `get_workitem_brief` 核实节点与字段）。
- **定位工作项**：用业务编号 `task_id`（字段 `field_2138b1`）`search_by_mql` 查 `story` 类型（FROM 用 `project_key`，非空间名）。判定「任务是否存在」= 是否查到匹配 `field_2138b1` 的工作项。
- **返回契约**：解析为 current_task 同一结构（见步骤 2），后续步骤不变。

## Steps

1. **活跃任务锁**：读 `.work/workbench.json`（不存在或为 `{}` 视为无活跃任务）。
   - 若 `current_task` 非空 **且** `current_task.task_id ≠ 入参 task编号` → 拒绝并提示「当前有未完成的任务，请先提交任务」，**退出**。
   - 若 `current_task.task_id == 入参` → 视为续做（幂等），继续后续步骤（会刷新分支到最新）。

2. **飞书同步**（FeiShu Project MCP，按 `feishu.config.json`）—— 用 `search_by_mql` 按 `task_id`(field_2138b1) 定位工作项，解析为 current_task：
   - `task_id` ← `field_2138b1`；`task_name` ← `name`；`description` ← `description`。
   - `current_owner` ← `current_status_operator`（用 `search_user_info` 解析 name/email）。
   - `current_stage` ← 当前 in-progress 工作流节点名（`get_node_detail` / `get_workitem_brief` 核实，不得编造节点标识）。
   - `module{category,name}` ← 关联字段 `module_relation`(field_1781cd) → 解析到「所属模块」工作项，读其名 `{分类} / {模块名}`，按 `" / "` 拆为 `category`/`name`。
   - **任务不存在**（无匹配 `field_2138b1` 的工作项）→ **报错退出**。
   - 取当前飞书账号：`search_user_info(['current_login_user()'])`。
   - **校验两项**：`current_stage == stage_mapping.development`（开发节点，配置值 `"NextJS开发(Claude)"` / node_key `state_29`；FE 是该节点的角色）且 `current_owner == 当前账号`。
     - 任一不符 → **重点提醒**操作员具体是哪一项不符、当前值是什么，**建议不要继续**；
     - 操作员明确坚持 → 仍继续后续步骤。

3. **缓存分支名**：`feature_name = feature/task-{task编号}`。

4. **本地代码仓脏检查**（沿用「异常界定」，见步骤 6）：先判**异常**——有进行中的合并/rebase/cherry-pick、冲突未解、detached HEAD → **停止**并提示操作员手动处理，退出。否则若工作区有**干净的**未提交改动（`git status --porcelain` 非空）**且**当前分支 ≠ `feature_name`：
   - **重点提醒**操作员将 `git stash`，并询问是否同意；
   - 操作员**拒绝**（或 AUTONOMOUS_MODE 无输入）→ **停止**并提示「请自行处理未提交的改动后再开始」，退出；
   - 同意 → `git stash`（带说明信息）后继续。

5. **develop 存在性**：检查代码仓存在 `develop` 分支（本地或远端）。不存在 → **提醒操作员并停止**，退出。

6. **两文档仓对齐**（需求空间 `../pep-webapp-docs`、数据模型空间 `../pep-data-model-docs`）—— 对**每个**仓依次执行；任一仓中止 → 整个 start-work 退出（不写 workbench）：
   - **缺失自动 clone**：本地无该仓 → 按各仓自描述 README 的 URL `git clone` 到对应目录（`Newland-Payment-Technology-US-Co-Ltd/pep-webapp-docs` / `pep-data-model-docs`）。
   - **同步云端**：`git fetch`（含 `--prune`），拿到远端最新分支信息。
   - **异常界定（停手，交操作员手动处理）**：进行中的合并/rebase/cherry-pick、冲突未解、detached HEAD、本地与远端 `develop`/目标分支 **diverged**（各有对方没有的提交，非快进）→ **重点提醒**具体是哪个仓、什么异常，**停止 start-work 退出**，让操作员手动处理后重跑。
   - **仅干净的未提交改动**（`git status --porcelain` 非空，且无上述异常）→ **重点提醒**该仓有未提交改动、将被 `git stash` 暂存（含 `task_id` 说明），询问是否同意；**拒绝/无输入** → 停止退出；同意 → `git stash` 后继续。
   - **切到 `feature_name`**：
     - 该仓存在 `feature_name`（本地或远端）→ checkout 并同步到云端最新（快进 `pull`）。
     - **`feature_name` 不存在**（开工时文档仓通常尚无该分支——那是 `/logic-converge` / `/submit-work` 后来才建的）→ **重点提醒**「该仓无 `feature/task-{编号}`，是否用 `develop` 代替?」；**操作员明确同意才**切到 `develop` 并同步到云端最新；**不同意/无输入** → 停止退出。**不自动创建 feature 分支。**

7. **本地代码仓分支准备**（**仅在步骤 6 两文档仓都对齐成功后执行**）：
   - 先 `git fetch` 并把 `develop` 同步到最新。
   - 若 `feature_name` 已存在 → 切到它并 `git pull` 到最新。
   - 否则 → 基于最新 `develop` 创建 `feature_name` 并切换过去。

8. **落锁(最后一步)**：把任务信息写入 `.work/workbench.json`，**符合 `.work/workbench.schema.json`**：
   - `current_task = { task_id, task_name, module{category,name}, current_owner{name,email}, current_stage, description }`（来自步骤 2 的同步结果）。
   - `start_time = 当前时间`，格式 `yyyy-MM-dd HH:mm:ss`。
   - 不触碰 `docs_flash_time` / `specs_docs` / `prototype_docs` / `data_model_docs`（那是 `/logic-converge` 的字段）。

## I/O contract

- **Input**：task编号（命令参数）；真实飞书工作项（FeiShu Project MCP，按 `.claude/feishu/feishu.config.json`）；三仓 git 状态（本代码仓 + `../pep-webapp-docs` + `../pep-data-model-docs`，后两者缺失则自动 clone）。
- **Output**：成功时——两文档仓已切到 `feature/task-{task编号}`（或经同意留在最新 `develop`）、本代码仓已切到 `feature/task-{task编号}`（基于最新 develop），三仓均同步到云端最新 + `.work/workbench.json` 写入 `current_task`、`start_time`。
- **Idempotent**：对同一 task编号重复执行 = 三仓刷新分支到最新 + 重写锁；不会因已存在而报错。
- **Failure**：步骤 1–7 任一失败/被中止 → 退出且**不写 workbench**。git 副作用不回滚：已 clone 的仓保留，已 stash/切换的仓停在原地，由操作员接管。

## AUTONOMOUS_MODE

- 交互点：步骤 2 的「阶段/负责人不符是否坚持」、步骤 4 的「本地是否 stash」、步骤 6 的「文档仓是否 stash」「分支缺失是否用 develop 代替」（**逐仓**）。其余无分支。
- **保守停手**：步骤 4/6 凡需操作员确认处（stash、develop 代替），**无输入 → 停止退出**，绝不擅自 stash / checkout。
- **异常一律停手**：步骤 4/6 检出进行中操作、冲突、detached HEAD、diverged → 停止退出，交操作员手动处理。
- 任务信息来自真实飞书 MCP，**不得编造**；查询失败/无匹配 task_id → 报错退出。
