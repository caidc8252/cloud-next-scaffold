# 邀请入驻（invite-user）后端冲突报告

> 输入 = 本地 `docs/design-bridge/invite-user/business-logic.md`（+ 兄弟 design-bridge 文档）；
> 现状 = 已实现的 invite/onboarding 代码（`apps/portal/service/onboarding`、`apps/admin/service/users`）
> + `packages/db/prisma/schema.prisma`。两仓握手经用户决定豁免（business-logic.md 为本会话新产出、上游暂无对应文件）。
> 本报告**只记录冲突 + 决议**，不含 contract/数据建模/端点设计（那是 `/design`）。

## 1. Summary

本次冲突集中在「场景一通用邀请 vs 现有代码」，多数已被 business-logic.md 的"现状偏差"预先点出，本报告将其形式化为可裁决的登记表。

- **high ×1**：CONF-1 首管/激活逻辑被混入通用 accept（场景拆分的核心，牵动 bootstrap）。
- **med ×3**：CONF-2 `createInvite` 缺"已是成员"校验；CONF-3 有效期/token 字节为 app 局部常量、非全局共享配置（触碰 `packages/*`，需授权）；CONF-4 邀请生命周期四操作（改角色/重发/重新生成/发送覆盖）语义需按"未过期/已过期"重定义。
- **db / permissions 层**：无冲突（Prisma 与 domain-model 对齐；权限守卫齐全，输入对权限码沉默）。

CONF-1～4 **均已裁决**（见 §3）。完整性缺口见 §4：场景二、场景一未接 customer app、bootstrap 线上入口、SSO、任意邮箱+验证码——其中**仅 bootstrap 随 CONF-1**，其余为双方一致待办（非冲突）。

## 2. Inputs inventory

| 输入 | 分类角色 | 取用要点 | 路径 / 版本 |
|---|---|---|---|
| business-logic.md | rules + scenarios（权威需求） | 场景一/二拆分；分支判据=入口非"首个成员"；现状偏差①-⑤；待办清单 | `docs/design-bridge/invite-user/business-logic.md`（commit f5dbc5a, 2026-06-14） |
| logic.md / domain-model.md / api-spec.yaml / scenarios.md | 既有目标规格 | token 授权、accept 单事务、错误码 104xxx、字段命名 | `docs/design-bridge/invite-user/`（已跟踪） |
| schema.prisma | db schema（现状） | SysOperatorInvite / SysParty / SysPartyUser / SysUser 字段与约束 | `packages/db/prisma/schema.prisma` |
| invite/onboarding 代码 | 现状实现 | createInvite/resend/cancel/setInviteRoles；onboarding getInvite/accept/bindInvite；auth returnTo | `apps/admin/service/users/**`、`apps/portal/service/onboarding/**`、`apps/portal/service/auth/**` |

## 3. Decision register

