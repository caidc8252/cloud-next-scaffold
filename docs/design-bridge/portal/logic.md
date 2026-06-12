# Logic — portal（登录入口 / 选择 Party）

密码登录、MFA 二次校验、选择 Party 三段如何流转，以及背后的规则与失败。词汇见 `domain-model.md`，线协议与 operationId 见 `api-spec.md`，与当前代码的差距见 `gap-analysis.md`。

> 高度：描述 **what & why**，不写控制流细节。domain-model.md 拥有不变量与状态机，本文件拥有行为（守卫、效果、计算）。错误以 `BusinessError(code, status)` 抛出。

## Operations

### getLoginChallenge
Realizes: `getLoginChallenge`（api-spec.md）
Rule: 下发 `{ serverTimestamp, nonce }`；`nonce` 写 Redis `AUTH:LOGIN-NONCE:{nonce}=1`（TTL 130s）。前端用**公钥**对 `{password, timestamp, nonce}` 整体 RSA-OAEP 加密——nonce 在密文内部不可替换。
Edge cases: 端点按 IP 限流，防 nonce 刷量。

### login
Realizes: `login`（api-spec.md）
Rule: 按 **email** 校验账号与口令；通过后按 `mfaEnable` 分岔——开通则签 `MfaTempToken`、未开通则跳过 MFA 直接【建会话 + 选 Party】。
Sequence:
1. 按 `email` 查 `User`。**「邮箱不存在」与「密码错误」归一**为同一失败（防枚举）。
2. `status != ACTIVE`（LOCKED）→ 失败「账号已锁定」。
3. 刷错锁：`passwordErrorLockExpiredTimestamp` 在未来 → 失败「密码错误超限，稍后再试」。
4. 私钥解密拿 `{password, timestamp, nonce}`；解密/结构失败 → 失败。
5. 时间戳**双向** `|now - timestamp| <= 120s`；`GETDEL AUTH:LOGIN-NONCE:{nonce}` 取不到 → 失败「登录已失效，请重试」（重放/超时）。
6. argon2id 校验：失败 → `passwordErrorTimes+1`，达 **6** 置锁 `+60min`，失败「账号或密码错误」；成功 → 清零计数与锁、写 `lastLoginAt`（**唯一清零点**）。
7. 分岔：`mfaEnable=false` → 跳过 MFA 进【建会话 + 选 Party】；`mfaEnable=true` → 签 `MfaTempToken`（`AUTH:MFA:USER-{tempToken}={userId}`，TTL 300s），返回 `{code:'MFA VERIFY', tempToken}`。
Edge cases: 刷错锁**有意不在过期时清零**——解锁后再错一次立即重锁 60min。

### verifyMfa
Realizes: `verifyMfa`（api-spec.md）
Rule: 凭 `MfaTempToken` 解析 `userId`，对其所有 `ACTIVE` TOTP 因子**轮询**校验（任一通过即过），通过后删 token 进【建会话 + 选 Party】。
Sequence:
1. 读 tempToken → userId；失效 → 失败，重新登录。
2. 取 `MfaInfo where status=ACTIVE`；无 → 失败「未配置 MFA」（失败安全，绝不放行）。
3. TOTP `step=60`，逐一校验任一命中即通过。
4. 通过 → 所有 ACTIVE 因子 `failTimes=0`、删 tempToken → 建会话。
Failures（计数唯一权威 = DB `MfaInfo.failTimes` + `lastFailTimestamp`，无 Redis 计数器）:
- 任一 ACTIVE 因子 `failTimes>=10 && now-lastFailTimestamp<60min` → 锁定「错误过多，60 分钟后再试」（tempToken 保留至 300s 自然过期）。
- 锁过期（`>=10` 但已过 60min）→ 先把所有 ACTIVE 因子 `failTimes=0` 再校验。
- 未达锁的失败 → 所有 ACTIVE 因子 `failTimes+1`、`lastFailTimestamp=now`，失败「验证码错误」。
Edge cases: 真遇到 `mfaEnable=true && 无 ACTIVE 因子`（数据不一致），落第 2 步「未配置 MFA」失败安全，不加额外防御分支。

### selectParty
Realizes: `selectParty`（api-spec.md）
Rule: 用户从可选 Party 中选定一个，算出该 Party 的权限上下文写入会话，按 `portalUrl` 进入控制台。
Sequence:
1. 校验 `partyId ∈ session.parties`（登录收尾时已写入）；不存在 → 失败，重新登录。
2. 按【权限计算】算 `permissions` / `contractTypes` / `portalUrl`，写 `session.party`。
3. 返回 `{ portalUrl }`，前端跳转。
Failures: 选中项不在可选列表 → 失败。

### logout
Realizes: `logout`（api-spec.md）
Rule: 删除 `pep-token` 会话（Redis + cookie），返回登录页跳转；无既有会话也安全返回。

## Shared rules

### 建会话 + 选 Party（登录收尾）
Rule: `login`（无 MFA）与 `verifyMfa`（通过）共用收尾：
1. 建正式 token（UUID），Redis `AUTH:USER-TOKEN:{token}={userId,email,nickName,mfaPassed:true}`，写 cookie `pep-token`。
2. 查 `PartyUser`，条件 `status=ACTIVE && 授权窗有效(from<=now||null, to>now||null)`，且对应 `party.status != ONBOARDING`。**门禁线只看成员/账号状态，不看合同有效性。**
3. 把可选 Party 列表写入 `session.parties`（`{partyId, partyName, status}`），按数量分支：
   - **0** → 返回「你还没加入任何公司」+ 退出按钮。
   - **1** → 直接走 `selectParty` 同样的【权限计算】写 `session.party`，登录成功。
   - **>1** → 返回列表给前端选，前端二次提交 `partyId` 走 `selectParty`。
