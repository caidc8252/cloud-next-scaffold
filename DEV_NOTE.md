# 开发笔记 / DEV_NOTE

> 只保留脚手架长期维护需要知道的决策。运行方式看 README，临时任务看 WIP。

## 当前定位

- 这个仓库本身是脚手架源码仓，不再承载旧业务应用。
- 当前默认基线不是“极简空壳”，而是一套可直接登录的后台骨架。
- 当前开发方式是直接在仓库本体上迭代，不再提供 `init:project` 生成新项目。
- 当前默认工作区：
  - `apps/web`
  - `packages/api-kit`
  - `packages/cache`
  - `packages/config`
  - `packages/db`
  - `packages/i18n`
  - `packages/permissions`
  - `packages/platform-config`
  - `packages/request`
  - `packages/security`
  - `packages/storage`
  - `packages/ui`

## 基线约束

- 默认基线必须始终保留：
  - 登录页
  - 基础登录态
  - 后台 layout
  - 用户 / 角色 / 菜单三张基础表
  - Prisma + PostgreSQL
- 不要重新引入新的基础技术栈。优先沿用仓库历史里已经验证过的：
  - Next.js App Router
  - Prisma
  - PostgreSQL
  - argon2

## 环境与脚本约束

- Node.js 版本必须 `>=20.19.0`。Prisma 7 的安装脚本会拒绝更低版本。
- 根 `.env` 负责数据库和认证密钥。
- Redis 连接配置统一走根 `.env` 的 `REDIS_URL`，本地开发由 `docker-compose.yml` 启动 Redis。
- `apps/web/.env` 负责应用展示名等 app 级变量。
- Prisma 统一通过根脚本 [scripts/prisma.mjs](/d:/codes/cloud-scaffold/scripts/prisma.mjs) 触发，避免 workspace 下 `.env` 路径不一致。
- Prisma 7 的 CLI 配置位于 `packages/db/prisma.config.ts`，Client 生成到 `packages/db/generated/prisma`，此目录不提交，构建前必须先执行 `pnpm db:generate`。
- `packages/config` 会主动加载根 `.env`，否则 Next 应用构建时拿不到数据库配置。
- **GitHub Codespaces 下所有 server action 报 E80 "Invalid Server Actions request."**（切语言 / `TimeZoneInit` 等都中招，且进页面就触发）。根因不是 i18n、缓存或 `optimizePackageImports`：经 VS Code 本地端口转发访问时浏览器 origin 是 `localhost:3000`，但 GitHub 转发层注入 `x-forwarded-host: <name>.app.github.dev`，Next 的 server action CSRF 校验优先信任转发头、拿它和 origin 比对 → 不一致即拒绝。修复：`next.config.ts` 里按 `GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN` 是否存在，给 `experimental.serverActions.allowedOrigins` 放行 `["localhost:3000", "*.app.github.dev"]`，仅 Codespaces 生效，本地 / 生产不受影响。改 `next.config.ts` 后必须重启 dev server。排查靠临时 middleware 打印 `origin` / `host` / `x-forwarded-host`，别靠猜（E80 是 origin/host 不匹配，不是 action id 找不到）。
- `packages/permissions` 同时承载 `PermissionChecker`、服务端登录态实现，以及 `@cloud/permissions/client` 提供的前端权限 hook。业务代码统一从 `@cloud/permissions/server` 引用，不再保留 `apps/web/lib/auth.ts` 兼容转发。
- `packages/storage` 统一承载 Amazon S3 上传会话、STS 临时凭证、服务端上传、对象元数据确认和短期下载链接；业务代码连接 S3 默认走 `@cloud/storage/server`。
- 双向游标分页统一走 `@cloud/request/server` 的 `readCursorQuery(token, direction)` + `buildCursorPage()`，配合 `CursorPager`。游标 token 由服务端用 `encodeCursor()` 签发、只编码锚点 id、对客户端不透明；翻页方向是独立的 `direction` 参数，由客户端显式传，不编进 token。响应里带 `nextCursor` / `prevCursor` / `hasNextPage` / `hasPrevPage`；客户端用 `apps/web/lib/use-cursor-pagination.ts` 的 `useCursorPagination()` 原样回传游标 + 方向，绝不从行 id 自己拼游标。偏移分页仍用 `Pager`（page/total/totalPages）。
- S3 上传记录落在 `storage_object`，下载入口必须先按当前 Entity 查询业务记录，再生成短期 S3 GET 链接；不要直接把前端保存的 `objectUrl` 当作下载授权。
- 文件去重以同租户内 `contentHash(SHA-256) + sizeBytes + ACTIVE` 为准。正常 UI 上传前会先查重；小文件服务端上传会重新计算 hash，避免只信任前端。
- S3 下载前先 `HeadObject` 校验对象和读权限，避免浏览器跳到 S3 XML 错误页；对应 AWS 身份必须允许目标对象的 `s3:GetObject`。
- 公开图片通过 `storage_object.visibility = PUBLIC` 表达，且只允许 `image/*` 落到 `public/` 前缀。公开访问只暴露 `accessUrl`，S3 bucket policy 只应开放 `public/*`，不要开放整个 bucket。Bucket policy 的匿名 `s3:GetObject` 不等于应用有写权限，上传公开图片仍需要应用 AWS 身份或被 assume role 允许 `s3:PutObject` 到 `public/*`。
- `storage_object` 只表达文件本体，业务归属统一落在 `storage_attachment`。通用绑定使用 `subjectType + subjectId + purpose`，业务模块负责校验 subject 是否真实存在以及是否允许绑定。
- **服务端分层（route / service / schema / policy / data）**：业务实现拆层落在 `apps/web/service/<domain>/`，不堆在 route handler、也不放 route 目录下的 `_server/`（`_server/` 是历史遗留，lint 拦 route 直接 import `*.repository` / `*.mapper` / `@cloud/db`）。详细规则见 `AGENTS.md` 的「服务端分层」小节，要点：
  - route 只做 HTTP 适配（`assertPermissions → zod parse → 调 service → envelope`），只依赖 service
  - schema（client+server 共享 zod）在 `service/<domain>/schemas/`，在 route parse
  - service / repository / mapper / policy 在 `service/<domain>/server/`，全部 `import "server-only"`；repository 无 session/HTTP 感知、mapper 只做 Entity→VO、policy 做范围校验（纯函数好测）
  - 跨 domain 纯 helper 放 `service/_shared/`（如解析角色 JSONB 的 `role-codes.ts`）
  - 业务逻辑进 service 后可 mock repository 边界做单测——这是这次分层的主要收益
  - **样板**：`users` 域已迁好（`apps/web/service/users/`），新 domain 照此结构；旧域逐步从 `_server/` 迁出
