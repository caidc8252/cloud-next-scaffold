# 差距分析 — 目标模型（新 domain-model + schema.sql）vs 当前实现（portal 代码）

## 1. 范围与方法

- **目标（desired）**：新版数据模型文档 + 最新 `/Users/tymon/11-git/pep-schema/postgresql/schema.sql`（PostgreSQL，10 张 `sys_*` 表）；本目录 `domain-model.md` / `api-spec.md` / `logic.md` 已按此目标规格产出。
- **当前（current）**：`apps/portal` 实际代码 + `packages/db/prisma/schema.prisma`。
- **比较对象**：数据模型（表/字段/约束/枚举）、登录与 MFA 流程逻辑、选 Party 与会话架构、角色与权限、契约管理、新增实体、命名级联。
- **说明**：目标文档覆盖了大量 **admin/平台侧**（契约管理、entitlements、证书签名、菜单组装）能力，这些在当前 portal 中**根本未实现**——portal 只做登录前/登录中流程。下文对此类一律标注「未实现（admin 域）」，区别于「实现了但与目标冲突」。

### 严重度图例
- 🔴 **冲突**：当前代码已实现，但与目标语义直接矛盾，改动有破坏性。
- 🟠 **缺口**：目标要求、当前完全没有（需新建）。
- 🟡 **偏差**：方向一致但细节/取值/命名不同，改动较轻。
- 🟢 **一致**：已对齐，无需改动。

---

## 2. 结论速览

| # | 主题 | 当前 | 目标 | 严重度 |
|---|------|------|------|--------|
| 1 | **Partner → Party 全局改名** | `sys_partner*` / `partnerId` | `sys_party*` / `party_id` | 🔴 级联 |
| 2 | **登录标识** | 按 `username`（唯一）登录 | 按 `email`（唯一）登录，**无 username** | 🔴 |
| 3 | **TOTP Time Step** | `step = 30s` | `Time Step = 60` | 🔴 |
| 4 | **MFA 锁定行为** | 失败≥10 在锁窗内 → 返回 423，不删 token | 失败≥10 → 删 redis token + 重置 failTimes + **强制重新登录** | 🔴 |
| 5 | **会话与跳转架构** | 建 `@cloud/permissions` 会话 + **跨 host 交接到 admin**（handoff token） | redis `pep-token` cookie + 每 Party 的 `portalUrl` 前端跳转 | 🔴 |
| 6 | **角色黑名单** | `sys_partner_role_blocklist` + `selectApplicableRoles` 用 blocklist 过滤 | **无黑名单表**；靠 role 自身 start/end + 契约类型 + GLOBAL/PRIVATE | 🔴 |
| 7 | **角色契约通配** | `role.contractType === "*"` 通配所有 | **无通配**，contract_type 受 7 值 CHECK 约束 | 🔴 |
| 8 | **契约类型** | 开放 `VarChar(20)`（示例 ISO/ISV/CUSTOM） | 7 值 CHECK：ADMIN/US-ISO/US-ISV/US-ISO-PILOT/US-ISV-PILOT/MERCHANT/PLATFORM-CUSTOM | 🟠 |
| 9 | **契约状态机** | `ACTIVE / TERMINATED` | `ACTIVE / SUSPENDED / TERMINATED`（新增 SUSPENDED） | 🟠 |
| 10 | **全局唯一 ADMIN 契约** | 无 | partial unique index 兜底 | 🟠 |
| 11 | **角色授权窗** | `sys_role` 无 start/end | `sys_role` 新增 `start_date` / `end_date` | 🟠 |
| 12 | **role_type 规范** | 字符串，示例含 PRIVATE | `GLOBAL`/`PRIVATE` + CHECK（GLOBAL→party_id NULL，PRIVATE→NOT NULL） | 🟡 |
| 13 | **站内消息 sys_notice** | 无 | 新建表 + 多类型 payload | 🟠（admin/portal 共用） |
| 14 | **操作日志 sys_operation_log** | 无 | 新建表（审计） | 🟠 |
| 15 | **契约事件类型** | 自由字符串（AUTHORIZED/…） | 7 值 CHECK，含 `PILOT_CONVERT_ACTIVE` | 🟡 |
| 16 | **邀请表字段** | `roles`，status 含 EXPIRED/REVOKED | `intended_role` + `inviter_party_id`，status 仅 PENDING/CONSUMED | 🟡 |
| 17 | **User 字段** | 有 `username`；无 phone | 无 username；加 `phone_country_code`/`phone`；`email` UNIQUE | 🟠 |
| 18 | **时间戳新鲜度** | 双向 `|now-ts| <= window` | 单向 `ts < now-120s` 才过期 | 🟡 |
| 19 | **登录配置常量** | 来自 `getAuthConfig()`（值未知） | 明确：120s / 6 次 / 60min / MFA 10 次 | 🟡 |
| 20 | **密码复杂度/历史** | 未见前端校验规格；history 字段在 | 12–18 位 + 四类字符；history 留 5 条 | 🟡 |
| 21 | **password 算法** | argon2id | argon2id | 🟢 |
| 22 | **存储模块 storage_*** | 有 `storage_object`/`storage_attachment` | 本 schema 文件未含（属另一模块） | 🟢（范围外） |

---

## 3. 数据模型差距（表级）

