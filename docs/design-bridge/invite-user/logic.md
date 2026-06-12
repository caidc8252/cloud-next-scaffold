# 邀请入驻（invite-user / onboarding）逻辑规格

> 目标规格（target spec），与 `docs/design-bridge/portal/` 同口径：描述要做成的样子，不保留「忠实现状」层。当前 portal `app/(auth)/onboarding` 为 mock，本文是它真实化后的目标。

## 0. 一句话

被邀请人凭**邀请链接里的 token** 进入 onboarding，把这张邀请**绑定**到一个用户账号（当前登录的 / 另一个已有的 / 用被邀邮箱新建的），绑定即：建立 `sys_party_user` 归属、消费邀请、若目标主体处于 `ONBOARDING` 则**激活主体**，随后建立会话进入对应 console。

## 1. 授权模型（已定）

- **token 授权，不是邮箱强绑定**：安全边界是邀请 `token`（`randomBytes(24).base64url`，唯一、`+7d` 过期、**单次消费**）。`inviteEmail` 退化为「新建账号时的预填/建议邮箱」，不再是「只有此人能接受」的约束。
- 理由：邀请链接本身发往被邀邮箱，**能打开链接 ≈ 证明收到了发往该邮箱的邮件**；因此用被邀邮箱新建账号**无需再做邮箱验证**。
- **暴露窗口**由 `+7d 过期 + 单次消费 + accept 后立即作废`限定。
- 「换任意邮箱 + 邮箱验证」：发信能力现已具备（`@cloud/mail`，见 `docs/design-bridge/email-capability/design.md`），**技术上不再受阻**；但本期 invite-user **仍只做"被邀邮箱入驻"**，此分支作为**可选后续**（需要时再开，配合 `verify-code` 用途的节流）。是否本期纳入见 §9 + 末尾 scope 决策。

## 2. 参与实体与可复用件

- 邀请：`sys_operator_invite`（admin 侧 `createInvite` **已真实落库**：`token / expiresAt(+7d) / intendedRole=[{roleId}] / inviteEmail / partyId / status=PENDING`）。
- 主体：`sys_party`（`status` 默认 `ONBOARDING`）。
- 归属：`sys_party_user`（`partyId+userId` 唯一；`roles / authorizingType / status`）。
- 用户：`sys_user`（email 唯一、argon2 `passwordHash`、`nickName`）。
- 复用：`hashPassword/verifyPassword`、`decryptRsaOaep`（@cloud/security）；`createSession/getSession/getPartialSession/updateSession`、`createSessionHandoffToken`（@cloud/permissions）；`buildSessionSnapshot`、`buildSessionAndRedirect`、`resolvePortalGroup + entryUrlForParty`（会话架构 B）；`PASSWORD_POLICY / isPasswordValid`。

## 3. 接口收口（真实化后）

onboarding 自有 **2 个**真实接口，既有用户登录复用 `/auth/*`：

| 接口 | 作用 |
|---|---|
| `GET /api/onboarding/invite?token=` | 验票：`PENDING` 且未过期 → 返回 `{ partyName, inviteEmail, intendedRole, expiresAt }`；否则 4xx（见 §7）。**公开**（无需会话）。 |
| `POST /api/onboarding/accept` | 绑定 + 消费 + 激活 + 建会话。两模式见 §5。 |
| （复用）`GET /api/auth/login-challenge` | 发 `{serverTimestamp, nonce}`；register 加密密码、既有用户登录共用。 |
| （复用）`POST /api/auth/password` `+returnTo` | 既有用户登录；带 `returnTo` 时见 §6。 |
| （复用）`POST /api/auth/mfa` | 既有用户 MFA 二段；`returnTo` 经 MFA token 透传，见 §6。 |

**删除**的 mock 接口：`/api/onboarding/{signin,register}`（signin → 复用 `/login`；register 字段在客户端收集后并入 `/accept`）。

## 4. 客户端流程（状态机）

进入 `app/(auth)/onboarding?token=`：

