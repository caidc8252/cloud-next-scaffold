# 消息通知（notice-message）— Domain

> 实体 / 字段 / 枚举 / 状态 / 作用域 / 不变量的单一真源。
> 整体业务规则见 `business-logic.md`；wire 契约见 `api-spec.yml`；接口/生产者机制见 `api-logic.md`。

## Actors / Roles
- **收件人**：任意已登录用户。通知**按用户**归属，只读自己的（`x-authorize: authenticated`，无特定权限码）。
- **生产者**：服务端业务流程（非用户角色）。经内部 `createNotice` 写通知，不对外暴露创建 API。

## Entities

### SysNotice（既有表，不加列）
| 字段 | 类型 | 说明 |
|---|---|---|
| `noticeId` | uuid PK | |
| `userId` | int | 收件人；读取按 `userId = session.userId`。**一行只对一个收件人** |
| `belongToPartyId` | int? | **归属 party（展示标注 + 可见性作用域双重含义）**：非 null = 仅该 party 上下文可见（即只在「当前 party = 它」时出现）；**null = 系统/管理员对本账号发出，任一 party 上下文均可见**。读取仍按作用域过滤（见下），故界面里**非 null 命中的必是当前 party** |
| `noticeType` | varchar(40)? | 通知类型（**开放集**，生产者必给）。约定 `"<module>.<event>"`；前缀供**展示层**派生 module（图标/颜色），决定 payload 模板 |
| `title` | varchar(200)? | 标题。**生产者提供、展示原样**；空则不显示标题行（不做模板兜底） |
| `payload` | jsonb `{}` | 统一四件套（见下）；**必含 `summary`** |
| `status` | varchar(20) | `UNREAD`（默认）/ `READ`；闭集由**应用层**保证（无 DB CHECK） |
| `creTime` / `updTime` | ts | 创建/更新时间；列表按 `creTime` 倒序 |

索引：`(userId, status)`（角标计数 + 列表）、`(belongToPartyId)`。

### payload 结构（统一四件套，无特例）
| 键 | 必/选 | 说明 |
|---|---|---|
| `summary` | **必** | 铃铛/列表一行摘要，纯文本（取代旧 `content`，转义责任在写入侧） |
| `detail` | 选 | 详情页正文，纯文本，统一段落渲染 |
| `fields[]` | 选 | 通用属性栅格 `{ key, value, mono? }`；`key` 展示时走 i18n、缺译显原 key；`value` 最终文本 |
| `links[]` | 选 | 业务跳转 `{ label, type:'text'\|'button', url }`；URL 由生产者**发通知时拼好** |

> **已删**（相对早期草案/原型）：顶层 `module`、`actor`、`detailKind`、`cta`、`nav`、kind/id 描述符、旧 `content`/`link`。

## Enums / 状态
- `status`：`UNREAD` → `READ`（**单向**，应用层强制）。
- `noticeType`：**开放集**，约定 `"<module>.<event>"`；展示层取前缀派生 module（ticket/customer/app/order/account…→图标/颜色），未知前缀→默认图标 + 中性色。

## Lifecycles
- **通知**：`created(UNREAD)` →（查看/标记）→ `READ`。**只读化、不可逆**；本期**无 删除/dismiss/mark-unread**。

## 作用域规则（贯穿读取）
读取（列表 / 未读数 / 标记已读）一律按：**`userId = session.userId`** 且 **(`belongToPartyId = session.currentPartyId` 或 `IS NULL`)**。
- ⇒ 任一 party 上下文都能看到：**当前 party 的通知 + 你全部的系统/全局(null)通知**；切 party 时 party 类随之变、null 类恒在。
- ⇒ 因此能看到的**非 null 通知必属当前 party**，其业务链接在当前 `currentPartyId` 上下文打开、上下文永远匹配（不会拿别 party 的记录在当前 party 误操作）。
- **例外（不套此过滤）**：跨 party 未读统计 `unreadCountByParty`（party 切换器红点用）仅按 `userId` 收窄、按 party 分组——见 `api-logic.md`。

## Invariants
1. **只读自己的**：任何读/写以 `userId = session.userId` 收窄。
2. **party 作用域一致**：列表 / 未读数 / 全部已读用**同一过滤**。
3. **mark-read 幂等且单向**：仅 `UNREAD → READ`；按 `ids` 标记的 id 必属该用户。
4. **payload 必含 `summary`**（纯文本）；其余键可选；`noticeType` 决定模板。
5. **生产者内部化**：写通知只经服务端 `createNotice`，无对外创建 API。
6. **module 不落库**：仅展示层从 `noticeType` 前缀派生。
7. **语言固化**：生产者内容存收件人语言、展示不再翻译（策略见 `business-logic.md` §6）。