- 页面组件按 Next.js 惯例仍放在 `app/(portal)/<route>/` 下：
  - `page.tsx` 服务端入口（鉴权 + 顶层取数，取数调 service，不手写 prisma 查询）
  - `_components/`：客户端组件（list / detail / modal 等）
  - 跨 feature 共享的展示类型 / helper 放 `app/(portal)/system/_shared/`
- 跨目录引用一律走 `@/...` 路径别名（tsconfig 已配置），不要再写 `../../../..`。
- `@cloud/ui` Card 槽位（`CardHeader` / `CardContent` / `CardFooter`）的 padding 是 `group-data-[size=*]/card:p-*` 变体类：消费侧无前缀的 `p-0` / `px-0` **覆盖不掉**（tailwind-merge 不跨变体去重，且变体规则在产物中排在基础工具类之后、同特异性后者赢）。要贴边内容（表格、行列表）给对应槽位加 `flush`（如 `<CardContent flush>`，跳过槽位 padding，行自带内边距），不要用 `!important`。
- API Route Handler 的异常兜底统一走 `apps/web/lib/api-handler.ts`（完整设计 + 四类 demo 见 `docs/exception-handling.md`）：
  - **业务异常一律 throw 类型化异常**（不再 return 错误响应）：`@cloud/request` 出 `AppError` 基类 + `BusinessError`（业务 40x，`code`/`status`/`params`）/ `MiddlewareError`（DB/Redis/邮件等基础设施故障，统一 503 通用文案、对客户不透明）。`withApiHandler` 捕获后由 mapper 链统一出响应；`badRequestResponse` 等降级为 mapper 内部构造 Response 用。仍禁止裸 `throw new Error("文本")`。
  - mapper 链顺序（`api-handler.ts`）：`mapAuthzError` → `mapAppError`（business+middleware）→ `onError`（s3）→ `mapPrismaError` → `mapMiddlewareError`（ioredis 鸭子类型）→ 骨架兜 `ERR_INTERNAL` 500。Prisma 二分：约束冲突（P2002/P2025…）保留 4xx 业务语义；连接/超时（P1xxx）→ `ERR_MW_DB`/503。中间件四码 `ERR_MW_*`（Module 90）进 `@cloud/request` 注册表、四码共用同一句三语通用文案（差异只在 code 给开发/日志）。
  - 堆栈日志：`errorResponse(code, msg?, status?, { params?, cause? })` 的 `cause` 用于打堆栈（不进响应体）；mapper 把原始异常作 `cause` 传入，所有被捕获异常都连堆栈进日志。
  - 成功 JSON 响应统一为 `{ code: "OK", message: "success", data, page?, limit?, total?, totalPages?, nextCursor?, hasNextPage?, traceId }`；分页字段和 `data` 同级，不再包 `pager`；DELETE 等无内容接口使用 204 空 body。
  - `AuthzError`、常见 Prisma 异常和未知异常由 `handleApiError()` 统一映射，S3 接口通过 `onError: s3ErrorResponse` 保留存储专项错误码。
  - Next 控制流异常（redirect / notFound）必须继续抛出，不要吞掉。
