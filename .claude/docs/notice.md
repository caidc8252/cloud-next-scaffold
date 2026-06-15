# 站内通知能力

> 归属：各 app `service/notification/`（`server/{service,repository,mapper}` + `schemas` + 纯 `notification.scope.ts`）、客户端 `app/(portal)/notifications/*` + 顶栏铃铛 + `NotificationsProvider`、i18n `notifications.*`。**发任何站内通知前必读。** 完整设计/裁决见 `docs/superpowers/specs/2026-06-13-notice-{backend-conflicts,design}.md`、`docs/design-bridge/notice-message/`（本地）。

- 想给某用户发站内通知，统一调服务端内部 **`createNotice`**（`service/notification/server/notification.service.ts`）——它是**唯一生产者**、对外不暴露建通知 API（防伪造他人通知）。任何业务域 / 任何 app 的服务端都可调（跨 app 写同一张 `sys_notice` 表，如 portal 入驻完成 → 通知 admin 侧邀请人）。**不要**自己 `prisma.sysNotice.create`、不要新开建通知接口
- 入参契约（`createNoticeInputSchema`，单一真源）：`{ userId(收件人), belongToPartyId?(省略=该用户跨 party 全局), noticeType, title, payload }`。写一行 `SysNotice`（`status=UNREAD`），写后不可变（只 mark-read）
- **payload 四件套**（无特例结构）：`summary`（**必含**，纯文本，铃铛/列表一行）+ `detail`（**必含非空**，纯文本段落，详情正文；创建入口 zod 强制，禁空 detail 记录）+ `fields?[]`（`{key,value,mono?}`，详情属性栅格）+ `links?[]`（`{label,type:'text'|'button',url}`，详情跳转按钮）。**删了** content/actor/cta/nav/module 等旧形状，别再用
- **`noticeType` 约定 `"<module>.<event>"`**（如 `ticket.assigned`、`account.passwordReset`）。`module` **不落库**，前端从前缀派生图标/颜色/类型 chip/筛选（已知 ticket/customer/app/order/account，未知→default 通用图标）。新增一类 module 只需在 `app/(portal)/notifications/_lib/notice-meta.ts` 的 `MODULE_META` 加一项
- **`title` 生产者提供、展示原样**、空则不显示标题行（不做模板兜底）
- **语言规则（关键）**：生产者内容（`title`/`summary`/`detail`/`fields[].value`/`links[].label`）由**调用方按收件人语言渲染好再传**——取 `sys_user.locale`（用 `isLocale()` 收窄、回退 `en`）→ `getTranslations({ locale })`（**不能用 cookie 版**，收件人 ≠ 当前请求者）。展示端**原样不翻译**。结构标签（`fields[].key` 查 `notifications.fields.<key>` 缺则显原 key、module chip）才在**展示时** i18n
- **`links[].url` 生产者拼好**：同 app 存相对路径（`/tickets/T-1`）、跨 app 才存绝对 URL。客户端 `openNoticeLink` 同源软导航 / 跨源整页跳 + 挡开放重定向。行/铃铛点击进**通知详情页** `/notifications/[id]`（按通知 id，非业务跳转）；详情里点 `links` 才跳业务
- **埋点必须非阻断**：在业务 service 的事件点 `try/catch` 调 `createNotice`，失败仅 `log.warn`、**不影响主流程返回/不回滚**（通知是副作用）
- 读取面已就位（**不用你管**，接埋点时只需 `createNotice`）：`GET /api/notifications`（作用域 + DB offset 分页 `page/limit≤100` + 服务端筛选 `status/module/q`）、`/unread-count`、`POST /read`（`{ids}`|`{all}`，幂等单向 UNREAD→READ）。作用域一律 `userId = session.userId AND (belongToPartyId = currentPartyId OR IS NULL)`，三接口口径一致
- 客户端铃铛/列表/详情由 `NotificationsProvider`（`unreadCount`+`recentUnread`+`markRead`/`markAllRead`）驱动，已挂好；接新通知**无需动前端**（payload 四件套自动渲染）
- **本期不做**：dismiss / 删除 / mark-unread / 保留清理

## 接一个新埋点事件（配方）
1. 定 `noticeType = "<module>.<event>"`（module 决定前端图标；新 module 顺手在 `notice-meta.ts` 加 `MODULE_META` 项 + `notifications.module.<m>` 三语标签）。
2. 三语补 `notifications.events.<event>.{title,summary,detail,...}`（`en` 基底，禁硬编码）；正文里要展示的属性 key 补 `notifications.fields.<key>` 三语。
3. 在业务 service 的事件点，按收件人 `locale` 渲染好文本、拼好 `links[].url`，`try/catch` 调 `createNotice(...)`（失败仅 `log.warn`）。

## 范例（同 app，account.passwordReset）
见 `apps/admin/service/users/server/users.service.ts` 的 `resetUserPassword`：取目标用户 `locale` → `getTranslations({locale})` → 非阻断 `createNotice({ userId, belongToPartyId, noticeType:"account.passwordReset", title, payload:{summary, detail} })`。

- **日志**：走 `@cloud/log`（`createLogger("<scope>")`，见 `.claude/docs/logging.md`）。
- 分层/请求/i18n/鉴权细节分别见 `.claude/docs/{server-layering,api-and-requests,i18n,auth-permissions}.md`。
