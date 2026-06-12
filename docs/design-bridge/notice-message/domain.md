# 消息通知（notice-message）— Domain

> 从现有代码桥接：`packages/db` 的 `SysNotice` 模型（已存在）+ admin `notification-bell`（铃铛+角标+Popover 列表的 UI 壳，现为假数据 `count=10`、列表空、无读写）。本文定通知的实体/状态/作用域/不变量;读写接口见 `api-logic.md`/`api-spec.yml`。

## Actors / Roles
- **收件人**：任意已登录用户。通知**按用户**归属,只读自己的。无需特定权限码（`x-authorize: authenticated`）。
- **生产者**：服务端业务流程（非用户角色）。通过内部 `createNotice` 写通知,不对外暴露 API。

## Entities

### SysNotice（既有表）
| 字段 | 类型 | 说明 |
|---|---|---|
| `noticeId` | uuid PK | |
| `userId` | int | 收件人;读取按 `userId = session.userId` |
| `belongToPartyId` | int? | 作用域 party;**null = 跨 party 全局**（该用户在任何 party 上下文都可见）,否则仅该 party 上下文可见 |
| `noticeType` | varchar(40)? | 通知类型（**开放可扩展集**,由生产者定义;决定 payload 形状与展示图标/文案模板） |
| `title` | varchar(200)? | 标题（展示用） |
| `payload` | jsonb `{}` | 按 `noticeType` 分型的载荷,**约定必含 `content`**;可含 `link`（点击跳转）等 |
| `status` | varchar(20) | `UNREAD`（默认）/ `READ`;闭集由**应用层**保证（Prisma 不表达 CHECK） |
| `creTime` / `updTime` | ts | 创建/更新时间;列表按 `creTime` 倒序 |

索引:`(userId, status)`（角标计数 + 列表）、`(belongToPartyId)`。

## Enums / 状态
- `status`：`UNREAD` → `READ`（**单向**,应用层强制;无 DB CHECK,写入点用 zod/常量约束）。
- `noticeType`：**开放集**,非固定枚举;每种类型在生产者侧约定 payload 字段 + 在展示侧约定图标/标题模板。本期不锁定具体取值（随业务埋点增长）。

## Lifecycles
- **通知**：`created(UNREAD)` →（用户查看/标记）→ `READ`。**只读化,不可逆**;本期**无 删除/dismiss**（模型无软删字段）。

## 作用域规则（贯穿读取）
读取（列表 / 未读数 / 标记已读）一律按:**`userId = session.userId`** 且 **(`belongToPartyId = session.currentPartyId` 或 `belongToPartyId IS NULL`)**。
- ⇒ 用户只看到自己的通知;且只看到"当前 party 上下文 + 全局"的,切 party 时列表随之变化。

## Invariants
1. **只读自己的**:任何读/写都以 `userId = session.userId` 收窄,不能读/改他人通知。
2. **party 作用域一致**:列表、未读数、"全部已读"用**同一过滤**（user + 当前 party + 全局）,三者口径一致。
3. **mark-read 幂等且单向**:仅 `UNREAD → READ`;重复标记无副作用;按 `ids` 标记的 id 必属该用户。
4. `payload` 必含 `content`;`noticeType` 决定其余载荷字段（生产者约定）。
5. **生产者内部化**:写通知只经服务端 `createNotice`,无对外创建 API（防伪造他人通知）。

## 现状 delta（实现要点）
- **DB:齐备**（`SysNotice` 模型 + 索引在）。
- **UI:壳齐全、数据假**（铃铛/角标/Popover/列表区都有,但 `count=10` 写死、列表恒空、无 hook）。
- **缺中间层**:读写 service + 路由（list / unread-count / read）+ 前端 hook（取数 + 标记已读）+ 生产者 `createNotice` + 各业务**埋点事件**（哪些事件产生通知 = 产品决策,待定）。