- 错误文案服务端本地化（**code 为准**）：`@cloud/request/error-messages` 按 locale 维护 `ERR_*` 错误码 → 三语文案（en/zh-CN/ja，类型从 error-codes 推导，缺翻译编译报错）。`errorResponse()` 命中注册表就按当前 locale 出文案，`message` 参数只兜底注册表外的 code（`storage.*` / `database.*` / permissions 的 `forbidden`）。`handleApiError` 把 `AuthzError` 401 统一映射成注册表内的 `ERR_UNAUTHORIZED`（包内置三语、始终在场，不依赖 app 级 `registerErrorMessages` 是否加载，全路由可本地化）；403 暂仍用 `forbidden` + 英文兜底。
  - 决策：helpers 保持同步（团队约定），但 Next 16 读 cookie 是异步的 → 用 `node:async_hooks` 的 `AsyncLocalStorage` 存请求级 locale。`withApiHandler()` 进 handler 前 `await` 解析 `LOCALE_COOKIE`、`runWithLocale()` 注入，handler 内同步构造的 `errorResponse()` 用 `getStore()` 同步取 locale。没设置（非请求上下文 / 没走 withApiHandler）回退英文。
  - locale cookie 解析放在 app 层 `api-handler.ts`（依赖 `@cloud/i18n`），`@cloud/request` 不依赖 `@cloud/i18n`：request 只负责「给定 ALS 里的 locale 就本地化」，app 负责「cookie → locale」。
  - `apps/web/i18n/request.ts` 用 `getAllErrorMessages(locale)`（内置 + app 注册的**合并表**）注入 next-intl 的 `errors` 命名空间，供客户端 / RSC `useTranslations("errors")(code, params)` / `getTranslations`——与服务端响应体 `message` 同源、覆盖面一致（含 auth 等业务域 code）。文案只用命名占位 `{name}`（不用 ICU 复数），服务端轻量替换与客户端 next-intl 输出一致。
  - 注册表外的 **app 级业务域 code**（如 auth）走 `registerErrorMessages(locale -> code -> 文案)` 注册进 server 端解析，`@cloud/request` 自身不收录这些域 code（保持通用）。Auth 文案在 `apps/web/lib/auth-error-messages.ts`。**饿汉注册**：`apps/web/lib/register-error-messages.ts` 集中 import 所有 `*-error-messages`，由 `i18n/request.ts` 顶部引入一次——纯页面请求（不经过对应 route）时 `errors` 命名空间也能拿到业务域文案（修了旧的「靠 route 顶部 side-effect import 触发、页面请求时缺注册」的时序坑）。`storage.*` 仍保留英文兜底（开发向校验，价值低），未纳入本地化。
  - 复用同一个 code 配不同用户可见文案的，拆成专属 code（如登录/选组织各用 `ERR_AUTH_CREDENTIALS_REQUIRED` / `ERR_AUTH_ENTITY_REQUIRED`，不再共用 `ERR_AUTH_MISSING_FIELDS`），避免本地化后收敛成同一句。
