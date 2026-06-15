# 邀请入驻（invite-user / onboarding）逻辑规格（api-logic）

> 目标规格，与 api-spec.yaml 同口径：记每个操作的**非平凡规则 / 失败 / 关系鉴权 / 副作用（发信）**。
> 范围仅 **场景一 · 通用邀请**（操作员邀新同事加入**已 ACTIVE** 的 Party，被邀人恒 `NORMAL`、不激活）。
> 场景二（onboarding 首管/激活）、SSO、任意邮箱+验证码为**待办**，不在本文。
> 标 **〔CONF-N〕** 的规则系冲突裁决所定（`docs/superpowers/specs/2026-06-14-invite-user-backend-conflicts.md`）。

## 0. 一句话

操作员在 admin User 模块按邮箱 + 多选角色发出邀请（落 `sys_operator_invite` 并真发邮件）；被邀请人凭链接里的 **token** 进 portal onboarding，把邀请**绑定**到一个账号（当前登录 / 既有账号登录 / 用被邀邮箱新建），绑定即：建 `sys_party_user` 归属（恒 `NORMAL`）、消费邀请、建会话进对应 console。

## 1. 授权模型（已定）

- **token 授权，不是邮箱强绑定**：安全边界是邀请 `token`（`randomBytes(24).base64url`、唯一、单次消费、`+7d` 过期）。`inviteEmail` 退化为「新建账号时的预填邮箱」。
- 能打开链接 ≈ 证明收到了发往该邮箱的邮件 → 用被邀邮箱建号**无需再做邮箱验证**（本期范围；接入任意邮箱后放宽）。
- **暴露窗口**由 `+7d 过期 + 单次消费 + accept 后立即作废 + token 可轮换`限定。

## 2. 参与实体与可复用件

- 邀请 `sys_operator_invite`、主体 `sys_party`（场景一恒 ACTIVE）、归属 `sys_party_user`（`partyId+userId` 唯一）、用户 `sys_user`（email 唯一）。
- 有效期/ token 字节常量取自 `@cloud/platform-config`（`INVITE_TTL_MS`/`INVITE_TOKEN_BYTES`）〔CONF-3〕。
- 复用：`hashPassword/verifyPassword`、`decryptRsaOaep`、`createSession/getPartialSession/updateSession`、`buildSessionAndRedirect`、`resolvePortalGroup + entryUrlForParty`、`PASSWORD_POLICY/isPasswordValid`、`@cloud/mail` 的 `sendInviteEmail`（收件人 60s 冷却）。

## 3. 接口收口

admin 侧（邀请管理）+ portal 侧（接受）。完整 wire contract 见 api-spec.yaml（按 operationId 对齐）。

| operationId | 作用 | 权限 |
|---|---|---|
| `createInvite` | 发邀请（成员校验 + 过期覆盖 + 真发信） | `users.INVITE` |
| `listUsersAndInvites` | 列表（在册用户 + PENDING 伪条目） | `users.VIEW` |
| `setInviteRoles` | 改未过期邀请角色 | `users.CHANGE_ROLE` |
| `resendInvite` | 重发（只重寄） | `users.INVITE` |
| `regenerateInvite` | 重新生成（换 token + 续期 + 重发） | `users.INVITE` |
| `cancelInvite` | 撤销 PENDING 邀请 | `users.INVITE` |
| `getInvite` | 验票（公开） | public |
| `acceptInvite` | 接受（绑定 + 消费 + 建会话） | public |
| （复用）`loginChallenge`/`loginPassword`/`verifyMfa` | 既有用户登录（带 `returnTo`） | public |

## 4. admin 侧邀请生命周期规则

**有效/过期口径**：`有效` = `PENDING 且 expiresAt > now`；`已过期` = `PENDING 且 expiresAt <= now`（status 不变）。三个就地操作（改角色/重发/重新生成）**均仅作用于有效邀请**；过期一律走 `createInvite` 覆盖〔CONF-4〕。

