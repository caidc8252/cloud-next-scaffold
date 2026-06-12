# 邮件模板方案（已评审定稿 2026-06-12）

> 5 个发信业务点(见 `../email-capability/`「接入点」+ 审计)归并为 **3 种模板**。模板落各 app `lib/email/`、文案走 i18n `email.*`、经 `@cloud/mail` 发送。本文是实现规格。

## 评审结论（已定）
1. **邀请邮件不展示角色名**(roleId→名 需解析,保持简洁;详情留 onboarding 落地页)。
2. **重置密码页(消费端)放 portal、且本期搁置**:`password-reset` 模板的 `resetUrl` 作为**注入变量**,等 portal 重置页就绪再接 #3 业务;模板本身可先备好。各平台用户详情 UI 后续统一处理,不在邮件范围。
3. 有效期文案沿用现有常量:验证码 **10 分钟**(verify-code TTL 600s)、重置链接 **72 小时**、邀请 **7 天**。
4. 品牌名用 `NEXT_PUBLIC_APP_NAME`;页脚两版(忽略 / 联系管理员)。
5. `VerifyPurpose.USERNAME_CURRENT` 是 username 删除后的**死代码**,接邮件时一并清理。
6. **每 app 一份 `lib/email/layout.ts`**(平台独立),不抽共享包。

## 通用约定
- 文件:`apps/<app>/lib/email/<kind>.ts`(类型化 `EmailTemplate<V>`)+ `lib/email/layout.ts`(品牌头 + 内联样式按钮 + 页脚)+ `lib/email/index.ts`(薄发送器,拼 URL/定 locale/选 purpose)。
- 文案:i18n `email.*`(en 先写,三语 key 对齐;现一律渲染 `en`)。
- 安全:content 文本变量 `escapeHtml`;`subject` 纯文本不转义;按钮 `href` 用 app 自拼可信 URL(token `encodeURIComponent`)。日期等先在 app 侧格式化成字符串再作 `{date}` 传入(渲染套件不做本地化格式化)。
- 发送:`@cloud/mail.renderAndEnqueue({ template, vars, t, receivers, purpose, throttle })`;wire 上 `content_type` 默认 `text/html`(对齐对方契约,缺它可能被按纯文本发)。

### layout（每 app 一份，完整 HTML 文档 + charset）
`renderEmail({ bodyHtml, button?, footer })` → 包成**完整 HTML 文档**(`<!DOCTYPE html>` + `<meta charset="utf-8">` + body):品牌名(`APP_NAME`)+ `bodyHtml` + 可选按钮(`<a>` 内联样式)+ 灰色小字页脚。仅内联样式,无 table/媒体查询/图片;charset 保证中文/日文不乱码。

## 模板 1 · 验证码 `verify-code`
- **app**:admin(改邮箱)、portal(忘记密码;onboarding 换邮箱 deferred),各一份同形。
- **vars**:`{ code: string; expiresMinutes: number; intent: "emailChange" | "passwordRecovery" | "onboardingEmail" }`
- **subject**:`email.verifyCode.subject`
- **body**:`intro[intent]` + 大字 `{code}`(`<p style="font-size:28px;font-weight:700;letter-spacing:4px">`,code 转义)+ `expiry` + 页脚 `footerIgnore`
- **purpose / 节流**:`verify-code` / 默认 60s + 5 封每小时

## 模板 2 · 邀请入驻 `invite`（admin）
- **vars**:`{ partyName: string; inviterName: string; acceptUrl: string; expiresAtText: string }`
- **subject**:`email.invite.subject`(含 `{partyName}`)
- **body**:`intro`(`{inviterName} invited you to join {partyName}`,变量转义)+ 按钮 `button`→`acceptUrl` + `expiry`(`{date}=expiresAtText`)+ 页脚 `footerIgnore`
- **acceptUrl**:`{PORTAL_APP_URL}/onboarding?token=<encoded>`(门户唯一入口;`PORTAL_APP_URL` 部署 env,admin 侧拼)
- **purpose / 节流**:`invite` / 仅冷却 60s(已有登录态+权限+resendCount;不挂每小时上限)