### 3.1 命名级联：Partner → Party ✅（已完成）
**已落地（脚本化 perl 改名，仅复合标识符，不碰裸 `partner`/`partners` 自由文本）：**
- `packages/db/prisma/schema.prisma`：模型 `SysParty*`、表 `@@map("sys_party*")`、列 `@map("party_*")`、字段 `partyId/partyName/...`；正向关系字段 `partyUsers` 等改名；**单数反向关系字段保留叫 `partner`**（返回 `SysParty`，轻微命名不一致，留待小清理）。
- `pnpm db:generate` 重生成 `packages/db/generated/prisma/*`（清空旧目录避免残留 `SysPartner*.ts`）。
- 60 个源文件批量改名（apps/admin、apps/portal、packages/permissions、seed/scripts）。
- **验证**：admin+portal `tsc` rc=0；**全仓单测 468/468 通过（77 文件）**；源码残留 `SysPartner/partnerId/...` = 0；i18n/营销文案/注释里的 `partner(s)` 零误伤。
- **未做**：`select-partner` 路由 URL（属 api-spec target，单独）、`partner-choice(s).ts` 文件名（保留 kebab，内部符号已改 `listPartyChoices`/`isPartySelectable`/`PartyChoice`）、反向关系字段 `partner`→`party`。

下表为原始改名映射（保留备查）：

| 当前 | 目标 |
|------|------|
| `sys_partner` / `SysPartner` / `partnerId` / `partnerName` | `sys_party` / `party_id` / `party_name` |
| `sys_partner_contract` / `SysPartnerContract` | `sys_party_contract` |
| `sys_partner_contract_event` | `sys_party_contract_event` |
| `sys_partner_user` / `SysPartnerUser` | `sys_party_user` |
| `sys_partner_role_blocklist` | **删除**（见 3.6） |

> 影响面：`auth.repository.ts`、`session-snapshot.ts`、`partner-choices.ts`、`partner-choice.ts`、`role-selection.ts`、所有 `partnerId` 入参/VO、`/select-partner` 页面与接口、本目录三份文档。属一次性大范围重命名，建议脚本化 + 全量回归。

### 3.2 sys_party 🟡
- 目标 `status` CHECK 仅 `ONBOARDING / ACTIVE`（语义：未绑管理员 / 首个管理员绑定后转 ACTIVE）。当前 Prisma 为开放字符串、默认 `ONBOARDING`，方向一致。
- 目标新增**活跃 email 部分唯一倾向**索引（`idx_sys_party_email_active`，非唯一索引仅 WHERE active），当前无。
- 字段命名 `phone_country_code`（= CALLING CODE）两侧一致。

### 3.3 sys_user ✅（username→email 已完成）
> **已落地（A–G 全做）**：
> - **Schema**：`SysUser` 删 `username`、`email` 加 `@unique`；重生成 client。
> - **登录核心**：portal+admin `findUserByUsername`→`findUserByEmail`、`auth.service` 按 `input.email` 查、`loginSchema` `account`→`email`（加 `.email()`）。
> - **会话**：`Session`/`PartialSession` 去 `username`（`PartialSession` 改带 `email`）；session-snapshot 两 app 删 `username`；`dal.getPartialSession` 返回 email；UI（admin layout/dashboard/locked、portal select-partner）改用 `email`/`displayName`。
> - **account「改用户名」子功能整块删除**：route `/api/account/username`、`changeUsernameSchema`+type、`changeUsername` service、`account.repository.findUserByUsername`、`AccountProfile.username`、profile-page 用户名行+按钮、identity-change-flow 的 username 模式（简化为 email-only）、`requestCodeSchema` 去 `USERNAME_CURRENT`、account.service 相关 import。
> - **users 列表**：`loginName` 改由 `email` 撑。
> - **显示名**：roles/users `resolveUsernames` select `nickName`、`session.username`(updatedBy/inviter)→`session.displayName`；storage uploader `nickName || username`→`nickName`。
> - **seed**：`seed.ts` + `seed-portal-login-tests.ts` upsert 改按 `email`、去 username 列。
> - **验证**：admin+portal `tsc` 无源码错误（仅 `.next` 残留的已删 route 类型，重建即清）；**全仓 464/464 通过**（较前 -4 = 删掉的 changeUsername 用例）。phone 字段（§3.3 phone 部分）本就存在。
> - 残留：测试 fixtures 里若干 `username` 仅是 cast 对象上的无害多余属性；i18n 的 username 文案键已不再被引用（保留无害）。
- 🔴 **去掉 `username`**：目标 `sys_user` 无 username 列，登录主键是 `email`（`uk_sys_user_email` UNIQUE）。当前 `SysUser.username @unique`、登录走 username，且 `email` **无唯一约束**。需要：去 username、给 email 加 UNIQUE、登录改 email。
- 🟠 新增 `phone_country_code` / `phone`。
- 🟡 `status` CHECK = `ACTIVE / LOCKED`（明确「LOCKED 由 ADMIN 平台锁定」）；当前登录用 `!== ACTIVE` 判停用并报 `ACCOUNT_DISABLED`，目标语义是 LOCKED→「账号已锁定」。错误码语义需对齐。
- 🟢 `password_history` JSONB（留 5 条）、`password_error_times`、`password_error_lock_expired_timestamp`、`mfa_enable` 两侧一致。

