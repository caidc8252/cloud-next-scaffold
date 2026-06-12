# 邮件能力（email-capability）设计

> 目标规格，供评审。本仓**只负责把"要发的邮件"推进 Redis 队列**；真正发信由**另一个平台**消费 `mail:queue` 完成（它不做任何加工，原样发出）。本设计解决：能力放哪、变量怎么处理、各业务模板如何管理、如何防积压与防轰炸。

## 0. 一句话

`@cloud/mail`（共享包）负责**怎么发**（队列协议 + 入队 + 渲染机制 + 背压/节流）；各 app 的 `lib/email/`负责**发什么**（类型化模板 + 变量）；文案走各 app 的 **i18n `email.*`**。三者解耦、各 app 模板独立。

## 1. 核心切分

| 关注 | 归属 | 说明 |
|---|---|---|
| 推 job 到 Redis、队列协议、背压、收件人节流、渲染机制 | **包 `@cloud/mail`** | 纯能力、跨 app、不读 env、是与外部发信平台的协议 |
| 每种业务邮件的结构 + 变量 | **各 app `lib/email/`** | 业务私有、平台独立 |
| 邮件文案（标题/正文措辞） | **各 app `i18n/messages/*` 的 `email.*`** | 复用现成本地化（en/zh-CN/ja，en 为基底，`messages.test.ts` 校验对齐） |

外部发信平台「不做任何处理、原样发出」⇒ 所有**变量替换、本地化、转义**都在我们这边做完，入队的就是成品。

## 2. 内容格式（已定）

- `content` = **极简 email-safe HTML**：内联样式 + 一个 `<a>` 按钮，**以文字为主**，不用 table 布局 / 媒体查询 / 外部 CSS / 图片，绕开 Outlook 等客户端兼容性坑。
- 对方原样发 ⇒ HTML 完全由我们负责 ⇒ **渲染套件必须对注入的变量做 HTML 转义**（`displayName`/party 名/邮箱可能含 `<`、`&`）。
- `href` 用我们自己拼的可信 URL（token 经 `encodeURIComponent`），不当作文本转义。
- `title` = 邮件主题（subject）。

## 3. 包 `@cloud/mail`（server-only；依赖 `@cloud/cache`）

```
packages/mail/src/
  queue.ts      # 跨平台契约（单一真源）
  enqueue.ts    # 入队 + 背压
  throttle.ts   # 收件人节流
  render.ts     # 渲染机制（类型化模板 + 转义 + 入队）
  escape.ts     # escapeHtml
  index.ts
```

### 3.1 队列协议（`queue.ts`）—— 跨平台契约，单一真源
```ts
export const EMAIL_QUEUE_KEY = "mail:queue";
export const emailJobInputSchema = z.object({
  receivers: z.array(z.string().trim().email().transform(s => s.trim())).min(1),
  title: z.string().trim().min(1),     // = subject
  content: z.string().trim().min(1),   // = 极简 HTML 正文（对方原样发）
});
export type EmailJobInput = z.infer<typeof emailJobInputSchema>;
```
> 这是与外部发信平台约定的形状，**只此一份**；改它需两边同步。**暂不预留 `version`/`from`/`html` 等字段**，需要时再一起加（注释写清"跨平台契约，改动需协同"）。

### 3.2 入队 + 背压（`enqueue.ts`）
```ts
export const MAX_PENDING_EMAIL_JOBS = 500;
export async function enqueueEmailJob(input: EmailJobInput): Promise<{ queueKey: typeof EMAIL_QUEUE_KEY }> {
  const job = emailJobInputSchema.parse(input);
  const pending = await getRedis().llen(EMAIL_QUEUE_KEY);
  if (pending >= MAX_PENDING_EMAIL_JOBS) throw new MiddlewareError(ERR_MW_MAIL); // 190003：队列积压，拒绝（临时性，提示稍后重试）
  await getRedis().lpush(EMAIL_QUEUE_KEY, JSON.stringify(job));
  return { queueKey: EMAIL_QUEUE_KEY };
}
```
- **背压 500 是系统级保护**（防队列被积压拖垮），对所有调用方统一生效。
- `LLEN` 后 `LPUSH` 非原子，并发可能略超 500——软阈值，略溢出无害，不上 Lua。
- 计在**入队时**（fire-and-forget，发失败收不到信号；靠 TTL+重发兜，已认可此体验取舍）。

### 3.3 收件人节流（`throttle.ts`）—— 防同一收件人被刷
双层叠加，**按 (收件人, 用途) 维度**：
```ts
export type RecipientThrottlePolicy = { cooldownSeconds: number; maxPerWindow: number; windowSeconds: number };
export const DEFAULT_RECIPIENT_THROTTLE: RecipientThrottlePolicy = { cooldownSeconds: 60, maxPerWindow: 5, windowSeconds: 3600 };
export async function assertRecipientQuota(email: string, purpose: string, policy = DEFAULT_RECIPIENT_THROTTLE): Promise<void>;
```
- **冷却**：`mail:cooldown:{purpose}:{email}`，TTL=cooldownSeconds；存在即拒（= 服务端坐实"60s 后重发"）。
- **滚动配额**：`mail:quota:{purpose}:{email}`，`INCR` + 首次 `EX=windowSeconds`，超 `maxPerWindow` 即拒（挡慢速滴灌）。
- email 先 **归一化**（trim+小写）防大小写绕过；**按用途隔离**额度（验证码/重置/邀请各算各的）。
- **默认值（已定）**：冷却 60s + 每小时 5 封。
- **显式调用、按需挂**：用户可触发的邮件（验证码/重置密码）必挂；admin 触发的邀请已有登录态+权限+`resendCount`，可只挂轻量冷却或仅靠 500 背压。
- 阈值（policy）由 **app 侧注入**（包给机制、配置业务注入）。
- 超限抛错 → 调用方 catch 映射成 429/"操作过于频繁,请稍后再试"。