```
CONF-1  [场景拆分 / 首管激活]  severity: high
  where     business-logic.md「接受入驻」末条 +「现状偏差①」
            ↔ apps/portal/service/onboarding/server/onboarding.repository.ts (bindInvite)
            ↔ Prisma SysParty.status / SysPartyUser.authorizingType
  differs   文档：场景一被邀人恒 NORMAL、不激活 Party；首管/激活只属场景二(待办)。
            代码：party.status==ONBOARDING 时设 authorizingType=ADMIN 并把 party 翻 ACTIVE——
            把场景二的开户逻辑混进了通用 accept。
            （注：场景一目标 party 恒已 ACTIVE（ADMIN 平台 = seed 的 Platform party；Customer 租户
             由场景二开户后才进场景一），故现网场景一邀请走的就是 NORMAL 分支；问题在于 ONBOARDING
             分支仍长在共享路径里。且现有规则更松——"谁先 accept 谁自动当 ADMIN"，而目标规则是
             "Customer 租户首操作员只能由 ADMIN 平台签发邀请"，这正是要修的偏差。）
  impact    行为/归属变更 + bootstrap：ADMIN 平台首管来自 seed（已 ACTIVE+ADMIN），移除分支无即时缺口；
            Customer 租户的首管+激活属场景二(待办)，本期无线上入口。牵动完整性缺口。
  decided   business-logic.md 胜：场景一 accept 恒 NORMAL、不触碰 party.status；ONBOARDING→ADMIN+激活
            分支从通用 accept 移除，归场景二(待办，ADMIN 跨 party 给新租户开户)；ADMIN 平台首管来自 seed。
            移除手法（删/守卫/参数化）留 /design。  (human, 2026-06-14)

CONF-2  [createInvite 成员校验]  severity: med
  where     business-logic.md「发邀请」第3条(R5-1)
            ↔ apps/admin/service/users/server/users.service.ts (createInvite, 仅 findPendingInviteByEmail)
  differs   文档：目标邮箱"已是本 Party 活跃成员"→拒绝。
            代码：只查"在效 pending 邀请"(findPendingInviteByEmail)，不查成员归属；
            已是成员的邮箱仍可被再次邀请，仅在 accept 时幂等兜底("你已是成员")。
  impact    需新增 email→user→sys_party_user 查找 + 选定错误码（复用 ERR_USER_EMAIL_TAKEN 或新增）。
  decided   business-logic.md 胜：createInvite 增加成员校验。① 复用 ERR_USER_EMAIL_TAKEN(101002)，
            不新增码（避免动 packages/request；message 通用覆盖"已邀请/已是成员"）。② 拦任意已存在
            归属（含 LOCKED，非仅 ACTIVE），复用 findUserLink。查找：email→sys_user→findUserLink。
            accept 时"已是成员"仍按文档幂等成功（两点不矛盾）。
            ⟵ 经 CONF-4(B) 收紧：createInvite 的"已邀请→拒绝"仅对**未过期** PENDING 成立；遇**已过期**
            PENDING 走覆盖而非拒绝（findPendingInviteByEmail 需带 expiresAt 判定）。  (human, 2026-06-14)

CONF-3  [有效期 / token 字节 = 全局共享配置]  severity: med
  where     business-logic.md「发邀请」第2条(R3)
            ↔ apps/admin/service/users/server/users.service.ts:34-35 (INVITE_TTL_MS / INVITE_TOKEN_BYTES)
  differs   文档：有效期默认 7 天，取自"全局共享配置、所有子平台共用"。
            代码：admin app 内的局部 const。
  impact    需提升到共享包（@cloud/config 或 @cloud/platform-config）。⚠️ 触碰 packages/*，
            CLAUDE.md「除非特地指出，不要修改 packages/*」→ 需你明确授权落点。
  decided   迁入 @cloud/platform-config 作为平台常量（INVITE_TTL_MS=7d + INVITE_TOKEN_BYTES，单一真源）；
            用 typed 常量、不走 env。用户明确授权本次 packages/platform-config 改动。  (human, 2026-06-14)

CONF-4  [邀请生命周期操作语义：改角色 / 重发 / 重新生成 / 发送覆盖]  severity: med
  where     business-logic.md 邀请生命周期(R5/R10) + 用户 2026-06-14 调整
            ↔ apps/admin/service/users (createInvite / resendInvite / setInviteRoles)
            + repository findPendingInvite / findPendingInviteByEmail（均仅按 status=PENDING，不看 expiresAt）
  differs   现状：findPendingInvite 不看 expiresAt → 过期邀请(仍 PENDING)仍可改角色、可重发；且
            resendInvite 重发时刷新 expiresAt(+7d)、复用 token。目标语义(方案 B)对四个操作重定义，
            且区分"未过期 / 已过期"。
  impact    行为重写：setInviteRoles 加未过期守卫；resend 去掉日期刷新、只重寄；新增"重新生成"操作；
            createInvite 对过期 PENDING 改为覆盖（非拒绝）。回头收紧 CONF-2。
  decided   方案 B（四个独立操作，均仅作用于 PENDING；已过期一律不可就地操作，只能靠"发送邀请"覆盖）：
            · 改角色 setInviteRoles —— 仅未过期；过期→拒绝（要改去重新发送覆盖）。
            · 重发 resend —— 仅未过期；**仅重寄同一封邮件，不改 token、不改 expiresAt**；过期→无法重发。
            · 重新生成 regenerate（新增）—— 仅未过期；**换 token + 刷新 expiresAt(+7d) + 重发邮件**
              （用于链接疑似泄露的轮换）；过期→无法重新生成。
            · 发送邀请 createInvite —— 已是成员→拒绝(CONF-2)；有**未过期** PENDING→拒绝(已邀请)；
              有**已过期** PENDING→**覆盖**（新 token/日期/roles + 发邮件，不新建第二条）；否则新建。
            过期判定 = expiresAt < now（status 仍 PENDING）。错误码沿用 user 域、避免动 packages，细节留 /design。
            (human, 2026-06-14)
```

## 4. Completeness gaps（完整性缺口，非裁决）

- **场景二 Onboarding（Admin Customer 模块）**：文档列为待办，代码无对应入口（其首管/激活逻辑目前被混入通用 accept，见 CONF-1）。Orphan：input(TODO) ↔ no code。
  - **场景二是跨 party 邀请**：邀请 `partyId`=新租户、`inviterPartyId`=Platform；而现有 `createInvite` 写死 `partyId=inviterPartyId=session.currentPartyId`（邀进自己 party）。schema 两列本就分开、支持得了，但 createInvite 需场景二变体。属场景二设计点。
- **场景一仅接进 `apps/admin`**：`apps/customer` 为空壳（无 service/users）。"Customer 租户内操作员邀同事"的场景一**尚未接线**；createInvite 逻辑不依赖具体 party、可复用，只差 wire 进 customer app。完整性缺口，非冲突。
- **bootstrap 线上入口**：ADMIN 平台首管来自 seed（无缺口）；Customer 租户首管+激活属场景二，本期无线上入口。随 CONF-1 决议。
- **SSO/OIDC、任意邮箱+验证码**：文档与代码**双方都缺**（一致待办），非冲突。

## 5. Uncertain detections

- 无。CONF-4 经 2026-06-14 裁决从"疑似误检"升级为真实冲突并按方案 B 定案；`business-logic.md`
  原「现状偏差④」的措辞已被取代（重发/重新生成/改角色的过期语义见 CONF-4），后续应回填 business-logic.md。