- App Router 页面级兜底使用 `app/(portal)/error.tsx`、`app/(public)/error.tsx`、`app/global-error.tsx`、`app/not-found.tsx`，都复用纯展示组件 `app/_components/error-state.tsx`（友好文案 + 恢复动作 + 弱化可复制的错误编号）。
  - 错误边界 props 是 `{ error, unstable_retry }`（Next 16：`unstable_retry` 是传入的 prop，不是 import）；`error.digest` 当屏幕给用户的「错误编号」。
  - `global-error.tsx` 替换整个 root layout（含 `NextIntlClientProvider`），**拿不到 i18n context**，只能用写死的中性英文文案、且必须自带 `<html>`/`<body>`；其余边界在 layout 内可正常 `useTranslations`/`getTranslations`（文案在 `errorPage` 命名空间）。
  - RSC 跨边界生产环境只透传 `message`(脱敏)+`digest`，自定义 `code` 丢失：页面要展示精确 code 必须页面内 `catch (e instanceof BusinessError)` 自渲染 `<ErrorState>`，不能依赖 error.tsx。
  - `apps/web/instrumentation.ts` 的 `onRequestError` 集中记录 RSC/页面未捕获异常的 digest + 堆栈（route handler 异常已被 `withApiHandler` 捕获、不冒泡到这里）；屏幕上的 digest 即可在日志按它定位堆栈。
