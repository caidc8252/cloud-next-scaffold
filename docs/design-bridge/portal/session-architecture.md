# 会话架构:pep-token + portalUrl（A/B 方案详解）

> 决定「选定 Party 后,会话凭证如何从 portal 落到(可能异 host 的)目标 console」。
> portalUrl **来源**已定(见 §2);本文重点是**跨 host 落 cookie 的 A/B 两案详细推演** + 推荐。

## 0. 范围

- **已定**:portalUrl 来源(契约类型推 portal 组 + 禁止跨组重叠,§2)。
- **待定**:跨 host 落 cookie —— 方案 **A(共享父域直跳)** vs **B(泛化 handoff)**。本文为这个决策提供完整依据。

## 1. 现状(基线)

当前**已经是 B 的雏形**(只是目标单一、写死成 admin):

- 会话存储:`@cloud/permissions` Redis session,cookie 名 `sid`(`SID_COOKIE`),TTL 12h。
- 跨 host 进入 admin:portal 登录成功 → `createSessionHandoffToken(sid)`(一次性 token,`HANDOFF_TTL_SECONDS=60`)→ 重定向到 `{ADMIN_APP_URL}/api/auth/session-handoff?token=...`(`platform-routing.ts` 的 `getAdminSessionHandoffUrl`,`ADMIN_APP_URL` 单一 env)。
- admin 的 `/api/auth/session-handoff`:`consumeSessionHandoffToken(token)` → **在 admin 自己 host 写 `sid` cookie** → 303 跳 `/`。
- **代码注释已自证理由**(admin session-handoff route + platform-routing):
  > “在 admin 当前 host 下写入 sid,这样 **Codespaces 的端口子域可以正常登录**,同时**避免把 cookie domain 放大到整个 `app.github.dev` 公共开发域**。” / “直接跳 ADMIN_APP_URL 在 Codespaces 这类端口子域环境下会丢 host-only cookie。”

→ 即:**现有架构故意用 handoff,正是为了规避 A 的两个问题(跨 host host-only cookie 丢失 + 不想放大 cookie domain)。**

## 2. portalUrl 来源（已定,复述）

- contractType → portal 组(代码单一真源 `contractGroup`):
  - `MERCHANT` → **Merchant** portal
  - `US-ISO / US-ISV / US-ISO-PILOT / US-ISV-PILOT / PLATFORM-CUSTOM` → **Customer** portal
  - `ADMIN` → **Admin** portal
- **不变量**:禁止一个 party 的契约跨 portal 组(契约创建时强制;代码层 = 不变量)。⇒ 一个 party 唯一对应一个 portal,不需要"选 portal"。
- 由**契约类型**推(不分状态:过期/SUSPENDED 仍可推 → 落"合同过期"页)。
- 跨组脏数据兜底优先级:`ADMIN > CUSTOMER > MERCHANT`。
- portal 组 → URL 走**部署配置**(per-group env),不入库。

## 3. 目标语义

选定 Party → 会话 `party` 上有 `portalUrl`(按上面推)→ 用户进入**该 Party 的 console**;console 与 portal 可能不同 host(admin/customer/merchant 多 app)。`pep-token` 即目标里的会话 cookie 名(本质 = 现 `sid` 机制 + Redis `AUTH:USER-TOKEN:{uuid}`,语义不变)。

---

## 4. 方案 A —— 共享父域 cookie（直跳）

**核心**:`pep-token` 种在**共享父域**(如 `.pep.io`),前端直接 `location = portalUrl`,cookie 随请求自动带到目标 console。无 handoff。

**前提**:portal 与所有 console **同一可信父域**(`portal.pep.io` / `admin.pep.io` / `customer.pep.io` …),cookie `Domain=.pep.io`。

