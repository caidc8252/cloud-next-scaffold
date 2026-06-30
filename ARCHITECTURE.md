# Next.js 架构设计说明（大单体 · 菜单/权限驱动 · 多租户）

> 配套：脚手架操作 `.claude/scaffold/README.md`、AI 铁律 `CLAUDE.md`、入口索引 `README.md`。
> 快速体验（无需任何外部服务）：`pnpm install && pnpm --filter @cloud/db exec prisma generate && pnpm codegen && pnpm typecheck && pnpm test`。需求走查演示：`pnpm --filter platform test demo`。
> 本地全栈跑起来（带真实数据，零安装）：
> 1. 终端1：`pnpm dev:db`（PGlite 进程内 Postgres，监听 127.0.0.1:5432，自动建表+seed 3 条订单）
> 2. 终端2：`cp apps/platform/.env.example apps/platform/.env && pnpm --filter platform dev`
> 3. 打开 `http://localhost:3000/login`，用 `userId=demo` / `entityId=acme` 登录 → 左侧菜单 → 进 `cust.order` 看到订单数据。

---

## 0. 一句话概览

一个 Next.js（App Router）**大单体** `apps/platform`，左侧菜单不是写死的，而是用户登录、选定一个公司(Party)后，由 **角色×合同 交叉算出的"有效权限集"投影**而成。AI 按模块（`<分类>/<模块>`）开发功能，与菜单无关；每个模块自带 `manifest.ts` 声明它的菜单与权限码，确定性 codegen 把所有模块汇总成全局注册表与类型。

---

## 1. 针对你的诉求 → 设计如何满足（逐条对照）

| 你的诉求 | 设计中的落点 | 体验/验证入口 |
|---|---|---|
| AI 开发与菜单无关，只产出"某模块"（纯技术 or 带界面+后台+DB） | `apps/platform/modules/<cat>/<mod>/`，每模块 `manifest.ts`+`server/`+`schemas/`+`ui/`；纯技术模块进 `common.*`（无 menu） | `modules/common/audit`（纯技术）、`modules/cust/order`（带界面） |
| 开发产物统一放一个目录 | 全部模块在 `apps/platform/modules/**`；生成物在 `apps/platform/registry-generated/**` | 目录树见下文 |
| 多子平台(ADMIN/CUSTOMER/MERCHANT)但走大单体，菜单按登录权限拼 | 单 app；`platform` 维度贯穿 role/permission/session；菜单由有效权限投影 | `catalog/roles.ts` 按号段分 platform |
| 每个关键处理生成唯一权限码 `<cat>.<mod>.<fn>.<action>` | `manifest.ts` 声明 → codegen 汇成 `PermissionCode` 联合类型 | `registry-generated/registry-types.generated.ts` |
| 带界面模块=一个菜单 `menu_code=<cat>.<mod>`，有 entry_url + List<permission_code> | `manifest.ts` 的 `menuCode`/`entry`/`permissions`；permission→menu 为 1:n（`belongToMenuCode`） | `registry-generated/menu-registry.generated.ts` |
| 合同关联菜单(1:n)、有有效期；角色绑权限码 | `catalog/contract-types.ts`（US-ISV/US-ISO/ALL→menus，硬闸门）、`catalog/roles.ts`（role→permission，n:n） | 演示 ①②⑤ |
| 角色可由 List<permission_code> 反推 List<menu_code> | `computeUserPermissions` 先算权限再投影菜单（菜单是权限的投影，不是另算） | `packages/permissions/src/authz.ts` |
| 公司=Party，签多个合同；用户绑多 Party，每关联配多角色 | kit 符号 `sysEntity`/`sysEntityContract`/`sysUser`/`sysUserRole`/`sysEntityUser(authorizingType)` 映射 | `packages/db/prisma/schema.prisma` |
| 用户登录+选公司 → 得到 用户/角色/Party/合同 → 合同×角色 交叉 → 菜单列表 | `requireSession` per-request 水合 → 授权公式 → `buildMenu` 投影 → 渲染左侧菜单 | 演示 ①–⑦（`demo/requirement-walkthrough.test.ts`） |
| common 纯技术模块只对内服务、不反调业务、不受菜单/合同约束 | `common.*` 叶子层；豁免合同闸门；无 menu 不投影；import 边界规则 | 演示 ④ |