- `packages/i18n` 是对 `next-intl` 的薄封装，业务和 UI 一律从 `@cloud/i18n` 三入口取能力，禁止直接 import `next-intl`：
  - locale 清单固定为 `["en", "zh-CN", "ja"]`、`defaultLocale = "en"`，增删语言只改 `packages/i18n`，不在应用层硬编码数组。
  - 走 **cookie 不走 URL 路由**：自定义 `LOCALE_COOKIE="locale"` / `TZ_COOKIE="tz"`，刻意不用 next-intl 默认的 `NEXT_LOCALE`；没有 `app/[locale]/` 分段，切语言靠 `setLocaleAction` 写 cookie + `router.refresh()`。
  - **英文为基底**：`createI18nRequestConfig` 先加载 `en` 再 `deepMerge` 当前 locale，非英文 bundle 缺 key 自动回退英文；各 locale 只写差异，不要全量复制。
  - 缺失 key 在非 production 下由 `getMessageFallback` 直接 `throw`（开发期严格、线上降级返回 key），这是特性不是 bug，补 key 而不是关掉它。
  - `setLocaleAction` / `setTimeZoneAction` 是 **包内部已批准的 `"use server"` 例外**——只允许出现在 `packages/i18n` 内，业务代码的 mutation 仍一律走 route handler。
  - `apps/web` 已接通四件套：`next.config.ts` 用 `createNextIntlPlugin("./i18n/request.ts")` 包裹；`apps/web/i18n/request.ts` 调 `createI18nRequestConfig`，`loadMessages` 动态 import `i18n/messages/<locale>.json`；root layout 包 `NextIntlClientProvider`、`<html lang>` 用 cookie + `isLocale` 读实际 locale、树内挂 `TimeZoneInit`；portal header 放 `LocaleSwitcher`。
  - `LocaleSwitcher` 在 `apps/web/app/(portal)/_components/locale-switcher.tsx`，用 `@cloud/ui` 的 `Popover`（地球图标按钮 + `MenuItem` 列表 + 当前项加粗/勾选）组合，调 `@cloud/i18n/actions` 的 `setLocaleAction` + `router.refresh()`。**不放回 `@cloud/i18n`**：`@cloud/ui` 已依赖 `@cloud/i18n`，再让 `@cloud/i18n` 引 `@cloud/ui` 会循环依赖。`@cloud/i18n` 只保留无 UI 的 `TimeZoneInit`，并新增 `@cloud/i18n/actions` 导出供客户端组件取 server action。
  - **为什么不用 `DropdownMenu`**：header 是 `sticky top-0 z-sticky`(1020)，而 `@cloud/ui` 的 `DropdownMenuContent` 把 Positioner 钉死在 `isolate z-50`、且只把 className 透给 Popup 不透给 Positioner，业务侧无法抬层 → 弹层顶部被 header 盖住。`Popover` 走语义层 `z-popover`(1060) 高于 header（和相邻 `NotificationBell` 一致）。`DropdownMenu` 的 `z-50` 是 `@cloud/ui` 待修 bug（应改用语义 z 层），修复前 header 区域的下拉一律用 `Popover`。
  - **坑 1（locale 推断）**：因为走 cookie 不走 URL 路由、没有 next-intl middleware，`NextIntlClientProvider` 无法自动推断 locale，dev 期报 `Couldn't infer the locale prop`。必须把 layout 里算好的 locale **显式传** `<NextIntlClientProvider locale={locale}>`；messages / timeZone / formats 仍由 request config 自动注入，不用手传。
  - **坑 2（server action 被 optimize 破坏）**：`@cloud/i18n` 含 `"use server"`（`setLocaleAction` / `setTimeZoneAction`，全仓唯一的 server action）。**不要把它放进 `next.config.ts` 的 `experimental.optimizePackageImports`**——barrel 导入重写会让 server action 模块身份漂移、ID 对不上，运行时报 `Invalid Server Actions request`（`TimeZoneInit` 调 action 时触发）。它留在 `transpilePackages` 即可。改 `next.config.ts` 后必须**重启 dev server**，不是刷新。
  - `NextIntlClientProvider` 由 `@cloud/i18n/client` re-export（包原本漏了，已补），应用层只 import `@cloud/i18n/client`，不直接 import next-intl；`next-intl/plugin` 仅在 `next.config.ts` 这一构建配置处直接 import。
  - 文案在 `apps/web/i18n/messages/`，`en.json` 为基底，目前只落 `@cloud/ui` 必需的 `ui.datePicker.*`。`apps/web/i18n/messages/messages.test.ts` 守 en 含日期组件全部 key、zh/ja 无孤儿 key。现有页面英文硬编码尚未逐条迁移（独立任务）。

## 平台 manifest（菜单 / 权限 / 契约 单一真源）