### 3.4 渲染机制（`render.ts`）
```ts
export type EmailTemplate<V> = (vars: V, t: Translator) => { title: string; content: string };
export async function renderAndEnqueue<V>(opts: {
  template: EmailTemplate<V>;
  vars: V;                 // 类型化变量对象（编译期校验，漏传报错）
  locale: Locale;          // 显式收件人语言（不依赖 cookie）
  messages: Messages;      // app 注入的该 locale messages
  receivers: string[];
  purpose?: string;        // 传则跑 assertRecipientQuota
  throttle?: RecipientThrottlePolicy;
}): Promise<void>;
```
- 用 **显式 locale + 注入 messages** 建 `createTranslator`（**不能用 cookie 版 `getTranslations`**——收件人语言可能 ≠ 当前请求语言）。
- **对所有字符串变量先 `escapeHtml` 再交给模板**（content 是 HTML）；`Date` 等先格式化再转义。
- 流程：(可选)节流 → 渲染 → `enqueueEmailJob`（内含 500 背压）。

## 4. 各 app 模板层（`apps/{app}/lib/email/`）

结构与现有 `manifest`/`i18n` 同构，平台独立：
```
apps/{app}/lib/email/
  invite.ts          # type InviteVars + 模板函数（从 i18n 取词 + 注入变量）
  verify-code.ts
  reset-password.ts
  index.ts           # 薄发送器: sendInviteEmail(vars) 等；拼 URL、定 locale、选 purpose/policy
apps/{app}/i18n/messages/{en,zh-CN,ja}.json
  → 新增 "email": { "invite": { "title": "...", "body": "..." }, "verifyCode": {...}, ... }
```
示例（邀请）：
```ts
export type InviteVars = { partyName: string; inviterName: string; acceptUrl: string; expiresAt: Date };
export const inviteTemplate: EmailTemplate<InviteVars> = (v, t) => ({
  title: t("email.invite.title", { partyName: v.partyName }),
  content: t.markup("email.invite.body", { ...v, button: chunk => `<a href="${v.acceptUrl}" style="...">${chunk}</a>` }),
});
// index.ts
export async function sendInviteEmail(to: string, v: InviteVars) {
  await renderAndEnqueue({ template: inviteTemplate, vars: v, locale: "en", messages: await loadMessages("en"),
    receivers: [to], purpose: "invite", throttle: { cooldownSeconds: 60, maxPerWindow: 10, windowSeconds: 3600 } });
}
```
- **业务侧**（service 层）只调 `sendInviteEmail(...)`，不碰队列协议。
- **URL/token 等部署相关变量在 app 拼**（用 `platform-config`），包不碰、不读 env。

## 5. locale 策略（已定）
- **现在一律渲染 `en`**（调用处传 `locale: "en"`）；`renderAndEnqueue` 的 `locale` 参数保留,将来切换只改调用处 + 补译文。
- `email.*` 键**三语都补齐**（满足 `messages.test.ts` 对齐；非 en 先用英文占位），保证结构就位、测试绿。

## 6. 维护心智
- **加一种邮件** = 加 `lib/email/x.ts` + 三语 json 补 `email.x`。
- **改文案** = 只动 json。
- **换发信平台/改协议** = 只动 `@cloud/mail/queue.ts`（两边协同）。
- 三件事互不牵连；各 app 邮件集合完全独立。

## 7. 数据流
```
service(业务)
 → lib/email/sendXxx(vars)                 // app: 拼 URL、定 locale=en、选 purpose+policy
   → @cloud/mail.renderAndEnqueue(...)      // 包: (节流) → 渲染(转义) → 入队
     → enqueueEmailJob({receivers,title,content})  // 包: LLEN<500 背压 → lpush mail:queue
       → (外部平台 drain 队列，原样发信)
```

## 8. 决策汇总（已锁）
- 能力分层：transport+机制进 `@cloud/mail`，模板留 app，文案走 i18n。✅
- content = 极简 email-safe HTML，对方原样发，变量 HTML 转义。✅
- 契约 `{receivers,title,content}` 单一真源，**不预留**版本/扩展字段。✅
- locale 现全 `en`，参数与三语 key 结构先就位。✅
- 渲染机制进包、模板留 app。✅
- 背压：入队前 `LLEN >= 500` 拒绝（系统保护）。✅
- 收件人节流：`(收件人,用途)` 冷却 **60s** + 每小时 **5 封**（用户可触发邮件必挂）。✅

## 9. 仍待确认（多为跨团队，非本仓代码决策）
1. **与外部发信平台核对契约语义**：它读 `content` 是否**原样当 HTML 发**、`title` 是否当 subject、`receivers` 是否为 To；**发件人 `from` 由它固定**（我们不传）。本设计按此假设，需对方确认。
2. **一封多收件人**：`receivers` 多个 = 同一封 To 多人（互相可见）。验证码/重置/邀请均**单收件人**，按 `[email]` 发，避免泄露 + 配合 per-recipient 节流。
3. **错误码落位**：背压复用 `ERR_MW_MAIL=190003`；收件人超限用一个 429 语义码（编号在现有方案里择段，实现时定）。

## 10. 接入点（各 app 如何用；细节见对应 feature 文档）
- **portal**：invite-user 的验证码/（将来）入驻通知 → `purpose="verify-code"` 等，挂默认节流。
- **admin**：`createInvite`/`resendInvite` 真正把邀请链接发出 → `purpose="invite"`（见 invite-user 文档）。
- 任意 app 的 reset-password、通知类邮件同此模式。
