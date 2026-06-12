# 进度总览（STATUS）

> 一眼看清:最初目标完成情况 + 过程中的新发现 + 未完成清单。明细见 `gap-analysis.md`,设计见 `domain-model.md`/`api-spec.md`/`logic.md`/`scenarios.md`。
> 验证基线(贯穿):admin+portal `tsc` 无源码错误 · 全仓单测 **464/464** · 真库 **Docker PG16(:5433)** `db:push`+`db:seed` 通过。

## 1. 最初任务目标 —— ✅ 已完成

原始指令:`design-bridge:bridge` 「分析目前 portal 里的代码逻辑,输出 `logic.md`/`api-spec.md`/`domain-model.md`」。

- ✅ `domain-model.md` · ✅ `api-spec.md` · ✅ `logic.md` 三份均产出。
- ➕ 额外:`scenarios.md`(黑盒验收门)、`gap-analysis.md`(现状 vs 目标 + 实施追踪)。
- ⚠️ 范围变更:中途你决定从「忠实现状(option A)」切到「**目标规格**」(Party 命名 + 新 `pep-schema/schema.sql`)。所以这三份现**描述目标设计**;现状与目标的差异落在 `gap-analysis.md`。

**结论:最初的"出文档"目标已达成并超出。** 随后任务自然演进为「按目标规格做实现迁移」(下面 §3)。

## 2. 已完成且验证(实现层)

- ✅ **§3.1 Partner→Party 全量改名**(model/table/column/field;反向关系字段保留 `partner`)。
- ✅ **§3.3 username→email**(删 username、email 唯一、按 email 登录、删 account「改用户名」子功能、session 去 username 用 email/displayName);phone 字段本就有。
- ✅ **§3.6 角色体系**:删 blocklist、`roleType` GLOBAL/PRIVATE(取消 BUILTIN,内置由 roleId≤300 派生)、删 `contract_type`、角色选择 UI 新依据(`listAssignableRoles` = 平台区间死写预置 + party PRIVATE)、role `start/end` 授权窗、会话角色解析分流(≤300 代码注册表 / ≥1001 DB)+ 解耦 contract 过滤。
- ✅ **§3.4 契约 SUSPENDED 行为对齐**(只认 ACTIVE 为 live)。
- ✅ **§3.5 契约事件**:`eventInfo→payload` + 7 值注释(CHECK 限 pep-schema)。
- ✅ **§3.7 删 blocklist 模型** · **§3.9 邀请 `roles→intendedRole` + `inviterPartyId` + FK** · **§3.10/3.11 新建 `SysNotice`/`SysOperationLog`** · **各 FK 补齐** · **契约名 ISO→US-ISO**。
- ✅ **角色注册表管线**(§12-C):`@cloud/platform-config` 支持死写 GLOBAL 角色 + `gen:manifest` 收 `_roles.map.ts` + admin/customer 预置。
- ✅ **新建 `apps/customer` 平台**(脚手架,port 3200)。

## 3. 过程中发现的新问题 / 已做的关键决策

1. **portal 两层**:真实鉴权流(login/mfa/select-party,DB+103NNN)vs **mock 原型桩**(forgot-password/onboarding/oidc/company/sso,走 `@/lib/mock`,无 DB)。
2. **目标登录文档的安全/正确性问题(已逐条决议)**:① 文档"前端用私钥加密"是笔误→应公钥;② 缺"用户不存在"分支 + 锁定提示枚举风险→不存在与密码错归一;③ 时间戳单向且无 nonce→防重放弱→改 nonce(login-challenge)+ 双向窗;④ MFA 双计数器(redis+DB)归零错配→单一 DB 计数器;⑤ schema 注释(60min 锁)与流程文字(删 token 重登)**自相矛盾**→采纳 60min 锁;⑥ 无 MFA 路径漏写;⑦ >1 Party 的 parties 先写后校验时序矛盾;⑧ 多 ACTIVE 因子轮询;⑨ 未选 Party 的 token 权限边界。
3. **目标文档内部不一致**:`sys_notice.status` `READ` vs `READED`(以 schema.sql 的 `READ` 为准)。
4. **契约命名** admin 旧 `ISO/ISV` vs 目标 `US-ISO/US-ISV`(已统一)。
5. **Prisma(db push)表达不了 CHECK**——反复出现:契约类型 7 值 / 状态 / 事件类型 / notice·result 状态 等闭集**只能留 pep-schema DDL**,cloud 侧靠应用层 zod 在写入点强制。
6. **IDENTITY `START 1001` 进不了 Prisma schema**——cloud 靠 `seed.ts` 的 `setval` 兜;pep-schema DDL 层用 `START WITH 1001`。
7. **关系字段 `partner` 保留未改名**(返回 `SysParty`)——刻意,避开裸词替换风险,留小清理。
8. **`mfa_enable=true` 但无 ACTIVE 因子** 的数据不一致——决定:开通/禁用/换绑/重置收口**单一事务**保证原子翻转;登录侧不加防御(落"未配置 MFA"失败安全)。