- COC：菜单 / 权限 / 契约类型在代码里声明，不入库（替代旧 `sys_menu` + `sys_permission`）。每个 app 在 `apps/<app>/manifest/_menu.map.ts` 用 `defineAppManifest` 声明 `appId` + `contractKeys` + `menus`（菜单带 `permissions` 与 `contractTypes`）。数据格式真源就是这个文件。
- `@cloud/platform-config` 只做三件事：`defineAppManifest`（按 app 编写，zod 校验 + 冻结）、`validateMenus`（对**拍平后的全局菜单池**做完整性校验：menuCode/permissionCode **全局唯一**、parent 存在不成环、目录必须有子级、契约合法、icon 合法）、`createPlatformConfig(menus, { contractTypes })` → 暴露 `getMenus` / `getContractKeys`。`getMenus(契约?)` 是契约过滤入口：不传返回全部菜单，传单个契约或契约数组返回命中菜单（菜单 `contractTypes` 含 `*` 或与请求契约有交集即命中）。**没有运行时注册表**，构造期一次性校验整池，非法即拒启。
- 「解释逻辑」（侧边栏菜单树 / 角色权限目录 / 会话有效权限）不在包里，落在应用 `apps/web/manifest/select.ts`（纯函数，入参为**已按契约过滤好的 `menus`**，由 `getMenus(契约)` 提供，select 内部不再做契约过滤）：`selectPermissionGroups(menus)` / `resolveEffectivePermissions({ menus, authorizingType, grantedRoleCodes })` / `selectVisibleMenuTree(menus, grantedCodes)`。消费方先 `getMenus(当前会话契约)` 再喂给这些函数：`session-menus.ts` / `session-snapshot.ts` / `system/roles/page.tsx`。`apps/web/manifest/index.ts` 用 `PLATFORM_CONTRACTS`（绑定契约并集，替代旧的 `PLATFORM_ID`）构造配置并 re-export `getMenus` / `getContractKeys`。
- 采集物 `apps/<app>/manifest/_generated/apps.ts` 由 `pnpm gen:manifest`（接 predev/prebuild/pretest）生成、**自包含序列化数据**：把所有 app 的菜单**拍平成一份全局池 `MENUS`** + 聚合 `CONTRACT_KEYS`（各 app `contractKeys` 并集，替代已删的 `_contracts.ts`），唯一 import 是可擦除的 `import type { MenuEntry }`。**刻意不用 import barrel 跨 app 引用源码**——多 Next app 下 app 互相 import 源码会有打包问题；序列化后每个 app 各自自包含。该目录 gitignore（`apps/*/manifest/_generated/`），不提交。
- 生成器 `scripts/generate-manifest-registry.mjs` 用 **Node 24 原生 TS 类型擦除**（`await import(pathToFileURL(_menu.map.ts))`）评估各 app 的 `appManifest`，不依赖 jiti/tsx（bare import 在 pnpm 根脚本里解析不到）。
- 启动期早校验：`apps/web/instrumentation.ts` 仅 `import("@/manifest")` 触发 `createPlatformConfig` 校验。

## Next.js 约束

- 这个仓库使用 Next.js App Router。
- 路由分组目前采用：
  - `app/(public)`：登录等公开页
  - `app/(portal)`：登录后的后台区域
- `apps/web/next.config.ts` 显式设置了 `turbopack.root`，避免 workspace root 识别漂移。

## 验证基线

每次调整基线，至少跑：

```bash
pnpm db:generate
pnpm test
pnpm exec tsc --noEmit
pnpm lint
pnpm --filter web build
```

如果本地没有起 PostgreSQL，可以先不跑 `pnpm db:push` / `pnpm db:seed`，但 README 里的启动链路必须保持完整。

## 登录安全加固（login-redesign）