> **结论先行**：你模型里"用户→公司→角色×合同→有效权限→菜单"这条链，已被 `computeUserPermissions`+`buildMenu` 两个纯函数完整实现，并由 7 个走查用例 + 16 个 authz 单测 + 13 个 RLS e2e 锁定。跑 `pnpm --filter platform test demo` 就能逐条看到。

---

## 2. 目录结构

```
nextjs-framework-new-generation/
├─ apps/platform/                      # 大单体（唯一的 Next.js app）
│  ├─ app/
│  │  ├─ (public)/login/               # 登录前
│  │  ├─ (portal)/layout.tsx           # 业务外壳：用 @cloud/ui 渲染 buildMenu() 结果为左侧菜单
│  │  ├─ (portal)/no-access/           # 有会话但 visibleMenus=∅ 的落地页（授权公式第4分支）
│  │  └─ api/<cat>/<mod>/route.ts      # 路由处理器 = 唯一写入口（禁用 server action）
│  ├─ modules/<cat>/<mod>/             # ★ AI 生成落点（菜单无关）
│  │  ├─ manifest.ts                   #   声明 menuCode / permissions(含 belongToMenuCode) / platform / contractTypes / entry
│  │  ├─ server/{service,repository,mapper}.ts   # server-only 业务/数据/映射
│  │  ├─ schemas/                      #   zod，在 route 处解析
│  │  ├─ ui/                           #   页面与组件（@cloud/ui）
│  │  └─ *.test.ts / *.e2e.test.ts     #   单测 + RLS auth-boundary e2e cell
│  ├─ modules/index.ts                 # 汇总入口：读 modules/** + provisional-manifests/** 传给 codegen
│  ├─ provisional-manifests/           # 跨模块 forward-declared stub（前向声明 stub 物化，scaffold 自动写）
│  ├─ registry-generated/              # ★ codegen 产物（永不手改）：permission/menu registry + 类型 + seed
│  ├─ catalog/                         # ★ 代码态目录（非 DB）
│  │  ├─ roles.ts                      #   硬编码角色（role_id 1–500 分 platform；权限元素类型=PermissionCode）
│  │  └─ contract-types.ts             #   US-ISV/US-ISO/ALL → MenuCode[]（合同硬闸门）
│  ├─ lib/api-handler.ts               # withApiHandler：requireSession→tenantCtx.run→enrichTrace→handler
│  ├─ test/rls-harness.ts              # RLS e2e 基座（PGlite，进程内 Postgres）
│  ├─ e2e/auth-boundary.e2e.test.ts    # 跨租户拒绝 5 用例（真跑）
│  └─ demo/requirement-walkthrough.test.ts  # ★ 需求走查演示（7 用例）
├─ packages/                           # @cloud/* 参考骨架包
│  ├─ permissions/                     # ★ session + 授权公式 + buildMenu（泛型，不依赖生成物）
│  ├─ db/                              # ★ Prisma + 租户隔离4层（extension+ALS+RLS迁移+启动自检）
│  ├─ registry/                        # ★ manifest→注册表/类型/seed 的确定性 codegen + 8条 CI 守门
│  ├─ request/ config/ cache/ log/ security/ i18n/ ui/   # 基础设施
├─ catalog 之外的代码态目录在 apps/platform/catalog（见上）
├─ .claude/                            # AI 脚手架（已正式生产接入：真实飞书 + 真实文档 repo）
│  └─ commands/  skills/  scaffold/(含 README.md 操作总览 + 确定性 *.ts)   # AI 生产只读这些
└─ README.md  CLAUDE.md  ARCHITECTURE.md   # 根入口：人索引 / AI 铁律 / 本文档
```

---

## 3. 核心机制

