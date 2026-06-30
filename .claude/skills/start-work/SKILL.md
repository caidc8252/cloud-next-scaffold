---
name: start-work
description: /start-work {task编号} —— 开始一个新任务。校验唯一活跃任务锁、从真实飞书(FeiShu Project MCP)按编号同步任务信息、准备 git 工作分支 feature/task-{task编号}(基于 develop),最后登记到 .work/workbench.json。当操作员要开始一项新工作时使用。
---

# start-work

操作员开始一项新工作的入口。用法：`/start-work {task编号}`（例：`/start-work PEP-501-01`）。

职责：**确认可以开工 → 准备好 git 分支 → 落活跃任务锁**。本技能只做工作流编排与 git/状态准备，不读需求、不写代码（需求分析见 `/logic-analyze`）。

> **顺序铁律**：步骤 1–6 全是只读校验与 git 操作；**只有全部成功，才在步骤 7 写入 `workbench.json`**。任何一步失败/被操作员中止 → 直接退出，**不留下半启动的脏 workbench**。

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

4. **工作区脏检查**：若工作区有未提交改动（`git status --porcelain` 非空）**且**当前分支 ≠ `feature_name`：
   - 询问操作员是否 `git stash`；
   - 操作员**拒绝** → **停止**并提示「请自行处理未提交的改动后再开始」，退出；
   - 同意 → `git stash`（带说明信息）后继续。

5. **develop 存在性**：检查仓库存在 `develop` 分支（本地或远端）。不存在 → **提醒操作员并停止**，退出。

6. **分支准备**：
   - 先 `git fetch` 并把 `develop` 同步到最新。
   - 若 `feature_name` 已存在 → 切到它并 `git pull` 到最新。
   - 否则 → 基于最新 `develop` 创建 `feature_name` 并切换过去。

7. **落锁(最后一步)**：把任务信息写入 `.work/workbench.json`，**符合 `.work/workbench.schema.json`**：
   - `current_task = { task_id, task_name, module{category,name}, current_owner{name,email}, current_stage, description }`（来自步骤 2 的同步结果）。
   - `start_time = 当前时间`，格式 `yyyy-MM-dd HH:mm:ss`。
   - 不触碰 `docs_flash_time` / `specs_docs` / `prototype_docs` / `data_model_docs`（那是 `/logic-analyze` 的字段）。

## I/O contract

- **Input**：task编号（命令参数）；真实飞书工作项（FeiShu Project MCP，按 `.claude/feishu/feishu.config.json`）；当前 git 仓库状态。
- **Output**：成功时——已切到 `feature/task-{task编号}`（基于最新 develop）+ `.work/workbench.json` 写入 `current_task`、`start_time`。
- **Idempotent**：对同一 task编号重复执行 = 刷新分支到最新 + 重写锁；不会因已存在而报错。
- **Failure**：步骤 1–6 任一失败/被中止 → 退出且**不写 workbench**（无文件副作用，git 至多停在 fetch/stash 之后由操作员接管）。

## AUTONOMOUS_MODE

- 唯一交互点：步骤 2 的「阶段/负责人不符是否坚持」与步骤 4 的「是否 stash」。其余无分支。
- 任务信息来自真实飞书 MCP，**不得编造**；查询失败/无匹配 task_id → 报错退出。