### 3.4 sys_party_contract 🟠🔴（SUSPENDED 行为已对齐）
> **已落地（cloud 侧）**：Prisma（db push）**表达不了 CHECK**，故 7 值 / 状态 CHECK 仅存于 pep-schema 目标。行为上「SUSPENDED 不算 live 契约」已对齐：登录/选 Party 的合同有效性早已 `status:"ACTIVE"`（天然排除 SUSPENDED）；`account.repository.listActiveContractTypes` 由 `status:{not:"TERMINATED"}` 改为 **`status:"ACTIVE"`**（SUSPENDED 不再计入派生的 contractTypes）。验证：tsc rc=0、全仓 468/468 通过。
> **仍待**：7 值 / 状态 CHECK 待契约管理功能落地时在应用层（zod）补；effective 日期 UTC 秒级口径（🟡）；entitlements 载荷（admin 域）。
- 🟠 `authorized_contract_type` 由开放字符串收紧为 **7 值 CHECK**。
- 🟠 `status` 新增 **SUSPENDED**（`ACTIVE/SUSPENDED/TERMINATED`）。**对 portal 直接有影响**：当前 `selectPartner` / 合同有效性只认 ACTIVE/非 ACTIVE，未排除 SUSPENDED 之外的语义；引入 SUSPENDED 后选 Party 的可用判定需把 SUSPENDED 视为不可用。
- 🟠 新增约束：`uk_sys_party_contract_admin_singleton`（全局唯一 ADMIN 契约）、`chk_..._terminated_consistency`（TERMINATED ⇔ terminated_at 非空）、`chk_..._effective_range`。
- 🟡 effective 日期语义：目标明确 START=Party 时区当天 00:00:00→UTC、END=当天最后一秒→UTC。当前 `contract-validity.ts` 走「按 Party 时区取今天的 date 字符串做闭区间比较」，结果通常一致，但实现口径不同（字符串日 vs UTC 秒级边界），需统一。
- 🟢 `entitlements` / `logos` JSONB 字段存在；其**详细载荷规格**（按 contract_type 分支、GeoFencing 依赖 GeoLocation、MERCHANT 的 PKG 来源于上游 ISO 授权等）当前**完全未实现**（admin 域）。

### 3.5 sys_party_contract_event ✅（cloud 侧已尽可能对齐）
> **已落地（薄）**：`SysPartyContractEvent` 字段 `eventInfo`→`payload`（`@map("payload")`，与目标/domain-model 命名一致；无代码引用、表空，安全）；模型注释记录 **7 值闭集**（CREATE_CONTRACT/EDIT_CONTRACT/RENEW/SUSPEND/RESUME/TERMINATE/PILOT_CONVERT_ACTIVE）+ payload 分型指向 domain-model.md。tsc + 测试通过、真库 `db:push` in-sync。
> **本质限制**：cloud 用 Prisma db push **表达不了 CHECK**，7 值约束只能留 pep-schema DDL；且 cloud **无契约事件写入点**（无契约管理功能）。故 cloud 侧到此为止——真正的取值强制 + payload 分型 zod 待**契约事件写入功能**落地时在 service 层做（那才是自然的强制点）。
- 目标 `event_type` 收紧为 7 值 CHECK，含 **`PILOT_CONVERT_ACTIVE`**；payload 按类型分支（CREATE/EDIT/RENEW/SUSPEND/RESUME/TERMINATE）。当前为自由字符串、示例词汇不同（AUTHORIZED/TERMINATED/RENEWED）。属 admin 域写入，portal 不产生事件。

### 3.6 sys_role 🔴🟠🟡
- ✅ **`start_date` / `end_date` 角色授权窗（已完成）**：`SysRole` 加 `startDate`/`endDate`（`@db.Date`，可空=无界）；会话 NORMAL 分支按 party 时区今天用 `isContractEffective(startDate,endDate,today)` 过滤 DB PRIVATE 角色（GLOBAL 代码角色无窗、恒生效），`buildCurrentContext` 加 `now` 参；admin+portal 同改。tsc + 464/464 + 真库 `db:push`(additive in-sync)+`db:seed` 通过。**待补**：admin 角色 CRUD UI 设置 start/end（现仅入库 + 生效判定，创建默认 null=无界）。
- 🟡 `role_type` 规范为 `GLOBAL / PRIVATE` + CHECK + party_id 一致性（GLOBAL↔NULL，PRIVATE↔NOT NULL）。当前代码把 `roleType === "PRIVATE"` 限定到 partnerId，但未形式化 GLOBAL。
- 🔴 **无 `contract_type = "*"` 通配**：目标 contract_type 受 CHECK 约束在 7 值内，当前 `selectApplicableRoles` 的「`*` 通配匹配所有合同类型」逻辑在目标里没有对应物，需移除或改写为显式多类型。
- 🟢 `permission_codes` JSONB + GIN 反查（「按 permission code 查 role」）两侧一致。

### 3.7 sys_party_role_blocklist ✅（已删除）
> **已落地**：`role-selection.ts` 的 blocklist 分支早已下线（见 §12-D 项3）；本次从 `packages/db/prisma/schema.prisma` 删除 `SysPartyRoleBlocklist` 模型 + `SysParty.roleBlocklists` / `SysRole.roleBlocklists` 两个反向关系字段，`db:generate` 重生成（无 `SysPartyRoleBlocklist.ts`），并清掉 `session-snapshot.test` 里的 mock。验证：源码零残留 `RoleBlocklist`、tsc rc=0、全仓 468/468 通过。
- （原始结论）目标用「角色自身 start/end + GLOBAL/PRIVATE 归属」决定可用角色，取消黑名单机制。