- **createInvite**〔CONF-2/4〕，按序：
  1. 邮箱**已是本 Party 成员**（email→user→`findUserLink`，**任意状态含 LOCKED**）→ `ERR_USER_EMAIL_TAKEN`。
  2. 同邮箱有**未过期** PENDING 邀请 → `ERR_USER_EMAIL_TAKEN`。
  3. 同邮箱仅有**已过期** PENDING 邀请 → **覆盖**该行（重置 `token`/`expiresAt`/`intendedRole`、`resendCount=0`、邀请人字段改写为当前 actor），不新建第二条。
  4. 否则新建。
  - 副作用：落库后 `sendInviteEmail`（含 `{PORTAL}/onboarding?token=`）；发信失败不回滚（可重发）；收件人 60s 冷却命中 → 429。
- **resendInvite**〔CONF-4〕：仅有效邀请；**不改 token、不改 expiresAt**，仅 `resendCount+1` + 重寄。无有效邀请 → `ERR_USER_NO_PENDING_INVITE`。
- **regenerateInvite**〔CONF-4〕：仅有效邀请；换 token + `expiresAt=now+TTL` + 重寄（旧 token 立即失效），**不改 resendCount**。无有效邀请 → `ERR_USER_NO_PENDING_INVITE`。
- **setInviteRoles**〔CONF-4〕：仅有效邀请可改 `intendedRole`。无有效邀请 → `ERR_USER_NO_PENDING_INVITE`。
- **cancelInvite**：任意 PENDING（含已过期）可撤（删行，token 立即失效）；非 PENDING → `ERR_USER_CANCEL_NOT_PENDING`。
- **关系鉴权**：以上均按 `session.currentPartyId` 收口（查询带 partyId）；B Party 拿 A Party 的邀请 id → 查不到 → 同 `ERR_USER_NO_PENDING_INVITE`/`ERR_USER_CANCEL_NOT_PENDING`，绝不跨 Party 操作。

## 5. 客户端流程（portal onboarding 状态机）

进入 `app/(auth)/onboarding?token=`：
1. **验票** `getInvite`：失败 → `invalid` 终态页。
2. **landing**：展示 partyName / 预置角色 / 被邀邮箱（提示）/ 过期相对时间。按是否已登录分支：
   - 已登录：「以当前账号加入」(mode=`existing`) / 「换个账号」(登出 → `/login?returnTo`) / 「新建账号」。
   - 未登录：「登录加入」(`/login?returnTo`) / 「新建账号」。
3. **register**（仅被邀邮箱，无 loginName）：收集 `displayName / country / password(过 isPasswordValid)` → `acceptInvite`(mode=`register`)。
4. **授权** → `acceptInvite` → 成功 `location = redirectTo`。
- `returnTo` 仅允许站内 `/onboarding` 前缀，防开放重定向。

## 6. acceptInvite 两模式（绑定逻辑一致）

公共：按 `token` 取邀请 → 必须有效（PENDING + 未过期），否则 §7 报错。**全程单事务**。

- **mode=`existing`**：需当前会话；`userId = session.userId`。无会话 → `ERR_OB_NOT_AUTHENTICATED`。
- **mode=`register`**：`email = invite.inviteEmail`（强制，忽略客户端 email）；已存在用户 → `ERR_OB_EMAIL_TAKEN`（引导转登录）；密码 RSA 解密 + 服务端 `isPasswordValid` 二次校验；建 `sys_user(status=ACTIVE)`。

事务内（两模式公共）：
1. **消费邀请**：原子条件更新 `PENDING → CONSUMED`（防并发双消费）。
2. **绑定**：`upsert sys_party_user(partyId=invite.partyId, userId)`：已存在 → 幂等（不降级、`alreadyMember=true`）；不存在 → 创建，`roles=invite.intendedRole`、**`authorizingType=NORMAL`**、`status=ACTIVE`、`authorizingUserId/Name = invite.inviterUserId/名`〔CONF-1〕。
3. **不动 SysParty**：场景一目标 Party 恒 ACTIVE，**不读、不改** `party.status`；首管/激活属场景二（待办）〔CONF-1〕。
4. **建/更会话**（事务提交后）：register（新用户必恰好 1 Party）→ `createSession + buildSessionAndRedirect`；existing → `updateSession`（纳入新 Party）。落地：恰好 1 可选 Party → 对应 console handoff；多/零选或授权窗失效 → `/select-partner`。

