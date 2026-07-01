# 架构说明(单 app · CoC 声明驱动菜单/权限)

> 配套:CoC 规约 `.claude/context/injections/references/coding-rules/coc-declaration.md`、AI 铁律 `AGENTS.md`、入口索引 `README.md`
> 快速起步:
> 1. `pnpm install && pnpm db:generate`(Prisma client)
> 2. `pnpm gen:coc`(CoC 注册表/类型/i18n;predev/prebuild/pretest 会自动跑)
> 3. `pnpm test`(全量单测,pretest 先跑 gen:coc)
> 4. `cp apps/web/.env.example apps/web/.env` → `pnpm dev`(起 `apps/web`,:3000;需本地 Postgres + Redis,详见 README)

---

## 1. 一句话概览

一个 Next.js(App Router)**单体应用** `apps/web`。左侧菜单不写死,而是用户登录、选定一个公司(Party)后,由 **合同 × 角色 交叉算出的「有效权限集」投影**而成。AI 按模块 `modules/<cat>/<mod>/` 开发功能,与菜单解耦;每个模块自带 `manifest.ts` 声明自己的菜单与权限码,脚本指令 (`gen:coc`)把所有模块汇总成全局注册表与类型。

---
## 2. 目录结构

```
cloud-next-scaffold/
├─ apps/web/                            # 唯一的 Next.js app
│  ├─ app/
│  │  ├─ (portal)/                      # 登录前页面(login/onboarding/forgot…)
│  │  ├─ (dashboard)/                   # 控制台:layout 渲染 buildMenuTree 投影的侧边栏
│  │  └─ api/<cat>/<mod>/route.ts       # 薄壳:re-export 模块 controller(唯一写入口,禁用 server action)
│  ├─ modules/<cat>/<mod>/              # ★ AI 生成落点（菜单无关）
│  │  ├─ manifest.ts                    #   A 类模块:声明 menuCode / permissions / entry.url
│  │  ├─ i18n/{en,zh-CN,ja}.ts          #   本模块菜单标题 + 权限 label/desc(coc 命名空间)
│  │  ├─ server/                        #   <mod>.{controller,service,repository,mapper}.ts
│  │  ├─ client/<mod>.api.ts            #   该域客户端调用唯一出处
│  │  ├─ schema/                        #   VO,DTO
│  │  └─ ui/                            #   页面与私有组件
│  ├─ manifest/                         # ★ CoC 声明与产物
│  │  ├─ collect.ts                     #   采集入口(codegen 唯一消费)
│  │  ├─ catalog/                       #   代码态目录(单一权威):商业策略 + 导航骨架
│  │  │  ├─ menu-tree.ts                #     目录(非叶子)骨架
│  │  │  ├─ contract-types.ts           #     合同闸门:CONTRACT_MENUS(合同 → 解锁哪些叶子菜单)
│  │  │  ├─ roles.ts                    #     死写 GLOBAL 角色 GLOBAL_ROLES(roleId ≤ 1000)
│  │  │  └─ i18n/{en,zh-CN,ja}.ts       #     目录 / 角色 / 合同文案
│  │  └─ _generated/                    #   gen:coc 产物(gitignored、不手改、不作依赖)
│  │     ├─ registry-types.generated.ts       #   PermissionCode / MenuCode 联合类型
│  │     ├─ permission-registry.generated.ts  #   PERMISSION_REGISTRY + codeToMenu
│  │     ├─ menu-registry.generated.ts        #   MENU_REGISTRY
│  │     ├─ contract-scope.generated.ts       #   CONTRACT_SCOPE(合同 → 权限码并集)
│  │     └─ i18n/{en,zh-CN,ja}.json           #   coc 命名空间文案(模块 + catalog 合并)
│  ├─ lib/                              # 私有工具:api-handler(withApiHandler)、session-snapshot、session-menus…
│  └─ i18n/messages/{en,zh-CN,ja}.json  # app 级通用文案(nav/auth/account/notifications…)
├─ packages/                           # @cloud/* 共享能力
│  ├─ platform-config/                 # ★ CoC 原语(src/coc):defineModule/buildRegistry/validateCatalog/
│  │                                   #   validateGlobalRoles/deriveContractScope/emit/createCocConfig + 角色 ID 号段(contract-group)
│  ├─ permissions/                     # ★ 登录态 + 守卫(assert/requirePermissions)+ Redis 会话快照
│  ├─ db/                              # Prisma client
│  ├─ api-kit/                         # withApiHandler 骨架 + 错误映射
│  ├─ cache/ config/ request/ log/ security/ storage/ i18n/ ui/   # 基础设施
├─ e2e/                                 # 端到端
├─ .claude/                            # AI 脚手架（已正式生产接入：真实飞书 + 真实文档 repo）
│  └─ commands/  skills/  scaffold/(含 README.md 操作总览 + 确定性 *.ts)   # AI 生产只读这些
└─ README.md  AGENTS.md  ARCHITECTURE.md # 根入口：人索引 / AI 铁律 / 本文档
```

---

## 3. 核心机制


### 3.1 有效权限公式(`apps/web/lib/session-snapshot.ts`)

```
scope = ⋃ CONTRACT_SCOPE[当前 party 的有效合同]                 # 合同硬闸门 客户时区有效期
userPermissions = authorizingType === "ADMIN" ?  ⊆ scope                 # ★ ADMIN 旁路
                  ： U(用户在当前 Party 下角色.permissions) ∩ scope        # NORMAL 用户
visibleMenus(运行时) = buildMenuTree(userPermissions)                # 命中权限的叶子可见 → 祖先连带 → 空目录裁掉
```
要点:**先算权限、再投影菜单**;角色两类 —— PRESET GLOBAL 死写(roleId ≤ 1000,`catalog/roles.ts`,gen:coc 校验区间 [1,300]+唯一)+ DB PRIVATE(roleId ≥ 1001)。**只投影当前快照**

### 3.2 会话(Redis 快照,非每请求水合)

cookie 只放 256-bit 随机 `sid`;会话快照本体存 **Redis**(`@cloud/permissions` 的 `sessionStore`),滑动 TTL、过期即失效。快照在**登录 / 切公司时**由 `buildSessionSnapshot` 算一次(读 DB:user/party/contract/role → 按 §3.1 算 `permissions`),之后请求直接命中快照。菜单不进快照,渲染时由 `session.permissions` 现算(`lib/session-menus.ts` → `buildMenuTree`)。

### 3.3 服务端分层 + 一次请求的流转

```
浏览器 → app/api/<cat>/<mod>/route.ts          # 薄壳:export { GET, POST } from 模块 controller
  → withApiHandler(@/lib/api-handler):resolveLocale + 错误映射(Authz→App→Prisma→Middleware→500)
  → <mod>.controller:assertPermissions({ all|any: [PermissionCode] })   # 服务端鉴权,唯一真相
  → zod 解析输入(schema/)
  → service(业务编排): -> policy(范围/归属校验) -> repository(Prisma,按 currentPartyId 过滤)+ mapper(Entity→VO)
  → successResponse / createdResponse / noContentResponse(统一信封)
左侧菜单:layout 调 getSessionMenus → buildMenuTree(session.permissions) → 渲染(纯 UX,鉴权仍在服务端)
```
- 守卫:route/controller 用 `assertPermissions()`,page/layout 用 `requirePermissions()`;前端只是体验层,隐藏按钮/菜单不算安全边界。
- B 类页面(dashboard 等):不进 CoC 投影,layout 写死直链 + `requireSession`,文案走 app `nav` 命名空间。

---

