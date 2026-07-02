---
name: coding
description: Use after /start-work, when ready to implement the started task's module.
disable-model-invocation: true
---

# /coding

- **Prototype work → `mock-app`, not here.** A prototype (foundation artifact / HTML prototype) → `mock-app` owns the prototype→Next transform. Come back to `/coding` for the non-prototype logic it hands off.
- **四真源直读 — `logic.md` 是其中一源，不是唯一交接物。** coding plans from the truths: **specs + 原型 + data-model + `logic.md`**（+ 兑现后的 code）. Large truths enter via deterministic/structured readers (`foundation-map` for UI, Prisma types + enums/json-schema for DB) or by细锚点, **not** by blind dump. `logic.md` 只装其它三源没说的缺口/决策——**别**只凭它重建整个模块。
- **Freshness gate:** 生成/维护 `logic.md` 是 `/logic-analyze` 的活 — `/coding` 不自跑它。若 `.work/logics/<cat>/<name>/logic.items.json` 缺失，或 `<name>.groom.md` 仍有 `待处理` 碎片 → 停下让操作员先跑 `/logic-analyze`。`dir = .work/logics/<cat>/<name>`。
- `superpowers:writing-plans`, don't brainstorm. 计划按下面分相流程展开，每个任务标注它兑现的义务（coverage key 和/或 `L-n`）。
- **分相流程（质量第一、效率第二）:**
  - **A 读真理 → 覆盖清单.** 从四真源构建/刷新覆盖清单（`node .claude/skills/coding/coverage.mjs`）——每条 `R/P/SM/view/behavior/entity` 义务带锚点。大真理经 reader/`foundation-map`。
  - **B 地基生成（并行）.** DB 轨（`sync-db-model`→Prisma 类型 / enums→zod）+ UI 轨（`mock-app` scaffold + app-frame 壳 + 冻结共享层）。两轨独立可并行。
  - **C 地基硬检查点（清了才继续）.** `tsc`/foundation gate 绿 + seam↔Prisma↔states 绑定 + **操作员在线看 UI**：`pnpm db:setup`(一次) + `pnpm dev:web` + 真登录 → 导航到模块路由看页面/状态/跳转。此刻页面数据走 **mock-app 冻结的数据 seam**（不接真 service/prisma），故没写逻辑也能渲染；app 壳/菜单/鉴权照常用 dev DB（**不**绕 DB、**不**造 session stub）。前置：模块若权限门控，dev 登录用户须已 seed 到该权限，否则到不了页面。未过 → 修地基回 B。
  - **D 逻辑生成 + 收敛.** 独立条目并发生成 + 并发 check-only（findings 记一处）；依赖边先 check 上游再建下游；再 `check→fix→再 check` 收敛到 **`coverage.mjs gate` 全绿 + 派生测试全绿 + findings sink 空**。findings 分级：地基/契约级立即报（暂停下游），局部级批量进收敛循环。收敛护栏：测试当不动点、修复不许弄红已绿、有界则冲突上抛操作员。**编排细则**（findings sink 格式、单写者/快照并发、排空协议）见 `references/convergence-and-findings.md`。
  - **E 终检.** `SM-n` transition 测试 / `party` 负向 / `gen:coc` / typecheck / lint 全绿。
  - 计划须含 create/update-`modules/<cat>/<mod>/overview.md` 任务（per `.claude/context/injections/references/coding-rules/module-layout.md`），声明本模块覆盖了哪些 `R/P/SM`（引用 `coverage.md`）——机械交付物，**无** `L-n` tag。
- **双检查:** **C1 覆盖闸门** = `node .claude/skills/coding/coverage.mjs gate <dir>`（有义务无落点 = 非零退出，是墙）。**C2 对账（语义）** 查「实现了但实现错」：**自查优先**（回四真源找解释、能解就修并记绑定锚点）→ 确认真矛盾才问操作员（带原文背景，非丢编号）。
- **落点/状态记账（只经工具，不手改渲染产物）:**
  - 每条义务落点经 `node .claude/skills/coding/coverage.mjs cover <dir> <key> <implemented|gap|out-of-scope> [at|gapId|reason]`。
  - `logic.md` 的 `L-n` 状态仍**只由 controller（主会话）翻，never a subagent** — 经 `ledger.mjs status` only，never hand-edit `logic.md`/`logic.items.json`：
    - 满足验收 + 测试绿 → `node .claude/skills/logic-analyze/ledger.mjs status <dir> <n> 已处理`。
    - 被取代自动 `需返工` → 回滚其 impl 后 `status <dir> <n> 作废`。
    - 缺契约没法进 → `status <dir> <n> blocked` + surface。
- **Exit:** pipeline / 对账 surfaced findings → `/logic-groom`（re-groom → analyze → code loop）；clean run → `/submit-work`。
- Don't write back to FeiShu or open a PR — that's `/submit-work`.