### 3.8 sys_mfa_info 🟡
- 字段两侧基本一致（`fail_times`、`last_fail_timestamp`、`status ACTIVE/PENDING`、`secret_encrypted`）。
- 🟡 目标只建 `idx_sys_mfa_info_user`；当前 Prisma 额外有 `(userId, status)` 复合索引。无害差异。
- 注：目标注释「失败超 10 次锁 60 分钟（应用层）」与当前阈值 10 一致，但**锁的处置方式不同**（见 §5）。

### 3.9 sys_operator_invite ✅（字段已对齐）
> **已落地**：`SysOperatorInvite` 字段 `roles`→`intendedRole`（`@map("intended_role")`，与 `SysPartyUser.roles` 同名但**只改邀请这一处**，手术式）、新增 `inviterPartyId`（`@map("inviter_party_id")`，**暂不加 Prisma 关系/FK**——避免与 `partyId` 形成双 SysParty 关系的命名复杂度，FK 延后，与 operation_log 同口径）。`createInvite` 写 `inviterPartyId: partyId` + `intendedRole`；`setInviteRoles` 写 `intendedRole`；mapper `InviteRow.intendedRole` + `toClientInvite` 读 `row.intendedRole`；tests 同步。验证：tsc rc=0、468/468 通过。
> **未做**：status 收窄 PENDING/CONSUMED（cloud 无 CHECK，代码本就只用这两值，过期由 `expiresAt` 计算，无 EXPIRED/REVOKED 写入）；onboarding 真实落库（仍 mock）。
> **✅ 补 FK（后续）**：`inviterPartyId` 已加 `inviterParty SysParty @relation`（FK）。因 SysOperatorInvite 对 SysParty 现有两条关系，命名为 `partner @relation("invitedParty")`（级联删）+ `inviterParty @relation("inviterParty")`（仅引用）；SysParty 反向 `operatorInvites`/`invitesSentFromParty`；加 `@@index([inviterPartyId])`。真库 `db:push`（加 FK，邀请表空无冲突）+ `db:seed` 通过。**全仓其余 id 列 FK 均已到位**（契约 authorized/authorizing/terminatedBy、event→contract、role→party、party_user、storage、notice、invite→party/user）；`sys_operation_log` 刻意无 FK（append-only 审计，与目标一致）。
> 注：`sys_user` 的 `phoneCountryCode`/`phone`（§3.3 phone 部分）**早已存在**，无需新增。
- 🟡 新增 `inviter_party_id`（邀请者所属主体）。
- 🟡 字段名 `roles` → `intended_role`（JSONB List<{roleId}>）。
- 🟡 `status` 收窄为 `PENDING / CONSUMED`（去掉当前的 EXPIRED/REVOKED）；过期改为由 `expires_at < now()` 计算，新增 `chk_..._status_consistency`（CONSUMED⇔consumed_at 非空）。
- 注：目标 UNIQUE 仅 `token`（全局唯一）；语义「可用 = PENDING && expires_at>=now」「过期 = PENDING && expires_at<now」。当前 onboarding 接口是 **mock 桩**，无真实邀请校验（见 §7）。

### 3.10 sys_notice ✅（已建）
> **已落地**：`packages/db/prisma/schema.prisma` 新增 `SysNotice` 模型（UUID PK、`user`→SysUser CASCADE、`belongToParty`→SysParty?、status 默认 UNREAD、payload JSONB、(userId,status)+belongToPartyId 索引）+ SysUser/SysParty 加 `notices` 反向关系。CHECK(UNREAD/READ) 由应用层保证（Prisma 不表达 CHECK）。`db:generate` 生成 `SysNotice.ts`；tsc rc=0、468/468 通过。**待接埋点/读写 service + payload 分类型规格**才有业务价值。

### 3.10（原始）sys_notice 🟠
- 全新站内消息表：`user_id` / `belong_to_party_id` / `notice_type` / `title` / `payload`(必含 content) / `status UNREAD|READ`。
- 多种 payload 类型：TICKET / NEW APP VERSION / APP SUBSCRIPTION。
- 当前无任何对应。注：目标 schema CHECK 写 `READ`，而 domain-model 正文写 `READED`，**目标文档内部不一致**，落地前需定稿（建议 `READ`）。

### 3.11 sys_operation_log ✅（已建）
> **已落地**：新增 `SysOperationLog` 模型（UUID PK、**无 FK**=append-only 审计、`party_id`/`operator_user_id` 仅冗余、result SUCCESS/FAILURE 应用层保证、detail JSONB、trace + (partyId,creTime desc) 索引）。`db:generate` 生成 `SysOperationLog.ts`；tsc rc=0、468/468 通过。**待在各操作落埋点**才有审计价值。

### 3.11（原始）sys_operation_log 🟠
- 全新审计日志表：`trace_id` / `operator_user_id`(可空) / `operator_nick_name`(冗余) / `operator_ip` / `party_id` / `action`(可复用 permission code) / `title` / `detail` JSONB / `result SUCCESS|FAILURE` / `failure_reason`。只写不改。
- 当前无对应。portal 的登录/选 Party 等动作未来需补埋点。

