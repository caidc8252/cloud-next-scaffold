# Reset Password（重置密码）— API Logic

> **目标设计**：统一 token 链接、双触发、共享设密核。贯穿主线：授权两条链路汇入一个公共设密核 `applyNewPassword`。现状 delta 见 `domain.md` 末尾。

## 公共设密核 `applyNewPassword(userId, encryptedPassword)`
两触发授权完成、拿到 `userId` 后都调它：
1. `decryptAndValidatePassword(encryptedPassword, now, 105002)`（`lib/password-input`，已与 onboarding/forgot 共用）：
   - RSA 解密 + `loginPayloadSchema` 解析失败 → `103010`；
   - 时间戳不在双向窗 → `103011`；
   - `consumeLoginNonce` 取不到（重放/过期）→ `103011`；
   - 复杂度不过 → `105002`；返回明文。
2. **历史去重**：`recentPasswordHashes(user.passwordHash, history)`（当前+历史，截断 5）逐个 `verifyPassword`，命中 → `105003`。
3. **更新**：`passwordHash=hashPassword(明文)`、`passwordHistory=buildNextPasswordHistory(旧hash,history)`、`passwordChangedTimestamp=now`、`passwordErrorTimes=0`、`passwordErrorLockExpiredTimestamp=null`。

> 现有 `forgot.service.resetPassword` 的设密段可抽成此核；admin 触发复用同一核。

## 触发 A · 自助找回 `forgotSendResetLink`（portal，公开，防枚举）
1. 按 email 查用户。
2. **仅 user 存在且 `status==="ACTIVE"`**：签 token `pwreset:{token}={userId, source:"self-service"}`（TTL **60m**）→ 发 `password-reset` **链接**邮件（`@cloud/mail`，链接 `{PORTAL_APP_URL}/reset-password?token=`，`purpose="password-reset"`，默认收件人节流 60s+5/h）。
3. **始终**返回 `{ ok:true, cooldownSeconds:60 }`；发信异常吞掉+记日志（防枚举 + best-effort）。

## 触发 B · 管理员重置他人 `adminSendResetLink`（admin，`users.RESETPW`）
1. `assertPermissions({ all:["users.RESETPW"] })`。
2. 取目标在本 party 的归属：不存在/非 ACTIVE → `101003`；**受保护**（本人 / ADMIN 归属，`isProtectedUser`）→ `101008`。
3. 签 token `{userId, source:"admin"}`（TTL **72h**）→ 发 `password-reset` 链接邮件（同模板）。
4. 返回用户视图（沿用现 admin 用户列表项）。**非防枚举**（管理员已知该用户）。

## 公共消费端（portal，公开）

### `validateResetToken` `GET /api/reset-password/validate?token=`
读 `pwreset:{token}` 是否存在 → `{ valid:boolean }`。**非破坏性**，仅供重置页加载时决定显示表单或"链接已失效"。

### `resetPassword` `POST /api/reset-password`
1. 读 token → `{userId, source}`；不存在/过期 → `105001`。
2. 取用户；非 ACTIVE → `105001`（归一）。
3. `applyNewPassword(userId, encryptedPassword)`（见上；失败码 103010/103011/105002/105003）。
4. **消费 token**（`del pwreset:{token}`，一次性）。
5. `{ ok:true }`。

| 失败 | 码 |
|---|---|
| token 无效/过期、用户非 ACTIVE | 105001 |
| 加密无效 | 103010 |
| 时间戳/nonce（重放/过期） | 103011 |
| 复杂度不达标 | 105002 |
| 与近期密码重复 | 105003 |
| body 非法 | 100006 |

## 副作用 / Reactions
- **邮件**：两触发都入队一封 `password-reset` 链接邮件（`@cloud/mail` → `mail:queue`，外部平台发信）；fire-and-forget，失败仅记日志（自助侧吞掉以防枚举）。
- **会话**：本流程不建会话；设密成功后用户去登录页用新密码登录。
- **刷错锁**：设密成功清零（恢复访问）。
- **依赖**：重置页在提交前 `GET /api/auth/login-challenge` 取 `nonce`/`serverTimestamp` 加密新密码。
- **TTL 按 source**：self-service 60m、admin 72h（同一 token 机制，签发时配不同 TTL）。

## 错误码
| 码 | 含义 |
|---|---|
| 105001 | 重置链接无效/过期（含 token 不存在、用户非 ACTIVE，归一） |
| 105002 | 新密码不满足复杂度 |
| 105003 | 新密码与近期重复 |
| 103010 / 103011 | 复用：加密无效 / 请求过期(时间戳/nonce) |
| 101003 / 101008 | 管理员触发：目标不存在 / 受保护 |
| 100006 | body 非法 |

## 现状 delta（实现要点，详见 domain.md）
- 自助：`recovery-code`→`password-reset-token`、删 `verify-code`、`send-code`→`send-link`、`reset` 改收 `{token,encryptedPassword}`、邮件改 `password-reset` 链接模板、前端改"查邮件"+共享重置页。
- 管理员：`createPasswordResetToken` 加 `source`+可变 TTL、`resetUserPassword` 后真发链接邮件。
- 新建：portal 重置页 `/reset-password?token=` + `validate`/`reset` 端点 + 共享 `applyNewPassword`。
- `105001` 文案由"验证码无效"改为"重置链接无效/过期"。
