# 开发笔记 / DEV_NOTE

> 只保留脚手架长期维护需要知道的决策。运行方式看 README，临时任务看 WIP。

## 当前定位

- 这个仓库本身是脚手架源码仓，不再承载旧业务应用。
- 当前默认基线不是“极简空壳”，而是一套可直接登录的后台骨架。
- 当前开发方式是直接在仓库本体上迭代，不再提供 `init:project` 生成新项目。
- 当前默认工作区：
  - `apps/web`
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
- 系统管理页面组件（users / roles）属于 `apps/web` 业务代码，按 Next.js 惯例放在 `app/(portal)/system/<feature>/` 下：
  - `page.tsx` 服务端入口（鉴权 + 数据加载）
  - `_components/`：客户端组件（list / detail / modal 等）
  - `_server/`：服务端工具（mapper、纯查询逻辑），文件需 `import "server-only"`
  - 跨 feature 共享的类型 / helper 放 `app/(portal)/system/_shared/`
- 跨目录引用一律走 `@/...` 路径别名（tsconfig 已配置），不要再写 `../../../..`。
- API Route Handler 的异常兜底统一走 `apps/web/lib/api-handler.ts`：
  - 业务校验错误继续显式返回 `badRequestResponse` / `notFoundResponse` 等响应，不通过 throw 表达。
  - 成功 JSON 响应统一为 `{ code: "OK", message: "success", data, page?, limit?, total?, totalPages?, nextCursor?, hasNextPage?, traceId }`；分页字段和 `data` 同级，不再包 `pager`；DELETE 等无内容接口使用 204 空 body。
  - `AuthzError`、常见 Prisma 异常和未知异常由 `handleApiError()` 统一映射，S3 接口通过 `onError: s3ErrorResponse` 保留存储专项错误码。
  - Next 控制流异常（redirect / notFound）必须继续抛出，不要吞掉。
- 错误文案服务端本地化（**code 为准**）：`@cloud/request/error-messages` 按 locale 维护 `ERR_*` 错误码 → 三语文案（en/zh-CN/ja，类型从 error-codes 推导，缺翻译编译报错）。`errorResponse()` 命中注册表就按当前 locale 出文案，`message` 参数只兜底注册表外的 code（`storage.*` / `database.*` / permissions 的 `unauthenticated` `forbidden`）。
  - 决策：helpers 保持同步（团队约定），但 Next 16 读 cookie 是异步的 → 用 `node:async_hooks` 的 `AsyncLocalStorage` 存请求级 locale。`withApiHandler()` 进 handler 前 `await` 解析 `LOCALE_COOKIE`、`runWithLocale()` 注入，handler 内同步构造的 `errorResponse()` 用 `getStore()` 同步取 locale。没设置（非请求上下文 / 没走 withApiHandler）回退英文。
  - locale cookie 解析放在 app 层 `api-handler.ts`（依赖 `@cloud/i18n`），`@cloud/request` 不依赖 `@cloud/i18n`：request 只负责「给定 ALS 里的 locale 就本地化」，app 负责「cookie → locale」。
  - `apps/web/i18n/request.ts` 另把同一份注册表注入 next-intl 的 `errors` 命名空间，供客户端 / RSC 直接 `useTranslations("errors")(code)` / `getTranslations`。
  - 注册表外的 **app 级业务域 code**（如 auth）走 `registerErrorMessages(locale -> code -> 文案)` 注册进 server 端解析，`@cloud/request` 自身不收录这些域 code（保持通用）。Auth 文案在 `apps/web/lib/auth-error-messages.ts`，由 auth 路由顶部 side-effect import 触发注册。`storage.*` 仍保留英文兜底（开发向校验，价值低），未纳入本地化。
  - 复用同一个 code 配不同用户可见文案的，拆成专属 code（如登录/选组织各用 `ERR_AUTH_CREDENTIALS_REQUIRED` / `ERR_AUTH_ENTITY_REQUIRED`，不再共用 `ERR_AUTH_MISSING_FIELDS`），避免本地化后收敛成同一句。
- App Router 页面级兜底使用 `app/(portal)/error.tsx`、`app/(public)/error.tsx`、`app/global-error.tsx`、`app/not-found.tsx`；当前 Next.js 16 文档要求错误边界组件使用 `unstable_retry`。
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
- `@cloud/platform-config` 只做三件事：`defineAppManifest`（zod 校验 + 冻结）、`validateAppManifest`（完整性校验：menuCode/permissionCode 唯一、parent 存在不成环、目录必须有子级、契约合法、icon 合法）、`createPlatformConfig(manifests, { contractTypes })` → 暴露 `getPlatformManifest` / `getAppIds` / `getContractKeys` 三个 getter。**没有运行时注册表**（旧的 `registerAppManifest` Map + 双注册 hack 已删），构造期一次性校验全部 manifest + 跨 app appId 唯一，非法即拒启。
- 「解释逻辑」（侧边栏菜单树 / 角色权限目录 / 会话有效权限）不在包里，落在应用 `apps/web/manifest/select.ts`（纯函数，入参 manifest），消费方：`session-menus.ts` / `session-snapshot.ts` / `system/roles/page.tsx`。多 app 时这层按 app 复制（取舍：包保持极简，解释逻辑是应用业务）。
- 采集物 `apps/<app>/manifest/_generated/apps.ts` 由 `pnpm gen:manifest`（接 predev/prebuild/pretest）生成、**自包含序列化数据**：把所有 app 的 manifest 序列化成字面量 + 聚合 `CONTRACT_KEYS`（各 app `contractKeys` 并集，替代已删的 `_contracts.ts`），唯一 import 是可擦除的 `import type { AppManifest }`。**刻意不用 import barrel 跨 app 引用源码**——多 Next app 下 app 互相 import 源码会有打包问题；序列化后每个 app 各自自包含。该目录 gitignore（`apps/*/manifest/_generated/`），不提交。
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