- **传输加密**：密钥对统一落根 `.env`，都是 base64 裸 DER（单行，无 `\n` 转义）。公钥 `NEXT_PUBLIC_AUTH_LOGIN_RSA_PUBLIC_KEY`（SPKI DER，`NEXT_PUBLIC_` 构建期内联进客户端 bundle）经 `apps/site/lib/login-crypto.ts` 解码注入 site 登录前端，对 `{password, timestamp}` 做 RSA-OAEP/SHA-256 加密；私钥 `AUTH_LOGIN_RSA_PRIVATE_KEY`（PKCS#8 DER）由 `@cloud/config` 的 `parseAuthConfig` 解码成 `{key,format:"der",type:"pkcs8"}`（`getAuthConfig().rsaPrivateKey`），服务端 `@cloud/security/server` 的 `decryptRsaOaep` 解密。`@cloud/security` 的 `encryptRsaOaep`/`decryptRsaOaep` 同时接受 PEM 字符串和裸 DER 入参（`PublicKeyInput`/`PrivateKeyInput` 联合类型），密钥由业务侧注入（包不读 env）。静态存储仍是 argon2id（解密后直接 `verifyPassword`），未引入 SHA256。web 修改密码仍复用同类 RSA 加密工具保护敏感字段。
- **防重放（时间戳）**：点击登录时先 `GET /api/auth/server-time` 取服务端时间戳，加密进包体；服务端校验 `|now - timestamp| <= 60s`（env `AUTH_LOGIN_TIMESTAMP_WINDOW_SECONDS`，默认 60）。仅时间窗、无 nonce——同一密文 60s 内理论可重放，已接受此 trade-off（攻击窗口极短且需中间人拦截密文）。
- **锁定与状态解耦**：`SysUser.status` 只表达账号级（仅 `ACTIVE` 放行）；刷错锁只写 `passwordErrorLockExpiredTimestamp`（不再写 `status=LOCKED`）。阈值/时长走 env（`AUTH_PASSWORD_MAX_ERROR_TIMES` 默认 6，`errorTimes >= 6` 上锁；`AUTH_PASSWORD_LOCK_MINUTES` 默认 30）。只有密码正确才清零；锁过期后再错立即重新上锁且次数继续累加。登录决策逻辑在 `apps/site/lib/login-checks.ts`；web 保留同名时间窗 helper 给修改密码接口复用。
- **MFA 分岔**：site 登录时 `SysUser.mfaEnable` 为真则 `createMfaLoginToken`（`apps/site/lib/login-token.ts`，Redis `mfa:login:*`，TTL 300s）并返回 `{mfaRequired, mfaToken}`，不建正式 session；`apps/site/app/api/auth/mfa-verify` 校验 TOTP 后再创建 session。
- **错误码**：新增 `ERR_AUTH_ACCOUNT_DISABLED` / `ERR_AUTH_ENCRYPTION_INVALID` / `ERR_AUTH_REQUEST_EXPIRED`，落 auth 域三语文案（`apps/web/lib/auth-error-messages.ts`）。
- **下一期 TODO**：MFA verify 端点 + 临时 token 消费/升级为正式 session + 前端把 `mfaToken` 传给 `/mfa` 并做校验。
- **部署提示**：生产需更换 RSA 密钥对，两把都是 base64 裸 DER 放根 `.env`（公钥 `NEXT_PUBLIC_AUTH_LOGIN_RSA_PUBLIC_KEY` 为 SPKI DER、私钥 `AUTH_LOGIN_RSA_PRIVATE_KEY` 为 PKCS#8 DER，成对）；`NEXT_PUBLIC_*` 构建期内联，换公钥需重新构建客户端。
- **site 统一登录与 partner 选择**：当前登录页、登录 API、MFA 和 partner 选择在 `apps/site`。登录成功按可选 partner 聚合：只有一个可选 partner 时直接创建完整 session 并跳到 `WEB_APP_URL`；多个或没有可选 partner 时进入 site `/select-partner` 显示不可选原因。选择 partner 时，`apps/site/lib/session-snapshot.ts` 用全局 manifest + DB 角色/契约直接生成完整 session 并 `updateSession()`，然后跳到 `WEB_APP_URL`。web 的 `/login`、`/select-partner` 和 logout 会跳回 site。
- **跨子域 cookie**：本地 `localhost:3000/3001` 可共享 host cookie；生产若是 `site.example.com` / `web.example.com`，配置 `SESSION_COOKIE_DOMAIN=.example.com`，否则 site 写入的 `sid` 不会发送给 web。

## 系统库对齐（Partner/Contract/Role/User/MFA/Invite，schema-align）

> 本次按外部系统 DB 脚本重写了 `sys_*` 模型（greenfield，`db:push` + `db:seed` 重建，无迁移 SQL）。storage_object / storage_attachment 不在脚本范围，保持原样。

