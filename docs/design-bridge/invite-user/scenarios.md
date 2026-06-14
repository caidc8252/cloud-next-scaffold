# 邀请入驻 验收场景（scenarios）

> 黑盒验收门：从操作员 / 被邀请人视角描述「给定 X，做 Y，应得 Z」。Gherkin 风格，逐条可手测 / E2E 化。
> 范围仅 **场景一 · 通用邀请**（邀进**已 ACTIVE** 的 Party，被邀人恒 `NORMAL`、不激活）。场景二（onboarding 首管/激活）、SSO、任意邮箱+验证码不在本期验收。

## A. 验票

```
场景 A1: 有效邀请
  假设 admin 已为 party "BrightPOS" 创建一封 PENDING、未过期的邀请
  当 被邀请人打开 /onboarding?token=<有效token>
  那么 显示 landing：party 名 "BrightPOS"、预置角色、被邀邮箱（提示）、过期相对时间

场景 A2: token 不存在
  当 打开 /onboarding?token=garbage
  那么 invalid 终态页（104001），不泄露任何 party 信息

场景 A3: 已过期
  假设 邀请 expiresAt < now
  那么 invalid 页提示「已过期」(104002)

场景 A4: 已被消费
  假设 邀请 status=CONSUMED
  那么 invalid 页提示「已使用」(104003)
```

## B. 未登录 — 新建账号（被邀邮箱）

```
场景 B1: 被邀邮箱可用，建号入驻
  假设 inviteEmail=alice@x.com 尚无账号，party 已 ACTIVE
  当 选「新建账号」→ 填 displayName/country/合规密码 → 授权
  那么 创建 sys_user(email=alice@x.com)
   且 创建 sys_party_user(authorizingType=NORMAL, roles=邀请预置)   # 场景一恒 NORMAL
   且 party.status 不变（仍 ACTIVE，不被本流程触碰）
   且 邀请 status=CONSUMED
   且 返回 redirectTo 指向该 party 对应 console 的 handoff URL，跟随后已登录

场景 B2: 弱密码被拒
  当 新建账号设置密码 "short"
  那么 客户端按钮禁用；即便绕过，服务端返回 104005，且不创建任何记录

场景 B3: 被邀邮箱已注册 → 引导登录
  假设 inviteEmail=bob@x.com 已有账号
  当 选「新建账号」并授权
  那么 返回 104004，UI 提示「该邮箱已注册，登录加入」，不创建第二个账号

场景 B4: 密码明文不出网
  当 新建账号提交
  那么 请求体中密码为 RSA 密文（含 nonce+timestamp），重放同一密文 → 103011
```

## C. 未登录 — 已有账号登录入驻

```
场景 C1: 登录后绑定（无 MFA）
  假设 carol@x.com 有账号、无 MFA
  当 选「登录加入」→ 跳 /login?returnTo=/onboarding?token=… → 正确密码登录
  那么 建立 portal 会话并跳回邀请页（不进 console）
   且 landing 显示「已登录为 carol@x.com」→ 一键加入
   且 创建 sys_party_user(authorizingType=NORMAL)
   且 邀请 CONSUMED，redirectTo 进 console

场景 C2: 登录含 MFA
  假设 dave@x.com 开启 TOTP
  当 走 returnTo 登录 → 输入正确 TOTP
  那么 MFA 通过后建 portal 会话并跳回邀请页（returnTo 经 mfaToken 透传），后续同 C1

场景 C3: 登录失败计数与锁
  当 returnTo 登录连续错密码达上限
  那么 与正常登录一致触发刷错锁（复用同一计数器/时间窗），onboarding 不绕过

场景 C4: returnTo 防开放重定向
  当 构造 /login?returnTo=https://evil.com 或 returnTo=/system/users
  那么 returnTo 被拒/忽略（仅允许 /onboarding 前缀的站内相对路径）
```

## D. 已登录进入邀请页

