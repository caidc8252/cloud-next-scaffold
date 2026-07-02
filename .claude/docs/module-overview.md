# 模块概览（overview.md）约定

> 归属：`apps/web/modules/<cat>/<mod>/overview.md` 与 `apps/web/commons/<mod>/overview.md` 的内容约定与模板。**它是「模块的对外名片」**——给 `/logic-converge` 等做「全局认识」的只读交接物，不放实现细节（实现看代码与 `.claude/docs/server-layering.md`）。

## 是什么 / 给谁看
- 每个业务模块 `modules/<cat>/<mod>/` 与每个通用模块 `commons/<mod>/` 各有**一份** `overview.md`，描述「这个模块是什么、对外暴露什么、依赖谁、有何不变量」。
- **消费方**：`/logic-converge` 遍历所有 `overview.md` 建立跨模块认识（各模块对外暴露什么、依赖谁），据此收敛涉及其它模块的冲突；**不判断契约是否齐全、不做跨模块预检**（那是 `/coding` 的 stub-vs-block 职责，AGENTS.md 铁律 8）。其它人/skill 也可据此快速定位，不必通读模块源码。
- **写入方**：业务模块 `modules/<cat>/<mod>/overview.md` 由 **`/coding`** 在建/改该模块时创建并保持同步（`writing-plans` 把它作为一项交付物纳入计划）。专门的 **commons/overview 维护 skill**（建设中）只覆盖 **commons 概览 + 跨模块批量梳理**。`/logic-converge` **只读不写**。

## 写作原则
- **薄、稳、对外**：只写跨模块/全局视角需要知道的；模块内部实现细节、分层写法不写（那是代码与 server-layering 的事）。
- **可机读的清单优先**：public surface、权限码、依赖用列表/表格，便于 skill 解析。
- **与代码对齐**：字段以 `manifest.ts`、`server/<mod>.public.ts`、`app/api/*` 路由、`schema/` 为准，不臆造。

## 模板（modules 业务模块）
```markdown
# Overview: <cat>/<mod>

> 一句话职责：<这个业务模块负责什么>

## 数据 / 实体
- <表名>（`party_id` 归属：是/否）— <一句话>

## 对外 public surface
- API 路由：`<METHOD> /api/...` — <用途>
- 跨模块接口（`server/<mod>.public.ts` 导出）：`<fnName>(...)` — <用途>

## 权限码（4 段）
- `<cat>.<mod>.<entity>.<action>` — <说明>

## 依赖
- modules：`<cat>/<mod>` — <为何依赖>
- commons：`<mod>` — <为何依赖>

## 不变量 / 注意事项
- <写代码必须遵守、但不在 specs/原型里的约束>
```

## 模板（commons 通用模块）
> 差异：commons 是**叶子层通用模块**（由 modules 提升而来），**无自有菜单、不受合同闸门、不反调业务模块**，故没有「权限码/菜单」段，但要记**提升来源**与**被谁复用**。
```markdown
# Overview: commons/<mod>

> 一句话职责：<这个通用能力做什么>

## 提升来源
- 从 `modules/<cat>/<mod>` 提升（promote）而来 — <提升原因：被多处复用 / 纯技术下沉>

## 对外 API（导出）
- `<exportName>(...)` — <用途>

## 被复用于
- `modules/<cat>/<mod>` — <用途>

## 叶子层约束（自检）
- 无自有菜单 ✓ ｜ 不受合同闸门 ✓ ｜ 不反调业务模块 ✓

## 不变量 / 注意事项
- <跨模块复用时必须知道的约束>
```
