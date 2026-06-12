# 邮件能力 验收场景（scenarios）

> 黑盒/单测可验的验收门。`@cloud/mail` 与各 app `lib/email` 接好后逐条可测。

## A. 入队与背压

```
场景 A1: 正常入队
  当 调用 enqueueEmailJob({receivers:["a@x.com"], title:"T", content:"<p>..</p>"})
  那么 mail:queue 末尾多一条 JSON job，返回 { queueKey: "mail:queue" }

场景 A2: 入参非法
  当 receivers 为空 / title 为空 / content 为空 / 邮箱格式错
  那么 zod 校验失败抛错，不入队

场景 A3: 背压 500
  假设 mail:queue 当前长度 >= 500
  当 调用 enqueueEmailJob(...)
  那么 抛 MiddlewareError(190003)，不入队；调用方提示"邮件繁忙，稍后重试"

场景 A4: 背压恢复
  假设 队列被消费降到 < 500
  那么 入队恢复正常
```

## B. 收件人节流（60s + 5/时，按 收件人×用途）

```
场景 B1: 冷却 60s
  当 同一 (email, purpose) 60s 内第二次 assertRecipientQuota
  那么 第二次抛"过于频繁"（429 语义）；过 60s 后放行

场景 B2: 每小时上限 5
  当 同一 (email, purpose) 1 小时内成功第 6 次
  那么 第 6 次被拒；窗口滚动过期后恢复

场景 B3: 用途隔离
  假设 verify-code 已用满额度
  那么 invite / reset-password 的额度不受影响（独立计数）

场景 B4: 大小写归一
  当 A@X.com 与 a@x.com 交替触发
  那么 视为同一收件人，合并计数（不被大小写绕过）

场景 B5: 未挂节流的调用
  当 调用 renderAndEnqueue 不传 purpose
  那么 跳过节流，仅受 500 背压约束（用于系统通知类）
```

## C. 渲染与转义

```
场景 C1: 变量 HTML 转义
  假设 displayName = "<script>x</script>" 或 party 名含 "&"/"<"
  当 渲染含该变量的邮件
  那么 content 中该变量被转义为实体，不破坏 HTML、不可注入

场景 C2: 可信 href 不被破坏
  当 模板用 acceptUrl 作 <a href>
  那么 href 为我们拼的 URL（token 经 encodeURIComponent），链接可点

场景 C3: 缺变量编译期拦截
  当 调用模板漏传必需变量
  那么 tsc 报错（类型化 vars），不会渲染出字面占位符

场景 C4: 显式 locale
  当 renderAndEnqueue(locale:"en", messages:enMessages)
  那么 用 en 文案渲染，与当前请求 cookie 语言无关
```

## D. 端到端（与 feature 联动，详见各 feature 文档）

```
场景 D1: 邀请邮件真正发出
  当 admin createInvite 成功
  那么 lib/email.sendInviteEmail 入队一封含 acceptUrl 的邀请邮件（purpose=invite）

场景 D2: 外部平台缺位时的表现
  假设 没有消费者 drain mail:queue
  那么 入队成功但无人发信；队列累积至 500 后由背压拒绝新请求（不静默无限堆积）
```

## 不验收（本期范围外）
- 真正的 SMTP/SES 投递（外部平台职责）。
- 投递回执 / 退信处理（fire-and-forget，已认可）。
- 发起方/IP 维度的防滥用（本期只做收件人维度）。
