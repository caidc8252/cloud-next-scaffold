# 消息通知（notice-message）— API Logic

> 读取面三接口的规则 + 服务端生产者（createNotice）+ 反应/埋点。贯穿:所有读写按 **当前用户 + 当前 party 作用域** 收窄。

## 贯穿作用域
`scope(session)` = `userId = session.userId` AND (`belongToPartyId = session.currentPartyId` OR `belongToPartyId IS NULL`)。列表 / 未读数 / 全部已读 **同用此过滤**,口径一致。切 party 后结果随当前 party 变化。

## listNotifications `GET /api/notifications`
1. `assertPermissions({ all: [] })` → 取 session（需登录;无特定权限码）。
2. 查 `scope(session)`,按 `creTime` 倒序,取 `limit`（默认 30,上限 100）。
3. 映射为客户端 `Notice`：`{ id: noticeId, type: noticeType, title, payload, status, createdAt: creTime }`。

## notificationsUnreadCount `GET /api/notifications/unread-count`
1. 同 1。
2. `count(scope(session) AND status="UNREAD")` → `{ count }`。廉价,供铃铛角标轮询/聚焦刷新。

## markNotificationsRead `POST /api/notifications/read`
1. 同 1;解析 body：`{ ids: string[] }` 或 `{ all: true }`,二者皆无 → 400。
2. `updateMany`（两支都套 `scope(session)`,与列表/未读数同口径——满足 domain 不变量③）：
   - `all` → `where scope(session) AND status="UNREAD"`；
   - `ids` → `where scope(session) AND noticeId IN ids AND status="UNREAD"`（既限本人+当前 party 作用域,又限 id;非本人/跨域/已读的不动）。
   - `data: { status: "READ" }`。
3. 返回 `{ updated: count }`。**幂等**（重复标记 updated=0）、**单向**（只 UNREAD→READ）。

| 失败 | 码 |
|---|---|
| 未登录 | 401（assertPermissions 抛 AuthzError） |
| body 既无 ids 也无 all | 100006 / 400 |

## 生产者（服务端内部,非 API）
`createNotice({ userId, belongToPartyId?, noticeType, title, payload })`：
- 写一行 `SysNotice`（`status=UNREAD`）。`payload` 必含 `content`;`noticeType` 决定其余字段与展示模板。
- `belongToPartyId` 省略/null = 跨 party 全局通知;给值 = 仅该 party 上下文可见。
- 由业务流程在事件发生时调用;**不**对外暴露创建 API（防伪造他人通知）。
- 跨 app 写入:任一 app 的服务端都可写同一 `sys_notice` 表（如 portal 入驻完成 → 通知 admin 侧的邀请人）。

## 反应 / 埋点（哪些事件产生通知 —— 产品决策,待定,可增量接）
通知系统是**通用基础设施**;具体"哪些业务事件 → 写哪种通知"是产品决策,逐个接入。候选示例（**非承诺、待定**,unverified — needs human）:
- 邀请被接受 → 通知**邀请人**（"X 已加入 {party}"）。
- 管理员重置了某用户密码 → 通知**该用户**。
- 合同变更（续约/暂停/终止）→ 通知相关主体的管理员。
- 系统级公告 → `belongToPartyId=null` 全局通知。
> 本期落地**读取面 + `createNotice` 生产者基建**;具体埋点事件随产品确认逐个加（每加一种:定 `noticeType` + payload + 展示模板 + 在事件点调 `createNotice`）。

## 前端（铃铛）
- 挂载时取 `unread-count`（角标;可加 30–60s 轮询 / 聚焦刷新）。
- 打开 Popover → 取 `listNotifications`;条目点击 → 跳 `payload.link` + 乐观 `read({ids:[id]})`;顶部"全部已读" → `read({all:true})` 后刷新角标。
- 替换现有写死 `count=10` / 恒空列表。
