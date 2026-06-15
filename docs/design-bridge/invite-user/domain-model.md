# 邀请入驻 领域模型（domain-model）

> 目标规格。聚焦 invite-user 流程触及的实体、状态机与不变量；字段命名以 `packages/db/prisma/schema.prisma` 为准。
> 实体模型为**两场景共用**，但写点不同（见各节标注）：
> - **场景一 · 通用邀请（本期）**：操作员邀新同事加入**已 ACTIVE** 的 Party，被邀人恒为普通成员（`NORMAL`），**不**激活 Party。
> - **场景二 · Onboarding 开户（待办）**：ADMIN 平台为**新建** Party 设首个管理员（`ADMIN`）并激活 Party。
> 标 **〔裁决 CONF-N〕** 的规则系冲突裁决所定，全文见 `docs/superpowers/specs/2026-06-14-invite-user-backend-conflicts.md`。

## 1. 实体关系

```
SysOperatorInvite ──(partyId)──▶ SysParty ◀──(partyId)── SysPartyUser ──(userId)──▶ SysUser
        │ inviterUserId / inviterPartyId                         ▲
        └────────── intendedRole: [{roleId}] ────────────────────┘（accept 时拷入 partyUser.roles）
```

- 一张 `SysOperatorInvite` 指向**一个被邀主体** `partyId` + 邀请人 `inviterUserId/inviterPartyId`，携带 `inviteEmail` 与 `intendedRole`（角色 id 列表）。
- accept 把「邀请」物化为 `SysPartyUser`（用户 ↔ 主体归属），并把 `intendedRole` 拷进 `partyUser.roles`。
- 用户可属多个主体（多条 `SysPartyUser`）；`(partyId,userId)` 唯一。
- **场景一与场景二的 partyId 关系不同**：场景一 `partyId == inviterPartyId`（邀进自己 Party）；场景二 `partyId`=新租户、`inviterPartyId`=ADMIN 平台（跨 party 邀请）。

## 2. SysOperatorInvite（邀请）

| 字段 | 类型 | 说明 |
|---|---|---|
| `operatorInviteId` | int PK | |
| `partyId` | int | 被邀入驻的主体 |
| `inviterPartyId` / `inviterUserId` | int | 邀请人主体 / 用户 |
| `inviteEmail` | citext | 被邀邮箱；**仅作新建账号预填**，非授权约束 |
| `intendedRole` | jsonb `[{roleId}]` | 预置角色，accept 时拷入归属 |
| `token` | varchar(128) unique | `randomBytes(24).base64url`（字节数取自 `@cloud/platform-config`），授权凭证 |
| `expiresAt` | ts | `now + INVITE_TTL_MS`（默认 7d，常量取自 `@cloud/platform-config`）〔裁决 CONF-3〕 |
| `consumedAt` | ts? | accept 时间 |
| `resendCount` | int | 重发次数；**仅"重发"自增**，"重新生成"不动它，"覆盖"重置为 0〔裁决 CONF-4〕 |
| `status` | varchar(20) | `PENDING` → `CONSUMED`（撤销则 admin 侧删行） |

**状态机**：`PENDING` ──accept──▶ `CONSUMED`（单次、不可逆）。
**过期是派生态、非 status**：`expiresAt < now` 即"已过期"，但 `status` 仍为 `PENDING`〔裁决 CONF-4〕。据此「有效邀请」= `PENDING 且 expiresAt > now`。
**token 轮换**：「重新生成」与「覆盖」会重置 `token`，旧 token 立即失效。

## 3. SysParty（主体）— 与本流程相关的状态

`status`：`ONBOARDING`（默认，新建未激活）/ `ACTIVE` / 其它（SUSPENDED 等，非本流程）。

**激活迁移属【场景二 · 待办】**：onboarding 首个成员加入时若 `party.status == ONBOARDING` → `ACTIVE`。
**场景一不写 SysParty**：场景一目标 Party 恒已 `ACTIVE`，accept **不读、不改** `party.status`〔裁决 CONF-1〕。

## 4. SysPartyUser（归属）— accept 产出

| 字段 | 场景一 accept 赋值 | 场景二 accept 赋值（待办） |
|---|---|---|
| `partyId / userId` | 邀请的 party / 绑定的用户（唯一约束 `uk_sys_party_user`） | 同 |
| `roles` | `invite.intendedRole` | 同 |
| `authorizingType` | **恒 `NORMAL`**〔裁决 CONF-1〕 | `ADMIN`（首管） |
| `authorizingTimestamp` | now | now |
| `authorizingUserId` / `authorizingUserName` | `invite.inviterUserId` / 邀请人名（查不到回退 `system`） | 同 |
| `status` | `ACTIVE` | `ACTIVE` |

幂等：归属已存在则不创建、不降级（视为已是成员）。

## 5. SysUser（用户）— mode=register 产出

| 字段 | 赋值 |
|---|---|
| `email` | `invite.inviteEmail`（唯一；已占用 → `ERR_OB_EMAIL_TAKEN`） |
| `passwordHash` | `hashPassword(明文)`（argon2id），明文经 RSA 解密得到 |
| `nickName` | `displayName` |
| `country` | 选择器值 |
| `status` | `ACTIVE` |

> **无 username**：SysUser 已是 email-only，register 不收 `loginName`。

## 6. 角色解析（accept 后生效）

`partyUser.roles=[{roleId}]` → 经会话快照解析为权限码：`roleId ≤ 300` 读代码注册表（GLOBAL），`≥ 1001` 读 `sys_role`（PRIVATE），按当前 party 的有效 contractTypes + 角色 start/end 窗过滤。（沿用 portal 角色/权限/菜单约定，本流程不新增。）

## 7. 不变量

1. 一封邀请只能被消费一次（`status PENDING` 条件更新 + `uk_sys_party_user` 双重保证）。
2. **〔场景二〕** 主体激活当且仅当「ONBOARDING → 首个 ACTIVE 成员加入」。场景一不触发激活。
3. 邀请 token 是唯一授权凭证；任何账号身份均可凭有效 token 绑定（token 授权模型）。token 轮换后旧值即失效。
4. 用户创建 + 归属创建 + 邀请消费（+ 场景二的主体激活）同一 DB 事务。
5. **〔场景一 · 裁决 CONF-1〕** 被邀人恒 `NORMAL`、不激活 Party。
6. **〔裁决 CONF-2〕** 同一 Party 内，一个邮箱不可被重复落为成员：邮箱**已是该 Party 成员（任意状态，含 LOCKED）→ 拒绝再邀**。
7. **〔裁决 CONF-4〕** 同一 (party,email) 至多一条"有效" pending 邀请：已有**未过期** pending → 拒绝再发；仅有**已过期** pending → 覆盖同一行（不新建第二条）。

### 本期范围规则（非永久不变量）
- `mode=register` 的用户 email = `invite.inviteEmail`、免单独邮箱验证（token 即收件证明）。**这是"本期只开被邀邮箱建号"的结果，不是铁律**：接入「任意邮箱 + 验证」后此式即放宽（待办）。

## 8. 与 pep-schema 的关系

字段/约束（status 闭集、citext、唯一键、`expiresAt` 等）以 `pep-schema/postgresql/schema.sql` 为目标 DDL；Prisma 表达不了的 CHECK（status 取值）由应用层 zod/服务在写入点强制（与全仓约定一致）。