1. **验票**：调 `GET /invite`。失败 → `invalid` 终态页。
2. **landing**：展示 partyName / 角色 / 被邀邮箱（仅提示）。分支按「是否已登录」：
   - **已登录**（`getPartialSession()` 非空）：
     - 「以 {当前邮箱} 加入」→ `confirm`（mode=`existing`）。
     - 「换个账号」→ 先 `POST /auth/logout` → 跳 `/login?returnTo=/onboarding?token=…`。
     - 「新建账号」→ `register`。
   - **未登录**：
     - 「我已有账号，登录加入」→ 跳 `/login?returnTo=/onboarding?token=…`。
     - 「新建账号」→ `register`。
3. **register**（仅新建账号；**仅被邀邮箱**，无 custom-email/验证码，无 loginName）：收集 `displayName / country / password(+confirm，过 `isPasswordValid`)` → `confirm`（mode=`register`）。
4. **confirm**：展示「party + 预置角色 + 加入身份」→ 授权。
5. **授权** → `POST /accept` → 成功返回 `{ redirectTo }` → 前端 `location = redirectTo`（进 console 或 `/select-partner`）。

> `ObSignin` 内联登录组件**删除**（既有用户一律走 `/login?returnTo`）。`returnTo` 仅允许**站内相对路径**（必须以 `/onboarding` 开头），防开放重定向。

## 5. `POST /api/onboarding/accept` 两模式

公共：按 `token` 取邀请 → 必须 `PENDING` 且未过期，否则 §7 报错。**全程单事务**。

- **mode=`existing`**：要求当前有会话（`getPartialSession()`）。`userId = session.userId`。
- **mode=`register`**：`email = invite.inviteEmail`（强制，不接受客户端传入的 email）。
  - 若该 email 已存在 `sys_user` → `ERR_OB_EMAIL_TAKEN`（引导转登录）。
  - 服务端**再次** `isPasswordValid` 校验；密码经 RSA 解密（复用 login-challenge `nonce` + 双向时间戳窗 + 单次消费，与登录同安全姿态）。
  - 建 `sys_user`：`email=inviteEmail, passwordHash=hashPassword(pw), nickName=displayName, country, status=ACTIVE`。

事务内（两模式公共，绑定逻辑一致）：

1. **绑定**：`upsert sys_party_user(partyId=invite.partyId, userId)`：
   - 已存在该归属 → 幂等（不降级既有 `roles/authorizingType`；视为「已是成员」）。
   - 不存在 → 创建：`roles = invite.intendedRole`、`status=ACTIVE`、`authorizingType` 见下、`authorizingTimestamp=now`、`authorizingUserId/Name = invite.inviterUserId/名`。
2. **首个管理员 + 激活**（单一规则）：accept 时若 `party.status == ONBOARDING`（即该 party 尚无 ACTIVE 成员）→ 本次成员 `authorizingType=ADMIN`，并把 `party.status` 翻成 `ACTIVE`；否则 `authorizingType=NORMAL`，不动 party。
3. **消费邀请**：`status=CONSUMED, consumedAt=now`。
4. **建/更会话**：
   - mode=`register`（新用户，必恰好 1 个 party）→ `createSession` + `buildSessionAndRedirect` → handoff 进对应 console。
   - mode=`existing` → `updateSession`（把新 party 纳入快照；若变成唯一可选 party 则 `currentPartyId` 落它）+ 返回 `buildSessionAndRedirect` 结果。

> 事务边界：用户创建 + 归属创建 + 邀请消费 + party 激活在**同一 `$transaction`**；会话建立在事务提交后（Redis/cookie 副作用不进 DB 事务）。

## 6. 既有用户登录的 `returnTo`（会话架构对接）

正常登录成功会跨 host handoff 进 console；onboarding 需要的是「认证后回邀请页继续 accept」。因此：

