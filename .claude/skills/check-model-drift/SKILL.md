---
name: check-model-drift
description: /check-model-drift [feature] —— 检查数据模型空间(../pep-data-model-docs)里逻辑模型(DBML)与物理模型(SQL)的差距。通过创建干净上下文的 subagent，传入 feature name 到数据模型空间执行该仓的只读简报命令 check-model-drift，把「逻辑↔物理差距简报」输出到界面并提醒操作员。只读、不写任何文件、不碰 git 写操作。当操作员要核对数据模型逻辑/物理一致性，或 logic-analyze 读完数据模型后自动核对时使用。
---

# check-model-drift

核对**数据模型空间** `../pep-data-model-docs` 里逻辑模型（`specs/logical-model/*.dbml`）与物理模型（`specs/physical-model/*.sql`）的差距，重点标出「本 feature 新建逻辑但尚未落物理」的项，提醒操作员。用法：`/check-model-drift [feature]`。

能力本体（差距分析规则、匹配、输出格式）**在数据模型空间那侧**：`../pep-data-model-docs/.claude/commands/check-model-drift.md`（只读简报命令，第 40 行明确「可作为子代理返回值」）。**本 skill 只做编排**：起一个干净上下文的 subagent，把 feature name 传过去执行那条命令，收回简报、展示、提醒。本 skill 不复制那侧的分析逻辑（避免两处漂移）。

> **只读铁律**：不写本仓/文档仓任何文件、不生成简报文件、不执行任何 git 写操作、不触发数据模型空间的 `sync-to-*` / `update-*` / `release-*` 落地命令。简报只输出到界面。

## 触发方式

- **自动**：`/logic-analyze` 读完数据模型四目录后自动触发一次（feature name 从 workbench 取；只读、**不阻断**分析，简报供操作员判断）。
- **手动**：操作员随时 `/check-model-drift [feature]` 独立执行。

## feature name 解析

1. 显式入参 `[feature]` → 直接用（如 `feature/task-ADM-02-01`）。
2. 缺省 → 读 `.work/workbench.json` `current_task.task_id`，拼 `feature/task-{task_id}`。
3. 两者皆无（无活跃任务且未传参）→ 提示操作员传入 feature，或退化为数据模型空间**当前分支**（无参即命令默认行为）。

> 依脚手架约定，`/start-work` 已把数据模型文档仓对齐到 `feature/task-{task_id}`；该分支名即传入值，用于命令第三步的 git 叠加（新建 vs 历史遗留分区）。

## Steps

1. **就绪校验**：`../pep-data-model-docs` 存在可读；缺失 → 提示按脚手架约定 `git clone`（`Newland-Payment-Technology-US-Co-Ltd/pep-data-model-docs`），未就绪则退出。解析 feature name（见上）。
2. **起干净上下文 subagent**（Agent 工具，`general-purpose`；**不复用主对话上下文**，让繁重的 DBML/SQL 解析在隔离上下文里跑，主对话只留简报）。传入 prompt 要点：
   - 目标仓：`../pep-data-model-docs`（先 `cd` 进去）。
   - 读取并**逐步执行**该仓 `.claude/commands/check-model-drift.md` 的全部步骤，目标分支 = 传入的 feature name。
   - **返回值**：严格按该命令「输出格式」的简报文本（未落物理·新建/历史遗留、列缺失、物理孤儿、建议动作、待确认问题），原样返回，不加主观改写。

   > **强制要求（写进 subagent prompt，逐条照做）**：
   > 1. **跳转到对方目录空间**：先 `cd ../pep-data-model-docs`，之后一切读取/分析都在该仓内进行，不回到本仓、不跨仓写。
   > 2. **遵守对方仓库的宪法**：进去后先读该仓的宪法（`CLAUDE.md`，及其引用的 `AGENTS.md` / 命令文件里的「宪法禁止事项」），**以对方的规则为准**执行；本仓约定不外带、不覆盖对方约定。
   > 3. **决不写文件**：不写/改对方仓或本仓任何文件、不生成简报文件、不执行任何 git 写操作、不触发对方的 `sync-to-*` / `update-*` / `release-*` 落地命令。纯只读。
   > 4. **只返回汇总的报告**：最终消息只有那份差距简报本身（按命令「输出格式」），不夹带过程日志、寒暄或额外解释。
3. **展示 + 提醒**：把 subagent 返回的简报**原样展示**到界面。并据内容提醒操作员：
   - 有「未落物理 · 该分支新建（可行动）」→ 提醒「本 feature 新建逻辑尚未落物理，建议到数据模型空间跑 `/sync-to-physical-model`」。
   - 有「列缺失 / 物理孤儿」→ 如实转述，交操作员判断。
   - 全部为「无」→ 报「逻辑↔物理一致，无差距」。
4. **自动触发场景**：仅展示 + 提醒，**不阻断**当前流程（logic-analyze 继续）。手动场景：展示完即结束。

## I/O contract

- **Input**：feature name（入参或 workbench 推导）；数据模型空间 `../pep-data-model-docs`（DBML + SQL + guidelines，只读）。
- **Output**：**仅界面展示**差距简报 + 提醒动作。**无文件产出**，不读写任何 `.work/*`，不碰 git 写操作，不碰数据库。
- **Idempotent**：纯只读，可重复；重复运行只是重新算并重新展示最新差距。
- **范围外**：落地物理模型（`/sync-to-physical-model`）、改 DBML/SQL/Overview、类型/约束深比对（命令只管存在性）。

## AUTONOMOUS_MODE

- 无写副作用、无交互分支。subagent 只读执行、返回简报；主 skill 展示 + 提醒即止。
- feature 无法解析且无活跃任务 → 提示操作员传入，不编造分支。

## Failure / exit code

- 数据模型空间缺失/不可读 → 提示 clone 后退出，**无副作用**。
- subagent 执行失败/返回非简报 → 如实报错并展示原始返回，退出；因全程只读，**无文件/ git 副作用**需回滚。
