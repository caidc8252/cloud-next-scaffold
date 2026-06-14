# 消息通知（notice-message）— API Logic

> 读取面三接口规则 + 服务端生产者（createNotice）+ 反应/埋点。
> **已按 2026-06-13 backend-conflicts 裁决刷新**（见 `docs/superpowers/specs/2026-06-13-notice-backend-conflicts.md`）。
> 贯穿：所有读写按 **当前用户 + 当前 party 作用域** 收窄。

## 贯穿作用域
`scope(session)` = `userId = session.userId` AND (`belongToPartyId = session.currentPartyId` OR `belongToPartyId IS NULL`)。列表 / 未读数 / 标记已读 **同用此过滤**，口径一致。

## listNotifications `GET /api/notifications`
1. `assertPermissions({ all: [] })` → 取 session（仅需登录）。
2. 查 `scope(session)`，按 `creTime` 倒序，**数据库分页**（`page` 默认 1、`limit` 默认 25、上限 100；用 `@cloud/request` 的 `Pager`/`CursorPager`）。
3. 可选服务端筛选（与分页同查询，保证翻页正确）：`status`（UNREAD/READ）、`module`（按 `noticeType` 前缀）、`q`（`title`/`payload.summary` 文本搜索）。
4. 映射为客户端 `Notice`：`{ id: noticeId, type: noticeType, title, status, createdAt: creTime, payload }`，并回 `pager: { total, page, limit }`。
5. 展示层从 `noticeType` 前缀派生 `module`（图标/颜色/类型 chip）；**`module` 不落库、不在响应里**。

## notificationsUnreadCount `GET /api/notifications/unread-count`
1. 同上鉴权。
2. `count(scope(session) AND status="UNREAD")` → `{ count }`。廉价，供铃铛角标轮询/聚焦刷新。

## markNotificationsRead `POST /api/notifications/read`
1. 同上鉴权；解析 body：`{ ids: string[] }` 或 `{ all: true }`，二者皆无 → 400。
2. `updateMany`（两支都套 `scope(session)`）：
   - `all` → `where scope(session) AND status="UNREAD"`；
   - `ids` → `where scope(session) AND noticeId IN ids AND status="UNREAD"`（非本人/跨域/已读的不动）。
   - `data: { status: "READ" }`。
3. 返回 `{ updated: count }`。**幂等**（重复标记 updated=0）、**单向**（仅 UNREAD→READ）。**无 mark-unread**。

| 失败 | 码 |
|---|---|
| 未登录 | 401（assertPermissions 抛 AuthzError） |
| body 既无 ids 也无 all | 100001（ERR_BAD_REQUEST）/ 400 |

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
}): Promise<void>  // 或返回 noticeId
```
- 写一行 `SysNotice`（`status=UNREAD`、`creTime=now`）。**自身不本地化**：调用方按收件人语言把 title/summary/detail/value/label 渲染好、并把 `links[].url` 拼好后传入。
- `belongToPartyId` 省略/null = 跨 party 全局；给值 = 仅该 party 上下文可见。
- **不对外暴露创建 API**（防伪造他人通知）。**跨 app 写入**：任一 app 的服务端都可写同一 `sys_notice` 表（如 portal 入驻完成 → 通知 admin 侧邀请人）。
- 写后不可变（只 mark-read）；若事件可能重复触发，调用方加去重键防重。

## 反应 / 埋点（产品决策，待定，可增量接）
通知系统是**通用基础设施**；「哪些业务事件 → 写哪种通知」逐个接。候选（**非承诺、待定**）：
- 邀请被接受 → 通知**邀请人**；管理员重置某用户密码 → 通知**该用户**；合同变更 → 通知相关管理员；系统公告 → `belongToPartyId=null` 全局。
> 每接一种：定 `noticeType`（`<module>.<event>`）+ payload + 展示侧 i18n（fields.key / module）+ 在事件点调 `createNotice`（按收件人语言渲染文本、拼好 links.url）。

## 前端（mock-app 已实现，真实化只换取数层）
- 铃铛：取 `unread-count`（角标，可聚焦刷新）；Popover 取未读 top-N，分组 Today/Earlier；标记已读后角标/列表/详情同步。
- 列表：服务端分页 + 筛选（status/module/q）；行点击进**通知详情页** `/notifications/[id]`（按通知 id，非业务跳转）。
- 详情：渲染 `summary`/`detail`（段落）/`fields`（key 走 i18n 栅格）/`links`（按钮）；点 link 才跳业务（同源软导航 / 跨源整页跳 + 白名单校验）。
