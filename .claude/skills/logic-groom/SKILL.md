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
- `groom` 不存在 → 创建骨架：仅 `# 原始碎片`（表头）。未决收敛问题**不进 groom**，改记入 `logic.md` 的 `## 2 Open`（旧的「问题清单」区已废弃）。

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
