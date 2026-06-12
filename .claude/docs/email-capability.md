# 邮件能力

> 归属：`@cloud/mail`（推 Redis `mail:queue`，外部平台消费发信）、各 app `lib/email/` 模板、i18n `email.*` 文案。**发任何邮件前必读。** 完整设计/决策见 `docs/design-bridge/email-capability/`。

- 发邮件统一走 `@cloud/mail`：本仓只把"要发的邮件"推进 Redis `mail:queue`，由**外部平台**消费后原样发出。不要在业务里直接发信、直接连 SMTP/SES，也不要直接 `lpush` 队列
- 队列协议 `{ receivers: email[], title=subject, content=极简HTML正文 }` 是 `@cloud/mail` 的**单一真源**（`emailJobInputSchema`），也是与外部发信平台的契约；改它需两边协同，不要在别处另立邮件 job 形状
- `content` 是**极简 email-safe HTML**（内联样式 + `<a>` 按钮、文字为主，不用 table 布局/媒体查询/外链 CSS/图片），外部平台原样发；`title` 是纯文本主题
- **转义**：拼 `content` 时对注入的变量调 `escapeHtml`（用户可控的名字/邮箱可能含 `<`、`&`）；`title` 不转义（否则 "Smith & Co" → "&amp;"）
- 业务邮件模板落各 app `lib/email/<kind>.ts`（类型化 `EmailTemplate<V>`，平台独立）；**文案走 i18n `email.*`**（三语对齐、`en` 基底，禁硬编码）；用 `renderAndEnqueue({ template, vars, t, receivers, purpose, throttle })` 收口
- 译者 `t` 由 app 侧用 `@cloud/i18n` 按**收件人 locale** 构建后注入（`@cloud/mail` 不依赖 i18n）；**不能用 cookie 版 `getTranslations`**（收件人语言 ≠ 当前请求语言）。当前一律传 `en`，locale 参数与三语 key 结构先就位
- URL/token 等部署相关变量在 **app 侧**拼（用 `@cloud/platform-config`，token 经 `encodeURIComponent`）；`@cloud/mail` 不读 env
- **队列背压**：`enqueueEmailJob` 入队前 `LLEN(mail:queue) >= 500`（`MAX_PENDING_EMAIL_JOBS`）即抛 `MiddlewareError(ERR_MW_MAIL=190003)`，系统级保护，软阈值
- **收件人节流**：用户可触发的邮件（验证码/重置密码）必须先 `assertRecipientQuota(email, purpose, policy)`——按 (收件人, 用途) 冷却 60s + 每小时 5 封（`DEFAULT_RECIPIENT_THROTTLE`），超限抛 `BusinessError(ERR_TOO_MANY_REQUESTS=100008, 429)`；admin 触发的邀请等已有登录态/权限，可只挂轻量冷却或仅靠背压
- 投递是 fire-and-forget：入队即消费一次节流额度，发失败无回执信号，靠验证码 TTL + 重发兜
- 新增一种邮件 = 加 `lib/email/<kind>.ts` + 三语补 `email.<kind>`；改文案只动 i18n json；改协议只动 `@cloud/mail/queue.ts`（两边协同）
- **日志**：走全局 `@cloud/log`（`createLogger("mail")`，详见 `.claude/docs/logging.md`）——入队成功 `info`、背压/节流拒绝 `warn`、细节（载荷/队列深度）`debug`。排查"发了没收到"先按 `scope:"mail"` 看日志确认是否真入队（外部平台是否消费/发信不在本仓日志范围）；也可 `redis-cli LLEN mail:queue` 直接验队列