Used by: `login`、`verifyMfa`（间接 → `selectParty`）

### 权限计算
Rule: `AuthorizingType=ADMIN` → 该 Party 全权限。`NORMAL` → 取 `PartyUser.roles → Role.permissionCodes`，过滤条件：
- 角色 `contractType` 属于该 Party **有效契约类型**集（仅 `ContractStatus=ACTIVE` 且在生效日期窗内的契约；SUSPENDED / 过期排除）；
- 角色自身 `startDate/endDate` 时间窗（按 `Party.timezone` 解读）内有效；
- `GLOBAL` 角色全局可用，`PRIVATE` 角色须 `partyId === 当前 Party`。
**无角色黑名单、无 `*` 通配。** 合同全过期/暂停 → `permissions=[]` / `contractTypes=[]`，须由前端落「合同已过期/暂停」页，而非空白控制台。
Used by: `selectParty`、登录收尾「1 条」分支

## Derived values
- `LoginResult` 形态由 `User.mfaEnable` 派生：true → `{code:'MFA VERIFY', tempToken}`；false → 登录收尾结果。
- `session.party.contractTypes` = 该 Party 当前 `ContractStatus=ACTIVE` 且生效中的契约类型集。
- `session.party.permissions` = 见【权限计算】。
- `session.party.portalUrl` = 该 Party 对应控制台地址，前端据此跳转。

## Reactions
### 操作审计
Trigger: 登录成功 / 失败、选 Party、登出等状态相关动作
Effect: 写 `OperationLog`（`traceId`/`operatorUserId`/`partyId`/`action`/`result`/`failureReason`），用于审计与链路关联。Failures: best-effort，不回滚主流程。

## 配置常量（已定调）
`LOGIN_WINDOW_SECOND=120`（双向）、`LOGIN_ERROR_TIMES=6`、`LOGIN_LOCK_WINDOW_MINUTE=60`、TOTP `step=60`、`MFA_ERROR_TIMES=10`、`MfaTempToken` TTL `300s`、`LoginChallenge nonce` TTL `130s`。

## Role / Permission / Menu 约定（已定调）

**三者关系**
- **menu + permission 死写在代码**：各 app 的 `apps/{app}/manifest/_menu.map.ts` 导出 `appManifest({ contractKeys, menus })`；permission 内嵌在 menu 条目（`permissions:[{code,label,desc}]`）。`menuCode`/`permissionCode` **全局唯一**。`gen:manifest` 收集各 app → `_generated/apps.ts` 全局池，经 `@cloud/platform-config` `getMenus(contracts)` 按契约过滤。
- **role 与 contract 解耦**：role 只是「权限码集合」，**不带 contractType、不按 contract 过滤**。
- **契约门控只在菜单层**：`menu.contractTypes` 决定某 Party 当前契约下可见的菜单 → 权限作用域。**有效权限 = `role.permissionCodes` ∩ 当前契约点亮的菜单作用域**（`resolveEffectivePermissions`）；`AuthorizingType=ADMIN` 直接拿作用域内全部。

**role 两类 + roleId 区间**
- `GLOBAL`（通用）：**死写在代码**（各 app `manifest`，与 menu 同管线由 `gen:manifest` 收集），**不进 DB、不可改不可删**，`party_id` 空。
- `PRIVATE`（指定）：ADMIN 在 admin 平台为某 customer **动态创建**，落 DB `sys_role`，`party_id` 指向该 customer。
- **roleId 区间（死写约定，需落 schema 注释）**：`1–100` admin / `101–200` customer / `201–300` merchant 预留 / **`≥1001` 动态 PRIVATE**（DB IDENTITY 从 1001 起）。
- 「内置/不可删/只读」由 `roleId ≤ 300` 派生，**不用单独 `BUILTIN` 枚举**（`roleType` 仅 `GLOBAL|PRIVATE`）。
- 每平台一个「类 ADMIN 全权限角色」（roleId `1` / `101`）：靠 `AuthorizingType=ADMIN` 运行时全量，`permissionCodes` 留空。

**预设角色（初版）**

| roleId | 平台 | roleType | 角色 | 权限 |
|---|---|---|---|---|
| 1 | admin | GLOBAL | Administrator | 全部（ADMIN 全量，codes 留空） |
| 2 | admin | GLOBAL | Operator | `dashboard:view` + `*.VIEW`（按需） |
| 101 | customer | GLOBAL | Customer Administrator | 全部（ADMIN 全量，codes 留空） |
| 102+ | customer | GLOBAL | （运营/只读等） | 待 customer 菜单/权限补全后填码 |
| 201–300 | merchant | GLOBAL | （预留） | — |
| ≥1001 | — | PRIVATE | ADMIN 为某 customer 定制 | admin 角色界面配置 |

**会话角色解析（分流）**：`PartyUser.roles=[{roleId}]` → `roleId ≤ 300` 从**代码注册表**解析、`≥ 1001` 从 **DB `sys_role`** 解析，合并后过 `resolveEffectivePermissions`。

**邀请**：admin 邀请 customer 操作员时，角色选择器列 `101–200` 死写预设，落 `OperatorInvite.intendedRole=[{roleId}]`。

## 其余 portal 流程（规格待定）
邀请入驻（OperatorInvite → 激活 Party 由 ONBOARDING→ACTIVE）、找回密码（含 `passwordHistory` 5 条去重 + 复杂度 12–18 位四类字符）、OIDC/SSO：目标域已有数据支撑（见 domain-model.md），但 API 与流程规格尚未评审定调，待后续补。