### 3.1 有效权限公式（`packages/permissions/src/authz.ts` · `computeUserPermissions`）
```
roleGranted      = ADMIN ? (合同范围内全部码 ∪ 全部 common.*)   // ADMIN 旁路
                         : ⋃ 用户在当前 Party 下角色.permissions  // 普通：角色并集
userPermissions  = { p∈roleGranted | p 是 common.* }            // common 豁免（不受合同）
                 ∪ { p∈roleGranted | 非 common ∧ p.menu∈合同菜单 } // 合同硬闸门
visibleMenus     = { p.menu | p∈userPermissions ∧ p.menu≠null }  // 菜单 = 权限的投影
```
要点：**先算权限、再投影菜单**（菜单不是单独算的）；合同对 ADMIN 同样是硬闸门；session 每请求重新水合（per-request），撤销下一请求即生效（无常量缓存层）。

### 3.2 多租户隔离 4 层（`packages/db`）
- **L0** 业务表必含 `party_id uuid + index`（schema CI）。
- **L1** `tenantCtx`(AsyncLocalStorage) 在 `withApiHandler` 注入。
- **L2** `db=base.$extends(tenantScope)` 自动注入 partyId（写路径 + 兜底）。
- **L3**（读路径主防线）Postgres RLS：`FORCE RLS` + 非 owner 角色 + `NULLIF(current_setting('app.party_id',true),'')::uuid` 策略 + 事务局部 GUC + fail-closed。**已用 PGlite 真测**（`test/rls-harness.ts`）。
- **L4** auth-boundary e2e：5 条跨租户拒绝用例（真跑）。

### 3.3 注册表管线（`packages/registry`）
manifest（唯一真相源）→ 确定性 codegen → `PermissionCode/MenuCode` 联合类型 + 注册表 JSON + DB seed。8 条 CI 守门（重名、删码无 @deprecated、catalog 引用必须存在、合同 menu 必须存在、belongToMenuCode 规则、`packages→apps` import 禁止、provisional 处理、stub-vs-real diff）。codegen 确定性、无漂移。

### 3.4 一次请求的流转
```
浏览器 → app/api/<cat>/<mod>/route.ts
  → withApiHandler: requireSession()（per-request 水合 → session.permissions）
  → tenantCtx.run({partyId})（设定租户上下文）
  → zod 解析输入（schemas/）
  → assertPermissions({all|any:[PermissionCode]})（服务端鉴权，唯一真相）
  → service（业务）→ repository（经 RLS 事务 helper 访问 DB）→ mapper（Entity→VO）
  → successResponse(envelope)
左侧菜单：layout 调 buildMenu(session) → 渲染（纯 UX，鉴权仍在服务端）
```

---

## 4. 演示测试（`apps/platform/demo/requirement-walkthrough.test.ts`）

跑 `pnpm --filter platform test demo`，7 个用例直接对应你的模型：

| 用例 | 证明的诉求 |
|---|---|
| ① US-ISV + 订单管理员 → 看到 cust.order 菜单与权限 | 角色×合同正常路径 |
| ② 换 US-ISO → cust.order 被合同挡掉 | **合同硬闸门**（没买就连权限都没有） |
| ③ 派发员+确认员 → 权限取并集 | **多角色并集** |
| ④ common.* 不受合同、不投影菜单 | **纯技术权限豁免** |
| ⑤ ADMIN 旁路：合同内全量+全部 common | ADMIN 授权且仍受合同闸门 |
| ⑥ buildMenu 从扁平权限码渲染菜单（deprecated 不投影） | **菜单=权限投影** |
| ⑦ 空集 → /no-access | 无合同/无角色的落地处理 |

---

## 5. 当前验证状态

`pnpm typecheck` 11/11 · `pnpm test` **168 测试通过**（permissions 21 / registry 29 / db 16 / apps/platform 102，含 13 个真实 RLS e2e + 7 个需求走查）· codegen 确定性无漂移 · 未闭合依赖清单为空。RLS 用进程内 PGlite 真测。

范围说明：**脚手架层（AI 逻辑）已正式生产接入**——`/sync` 接真实飞书（FeiShu Project MCP）、`/start-work`/`/submit-work` 接真实文档 repo（`../pep-webapp-docs`/`../pep-data-model-docs`）。**Next.js 框架运行时仍为占位、待后续转生产**：`app/api/auth/login`（密码校验）、`lib/hydrator.ts`（权限水合，未接真实 Prisma 读）、`prisma/seed.ts`、本地 PGlite dev-db 为占位/本地开发用途，本阶段不改。