### 3.12 storage_object / storage_attachment 🟢（范围外）
- 当前 Prisma 有这两表；目标 schema.sql 模块头明确范围为 Party/Contract/Role/User/MFA/Invite/Notice/OperationLog，**未包含存储模块**。判定为**本次范围外**，非删除，无需在本差距中处理。

---

## 4. 登录流程逻辑差距

| 环节 | 当前（logic.md / 代码） | 目标（新 domain-model） | 差距 |
|------|------------------------|------------------------|------|
| 查用户 | 按 `username` | 按 `email` | 🔴 改键 |
| 账号状态 | `status !== ACTIVE` → `403 ACCOUNT_DISABLED` | `status != ACTIVE` → 「账号已锁定」（LOCKED 语义） | 🟡 文案/码语义 |
| 刷错锁判定 | `lockExpired > now` → 锁定（只看时间戳） | `lock_expired != null && lock_expired > now()` → 锁定 | 🟢 一致 |
| 解密 | RSA-OAEP 解 `{password,timestamp}` | 同（指定私钥解密） | 🟢 一致 |
| 时间戳 | 双向 `|now-ts| <= windowMs` | 单向 `ts < now-120s` 才超时 | 🟡 当前会额外拒绝「未来时间戳」，目标不拒 |
| 密码校验 | argon2id `verifyPassword` | argon2id | 🟢 一致 |
| 失败累计 | +1，达 `maxPasswordErrorTimes` 置锁 `+lockDurationMinutes` | +1，达 **6** 置锁 **+60min** | 🟡 取值需确认（见 §8） |
| 成功清零 | 唯一清零点：times=0、lock=null、写 lastLogin | 同 | 🟢 一致 |
| MFA 分岔 | `mfaEnable` → 签 `MfaLoginToken`(Redis,300s) 返回 `{mfaRequired,mfaToken}` | `mfaEnable` → `tempToken` 存 `AUTH:MFA:USER-{tempToken}`，返回 `{code:'MFA VERIFY',tempToken}` | 🟡 形态/键名不同，机制相近 |
| 无 MFA 直登 | 走「登录收尾」建会话 + 交接 | 直接建正式 token、缓存账号/权限 | 🔴 架构不同（见 §6） |

---

## 5. MFA 校验逻辑差距 🔴

| 项 | 当前 | 目标 |
|----|------|------|
| TOTP 步长 | **30s**（`totp.ts` step=30） | **60s**（Time Step=60） |
| 因子查询 | 所有 `ACTIVE` TOTP，任一验过即通过 | `MFA INFO.status=ACTIVE` 取密钥校验 |
| 失败计数位置 | 仅 DB `sys_mfa_info.fail_times`（时间窗内累计） | redis `mfaObj.errorTimes` **与** `mfaInfo.fail_times` 双写 |
| 阈值 | 10 | 10（`MFA_ERROR_TIMES`） |
| 达阈值处置 | 返回 `423 MFA_LOCKED`（锁窗内），**保留 tempToken**，锁窗过期后自动清零再放行 | **删除 redis tempToken** + 重置 `fail_times=0` + 报「错误次数太多，重新登录」（**强制回到密码登录**） |
| 成功 | 清 `fail_times`、删 tempToken、建会话 | 清 `fail_times`、建正式 token、写 `pep-token` cookie |
| 锁的"时间窗" | 用 `lockDurationMinutes` 做时间窗锁 | 目标无"锁窗"概念，直接「超限即作废 token 重登」 |

> 这是行为层面的实质差异：当前是**带时间窗的软锁**（同一 tempToken 等锁过期可再试），目标是**硬截断**（超限即销毁 tempToken，必须重新走密码）。两者不可简单互换，需按目标重写 `verifyMfa`。

---

## 6. 会话与跳转架构差距 🔴

| 维度 | 当前 | 目标 |
|------|------|------|
| 会话载体 | `@cloud/permissions` 的 `createSession`/`updateSession`（`sid`） | redis `AUTH:USER-TOKEN:{uuid}`，cookie 名 **`pep-token`** |
| 跨域进入 | portal 建会话后**签一次性 handoff token，跳 `{ADMIN_APP_URL}/api/auth/session-handoff`**，由 admin host 写 cookie | 每个 Party 带 **`portalUrl`**，前端拿到后自行跳转 |
| 选 Party 入口判定 | `listPartnerChoices` + `isPartnerSelectable`（partnerStatus ACTIVE && userStatus ACTIVE && validContract） | `PARTY USER.status=ACTIVE && 授权窗有效` 即纳入列表；合同有效性只影响该 Party 的 permissions/contractTypes 计算 |
| 0 个可选 | currentPartnerId=null → 跳 `/select-partner`（空列表） | 明确返回「你还没加入任何公司」+ 退出按钮 |
| 1 个可选 | 自动定 + 签 handoff token 直达 admin | 直接读该 Party，算 permissions+contractTypes+portalUrl，登录成功 |
| >1 可选 | 去 `/select-partner` 选择 | 返回 Party 列表，前端选，后端校验 partyId ∈ redis.parties |
| 权限计算 | 会话快照 `selectApplicableRoles`（含 blocklist + `*` 通配） | `party.roles → role.permission`，再按 `contractTypes` 过滤有效 permission（**无 blocklist、无通配**） |

> 关键分歧：当前是**多 host（portal→admin 交接）**架构；目标是**单 token + 每 Party portalUrl 前端跳转**。这影响登录收尾、cookie、跨域策略、`platform-routing.ts` 全部逻辑。需产品确认最终架构后再动。