**时序**:
1. `GET /auth/login-challenge` → `{serverTimestamp, nonce}`
2. 公钥加密 `{password, timestamp, nonce}` → `POST /auth/password {email}`
3. (MFA) → 建 `pep-token`(Redis)+ **写 cookie `Domain=.pep.io`**
4. 选 Party → 算 `portalUrl`(`https://customer.pep.io` 等)
5. 前端 `location = portalUrl` → 浏览器带上 `.pep.io` 的 `pep-token` → console 直接读 cookie 鉴权 ✅

**改动点**:cookie 写入加 `Domain` = 父域;**删除** handoff 端点与 token;portal 登录直接写 `pep-token`。

**优点**:
- 最简单,无 handoff、无额外往返、无每-console 端点。
- 贴合目标 domain-model 文档的设想。

**缺点 / 风险**:
- **要求生产严格同父域**(部署强约束)。
- **破当前 Codespaces / 端口子域开发流**:dev 下 portal=`*-3100.app.github.dev`、customer=`*-3200.app.github.dev`,**无共享私有父域**(`app.github.dev` 是公共域,不能把 cookie 放上去);本地 `localhost:3100` / `localhost:3200` 也不共享 → cookie 不带 → 登录在 dev 直接不可用。这正是现有代码绕开的坑。
- **cookie 作用域放大**:`Domain=.pep.io` 意味着所有子域可读 `pep-token`(安全面比 host-only 大;任一子域 XSS/被攻陷影响面更广)。
- 与现状相反(现状是 handoff),改动方向是"拆掉现有保护"。

**适用**:生产确定同私有父域 + 团队不依赖 Codespaces/多端口 dev。

---

## 5. 方案 B —— 泛化现有 handoff（推荐）

**核心**:把现有"只对 admin"的 handoff **参数化成按 party 推出的 portalUrl**;每个 console 各有一个 handoff 端点,在**自己 host** 写 host-only `pep-token`。

**前提**:无(任何 host 布局都行,含 Codespaces / 多端口 / 异父域)。

**时序**:
1. `GET /auth/login-challenge` → `{serverTimestamp, nonce}`
2. 加密 → `POST /auth/password {email}`
3. (MFA) → 建 `pep-token`(Redis;此时不依赖把 cookie 写到目标 host)
4. 选 Party → 算 `portalUrl` + 签**一次性 handoff token**(复用 `createSessionHandoffToken`,TTL 60s)
5. 前端跳 `{portalUrl}/api/auth/session-handoff?token=...`
6. 目标 console 的 `/api/auth/session-handoff`:`consumeSessionHandoffToken` → **在自己 host 写 host-only `pep-token`** → 删 token(一次性)→ 303 进控制台 ✅

**改动点**:
- `platform-routing`:`ADMIN_APP_URL` 单一 → per-group(`ADMIN_APP_URL`/`CUSTOMER_APP_URL`/`MERCHANT_APP_URL`);`getAdminSessionHandoffUrl` 泛化成 `getSessionHandoffUrl(group, token)`。
- handoff 端点:admin **已有**;**customer / merchant 各加一个**(逻辑相同,复用 `consumeSessionHandoffToken`)。
- portal 登录收尾/选 Party:跳转目标由写死 admin → 按 `portalUrl` 走。
- (可选)cookie 名 `sid → pep-token`、redis key 对齐 `AUTH:USER-TOKEN`(cosmetic)。

**优点**:
- **对任何 host 布局鲁棒**(含 Codespaces / 多端口 dev) —— 延续现有可用机制。
- cookie 仍 **host-only**(作用域最紧,安全面小)。
- 是对现状的**泛化**,不推倒重来;改动可控、风险低。

**缺点**:
- 每个 console 一个 handoff 端点(少量重复;可抽公共 handler 进 `@cloud/permissions` 减重复)。
- 多一次跳转(handoff redirect)。
- 一次性 token + TTL 管理(已有,无新增机制)。

---

## 6. 对比

