# Reset Password（重置密码）— Domain

> **目标设计**：一套机制（一次性 token 链接）、两个触发（**自助找回** + **管理员重置他人**）。统一定调：找回也改为「发重置链接」而非验证码，使两条流程除"谁触发"外完全一致，且更安全（256-bit token 无暴力面）。
> 现状 delta 见末尾——代码需按此返工。

## Actors / Roles
- **未认证访客**：自助找回的触发、以及重置页/设密端点(pre-auth，token 即授权)。
- **管理员**：在后台对某用户触发重置(已认证 + 权限 `users.RESETPW`)。

## 核心切分：授权（两触发） + 设密（公共核）
- **授权段不同**：自助 = 用户提交邮箱→若 ACTIVE 签发 token；管理员 = 对目标用户签发 token。两者都**邮件发"重置链接"**。
- **设密段公共**：链接落 `/reset-password?token=` → 校验 token → 设新密码（RSA 密文 + 复杂度 + 历史去重 + 清刷错锁）→ 消费 token。唯一公共核 `applyNewPassword(userId, encryptedPassword)`。

## Entities

### SysUser（既有；本特性触及字段）
`email`(唯一,citext)、`status`(仅 ACTIVE 参与)、`passwordHash`(argon2id)、`passwordHistory`(JSON `string[]`,前插截断 `historySize`=5)、`passwordChangedTimestamp`、`passwordErrorTimes`/`passwordErrorLockExpiredTimestamp`(reset 成功清零)。

### PasswordResetToken（瞬态，Redis；统一两触发）
- key：`pwreset:{token}`（token = `randomBytes(32).base64url`，256-bit，不可猜）
- value：`{ userId: number, source: "self-service" | "admin" }`
- **TTL 按 source**：`self-service` 短（**60 分钟**，用户刚发起）；`admin` 长（**72 小时**，沿用现状）
- 生命周期：**issue**（触发时）→ **valid**（TTL 内）→ **consume**（设密成功删除，一次性）/ **expire**
- 泛化自现有 `lib/password-reset-token`（现 value 仅 `{userId}`、固定 72h → 加 `source` + 可变 TTL）

### LoginNonce（瞬态，Redis；复用登录防重放）
由 `GET /api/auth/login-challenge` 下发，随 RSA 新密码包带回，设密时单次消费；保护密码密文不被重放。

## Lifecycles
- **ResetToken**：issue（自助/管理员）→（重置页校验，非破坏性）→ consume（设密成功）。
- **密码轮换**：写新哈希；旧哈希前插 `passwordHistory`，截断到 5。

## Invariants
1. **token 不可猜 + 一次性**：256-bit，消费后即失效；TTL 按 source。
2. **token 绑定具体 userId**：设密只改该 userId 的密码（链接不暴露是谁）。
3. **设密公共规则**：新密码 RSA-OAEP 密文（绝不明文）+ 双向时间戳窗 + 单次 nonce；满足复杂度（≥12 且四类）；**不得等于近 5 个哈希**；成功后清零刷错锁。
4. **自助触发防枚举**：`send-link` 无论邮箱是否存在恒返回 ok；仅 ACTIVE 用户真签发 + 发信。
5. **管理员触发非防枚举**：需登录 + `users.RESETPW`；目标须 ACTIVE 且**非受保护**（非本人、非 ADMIN 归属），否则明确报错（`users.*`）。
6. 重置页/设密端点公开(pre-auth)——token 本身即授权凭证。

## 现状 delta（进度）
- ✅ **#4 自助找回已返工为 link-based**：`recovery-code`→`lib/password-reset-token`(token,自助 TTL 60m)；删 `verify-code`；`send-code`→`send-link`(发 `password-reset` 链接邮件)；消费端迁到 `POST /api/reset-password`(收 `{token,encryptedPassword}`)+ `GET /api/reset-password/validate`；设密核在 `forgot.service.resetPassword`（portal 消费端单点，无需跨 app 抽取）。
- ✅ **#3 管理员重置后端已落地**：`createPasswordResetToken` 写 `{userId, source:"admin"}`（72h）；`resetUserPassword` 后经 admin `lib/email.sendResetLinkEmail` 真发 `password-reset` 链接邮件（落 portal `/reset-password?token=`，复用 ② 的消费端）。
- ✅ **前端已落地**：`forgot-screen` 改「提交邮箱→提示查邮件」（调 `send-link`）；新建 portal `/reset-password?token=` 重置页（`validate` 校验 → 取 `login-challenge` + RSA 加密 → `POST /reset-password`）。自助 + 管理员两条链路端到端可用。
