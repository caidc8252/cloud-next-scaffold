# 收敛循环 + findings sink（`/coding` 阶段 D 编排）

阶段 D「逻辑生成 + 收敛」的可执行细则。目标：独立条目并发跑、检查与生成重叠、读写不冲突，最终收敛到一个**可信的零**。

## 1. findings sink（append-only，一 finding 一文件）

- 目录：`.work/logics/<cat>/<name>/findings/`（与 `coverage.json`/`logic.items.json` 同级）。
- **每条 finding = 一个 JSON 文件**，文件名 `<obligation-key-sanitized>--<unique-suffix>.json`；`unique-suffix` 由发现它的 checker 自造（如 `date +%s%N` 或自身 agent id）**防并发撞名**。
- Schema：
  ```json
  { "severity": "foundation|local", "obligationKey": "R:app-store.md#R-7",
    "file": "…/service.ts", "line": 42, "title": "一行", "detail": "证据/复现", "foundBy": "checker 标识", "round": 1 }
  ```
  - `severity:"foundation"` = 地基/契约级：改了会让**依赖它的模块白做**（公共 `*.stub`/`*.public` 契约、`party_id` 隔离、跨模块面）。
  - `severity:"local"` = 单模块内：校验小错、文案、非契约逻辑。
- **checker 只写自己那份 finding 文件**；**绝不写** `coverage.json`/`logic.items.json`（落点/状态归 controller 串行改，见 §2）。

## 2. 并发读写不冲突（靠隔离，不靠小心）

- **单写者不变式**：代码目录 = 对应 builder；`coverage.json`（经 `coverage.mjs`）/ `logic.items.json`（经 `ledger.mjs`）= **controller 串行**；findings 文件 = 各 checker 自己那份。**没有两个 agent 写同一处。**
- **checker 只读已提交快照**：builder 在自己 worktree 改完 `commit`，checker 读那个 SHA；git 对象不可变 ⇒ 读不撞写。（本次重设计处于 NO-COMMIT 演练，用工作树只读副本代替快照；真实 `/coding` 运行照常 commit。）
- **共享 / 地基层 fan-out 前冻结**（沿用 mock-app foundation-first）：冻结前不许 fan-out。

## 3. 调度（独立异步批量 + 依赖边 barrier）

- **独立义务** → 并发生成 + 并发 C2 check-only（各自写 finding，不当场修）。
- **依赖边** → barrier：条目 B 依赖 A 的契约，先 check A 过了再建 B（与地基同规矩，降一层）。
- **findings 分级触发**：
  - `foundation` → **立即报 controller，暂停下游依赖**（别让后续活堆在错地基上）。
  - `local` → 留在 sink，**批量进收敛循环**。

## 4. 收敛循环（check → fix → 到零）

1. 生成 + 并发 check 跑完 → controller **排空 findings**（读 `findings/`，按 severity 处理，处理完移到 `findings/archive/` 或删）：先修 `foundation`（可能触发依赖回滚/重建），再批量修 `local`。
2. **controller 串行更新落点**：把已绿派生测试对应的 obligation 标 `implemented`（`node .claude/skills/coding/coverage.mjs cover <dir> <key> implemented <testfile:testname>`）；确属本轮不做/不可测的标 `gap`/`out-of-scope`+理由。**`cover` 只由 controller 调，builder/checker 不碰 `coverage.json`**（守 §2 单写者）——否则测试全绿而 obligation 仍 `pending`，`gate` 永远红、循环不收敛。
3. 每轮重跑判据：`node .claude/skills/coding/coverage.mjs gate <dir>`（全绿 = 每条义务有落点）**且** 派生测试全绿（`pnpm test`）。
4. **循环直到：gate 绿 + 测试全绿 + findings sink 空。**

### 三护栏（保证会停，不打地鼠）

1. **测试当「零」的不动点** —— 判据是从 `SM-n`/`R-n`/party 派生的确定性测试（见 `coding-rules/testing.md`「从义务派生测试」），不是 LLM 主观「还能挑」。
2. **回归护栏** —— 任何 fix **不许弄红已绿测试** → 循环单调收敛。
3. **有界 + 冲突上抛** —— 设最大轮数 N；两个 finding 的修复互相打架 / 反复不收敛 → 停并**上抛操作员**（带原文背景），不无限循环。

> 排空后仍剩「缺契约、没法交接」的项 → 对应 `L-n` 置 `blocked` 并 surface；实现选择落 code+test+overview；业务/数据事实进 logic.md 回写队列（本轮暂缓上游回写）。