## 4. 未完成 / 待办清单

### A. 🅱️ 会话架构（方案已定 B，待实现）
- **会话架构 `portalUrl` + 跨 host 落 cookie**(最大架构项)。设计/决策完成,代码未实现。
  - 已定:portalUrl 来源 = 契约类型推 portal 组(MERCHANT/Customer/Admin)+ 禁止跨组重叠 + 共用 `contractGroup` + 兜底 `ADMIN>CUSTOMER>MERCHANT` + per-group env。
  - **已定(2026-06-12):方案 B(泛化 handoff)** —— 一次性 token 走 URL、目标后端写 host-only cookie;cookie 暂沿用 `sid`;实现收口到单一 `entryUrlForParty`+配置开关,将来可快切 A。详见 `session-architecture.md` §9。
  - 待实现:§8 delta(`contractGroup` 真源 + per-group URL + 填 `session.party.portalUrl` + handoff 泛化 + customer/merchant handoff 端点)。现仍写死跳 admin。

### B. ✅ 目标登录行为（本轮已实现,提交 `2d3473d`)
- ✅ **TOTP `step` 30→60**(admin+portal;keyuri 编 period=60,gen/verify/URI 一致)。⚠️ 60s 非主流默认,依赖 App 读 otpauth period。
- ✅ **nonce / `login-challenge` 防重放**:`/auth/server-time`→`/auth/login-challenge`(发 serverTimestamp+nonce、Redis TTL130s);登录包加 `nonce`;`login` GETDEL 消费(重放/过期→`REQUEST_EXPIRED`)。**portal-only**(登录 UI 在 portal;admin 无登录页,未动)。
- ✅ **config 默认** 120s / 60min(maxErrorTimes 本就 6)。
- ✅ **MFA enable/因子 原子翻转**:本就在 `$transaction`(activateEnrollment/disableMfa)内,无需改。
- 🐛 顺手修:`login-screen` POST body `account`→`email`(§3.3 client 侧遗漏,tsc 不校验 body shape)。
- ⏳ 剩 **pep-token + portalUrl 会话架构**(见 A,搁置)。
> 已对齐(无需改):email 登录、双向时间戳、MFA DB 单计数器 + 时间窗锁、公钥解密、选 Party 门禁、角色解析分流。
> **E2E 待跟进**:playwright 登录 spec + `seed-portal-login-tests` 可能仍打 `/auth/server-time` + `{account}`,需改 `login-challenge`/`nonce`/`email`(本机未跑 E2E,未验证)。

### C. 🧩 需功能开发才有意义(不属 schema 迁移)
- **契约管理 CRUD**:entitlements 载荷(按 type 分支、GeoFencing⇐GeoLocation、MERCHANT PKG⇐上游 ISO 授权)、7 值/状态 CHECK 的应用层强制点、PILOT→正式转换、全局唯一 ADMIN 契约、契约事件写入(7 值 + payload 分型 zod)。
- **角色 admin UI**:设置 role `start/end`、平台预置选择(现仅入库 + 生效判定)。
- **`sys_notice` / `sys_operation_log`**:读写 service + 埋点(现为空模型)。
- **onboarding 真实化**:邀请落库 + 激活主体(ONBOARDING→ACTIVE);现 mock。
- **forgot-password 真实化**:`password_history`(5)去重 + 复杂度(12–18 位四类);现 mock。
- **OIDC/SSO**:目标模型未提,**待你定去留**。

### D. 🗂 收尾 / 低优先
- IDENTITY DDL `START 1001`(仅 pep-schema 目标 DDL;cloud 已用 seed setval 兜)。
- 关系字段 `partner`→`party` 命名小清理。
- `select-partner` 路由 URL → `select-party`(api-spec target)。
- `partner-choice(s).ts` 文件名(内部符号已 `PartyChoice`/`isPartySelectable`)。
- 目标文档内部不一致定稿(`READ`)。
- 测试 fixtures 里残留的无害 `username` 多余属性清理(可选)。