---

## 7. 原型桩 vs 目标真实流 🟠

当前以下端点是 **mock 桩**（`@/lib/mock/store`，无 DB、无校验），目标要求真实实现：

- **forgot-password**（send-code/verify-code/reset）：目标域模型未直接描述找回密码流程，但 `password_history`（5 条）+ 密码复杂度规则需在 reset 时生效；当前全是 canned `{ok:true}`。
- **onboarding**（invite/register/signin/accept）：目标有完整 `sys_operator_invite` 语义（7 天有效、PENDING/CONSUMED、intended_role、邀请激活主体使 Party 由 ONBOARDING→ACTIVE）。当前 onboarding 接口只读 mock invite，不落库、不激活主体。**首个管理员邀请激活主体**这一关键业务当前未实现。
- **OIDC / company / sso-domains / idp-accounts**：目标域模型未提 SSO/OIDC，疑似当前 portal 的探索性原型，需产品确认是否保留/纳入目标。

---

## 8. 配置常量对照 🟡

| 常量 | 目标值 | 当前 | 待办 |
|------|--------|------|------|
| 登录时间戳窗口 | `LOGIN_WINDOW_SECOND = 120` | `timestampWindowMs`（值未知，且双向） | 确认并改单向 120s |
| 密码错误锁阈值 | `LOGIN_ERROR_TIMES = 6` | `maxPasswordErrorTimes`（值未知） | 对齐 6 |
| 密码锁时长 | `LOGIN_LOCK_WINDOW_MINUTE = 60` | `lockDurationMinutes`（值未知） | 对齐 60 |
| MFA 错误阈值 | `MFA_ERROR_TIMES = 10` | 硬编码 10 | 一致，建议提为配置 |
| MFA tempToken TTL | 文档未明示（当前 300s） | 300s | 确认 |
| TOTP step | 60 | 30 | 改 60 |

---

## 9. 影响面与建议推进顺序

1. **先定架构（§6）**：单 token+portalUrl vs portal→admin 交接，是最大分叉，决定后续大量代码走向。建议产品/架构先拍板。
2. **数据层改名与约束（§3.1–3.7）**：Partner→Party 改名 + 契约类型/状态 CHECK + 删 blocklist + 角色加 start/end + email 唯一/去 username。建议生成一份迁移（可用 `design-bridge:schema-migrate` 把目标 schema.sql 与当前 Prisma 对齐成迁移脚本）。
3. **登录/MFA 行为对齐（§4–5）**：email 登录、TOTP 60s、MFA 硬截断、时间戳单向、常量对齐。
4. **角色权限重算（§3.6–3.7、§6）**：移除 blocklist 与 `*` 通配，加入角色时间窗，按 contractTypes 过滤 permission。
5. **补真实流（§7）**：onboarding 邀请激活主体落库、forgot-password 真实化。
6. **新增审计与消息（§3.10–3.11）**：sys_notice、sys_operation_log 及埋点。
7. **admin 域契约/entitlements/证书**：体量最大、当前完全空白，单独立项。

## 10. 登录链路 — 已定调决议（评审结论）

以下登录/MFA/选 Party 相关项已逐条评审定调，目标设计完整写在 `logic.md` 的「目标版登录链路（已定调）」节。本节只记结论与对应的差距项。

| 决议 | 结论 | 影响 gap 项 |
|------|------|------------|
| 公钥 vs 私钥加密 | 前端**公钥**加密、后端私钥解密；目标文档「私钥加密」是笔误，已澄清 | §4 |
| 用户不存在分支 | 「邮箱不存在」与「密码错」**归一**报「账号或密码错误」防枚举；LOCKED 维持明确提示 | §4 |
| 防重放 | 改 **`/auth/login-challenge` 下发 nonce + GETDEL 单次消费**，时间戳改**双向** 120s 窗口（详见 logic.md） | §4、§8 #18 |
| MFA 锁定（解决目标内部矛盾） | schema 注释（60min 锁）与流程文字（删 token 重登）冲突 → 采纳 **DB 单一计数器 + 60min 时间窗锁**，**去掉 Redis 计数器**；理由：密码已过的前提下，「删 token 重登」给攻击者近乎无限 TOTP 爆破 | §5、#4 |
| MFA 一致性 | `mfa_enable` 与因子 ACTIVE/作废**同一事务、单一写入口**；登录侧不加防御分支（过度防御），异常态落「未配置 MFA」失败安全 | §3.8、§5 |
| TOTP 步长 | 30s → **60s** | §5 #3 |
| 多 ACTIVE 因子 | **轮询**，任一验过即通过 | §5、§3.8 #8 |
| 无 MFA 路径 | 目标文档漏写：无 MFA 直接跳过、后续选 Party 逻辑**完全复用**；正式 token 在查 PARTY USER 列表前就建好 | §4、§6 #5 |
| 选 Party 门禁线 | 门禁 = **成员/账号状态**（LOCKED 排除）；**合同有效性不作门禁**，过期/SUSPENDED 可登录但 `permissions=[]`，**必须配「合同已过期/暂停」落地页**；列表排除 `party.status=ONBOARDING` | §6 #6 |
| >1 条二次提交时序 | parties **先写 redis 再校验**（首次返回列表即写入） | §6 #7 |
| 未选 Party 的 token 边界 | 中间态 `pep-token` 无权限，只能调「选 Party」 | §6 #9 |
| 刷错锁过期不清零 | **有意**，解锁后再错一次即重锁；仅登录成功清零 | §4 #10 |
| 会话/跳转架构 | 改为目标的 **`pep-token` cookie + 每 Party `portalUrl` 前端跳转**（取代 portal→admin handoff） | §6 #5 |

