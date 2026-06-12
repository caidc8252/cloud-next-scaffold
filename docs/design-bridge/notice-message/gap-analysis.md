# 消息通知 — 差距分析（UI 展示 vs 现有逻辑/模型）

> 对比:**现有逻辑**(`SysNotice` 模型;后端读写**尚不存在**——无 service/路由)与 **界面展示**(admin `notification-bell.tsx`)。结论先行:这不是"个别字段对不上",而是 **UI 是个未接线的静态壳,且其内置接线注释指向一个与现有 `SysNotice` 不一致的旧表设计**。

## 0. 总体状态
| 面 | 现状 |
|---|---|
| 后端逻辑 | **几乎为零**:只有 `SysNotice` 模型;无 list/unread-count/read service 或路由;无生产者 |
| 界面 | **静态壳 + 假数据**:`count = 10` 写死、Popover 列表恒显示 "No notifications."、无取数、无 item 渲染、无读已读交互 |
| ⇒ | 展示与模型/目标逻辑**几乎全不匹配**(属"未接线"级,非细节偏差) |

## A. 字段层面（模型有 vs UI 渲染）
| `SysNotice` 字段 | UI 是否用上 | 差距 |
|---|---|---|
| `status`(UNREAD/READ) | ❌ | 无未读/已读区分、无未读点、无已读态 |
| `title` | ❌ | 未渲染条目标题 |
| `payload.content` | ❌ | 未渲染正文 |
| `creTime` | ❌ | 未渲染时间 |
| `noticeType` | ❌ | 未按类型出图标/模板 |
| `payload.link` | ❌ | 条目无点击跳转 |
| 未读数(派生自 `status`) | **写死 10** | 应 = `count(status=UNREAD)` 查询;且与空列表**自相矛盾**(角标 10、列表 0) |

→ 模型的展示字段**一个都没渲染**;徽标数字是假的。

## B. UI 注释假设的模型 ≠ 真实模型（重要,会误导实现）
`notification-bell.tsx` 的接线指引注释建议"新建 `sys_notification` 表(recipientUserId, partyId, type, payload, readAt, creTime)",但真实模型是 `sys_notice`:

| 注释假设 | 真实 `SysNotice` |
|---|---|
| 表 `sys_notification` | `sys_notice` |
| `recipientUserId` | `userId` |
| **`readAt`(时间戳)** 表已读 | **`status`(UNREAD/READ 枚举)** |
| `type` | `noticeType` |
| 顶层 `link` 字段 | `payload.link`（在 JSON 内） |
| `partyId` | `belongToPartyId` |
| (未提) | 另有 `title` 字段 |

→ 注释**早于** `SysNotice` 落库,已过时。**照注释实现会建出与现有模型冲突的表/字段、用错读已读机制(`readAt` vs `status`)。**

## C. 逻辑层面差距
1. **未读数**:`count=10` 写死 → 应查 `status=UNREAD` 的真实数;且需与列表同口径(当前用户 + 当前 party/全局)。
2. **取数缺失**:UI 不调任何接口 → 应有 `list` / `unread-count`（+ 可选轮询/聚焦刷新）。
3. **读已读交互全无**:模型有 `status`,UI 无"标记已读 / 全部已读"、无点击条目即读。
4. **party 作用域无意识**:`belongToPartyId` 存在、spec 要求按当前 party 过滤,但静态铃铛**切 party 不重置**。
5. **条目渲染结构缺失**:无 标题/正文/时间/类型图标/跳转 的任何 markup,只有一句空态。
6. **空态/有数据态**:永远空态,无两态切换。

## D. 属性 / 契约层面
- `title`、`noticeType` 模型**可空** → UI 渲染需空值兜底(默认标题/默认图标),否则空态错乱。
- `payload` 是自由 JSON、"必含 `content`" 仅注释约定**不强制** → UI 须**防御性**读 `payload.content`/`payload.link`。
- `status` 闭集靠**应用层**(无 DB CHECK)→ 读写两端都要守 UNREAD/READ。
- `belongToPartyId` 可空(null=全局)→ 读取过滤须用 `= 当前party OR IS NULL`,UI 不感知但服务端必须。

## 结论 / 要消除差距需要
1. 实现 `notice-message` 规格的**中间层**:`list / unreadCount / markRead` service + 3 路由 + `createNotice` 生产者。
2. **重写铃铛**:删 `count=10`、接 hook(取未读数 + 列表 + 标记已读);新增**条目渲染**(title/`payload.content`/time/`noticeType` 图标/`payload.link` 跳转 + 未读点),空值兜底。
3. **修正/删除铃铛里的过时注释**:对齐真实 `sys_notice` 模型(`userId`/`status`/`noticeType`/`payload`/`belongToPartyId`),避免误导。
4. party 切换时重置(随会话 `currentPartyId`,服务端已按作用域过滤,前端切换刷新即可)。
5. 埋点(谁产生通知)按产品逐个接(见 `api-logic.md`,待定)。