```
场景 D1: 用当前账号加入
  假设 已登录为 eve@x.com（portal 会话有效）
  当 打开 /onboarding?token=… → 「以 eve@x.com 加入」→ 授权
  那么 mode=existing 绑定 eve(NORMAL)；updateSession 纳入新 party；redirectTo 落地

场景 D2: 换个账号
  当 已登录用户点「换个账号」
  那么 先登出（清 portal 会话）→ 跳 /login?returnTo=邀请页，之后同 C1

场景 D3: 当前账号已是该 party 成员（幂等）
  假设 eve 已是该 party 成员
  当 「以 eve 加入」授权
  那么 不重复创建归属、不降级其角色；返回 alreadyMember=true，提示「你已是成员」并进入
```

## E. 成员归属与并发（场景一）

```
场景 E1: 被邀人恒为普通成员、不激活 party
  假设 party 已 ACTIVE，操作员邀同事（partyId==inviterPartyId）
  当 同事 accept
  那么 authorizingType=NORMAL，party.status 仍 ACTIVE（不被触碰）

场景 E2: 并发双 accept 同一邀请
  当 两个请求几乎同时用同一 token accept
  那么 仅一个成功消费（PENDING 条件更新）；另一个得 104003 或幂等成员结果，绝不产生双重归属
```

> 〔场景二 · 待办，不在本期验收〕「新 Party 首个成员 → ADMIN + 激活（ONBOARDING→ACTIVE）」由 ADMIN 平台 onboarding 流程负责，与场景一隔离。

## F. admin 侧邀请管理（场景一核心）

```
场景 F1: 已是成员的邮箱不可重邀
  假设 frank@x.com 已是本 party 成员（ACTIVE 或 LOCKED 均算）
  当 操作员对 frank@x.com 发邀请
  那么 返回 101002，不创建邀请

场景 F2: 同邮箱已有未过期邀请 → 拒绝重复发
  假设 grace@x.com 在本 party 有一封未过期 PENDING 邀请
  当 再次对 grace@x.com 发邀请
  那么 返回 101002

场景 F3: 同邮箱旧邀请已过期 → 覆盖重发
  假设 helen@x.com 在本 party 仅有一封已过期 PENDING 邀请（operatorInviteId=K）
  当 再次对 helen@x.com 发邀请（可带新角色）
  那么 复用同一行 K（新 token / 新有效期 / 新角色 / resendCount=0），不新建第二条，并重发邮件

场景 F4: 重发只重寄、不续期
  假设 一封未过期邀请
  当 操作员点「重发」
  那么 token 不变、expiresAt 不变、resendCount+1，重寄同一封；过期邀请点重发 → 101006

场景 F5: 重新生成换链接
  假设 一封未过期邀请
  当 操作员点「重新生成」
  那么 token 变、expiresAt 刷新(+7d)、重发邮件；旧 token 立即失效（旧链接进 invalid）；resendCount 不变；过期邀请点重新生成 → 101006

场景 F6: 过期邀请不可改角色
  假设 一封已过期邀请
  当 操作员尝试改其角色
  那么 返回 101006（要改只能用「重新发送」覆盖）

场景 F7: 撤销
  当 操作员撤销一封 PENDING 邀请（含已过期）
  那么 该行删除、token 立即失效；撤销非 PENDING 目标 → 101007

场景 F8: 收件人发信节流
  当 对同一收件人 60s 内连续触发发信（发/重发/重新生成）
  那么 第二次返回 429，提示稍后再试（邀请数据本身不受影响）

场景 F9: 跨 Party 隔离
  假设 操作员属 party A
  当 用 party B 的邀请 id 调重发/重新生成/改角色/撤销
  那么 查不到该邀请（按 currentPartyId 收口），返回 101006 / 101007，绝不跨 party 操作
```

## G. 邀请生命周期边界

```
场景 G1: accept 后 token 立即失效
  当 同一 token 第二次打开/accept
  那么 视为已消费（104003）

场景 G2: 7 天过期
  假设 邀请创建超过 7 天
  那么 验票与 accept 均按过期处理（104002）；救活需「重新生成」或「重新发送覆盖」（重发不再续期）
```

## 不在本期（不验收）
- 真实邮件投递的回执/退信处理。
- 「换任意邮箱 + 邮箱验证码」新建账号分支；SSO/OIDC 接入。
- 场景二 Onboarding（ADMIN 为新 Party 设首管 + 激活）。