- `/login?returnTo=…` → `LoginScreen` 透传 `returnTo` 到 `POST /auth/password`。
- `auth.service.login(input, returnTo?)`：认证（状态/锁/解密/时间戳/nonce/验密/失败计数）**完全复用**。成功后：
  - 无 `returnTo`：现状不变（建会话 + handoff 进 console）。
  - 有 `returnTo`：`createSession`（**只写 portal host cookie，不签 handoff**）→ 返回 `{ redirectTo: returnTo }`。
- MFA：`createMfaLoginToken(userId)` 扩展为存 `{ userId, returnTo? }`；`verifyMfa` 成功后若带 `returnTo` → 同样「建 portal 会话 + 跳 returnTo」。
- 回到 `/onboarding?token=` 后 `getPartialSession()` 即非空 →走 mode=`existing`。

> 这是登录服务唯一新增分支；`returnTo` 校验为站内 `/onboarding` 前缀。建会话用 `buildSessionSnapshot(userId, currentPartyId=按既有归属算)`——尚未加入被邀 party 不影响，accept 后 `updateSession` 重算。

## 7. 错误码（portal `104xxx`）

| 码 | 常量 | 含义 / UI |
|---|---|---|
| 104001 | `ERR_OB_INVITE_NOT_FOUND` | token 不存在 → invalid 页 |
| 104002 | `ERR_OB_INVITE_EXPIRED` | 过期 → invalid 页（提示已过期） |
| 104003 | `ERR_OB_INVITE_CONSUMED` | 已被消费 → invalid 页（提示已使用） |
| 104004 | `ERR_OB_EMAIL_TAKEN` | 被邀邮箱已注册 → 引导「登录加入」 |
| 104005 | `ERR_OB_PASSWORD_WEAK` | 新密码不满足策略 |
| 104006 | `ERR_OB_NOT_AUTHENTICATED` | mode=existing 但无会话（会话已过期）→ 转登录 |
| （复用）103010/103011 | 加密无效 / 请求过期 | register 密码 RSA 解密/重放失败 |

「已是成员」不作为错误：accept 幂等成功，UI 提示「你已是 {party} 成员」并进入。

## 8. 安全与不变量

- 邀请 token：唯一、`+7d`、**单次消费**（accept 事务内置 CONSUMED；并发 accept 由 `status=PENDING` 的条件更新 + 唯一归属约束兜底）。
- 永不明文传密码：register 与登录都走 RSA(OAEP) + nonce + 双向时间戳窗。
- `mode=register` 的 email **只取自邀请**，忽略客户端 email，杜绝「拿邀请给任意邮箱建号」。
- 绑定唯一性靠 `uk_sys_party_user(partyId,userId)`；重复 accept 幂等。
- 激活与首管判定是**派生自「party 当前是否 ONBOARDING」**的单一规则，不引入额外标志位，对「已 ACTIVE 的 party 邀同事」同样正确（→ NORMAL，不动 party）。
- 开放重定向防护：`returnTo` 限站内 `/onboarding` 前缀。

## 9. 范围与发信能力（更新：mailer 已具备）

发信能力已落地为共享包 `@cloud/mail`（推 job 到 Redis `mail:queue`，外部平台消费发信；设计见 `docs/design-bridge/email-capability/`）。由此：

- **现已可做（建议本期纳入）**：admin `createInvite`/`resendInvite` 真正把**邀请链接邮件**发到 `inviteEmail`（`apps/admin/lib/email.sendInviteEmail`，`purpose="invite"`，挂冷却 60s）。这让"邀请落库 + 真正寄出"闭环。
- **可选后续（默认仍推迟）**：register 的「换任意邮箱 + 验证码」分支（`verify-code` 用途，节流 60s + 5/时）。不做则 register 仍仅限被邀邮箱（§1，token 即收件证明、免验证）。
- **不在本期**：投递回执/退信处理（fire-and-forget）；邮件的创建/重发/取消 UI（admin 侧已真实，见 `apps/admin/service/users`）。

> **scope 决策（待拍）**：本期是否纳入「邀请邮件真正发出」（建议是）与「任意邮箱+验证」（建议否，留后续）。
