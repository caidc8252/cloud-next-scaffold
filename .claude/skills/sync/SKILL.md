---
name: sync
description: 查询真实飞书（当前负责人=当前账号 且 阶段=FE）并向操作员展示开发任务清单。只读展示，不写任何文件。当操作员要查看「归我、且在 FE 开发阶段」的任务清单时使用。
---

# /sync

查询真实飞书里**归我、且在开发阶段**的工作项，并向操作员**展示**清单。

> **重要：`/sync` 只读、只展示，不写任何文件**。
> `/sync` 让操作员看到「有哪些任务、归谁、到哪个阶段」。
> 字段 key、类型/节点/角色标识、MQL 写法**一律以 `.claude/feishu/feishu.config.json` 为准**（`field_mapping` / `mql_hints` / `stage_mapping`），本文件不重复声明、不得编造。

## Steps
1. **读取公共配置**：从 `.claude/feishu/feishu.config.json` 加载 `space.project_key`、`filter`、`field_mapping`、`mql_hints`。配置缺失或无效 → 阻塞等待操作员提供。
2. **拉取工作项**（FeiShu Project MCP）：先用 `ToolSearch` 加载 `search_by_mql` / `search_user_info`，按 config 的 `mql_hints` 组 MQL 查询，过滤条件来自 `filter`（运行时解析，**不得编造**）：
   - `assignee=current-user` → 用 `search_user_info(['current_login_user()'])` 解析当前账号后，按 `mql_hints` 的「归我」写法过滤。
   - `stage=FE` → FE 是流程角色/节点（见 `filter.stage_role_name` 与 `stage_mapping`）；以 FE 角色成员 = 当前用户 + 当前节点判定，按 `mql_hints` 组条件，必要时用 `get_workitem_brief` 核实，不得编造节点标识。
3. **展示列**（每列对应 `field_mapping` 的语义名，field_key 由 config 解析；执行时用 `get_workitem_field_meta` 核实）：
   | 展示列 | 来源（`field_mapping` 语义名） |
   |---|---|
   | 任务名称 | `name` |
   | 任务编号 | `task_id` |
   | 当前负责人 | `current_owner`（经 `search_user_info` 解析为 name/email/user_key） |
   | 当前阶段 | 当前工作流节点名 |

## I/O contract
- **Input**：真实飞书工作项（FeiShu Project MCP）。
- **Output**：**仅终端展示**（任务清单表格）；**无文件产出**，不读写任何 `.work/*`。
- **Idempotent**：纯查询，无副作用；重复运行只是重新展示最新飞书状态。

## 展示格式（向操作员汇报）
- 向操作员以**表格**展示：**一列一个字段，一行一条任务**（多条记录行式更紧凑）。
- 列固定为四字段，每条任务占一行：
  ```
  | 任务名称 | 任务编号 | 当前负责人 | 当前阶段 |
  |---|---|---|---|
  | 客户管理（Customer 全生命周期） | ADM-02-01（飞书 7025546162） | Tymon Lin / 林春晖 | NextJS开发(Claude) |
  ```
- 多条任务则继续追加行。

## AUTONOMOUS_MODE
- 无交互分支。`project_key` 与查询条件来自配置/操作员；缺失时不得编造，应阻塞等待输入。

## Failure / exit code
- 拉取/解析失败 → **非零退出**；因 `/sync` 不写任何文件，故**无文件副作用**需要回滚。