> **新增要求（落地清单）**：MFA 的开通/禁用/换绑/管理员重置必须收口到**单一事务服务**，保证 `mfa_enable` 与因子 `status` 原子翻转——这是不依赖登录侧防御分支的前提。

## 11. 待澄清（unverified — needs human）

- OIDC/SSO（§7）：目标模型未提，是否纳入/保留？
- `getAuthConfig()` 当前实际值（§8）是否已等于 120/6/60？需读 config 实现确认（目标值已定调，需核对现状）。
- 目标文档内部不一致：`sys_notice.status` 是 `READ` 还是 `READED`（§3.10，建议以 schema.sql CHECK 的 `READ` 为准）。
- 契约 effective 日期：是否要从「时区 date 字符串比较」切到「UTC 秒级边界」（§3.4）。
- forgot-password 真实化时 `password_history`（5 条）去重与密码复杂度（12–18 位 + 四类字符）的落地（§7、§8 #20）。

## 12. Role / Permission / Menu + customer 平台 改造点（实施清单）

定调结论见 `logic.md`「Role / Permission / Menu 约定」。落地拆成四块：

### A. 新建 `apps/customer` 平台（✅ 本次已脚手架）
- 已建：`package.json`(port 3200) / `tsconfig.json` / `next.config.ts` / `next-env.d.ts` / `app/{layout,page,globals.css}` / `i18n/{request.ts,messages/*}` / `manifest/{_menu.map.ts,index.ts,select.ts}`；已加入 `pnpm-workspace.yaml`；`pnpm install` + `pnpm gen:manifest` 通过，`tsc --noEmit` 干净。
- 待补：customer 真实业务菜单/权限（现仅占位 `c-home`/`c-overview`/`overview:view`）、登录后按 `portalUrl` 落地页、`app/(console)` 分组与 service 层。

### B. schema.sql（sys_role）
- **删 `contract_type`**（NOT NULL + CHECK）——role 与 contract 解耦（§3.6 修订；与旧 domain-model「契约可见性」相反，下沉到菜单层）。
- `role_type` CHECK 保持 `GLOBAL|PRIVATE`（代码现用的 `BUILTIN` 取消）。
- **新增 roleId 区间约定**写进 `sys_role` 注释 + 头部「跨表硬约束」段：`1–100` admin / `101–200` customer / `201–300` merchant 预留 / **动态 IDENTITY 从 `1001` 起**（`GENERATED ALWAYS AS IDENTITY (START WITH 1001)`）。注明 GLOBAL 在代码、DB 仅存 PRIVATE。
- （注：pep-schema 无 `schema.md`，约定落 `postgresql/schema.sql` + `CLAUDE.md`。）

### C. manifest 管线（@cloud/platform-config + gen:manifest）
- 新增**角色注册表**：各 app `apps/{app}/manifest/_roles.map.ts`，`gen:manifest` 一并收进 `_generated/apps.ts`（`ROLES` 导出，挨着 `MENUS`）。
- 构造期校验（沿用「非法拒启」）：roleId 落正确区间、全局唯一、不撞 `≥1001`、`permissionCodes` 必须存在于菜单池。
- `@cloud/platform-config` 暴露 `getRoles()` / `resolveRolePermissions(roleId)`。
- admin 死写 `1–100`、customer 死写 `101–200`（含各自的「类 ADMIN 全权限」角色，codes 留空）。

### D. 现有代码对齐
- `roles.policy.ts`：`isBuiltinRole(roleType==='BUILTIN')` → 改 `roleId <= 300`。
- `roles.service.ts`：CRUD 只管 `≥1001` PRIVATE；`GLOBAL`(≤300) 不入库、只读。
- `session-snapshot.ts`：角色解析**分流**——`roleId ≤ 300` 走代码注册表、`≥1001` 走 DB，合并后 `resolveEffectivePermissions`；去掉按 `contractType` 的角色过滤（`selectApplicableRoles` 的 contract 分支删除）。
- **契约命名对齐**：admin manifest 现声明 `["ADMIN","ISO","ISV","MERCHANT"]`，customer 用目标 7 值 `US-ISO/US-ISV/...` → `gen:manifest` 全局并集已出现 `ISO` 与 `US-ISO` **并存的不一致**（本次可见）。需把 admin 的 `ISO/ISV` 迁到 `US-ISO/US-ISV`，与 schema.sql `ContractType` CHECK 统一。