- **字段改名（影响登录/会话/用户页）**：`SysUser.displayName → nickName`、`mfaEnabled → mfaEnable`；`username`/`email`/`nickName` 均 NOT NULL；删 `passwordUpdatedAt`（保留 `passwordChangedTimestamp`）。会话契约层 `@cloud/permissions` 的 `Session.displayName` 字段名**不改**（属包，不动），在 `session-snapshot.ts` 里 `user.nickName → displayName` 映射。上面登录加固小节里旧的 `mfaEnabled` / `mfa_enabled` 字样以此处为准（现为 `mfaEnable` / `mfa_enable`）。
- **JSONB 取代 join 表**：角色绑定走 `sys_partner_user.roles`（`List<{roleId}>`），权限码走 `sys_role.permission_codes`（`List<string>`）；`sys_user_role` / `sys_role_permission` 已删。会话聚合、角色/用户接口都改读 JSONB；删除角色的「是否仍被绑定」用 `sysPartnerUser.count({ where: { roles: { array_contains: [{ roleId }] } } })`。是 AGENTS.md「数组不行」的已批准例外（见该节）。
- **契约类型内联**：删 `sys_contract_define` 表，契约类型变内联字符串（`authorized_contract_type` / `sys_role.contract_type` 等），合法值由应用层 zod 校验。脚本枚举含 `ISO_PILOT`/`ISV_PILOT`，但 manifest `contractKeys` 仍是 `ADMIN/ISO/ISV/MERCHANT`——pilot 契约 DB 允许但暂无菜单映射（需要时再补 manifest）。
- **DB 硬约束策略 = Prisma-native + 应用层兜底**：脚本里的 CHECK、partial unique index（ADMIN 单例 / 活跃契约唯一）、触发器、GIN 索引 Prisma 表达不了，**不切 `prisma migrate`**，保持 `db:push`；枚举/状态合法性靠 zod，跨表不变量（如 ADMIN 单例）靠 service 层事务，`upd_time` 靠 `@updatedAt`。如果将来要 DB 级硬保证，再评估切 migrate + 手写 SQL companion。
- **citext**：`username`/`email`/`invite_email` 用 `@db.Citext`（大小写不敏感），generator 开 `previewFeatures=["postgresqlExtensions"]`、datasource `extensions=[citext]`。登录按用户名查现在天然大小写不敏感。
- **邀请模型重写**：`SysInvite`（旧：邀请时建 `username=null` 占位用户）→ `SysOperatorInvite`（挂 `partnerId + inviterUserId + inviteEmail`，**不预建用户**，消费时才建真实用户——消费/激活端点尚未实现，与旧实现一致是 TODO）。列表里待消费邀请合成为 `status=PENDING` 的伪条目，id 形如 `invite-<operatorInviteId>`；resend/cancel 路由按该 id 解析操作 `sys_operator_invite`。**对脚本的小幅偏离**：给 `sys_operator_invite` 加了 `roles JSONB`，承载邀请时选的角色（脚本无此列，但要保留「邀请即配角色」功能，消费时落到 `sys_partner_user.roles`）。
- **重置密码 → Redis**：删 `sys_password_reset_request` 表，token 改存 Redis（`apps/web/lib/password-reset-token.ts`，key `pwreset:*`，TTL 72h，沿用 login-token 范式）。因此用户详情不再有可列出的「历史重置请求」（mapper 返回 `[]`）。消费/设新密码端点同样是 TODO。
- **锁定语义**：用户锁定走 `sys_partner_user.status` 的 `ACTIVE ↔ LOCKED`（旧实现用 `INACTIVE`，已统一为 `LOCKED`）；客户端 `User.status` 仍映射成 `ACTIVE/INACTIVE/PENDING`。
- **新表（schema-only，本期不接业务）**：`sys_mfa_info`（TOTP 密钥）、`sys_partner_contract_event`（契约事件流水）；`sys_partner_contract.entitlements/logos` JSONB、`sys_user.password_history` JSONB 也只建列不写。
- **删表**：`sys_contract_define`、`sys_partner_partner`、`sys_org`、`sys_user_org`、`sys_user_role`、`sys_role_permission`、`sys_user_password_history`、`sys_password_reset_request`、`sys_invite`（均经确认无代码消费或已迁走）。