## 7. 既有用户登录的 returnTo

- `/login?returnTo=/onboarding?token=…` → 登录服务带 `returnTo` 时：认证（状态/锁/解密/时间戳/nonce/验密/失败计数）**完全复用**；成功后 `createSession`（**只写 portal host cookie，不签 handoff**）→ 返回 `{ redirectTo: returnTo }`。
- MFA：`returnTo` 存进一次性 `mfaToken`，二段通过后同样「建 portal 会话 + 跳 returnTo」。
- `returnTo` 校验为站内 `/onboarding` 前缀。

## 8. 错误码

**portal（104xxx）**：

| 码 | 常量 | 含义 |
|---|---|---|
| 104001 | `ERR_OB_INVITE_NOT_FOUND` | token 不存在（不泄露 party 信息）|
| 104002 | `ERR_OB_INVITE_EXPIRED` | 过期 |
| 104003 | `ERR_OB_INVITE_CONSUMED` | 已消费 |
| 104004 | `ERR_OB_EMAIL_TAKEN` | 被邀邮箱已注册 → 引导登录 |
| 104005 | `ERR_OB_PASSWORD_WEAK` | 新密码不合策略 |
| 104006 | `ERR_OB_NOT_AUTHENTICATED` | mode=existing 但无会话 |
| （复用）103010/103011 | 加密无效 / 请求过期 | register/login RSA 解密/重放 |

**admin（101xxx）**：

| 码 | 常量 | 含义 |
|---|---|---|
| 101001 | `ERR_USER_EMAIL_INVALID` | 邮箱格式非法 |
| 101002 | `ERR_USER_EMAIL_TAKEN` | 邮箱已是成员 / 已有未过期邀请 |
| 101006 | `ERR_USER_NO_PENDING_INVITE` | 无有效（未过期）待处理邀请 |
| 101007 | `ERR_USER_CANCEL_NOT_PENDING` | 撤销目标非 PENDING |

> 业务错误默认 400；`ERR_USER_NO_PENDING_INVITE` 显式 404。「已是成员」在 accept 侧不作错误（幂等成功）；在 createInvite 侧作 `ERR_USER_EMAIL_TAKEN`。

## 9. 安全与不变量

- 邀请 token：唯一、`+7d`、**单次消费**；并发 accept 由 `status=PENDING` 条件更新 + `uk_sys_party_user` 兜底。token 轮换（regenerate/覆盖）即作废旧值。
- 永不明文传密码：register 与登录都走 RSA(OAEP) + nonce + 双向时间戳窗。
- `mode=register` 的 email **只取自邀请**，杜绝「拿邀请给任意邮箱建号」；`partyId` 只取自邀请，杜绝「绑到别的 Party」。
- **场景一恒 NORMAL、不激活**〔CONF-1〕；激活/首管是场景二派生自「party 当前是否 ONBOARDING」的单一规则，不引入额外标志位。
- 同 Party 邮箱唯一性：已是成员不可重邀〔CONF-2〕；至多一条有效 pending〔CONF-4〕。
- 开放重定向防护：`returnTo` 限站内 `/onboarding` 前缀。

## 10. 范围与待办

- ✅ 本期：admin 邀请管理（含真发信、过期覆盖、重新生成）+ portal 接受（恒 NORMAL）。
- 待办：SSO/OIDC 接入；任意邮箱 + 邮箱验证码；场景二 Onboarding（Admin Customer 模块，跨 party 邀首管 + 激活）；场景一接进 `apps/customer`。