### 实施进度（截至本次）
> **真库验证（2026-06-12）**：cloud 仓 §3 schema 迁移已对 **Docker Postgres 16（:5433，dev 栈）** 跑 `pnpm db:push`（已 in-sync）+ `pnpm db:seed`（成功）。即 Partner→Party 改名、username→email（email 唯一、无 username 列）、删 blocklist、新建 sys_notice/sys_operation_log、邀请字段、契约 SUSPENDED 行为对齐——均在真实 PG16 建表 + 种子跑通，配合 admin+portal `tsc` 干净、全仓单测 464/464 绿。（注：本机无 psql CLI，Prisma 经引擎走 TCP；先前文档中的「未对真库验证」据此作废。）
- ✅ **§12-A** customer app 脚手架。
- ✅ **§12-B** pep-schema `sys_role` 改（删 contract_type、IDENTITY 1001、roleId 区间注释）。
- ✅ **§12-C** `@cloud/platform-config` 角色注册表 + `gen:manifest` 收集 `_roles.map.ts` + admin/customer 预设（roles:3）+ index 暴露 `getRoles`/`resolveRolePermissions`；platform-config 单测 18/18。
- ✅ **§12-D 项4** admin contractKeys `ISO/ISV→US-ISO/US-ISV` + 修 `manifest.test.ts`（全局并集已无 ISO/US-ISO 重复）；admin manifest 测试 12/12。
- ✅ **§12-D 项1**（`isBuiltinRole` 改 `roleId<=300`）：`roles.policy.ts` + `roles.service.ts`（2 处调用）+ `roles.mapper.ts`（builtin 由 roleId 派生）+ 相关测试更新。
- ✅ **§12-D 项3**（会话角色解析分流 + 解耦 contract 过滤）：`apps/{admin,portal}/lib/session-snapshot.ts`（≤300 读代码注册表 `resolveRolePermissions`、≥1001 读 DB、去 blocklist 查询）+ `role-selection.ts`（两 app，简化为仅 PRIVATE-scope，删 contractType/blocklist）+ portal `manifest/index.ts` 暴露 `getRoles/resolveRolePermissions` + 测试更新。
- ✅ **SysRole-only 迁移（免 schema 改）**：`seed.ts` 加 `setval(pg_get_serial_sequence('sys_role','role_id'),1000)` 使动态 PRIVATE 角色 roleId 从 1001 起。`createRole` 改建 `PRIVATE` 角色。
  - **验证**：admin+portal `tsc` rc=0；**全量单测通过**；并已对**真库（Docker Postgres 16，:5433）`pnpm db:push` + `pnpm db:seed`** 验证——seed 实际行使了 `setval`，打印 `sequence set to start at 1001`，动态角色起始确认生效。
- ✅ **§12-D 项2 + §3.6 删 `contract_type` 列（已完成）**：
  - **角色选择 UI 新依据（已定调：选项3 + (a) 由 contractTypes 推平台区间）**：新增 `listAssignableRoles(partyId, contractTypes)` = 「平台区间内的死写 GLOBAL 预置」(`getRoles()` 按 `CONTRACT_TYPE_RANGES` 过滤：ADMIN→1-100 / US-ISO·ISV·PILOT·PLATFORM-CUSTOM→101-200 / MERCHANT→201-300) ∪「该 party 的 DB PRIVATE 角色」；`system/users/page` 改用它；3 个组件去掉 `r.contractType==="ADMIN"` 过滤、直接用 `roles`。`roles.mapper` 加 `toClientCodeRole`（GLOBAL 角色无 DB 行 → builtin、updatedBy=system）。
  - **删列**：`Role` VO 去 `contractType`；`roles.mapper`/`roles.service.createRole` 去 `contractType`；`schema.prisma` `SysRole` 删 `contract_type` 列 + `@@index([contractType])`。`listRoles`（角色管理页）仍只读 DB PRIVATE。
  - **验证**：admin+portal `tsc` rc=0；全仓 **464/464** 通过；**真库 `db:push --accept-data-loss`（drop contract_type，DB in sync）+ `db:seed` 跑通**。
  → §3 仍待：IDENTITY DDL 改 `START 1001`（现靠 seed setval 兜，仅 pep-schema 目标的 DDL 层）、契约事件类型 7 值（§3.5，admin 域低优先）、会话架构 pep-token/portalUrl（最大架构项，**已搁置**）。〔各 FK 已补齐 ✅〕

### 会话架构 / portalUrl（方案已定 B，待实现 §8）
**已定**：① portalUrl 来源 = **契约类型推 portal 组**（`MERCHANT`→Merchant / `US-ISO·ISV·*-PILOT·PLATFORM-CUSTOM`→Customer / `ADMIN`→Admin），**禁止契约跨组重叠**（代码不变量，契约创建时强制），与角色区间共用一套 `contractGroup(contractType)` 映射（代码、不入库）；portal 组按契约类型推（**不分状态**，过期/终止仍可推→落"合同过期"页）；跨组脏数据兜底优先级 `ADMIN>CUSTOMER>MERCHANT`；URL 走 per-group env（`ADMIN_APP_URL`/`CUSTOMER_APP_URL`/`MERCHANT_APP_URL`）。
**已定（2026-06-12）：方案 B（泛化 handoff）**。一次性 token 走 URL → 目标 console 后端校验后写 host-only cookie + 删 token(会话凭证不进 URL);把 handoff 目标从单一 `ADMIN_APP_URL` 泛化成按 party 推的 `portalUrl` + 给 customer/merchant 加 `/api/auth/session-handoff`,不重写 `@cloud/permissions`。cookie 暂沿用 `sid`(不改名)。**实现时收口到单一 `entryUrlForParty` + 配置开关,使将来可快切 A(共享父域直跳)**。详见 `session-architecture.md` §9。**尚未实现**——选任何 party 现仍写死跳 admin。
**实现 delta（待 A/B 定后）**：① `contractGroup` + per-group URL 配置；② handoff 目标泛化 + customer 加 handoff 端点；③（可选）cookie/redis key 改名。
