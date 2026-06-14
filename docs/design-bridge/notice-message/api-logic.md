# 消息通知（notice-message）— API Logic

> 读取面三接口的**机制**（规则/失败/映射）+ 服务端生产者 `createNotice` + 反应/埋点。
> 业务规则/策略（作用域意义、语言、跳转、生命周期）见 `business-logic.md`；实体/字段见 `domain.md`；wire 契约见 `api-spec.yml`。

## 贯穿作用域
`scope(session)` = `userId = session.userId` AND (`belongToPartyId = session.currentPartyId` OR `belongToPartyId IS NULL`)。列表 / 未读数 / 标记已读 **同用此过滤**，口径一致。

## listNotifications `GET /api/notifications`
1. `assertPermissions({ all: [] })` → 取 session（仅需登录）。
2. 查 `scope(session)`，按 `creTime` 倒序，**数据库 offset 分页**（`page` 默认 1、`limit` 默认 25、上限 100；用 `@cloud/request` 的 `Pager`）。
3. 可选服务端筛选（与分页同查询，保证翻页正确）：`status`（UNREAD/READ）、`module`（按 `noticeType` 前缀 `startsWith "<module>."`）、`q`（`title` `contains` 与 `payload.summary` 的 JSON `string_contains` 组 OR；该 OR 收在 `AND` 下，不冲掉作用域的 party-OR）。
4. 映射为客户端 `Notice`：`{ id: noticeId, type: noticeType, title, status, createdAt: creTime, payload }`。
5. 响应：`successResponse({ items }, pager)`——`pager` 的 `page/limit/total/totalPages` **展开到信封顶层**（与 `data` 同级，非嵌套在 `data` 内）。
6. 展示层从 `noticeType` 前缀派生 `module`（图标/颜色/类型 chip）；**`module` 不落库、不在响应里**。

## notificationsUnreadCount `GET /api/notifications/unread-count`
1. 同上鉴权。
2. `count(scope(session) AND status="UNREAD")` → `{ count }`。廉价，供铃铛角标挂载/聚焦刷新。

## markNotificationsRead `POST /api/notifications/read`
1. 同上鉴权；`req.json()` 解析失败 → `BusinessError(ERR_INVALID_JSON=100006)`；body 经 `markReadBodySchema`（`{ ids: string[] }` 或 `{ all: true }`），不合法 → `BusinessError(ERR_BAD_REQUEST=100001)`。
2. `updateMany`（两支都套 `scope(session)`）：
   - `all` → `where scope(session) AND status="UNREAD"`；
   - `ids` → `where scope(session) AND noticeId IN ids AND status="UNREAD"`（非本人/跨域/已读的不动）。
   - `data: { status: "READ" }`。
3. 返回 `{ updated: count }`。**幂等**（重复标记 updated=0）、**单向**（仅 UNREAD→READ）、**无 mark-unread**。

| 失败 | 码 |
|---|---|
| 未登录 | 401（`assertPermissions` 抛 `AuthzError`） |
| JSON 解析失败 | 100006（`ERR_INVALID_JSON`） |
| body 既无 ids 也无 all | 100001（`ERR_BAD_REQUEST`）/ 400 |

## 生产者 createNotice（服务端内部，非 API）
```ts
createNotice(input: {
  userId: number;                  // 收件人（必填，一行一人）
  belongToPartyId?: number | null; // 作用域 party；null = 该用户跨 party 全局
  noticeType: string;              // "<module>.<event>"，生产者必给
  title: string;                   // 标题（按收件人语言渲染好）
  payload: {                       // 四件套，文本均按收件人语言渲染好
    summary: string;               // 必含
    detail?: string;
    fields?: { key: string; value: string; mono?: boolean }[];
    links?: { label: string; type: "text" | "button"; url: string }[];
  };
}): Promise<void>
```
- 入参经 `createNoticeInputSchema` 校验后写一行 `SysNotice`（`status=UNREAD`、`creTime=now`）。**自身不本地化**：调用方按**收件人 `sys_user.locale`** 渲染好 title/summary/detail/value/label（语言策略见 `business-logic.md` §6）、并把 `links[].url` 拼好后传入。
- **不对外暴露创建 API**；**跨 app 写入**：任一 app 服务端可写同一 `sys_notice` 表。
- 写后不可变（只 mark-read）；若事件可能重复触发，调用方加去重键防重。

## 反应 / 埋点（产品决策，逐个增量接）
通知系统是**通用基础设施**；「哪些业务事件 → 写哪种通知」逐个接。
- **已接**：`account.passwordReset` —— 管理员重置他人密码（`apps/admin/service/users/server/users.service.ts` `resetUserPassword`）→ 通知该用户；非阻断（失败仅 `log.warn`）。
- 候选（**待定**）：邀请被接受 → 通知邀请人；合同变更 → 通知相关管理员；系统公告 → `belongToPartyId=null` 全局。
> 接一种的配方（定 `noticeType` + 三语 i18n + 事件点非阻断调 `createNotice`）见 `.claude/docs/notice.md`。

## 前端（已实现）
铃铛 / 列表 / 详情的取数与交互见 `business-logic.md` §8–§9；由 `NotificationsProvider` 驱动（`unreadCount` + `recentUnread` + `markRead`/`markAllRead`），mutation 经 `@cloud/request/client` 调上述 route。
