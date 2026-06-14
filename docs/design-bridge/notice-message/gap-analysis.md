# 消息通知 — 差距分析（已 SUPERSEDED）

> ⚠️ **本文已作废。** 原差距分析比对的是**旧静态铃铛**（`count=10`、列表恒空、无 hook、注释指向不存在的 `sys_notification` 表）——那个壳已被通知 **mock-app** 替换。
> 真源改为：
> - 裁决：`docs/superpowers/specs/2026-06-13-notice-backend-conflicts.md`
> - 刷新后的设计：本目录 `domain.md` / `api-spec.yml` / `api-logic.md`
> - 现有实现：`apps/admin/service/notification/**` + `apps/admin/app/api/notifications/**` + `(portal)` 铃铛/列表/详情。

## 当前真实差距（mock-app 之后，真实化前）

| 面 | 现状 | 缺 |
|---|---|---|
| DB | `SysNotice` + 索引齐备 | — |
| UI | mock-app 已做：铃铛 Popover / 列表（搜索+类型/状态筛选+分页+导出）/ 详情（summary+detail+fields+links） | — |
| 取数 | 走**内存 mock store**（`service/notification/mock-store.ts`）+ stub 路由 | 换真实 service + repository |
| 作用域 | mock store 不收窄（全局 seed） | 真实层补 `userId + (party OR null)`（C5） |
| 生产者 | 无 | `createNotice` + 逐事件埋点（C6） |
| 分页 | 列表一次拉满前端筛（mock） | 改**数据库分页**（C13） |
| 语言 | mock 文本为 en | 真实按收件人语言由生产者渲染存（C12） |

> 详细字段级裁决（payload 四件套、module 派生、links URL、status、title 等）见冲突文件。