| 维度 | A 共享父域 | B 泛化 handoff |
|---|---|---|
| 跨 host 前提 | **需同私有父域** | 任意布局 |
| Codespaces / 多端口 dev | **不可用** | 可用 |
| cookie 作用域 | 父域(宽,所有子域可读) | host-only(紧) |
| 改动量 | 小(拆 handoff,但要保父域) | 中(per-console handoff + URL 泛化) |
| 与现状关系 | 相反(拆现有保护) | 延续/泛化现状 |
| 额外往返 | 无 | 一次 handoff redirect |
| 贴合目标文档 | 高 | 中(但更贴现实) |

## 7. 推荐:**B**

理由:
1. **现有代码已为此选了 handoff**,注释明确是为了解决跨 host host-only cookie + 不放大 cookie domain;多 console 后这两个理由更强。
2. B = **把已验证可用的机制泛化**(目标参数化成 portalUrl + 加 customer/merchant handoff 端点),不破开发流、安全面更紧、改动可控。
3. A 更贴目标文档,但**牺牲 Codespaces/多端口 dev** 且要**生产域名强约束** + **放大 cookie 作用域**——以"拆掉现有保护"换"少一次跳转",不划算。

**可演进(hybrid,非现在做)**:若将来生产确定同私有父域,可在 B 基础上加 A 作 fast-path —— 同父域时直跳(省一次 handoff),异 host 时回落 handoff。先 B,后按需叠加。

## 8. 选 B 后的实现 delta（落地清单,待 §9 拍板后做）

1. `contractGroup(contractType)` 代码单一真源(与角色区间共用)。
2. `platform-routing`:per-group URL env + `getSessionHandoffUrl(group, token)`。
3. 选 Party / 登录收尾:算 `session.party.portalUrl` + 签 handoff token + 跳 `{portalUrl}/api/auth/session-handoff`。
4. customer(+ 将来 merchant)加 `/api/auth/session-handoff`(复用 `consumeSessionHandoffToken`;可抽公共 handler)。
5. (可选)cookie/redis key 改 `pep-token`/`AUTH:USER-TOKEN`。
6. 0/多 Party、过期落地页:按已定逻辑(`logic.md` 目标版)。
7. E2E:登录引导随之对接(见 STATUS「E2E 待跟进」)。

## 9. 决定:**B（2026-06-12）**

- **采用方案 B(泛化 handoff)。** 一次性 handoff token 走 URL → 目标 console 后端 `consumeSessionHandoffToken` 校验 + 在自己 host 写 host-only 会话 cookie + 删 token;会话凭证本身不进 URL。
- **保留将来可快切 A**:这是硬要求 —— 实现时把「如何把会话落到目标 console」收口到**单一函数 + 配置开关**,使切换 A↔B 局部化。
- cookie 名:暂**沿用 `sid`**(不顺手改 `pep-token`,避免现有会话失效;改名留作纯 cosmetic,任何时候可做)。

### 9.1 可切换性设计（让 A 成为"快切"）
- 新增**唯一入口** `entryUrlForParty(group, sid)`(或 `resolvePartyEntry`),内部按一个配置开关(如 `SESSION_HANDOFF_MODE = "handoff" | "shared-domain"`)返回:
  - **B(handoff,默认)**:签一次性 token → 返回 `{portalUrl}/api/auth/session-handoff?token=`(目标后端写 host-only cookie)。
  - **A(shared-domain,将来)**:直接返回 `portalUrl`(会话 cookie 已写在共享父域,前端直跳)。
- `buildSessionAndRedirect` / `selectPartner` **只调这个入口**,不内联 handoff 细节。
- cookie 写入也隔离:B 写 host-only;A 写 `Domain=父域`。集中在 `@cloud/permissions` 的 cookie options,一处切。
- ⇒ 将来切 A:改配置开关 + 给 cookie 加 `Domain` + console 端可省 handoff(handoff 端点保留作回落即可),**不动各业务调用点**。

### 9.2 仍需的部署输入(实现时确认)
- `CUSTOMER_APP_URL` / `MERCHANT_APP_URL` 实际取值;merchant app 未建 → 先占位/暂不接 MERCHANT 组。
