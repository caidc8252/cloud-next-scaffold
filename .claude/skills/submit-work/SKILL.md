---
name: submit-work
description: /submit-work —— 闭合 /start-work 开的活跃任务。检查 groom 残留 → 提交代码 → 扫 stub 未完成信号（有 stub 默认拦下 PR，需显式确认才放行）→ 询问是否 PR 到 develop（默认不提交，含代码/需求/数据模型三仓；严禁 PR 到 main）→ 关闭 groom 入口、清空 workbench 活跃锁。当操作员完成本任务、要收尾提交时使用。
---

# submit-work

把 `/start-work` 开的这一轮工作**收尾闭环**：确认无遗留 → 提交代码 → 决定是否并入 `develop` → 释放活跃任务锁。

> 本 skill 是**全新实现**（workbench 模型），不沿用任何旧的 submit-work 命令逻辑。
> **前置**：读 `.work/workbench.json`；`current_task` 为空 → 报错退出（无活跃任务可提交）。取 `cat/name/task_id` ← `current_task`。

## Steps

1. **groom 残留闸门（硬闸门）** —— 读 `.work/logics/<cat>/<name>/<name>.groom.md`：
   - `# 原始碎片` 仍有 `处理状态=待处理`，**或** `# 问题账` 仍有 `待处理` → **拦截提交**，列出残留条目，提示「先跑 `/logic-analyze` 把碎片/问题消费完再提交」。**本 skill 不自己分析/消费**（那是 `/logic-analyze` 的职责）。
   - 无残留（或无 groom 文件）→ 通过。

   > **收尾顺序**：submit 前应先「停止 `/logic-groom` 输入 → 跑 `/logic-analyze` 把最新碎片清成 `已整理` → 再 `/submit-work`」。若 analyze 后又 groom 出新碎片，本闸门会再次拦截——这是有意的强制闭合。

2. **提交代码** —— 在 `feature/task-<task_id>` 分支上：
   - 先 `git status` 给操作员看将提交的改动；**无改动** → 跳过提交并提示。
   - `git add -A` + `git commit`（提交信息含 `task_id` 与简述）。

3. **stub 未完成信号扫描（PR 软闸门）** —— PR 提醒前，扫代码仓：
   - `find apps/web/modules -name '*.stub.ts'`（跨模块前向声明 stub，铁律 #8）。
   - **有 stub** → 列出**完整清单**告知操作员：每个 stub 代表本功能**引用了别处尚未声明的权限码 = 代码未完全开发闭合**（目标模块声明真码后才删）。**不硬拦提交**（代码步骤 2 已 commit，且 stub 是 `gen:coc` 依赖的合法源码，**别删**），但**默认拦下步骤 4 的 PR**——见步骤 4。
   - **无 stub** → 一句话告知「无未完成 stub」后继续。

4. **PR 决策（默认选中「不提交」）** —— 询问操作员是否把工作 PR 到 `develop`：
   - **硬规则：PR 目标恒为 `develop`；严禁直接 PR 到 `main`。** 任一仓库都不得以 `main` 为 base；只要检测到操作员/工具意图指向 `main`，**当场拒绝**并改回 `develop`。
   - **stub 存在 → 默认拦下 PR**：步骤 3 若扫出 stub，PR 意味着把**半成品（引用了未声明权限码的功能）**并入 `develop`。**默认不放行 PR**——先带上 stub 清单说明「本功能未开发闭合，建议先把相关 stub 的目标权限码落到位、清完 stub 再 PR」。**仅当操作员在看过清单后显式确认「知情、坚持 PR」**才放行；无此显式确认（含无操作员输入）→ **一律不 PR**，退回「不提交」。
   - **不提交（默认）** → **提醒影响**：工作停留在 `feature/task-<task_id>`，未并入 `develop`；他人/后续任务看不到本次成果，主干不前进，代码与文档未入主干对齐，需日后手动并。
   - **提交** → 对**三个仓库**各自的 `feature/task-<task_id>` 开 PR 到 `develop`：
     - **代码仓**（本仓库）—— 已在该分支，直接 PR。
     - **需求空间** `../pep-webapp-docs`、**数据模型空间** `../pep-data-model-docs`：
       - **兜底 `/logic-analyze` 可能被跳过**：本地无该仓 → 先按 `/logic-analyze` 路径约定表的 URL `git clone` 到 `../pep-webapp-docs` / `../pep-data-model-docs`；若该仓不在 `feature/task-<task_id>`（分支不存在则基于最新 `develop` 创建），先 checkout 到它；有未提交的回写改动 → `git add -A` + `commit`（信息含 `task_id`）。
       - 然后开 PR `feature/task-<task_id>` → `develop`。
     - 某仓库**确无任何改动**（feature 与 `develop` 无差异）→ **跳过并明确告知**（不静默吞掉）。

5. **闭环收尾**：
   - 关闭本任务的 `/logic-groom` 捕获入口（捕获模式结束）。
   - 清空 `.work/workbench.json` → `{}`（释放唯一活跃任务锁，可开下一个任务）。
   - **不清** `.work/logics/<cat>/<name>/`（`logic.md`/`logic.items.json`/`<name>.groom.md` 是**模块级累积**，跨 task 保留）。

## I/O contract
- **Input**：`workbench.current_task`；`<name>.groom.md`；`apps/web/modules/**/*.stub.ts`；`feature/task-<task_id>` 工作区；三个仓库。
- **Output**：代码 `commit`（+ 可选三仓 PR 到 `develop`，**永不 `main`**）；stub 未完成清单（软提醒）；`workbench.json → {}`；groom 入口关闭。`logic.*` 与 groom 文件**保留**（stub 文件也**不删**）。
- **Idempotent**：`workbench` 已空 → no-op（无可提交任务）。

## AUTONOMOUS_MODE
- 两个交互点：步骤 4 的 PR 决策（默认不提交）、步骤 1 残留拦截后的去向。无操作员输入 → **不擅自 PR、不擅自跳过残留闸门**。
- 步骤 3 扫出 stub → **默认拦下 PR**：无「知情、坚持 PR」的显式确认（含无操作员输入）时**一律不 PR**。
- 「严禁 PR 到 `main`」是**硬规则**，无输入时也绝不违反。
