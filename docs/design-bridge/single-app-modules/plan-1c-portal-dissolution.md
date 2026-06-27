# Step 1c — 解散 apps/portal（设计 + 决策待确认）

> 状态:已勘察 + 风险已定位。**auth/login 合并是全项目最危险的一步**(改错→无人能登录),
> 涉及行为分叉(非纯改名),故先文档化策略 + 拍板,再执行。

## 现状勘察

`apps/portal` = 前台门户,含:
- **service**:`auth`(登录面:login/verifyMfa/selectPartner)、`forgot-password`、`onboarding`、`mfa`(登录期 verify 子集)。
- **app**:`(auth)`(login/forgot-password/reset-password/onboarding/select-partner + 共享 `_components`)、`(marketing)`;`api/auth/*`(9 个)、`api/forgot-password`、`api/onboarding`、`api/reset-password`。
- **lib**:大量与 web/lib 同名文件 + portal-only(login-nonce/platform-routing/schemas/password-input/format/countries/error-codes/forgot|onboarding-error-*)。
- **manifest**:`_generated`(gen 产物)+ index(同 web)。

## 关键发现(改变了"合并"的性质)

1. **存在两套登录实现**:web(原 admin)`auth.service` 已有 `login/verifyMfa/selectPartner` + `(public)/login` 页面;portal 有更丰富的一套(oidc/sso-domains/idp-accounts/company/login-challenge)。**收口成一套登录** = 用 portal 的登录面**替换** admin 的,不是简单搬运。
2. **共享 lib 多为"同源漂移"**:`session-snapshot`(106 diff 行)经查**几乎全是变量名/格式/注释差异 + 一个 `=null` 默认值**,行为等价 → **留 web 版、弃 portal 版**。多数同名 lib 同理(fork 后风格漂移,非行为差异)。
3. **但有真行为分叉**:`login-crypto.encryptLoginPassword` portal 多一个 `nonce` 参数(登录重放保护),并写进密文;而该 lib **同时被 portal 登录与 web 账户改密**消费。`login-nonce` 是 portal-only 的配套。→ 不能无脑替换,否则改密链路可能断。
4. **`(auth)` 页面组件互相耦合**:`card-bits`/`password-checklist` 被 login/onboarding/forgot/reset 共用 → 页面不能逐个独立迁,需一并处理 `(auth)` 外壳。

## 合并准则(沿用 Step 0 spec,细化到本步)

- **同名 lib**:逐个 diff → 等价的留 web(admin 为主)、弃 portal;**真分叉的登录面(login-crypto/login-nonce/login-token 的 nonce 路径)以 portal 为准**,并同步确认 web 账户改密仍工作。
- **portal-only lib** → 直接进 `web/lib`。
- **auth.service**:以 portal 登录面为基(含 oidc/sso/idp/company/login-challenge),并保留 web 已有的后台 `selectPartner`/controller(logout/session-handoff/server-time)。net-new 登录服务函数进 `identity/auth`。
- **页面**:`(auth)` 整体 → `web/app/(portal)` 薄壳 + `identity/*` 模块 ui;`(public)`(403/locked/login/select-partner)并入 `(portal)`,**admin 的 `(public)/login` 由统一登录页取代**。
- **forgot-password / onboarding** → 各自新模块 `identity/account-recovery`、`identity/onboarding`(纯模板应用,无 dedup,较低风险)。
- **mfa**:portal 的登录期 verify 已被 `identity/mfa` 覆盖,删 portal 版。

## 子阶段拆分(已按依赖修订)

> **依赖修订(关键)**:勘察后发现 onboarding/account-recovery **依赖共享登录基建**——
> 页面用 nonce 版 `login-crypto` + `@/service/auth/api`;service 用 `auth.service`(如
> `buildSessionAndRedirect`);并与 login 共享 `(auth)/_components/{card-bits,password-checklist}`。
> 故 **"低风险模块先、auth 最后" 不成立**:登录基建是地基,必须先建。修订顺序如下。

| 子阶段 | 内容 | 风险 |
|---|---|---|
| **1c-a portal-only lib** | 无冲突的 portal-only lib(error-codes/messages、countries、format、schemas、password-input、platform-routing 等)→ `web/lib`,**随其消费者迁移时带入**(不空挂) | 低 |
| **1c-b 登录基建(原 1c-d 核心)** | reconcile 分叉登录 lib(`login-crypto` nonce 版统一、`login-nonce`、`login-token`、`password-reset-token`、`password-rules`、`api-handler`、`session-snapshot`、`email`);portal 登录面 auth.service(login/verifyMfa/oidc/sso/idp/company/login-challenge/buildSessionAndRedirect)并入 `identity/auth`;9 个 auth 路由;统一登录页替换 admin `(public)/login`;迁共享 `(auth)/_components` | **高(登录关键)** |
| **1c-c onboarding** | `identity/onboarding`(依赖 1c-b 的 auth.public + login-crypto)+ 页面 + api | 中 |
| **1c-d account-recovery** | `identity/account-recovery`(forgot + reset)+ 页面 + api | 中 |
| **1c-e 收尾** | marketing 页;`(public)`→`(portal)`;删 `apps/portal`;清 workspace/scripts/playwright/tsconfig/lockfile | 中 |

**结论**:1c 的真正核心与地基是 **1c-b(登录基建 + auth 合并)**,且 onboarding/recovery 必须在其后。
建议把 1c-b 当作一次**专注、带登录回归**的执行(行为分叉 + 登录关键),而非夹在中间快速带过。

## 需要你拍板的决策

1. **登录传输 nonce**:`identity/auth` 统一后,**登录与账户改密都走 portal 的 nonce 版 `login-crypto`**(更安全、一致),代价是改密链路要相应加 nonce、回归测试登录+改密。同意吗?(备选:登录用 nonce 版、改密保持无 nonce —— 两套并存,不推荐。)
2. **执行节奏**:1c-d(auth)是登录关键且行为分叉。建议先做低风险的 1c-a/b/c(地基 + onboarding + recovery)并验收提交,**auth 合并(1c-d)单独谨慎执行**(可能需要专门回归)。接受这个顺序吗?
3. **e2e 登录回归**:1c-d 后强烈建议跑 `pnpm test:e2e`(需 docker/db)验证登录链路。本环境能否跑 e2e,还是只能靠单测 + 手测?

## 推迟/保持

- URL、权限码、菜单不变(同 1b);Step 2 CoC 再议。
- 既有 db-read lint 债、9 个 e2e orphans(其中 4 个 portal auth 标记将随 portal 删除而消失)不在本步处理。