## 模板 3 · 重置密码链接 `password-reset`（admin；消费端就绪后接）
- **vars**:`{ resetUrl: string; expiresHours: number }`
- **subject**:`email.passwordReset.subject`
- **body**:`intro` + 按钮 `button`→`resetUrl` + `expiry`(`{hours}`)+ 页脚 `footerContactAdmin`
- **resetUrl**:`{PORTAL_APP_URL}/reset-password?token=<encoded>`(重置页放 portal;本期搁置,变量先留)
- **purpose / 节流**:`password-reset` / 默认 60s + 5 封每小时

## 业务点 → 模板
| 业务点 | app | 模板 | intent / 备注 |
|---|---|---|---|
| #1 改邮箱验证码 | admin | verify-code | `emailChange`(替换 `deliverVerifyCode` 桩) |
| #2 邀请入驻 | admin | invite | `createInvite`/`resendInvite` 接入(**最先做,fully ready**) |
| #3 重置用户密码 | admin | password-reset | 待 portal 重置页就绪 |
| #4 忘记密码 | portal | verify-code | `passwordRecovery`(随 forgot-password 真实化) |
| #5 onboarding 换邮箱 | portal | verify-code | `onboardingEmail`(deferred) |

## i18n key 树（EN 值；zh-CN/ja 同结构,先可英文占位）
```
email.common.footerIgnore        = "If you didn't request this, you can safely ignore this email."
email.common.footerContactAdmin  = "If you didn't request this, please contact your administrator."
email.verifyCode.subject         = "Your verification code"
email.verifyCode.expiry          = "This code expires in {minutes} minutes."
email.verifyCode.intro.emailChange       = "Use the code below to confirm your email change."
email.verifyCode.intro.passwordRecovery  = "Use the code below to reset your password."
email.verifyCode.intro.onboardingEmail   = "Use the code below to confirm your email address."
email.invite.subject = "You're invited to join {partyName}"
email.invite.intro   = "{inviterName} invited you to join {partyName}."
email.invite.button  = "Accept invitation"
email.invite.expiry  = "This invitation expires on {date}."
email.passwordReset.subject = "Reset your password"
email.passwordReset.intro   = "A password reset was requested for your account."
email.passwordReset.button  = "Reset password"
email.passwordReset.expiry  = "This link expires in {hours} hours."
```

## 落地就绪度（实现排序建议）
1. **#2 邀请(admin)** —— ✅ **已落地**:`apps/admin/lib/email/{layout,invite,index}.ts` + i18n `email.invite`/`email.common`(三语)+ `createInvite`/`resendInvite` 接 `sendInviteEmail`;`@cloud/mail` 入 admin deps;`acceptUrl={PORTAL_APP_URL}/onboarding?token=`(dev 默认 3100);`purpose=invite` 仅冷却 60s。第一条可端到端验证的真实发信链路。
2. **#1 改邮箱验证码(admin)** —— ✅ **已落地**:`lib/email/verify-code.ts`(intent=`emailChange`)+ i18n `email.verifyCode` 三语;`requestVerifyCode` 改调 `sendVerifyCodeEmail`(`purpose=verify-code`,默认节流 60s+5/h);删 `deliverVerifyCode` 桩 + `USERNAME_CURRENT` 死代码。
3. **#4 忘记密码(portal)** —— ✅ **后端已落地**:三路由真实化（send-code 发码+`verify-code` 邮件 / verify 真校验 / reset 真改密）+ `lib/recovery-code`（按 email 存码）+ portal `lib/email`（intent=passwordRecovery）+ `lib/password-input`（解密校验，与 onboarding 共用）+ 密码历史去重 + `105xxx` 码；防枚举（发码恒 ok、码错归一）。**前端 forgot-screen 重写 + 客户端 RSA 加密待补**（下一步）。
4. **#3 重置密码(admin)** —— 需 portal 重置页(消费端);模板先备。
5. **#5 onboarding 换邮箱** —— deferred。
