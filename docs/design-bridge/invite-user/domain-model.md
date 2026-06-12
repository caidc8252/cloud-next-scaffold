# 邀请入驻 领域模型（domain-model）

> 目标规格。聚焦 invite-user 流程触及的实体、状态机与不变量；字段命名以 `packages/db/prisma/schema.prisma` 为准。

## 1. 实体关系

```
SysOperatorInvite ──(partyId)──▶ SysParty ◀──(partyId)── SysPartyUser ──(userId)──▶ SysUser
        │ inviterUserId / inviterPartyId                         ▲
        └────────── intendedRole: [{roleId}] ────────────────────┘（accept 时拷入 partyUser.roles）
```

- 一张 `SysOperatorInvite` 指向**一个被邀主体** `partyId` + 邀请人 `inviterUserId/inviterPartyId`，携带 `inviteEmail` 与 `intendedRole`（角色 id 列表）。
- accept 把「邀请」物化为 `SysPartyUser`（用户 ↔ 主体归属），并把 `intendedRole` 拷进 `partyUser.roles`。
- 用户可属多个主体（多条 `SysPartyUser`）；`(partyId,userId)` 唯一。

## 2. SysOperatorInvite（邀请）

| 字段 | 类型 | 说明 |
|---|---|---|
| `operatorInviteId` | int PK | |
| `partyId` | int | 被邀入驻的主体 |
| `inviterPartyId` / `inviterUserId` | int | 邀请人主体 / 用户 |
| `inviteEmail` | citext | 被邀邮箱；**仅作新建账号预填**，非授权约束 |
| `intendedRole` | jsonb `[{roleId}]` | 预置角色，accept 时拷入归属 |
| `token` | varchar(128) unique | `randomBytes(24).base64url`，授权凭证 |
| `expiresAt` | ts | `+7d` |
| `consumedAt` | ts? | accept 时间 |
| `resendCount` | int | 重发次数（admin 侧） |
| `status` | varchar(20) | `PENDING` → `CONSUMED`（取消则 admin 侧删除行） |

**状态机**：`PENDING` ──accept──▶ `CONSUMED`（单次、不可逆）。过期不改 status，由 `expiresAt < now` 判定失效。

## 3. SysParty（主体）— 与本流程相关的状态

`status`：`ONBOARDING`（默认，新建未激活）/ `ACTIVE` / 其它（SUSPENDED 等，非本流程）。

**激活迁移（本流程唯一写点）**：accept 时若 `party.status == ONBOARDING` → `ACTIVE`。等价定义：**主体获得其首个 ACTIVE 成员的那一刻被激活**。

## 4. SysPartyUser（归属）— accept 产出

| 字段 | accept 赋值 |
|---|---|
| `partyId / userId` | 邀请的 party / 绑定的用户（唯一约束 `uk_sys_party_user`） |
| `roles` | `invite.intendedRole` |
| `authorizingType` | `ADMIN` 若该 party 此刻为 ONBOARDING（首个成员）；否则 `NORMAL` |
| `authorizingTimestamp` | now |
| `authorizingUserId / Name` | `invite.inviterUserId` / 邀请人名 |
| `status` | `ACTIVE` |

幂等：归属已存在则不创建、不降级（视为已是成员）。

## 5. SysUser（用户）— mode=register 产出

| 字段 | 赋值 |
|---|---|
| `email` | `invite.inviteEmail`（唯一；已占用 → `ERR_OB_EMAIL_TAKEN`） |
| `passwordHash` | `hashPassword(明文)`（argon2id），明文经 RSA 解密得到 |
| `nickName` | `displayName` |
| `country` | 选择器值 |
| `status` | `ACTIVE` |

> **无 username**：SysUser 已是 email-only（§ portal 迁移），register 不收 `loginName`。

## 6. 角色解析（accept 后生效）

`partyUser.roles=[{roleId}]` → 经会话快照解析为权限码：`roleId ≤ 300` 读代码注册表（GLOBAL），`≥ 1001` 读 `sys_role`（PRIVATE），按当前 party 的有效 contractTypes + 角色 start/end 窗过滤。（沿用 portal `logic.md` 的角色/权限/菜单约定，本流程不新增。）

## 7. 不变量

1. 一封邀请只能被消费一次（`status PENDING` 条件更新 + `uk_sys_party_user` 双重保证）。
2. 主体激活当且仅当「ONBOARDING → 首个 ACTIVE 成员加入」。
3. 邀请 token 是唯一授权凭证；任何账号身份均可凭有效 token 绑定（token 授权模型）。
4. 用户创建 + 归属创建 + 邀请消费 + 主体激活同一 DB 事务。

### 本期范围规则（非永久不变量）
- `mode=register` 的用户 email = `invite.inviteEmail`、免单独邮箱验证（token 即收件证明）。**这是"本期只开被邀邮箱建号"的结果，不是铁律**：发信能力已具备（`@cloud/mail`），接入「任意邮箱 + 验证」后此式即放宽（见 logic.md §1/§9）。

## 8. 与 pep-schema 的关系

字段/约束（status 闭集、citext、唯一键、`expiresAt` 等）以 `pep-schema/postgresql/schema.sql` 为目标 DDL；Prisma 表达不了的 CHECK（status 取值）由应用层 zod/服务在写入点强制（与全仓约定一致）。
