<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->



# AI 行为准则

本文档用于定义 AI 在本项目中的行为和遵循的规范。

## 总则

- 我们的目标是开发稳定可靠的产品
- 所以我们要追求：
    - 代码效率
    - 架构稳定
    - 可维护可复用
- 要勇于指出我的错误，当我的要求与上面的目标冲突时，直截了当跟我沟通
- 也要积极帮我思考，找出不同方案间的优劣和 trade off，帮我重塑决策
- 不要过度防御，不要为了兜底而兜底，马奇诺防线没有意义
- 约定大于配置，代码大于文档


## 文档

### 文档原则

- 只保留必要文档
- 在你开始各种工作时，请确保你已经了解各种文档记录的内容
- 文档内容应精准、及时更新
- 重要信息要精确精简，避免冗余
- 随时清理 TODO.md 和 WIP.md
- 及时维护 README.md 保证通过阅读这个文档可以无卡点的配置，启动项目。能够快速了解项目的结构和大体逻辑

### 常规文档

- README.md - 项目描述和使用指南


## 开发流程

- 拿到一个任务，先做计划，分解任务，列出 todo，写入 WIP.md
- 针对目标编写测试用例
- 逐项完成 todo，并确保测试通过
- 如有需要，记录文档以备不时之需
- 测试通过，验收完成之后，清理文档，将重要事项并入常规文档
- 涉及到项目配置的部分，需要确认 在 windows linux 下都能正常工作

## 开发指南

### 目录约定

- 登录前页面放在 `apps/admin/app/(public)`
- 登录后的后台页面放在 `apps/admin/app/(portal)`
- API 路由放在 `apps/admin/app/api`
- 业务实现（service / repository / mapper / policy / schema）放在 `apps/admin/service/<domain>/`，详见下面「服务端分层」
- 仅与具体业务无关的通用服务端工具放 `apps/admin/lib`；跨业务可复用能力沉淀到 `packages/*`
- 当前基线已经把后台壳子接在 `app/(portal)` 上，大多数业务页面默认加在这里

### 服务端分层（route / service / schema / policy / data）

> 业务实现按层拆分，落在 `apps/admin/service/<domain>/`。**不要再把业务逻辑堆在 route handler 里，也不要放进 route 目录下的 `_server/`**——`_server/` 是历史遗留写法（lint 会拦 route 直接 import `*.repository` / `*.mapper` / `@cloud/db`），见到顺手迁到 `service/`。

- **route**（`app/api/**/route.ts`）：只做 HTTP 适配。顺序 `assertPermissions → 解析参数 / zod parse → 调 service → 返回 envelope`，整体包在 `withApiHandler` 里。route **不直接 `import @cloud/db`**，也不直接 import `*.repository` / `*.mapper`，只依赖 service（需要 mapper 的纯 helper 时由 service re-export 转出）。
- **schema**（`service/<domain>/schemas/<domain>.schema.ts`）：client + server 共享的 zod，在 route parse、不在 service 里 parse。放在 `server/` 外面，因为客户端表单也要 import。
- **service**（`service/<domain>/server/<domain>.service.ts`）：业务编排。入参是「已解析的类型化数据 + 当前会话」，**绝不接收 `Request` / `NextRequest` / `URLSearchParams`**。可预期错误一律 `throw BusinessError`，由 route 的 `withApiHandler` 统一兜底。
- **policy**（`service/<domain>/server/<domain>.policy.ts`）：范围 / 实体级权限校验（例如「这条记录是否属于当前租户」「当前用户能否改这个目标」），尽量写成纯函数便于单测。
- **data**（`service/<domain>/server/<domain>.repository.ts` + `*.mapper.ts`）：repository 只做 prisma 查询 / 变更，无 session / 权限 / HTTP 感知；mapper 只做 Entity → VO。
- `server/` 下所有文件加 `import "server-only"`。
- 跨 domain 复用的纯 helper（如解析角色 JSONB 的 `service/_shared/role-codes.ts`）放 `service/_shared/`，不要让一个 domain reach 进另一个 domain 的 `server/`。
- 页面保持薄：`page.tsx` 只做顶层取数 + 组合，取数同样调 service（与 route 复用同一套 repository / service），不在 page 里手写 prisma 查询。
- 两层权限：route 做粗粒度码校验（`assertPermissions(['xxx.UPD'])`），service / policy 做范围校验；按钮显隐只是体验层，不是安全边界。
- 当前进度：`users` 域已按此结构迁好，可作样板参考（`apps/admin/service/users/`）；其余域逐步迁移。

### 共享能力复用

- `packages/*` 是项目级共享能力，开始实现前先检查现有包和导出，优先复用，避免在 `apps/*` 里重复造轮子
- 除非明确确认现有能力不满足需求，否则不要在业务代码里重新实现一套相同职责的工具、组件、鉴权、请求封装或数据库访问逻辑
- 需要新增共享能力时，先判断它是否应该沉淀到 `packages/*`；如果只是当前业务页面私有逻辑，优先放在业务目录，不要过早抽公共层
- 默认先通过包导出和源码快速了解能力边界，再开始编码；如果已有同职责实现，优先接入而不是平行再写一份
- 当前包职责可以先按下面理解：
  - `@cloud/ui`：共享 UI 组件、布局组件、主题能力、通用样式工具
  - `@cloud/request`：客户端请求封装、服务端响应辅助、错误码和错误提示
  - `@cloud/permissions`：权限判断、服务端权限聚合、服务端权限守卫、客户端权限上下文
  - `@cloud/db`：Prisma Client、数据库 schema、seed、数据库脚本入口
  - `@cloud/security`：服务端密码哈希与校验等安全基础能力
  - `@cloud/storage`：Amazon S3 上传会话、浏览器直传、服务端上传和存储配置归一化
  - `@cloud/config`：环境变量读取、配置校验、密码策略等基础配置能力
  - `@cloud/i18n`：`next-intl` 薄封装，固定 locale 清单、自定义 locale/时区 cookie、英文基底 + 深合并、格式预设、`TimeZoneInit`、locale/时区 server action（`@cloud/i18n/actions`）
  - `@cloud/api-kit`：API 兜底骨架 `createApiHandler`（控制流重抛 + `runWithLocale` 包装 + 未知异常 500），及本栈默认件 `mapAuthzError` / `mapPrismaError` / `resolveLocaleFromCookie` / `composeMappers`；各 app 在自己的 `lib/api-handler.ts` 里注入 config 组装出 `withApiHandler` / `handleApiError`

### 能力归属与配置注入（架构 rule，持续维护）

> 本节是踩坑沉淀的硬规则，新增/调整能力归属时回来更新，别让它过期。

- **能力的两端不要拆散**：一个能力若同时有客户端和服务端实现（加解密、请求封装、权限上下文、上传直传等），**整体沉淀进同一个 `packages/*` 包**，用 `./client` / `./server` 双入口（分别加 `client-only` / `server-only` 守卫），不要把其中一端留在 `apps/*` 里平行实现。
  - 反例（本仓真实踩坑）：RSA 登录加密——解密放了 `@cloud/security/server`，却差点把浏览器端加密写在 `apps/admin`。正确做法是同包加 `@cloud/security/client` 的 `encryptRsaOaep`，与 `server` 的 `decryptRsaOaep` 成对。
  - 判断「该不该进包」：跨业务可复用、职责边界清晰 → 进包双入口；仅当前页面私有逻辑 → 留业务目录，别过早抽公共层。
- **包只做纯能力，配置由业务侧注入**：密钥、凭证、连接串、bucket、私钥/公钥等**运行期配置不在包内读 `.env`**，由业务侧（`@cloud/config` 或路由）读出后作为参数显式传入包函数（沿用 `@cloud/storage` 的 S3 配置注入范式）。
  - 包函数签名优先 `fn(input, config)`，而不是 `fn(input)` 内部偷读 env。
- **部署相关的常量留在 app**：写死前端的公钥 PEM、对外 URL、展示名等部署/环境相关字面量留在 `apps/*`（如薄 wrapper），不进通用包；通用包保持与具体部署解耦。
- 新增包能力前，先按上面三条自检：两端是否拆散了？是否在包里偷读 env？是否把部署常量塞进了包？

### 存储与 S3

- 连接 Amazon S3、生成临时上传凭证、服务端上传文件时，统一通过 `@cloud/storage/server`
- 浏览器直传 S3 时，统一通过 `@cloud/storage/client`，大文件分片上传也在此包内处理
- 默认上传策略：`<= 5 MB` 的浏览器文件可走服务端 `uploadFileToS3FromServer()`，`> 5 MB` 走 `createS3UploadSession()` + `uploadFileToS3FromBrowser()` 直传；直传中 `> 100 MB` 默认 multipart
- 不要在业务代码里直接 new AWS SDK 的 `S3Client` / `STSClient`，除非先确认 `@cloud/storage` 无法覆盖需求并同步沉淀包能力
- S3 配置由业务侧从环境变量读取后显式传入 storage package，storage package 不直接读取 `.env`
- 上传完成后的文件本体记录统一落在 `storage_object`，历史列表、下载、公开访问都以这张表为准
- `storage_object.object_url` 是对象的稳定访问地址，不等于授权下载；私有文件下载必须先按当前租户校验数据库记录，再由服务端生成短期 S3 GET 链接
- 下载链接默认有效期是 5 分钟；生成下载链接前优先做 S3 `HeadObject` 校验，避免把用户直接带到 S3 XML 错误页
- 文件去重以同租户、同可见性、同 `contentHash(SHA-256) + sizeBytes + ACTIVE` 为准；命中重复文件时复用已有 `storage_object`，不新增上传记录
- `uploadUrl` 只用于生成上传会话或推导对象地址，不再写入数据库
- 文件业务归属不要塞进 `storage_object`；应用包、头像、合同附件等业务关系统一写入 `storage_attachment`，用 `subjectType + subjectId + purpose` 表达绑定关系
- 公开图片使用 `storage_object.visibility = PUBLIC`，只允许 `image/*`，且对象 key 必须落在 `public/` 前缀；公开文件才返回可直接访问的 `accessUrl`
- S3 bucket policy 只应对 `public/*` 开放匿名 `s3:GetObject`，不要公开整个 bucket；这只解决公开读取，不给应用身份增加上传权限
- 应用使用的 AWS 身份或被 assume role 必须允许目标 prefix 的 `s3:PutObject`；私有下载和下载前校验还需要 `s3:GetObject`

### 页面开发

- 新增后台页面时，优先在 `apps/admin/app/(portal)` 下创建路由目录和 `page.tsx`
- App Router 页面组件默认使用服务端组件，除非有明确交互需求再加 `"use client"`
- 只需要登录态的页面，调用 `requireSession()`
- 页面本身有明确权限要求时，优先调用 `requirePermissions()`，不要只在前端做按钮显隐
- 页面保持薄：`page.tsx` 只做鉴权 + 顶层取数 + 组合，取数调对应 domain 的 service（见「服务端分层」），不在 page 里手写 prisma 查询或业务逻辑
- 页面级异常兜底沿用现有文件：
  - `apps/admin/app/(portal)/error.tsx`
  - `apps/admin/app/(public)/error.tsx`
  - `apps/admin/app/global-error.tsx`
  - `apps/admin/app/not-found.tsx`
- 调整错误边界前先阅读 `node_modules/next/dist/docs/` 中当前 Next.js 版本的错误处理约定；当前错误边界重试入口是 `unstable_retry()`

### 菜单约定

- 当前菜单来自数据库 `menu` 表，不是写死在前端
- 相关模型优先查看 `packages/db/prisma/schema.prisma` 和 `packages/db/prisma/seed.ts`
- 新增默认菜单时，优先修改 seed，再执行 `pnpm db:seed`
- 临时调试可以使用 `pnpm db:studio` 直接改表
- 菜单要可访问，必须同时满足：
  - `path` 对应页面已存在
  - 菜单绑定到当前用户角色对应的 `roleId`

### 鉴权与权限

- 登录态与权限守卫优先直接从 `@cloud/permissions/server` 引入，不要在业务代码里继续写很深的相对路径
- `apps/admin/lib/auth.ts` 目前只保留兼容导出，默认不要作为新代码入口
- `getSession()` 用于读取会话，未登录时返回 `null`
- `requireSession()` 用于强制登录，未登录时会跳转并清理状态
- `assertPermissions()` 用于接口 / Route Handler 的服务端权限校验
  - 未登录时抛 401
  - 已登录但缺权限时抛 403
- `requirePermissions()` 用于 page / layout 的服务端权限校验
  - 未登录时跳转登出链路
  - 已登录但缺权限时跳转 `/403`
- `packages/permissions` 已承载：
  - 登录态读取与 session 聚合
  - 服务端权限守卫
  - 客户端权限上下文与 UI 级判断
- 前端权限控制只能用于体验层，不是安全边界
  - 隐藏按钮、菜单可以放在前端
  - 真正的读写保护必须落在服务端守卫上
- 后端接口不要只做 `getSession()` 判断后直接执行敏感操作
  - 只要接口存在明确权限要求，优先改为 `assertPermissions()`
- 页面不要只靠 layout 或客户端组件兜权限
  - 权限判断要尽量贴近实际页面和数据入口
- 当前默认权限模型已经包含 `permission` 表，以及 `role -> permission -> menu` 聚合链路
- 如果要新增细粒度权限，优先保持下面这条链路一致：
  - `packages/db/prisma/seed.ts` 补权限码
  - 角色绑定权限
  - 页面、接口接入对应的服务端守卫

### 接口与请求

- 本项目不使用 Server Action
  - 所有表单提交、数据 mutation 一律走 Route Handler（`apps/admin/app/api/*`）
  - 鉴权、登录、选择组织等公开页面的提交同样走 API，不写 `"use server"` action
  - 客户端用 `@cloud/request/client` 调接口，拿到返回后再自行用 `useRouter()` 跳转
  - 历史遗留的 Server Action 见到即顺手改成 API，不要新增
- 统一通过 `packages/request` 发起请求
- 客户端使用 `@cloud/request/client`
- 客户端收到「会话失效类」401 会自动跳登出，机制在包、策略在 app，**不要在业务组件里手写 401 跳转**：
  - 包：`@cloud/request/client` 的 `setUnauthorizedHandler(fn)` 在 `status===401` 时回调 `fn(RequestError)`，然后照常 throw（不吞错，组件原有 `catch` / `toastError` 不变）；包不认识任何 app 路由或错误码
  - 策略：`apps/admin/lib/session-expiry.ts` 的 `handleUnauthorized` 按**白名单 code** 决定是否登出——`{ "unauthenticated", ERR_UNAUTHORIZED, ERR_AUTH_NOT_AUTHENTICATED }` 命中才 `window.location.replace("/api/auth/logout")`（与服务端 `requirePermissions` 401 出口一致：清残留 cookie → 303 `/login`）；模块级 `redirecting` 锁防并发重复跳
  - 登录页凭证错误 `ERR_AUTH_INVALID_CREDENTIALS` 也是 401，但**刻意不在白名单**，不会误跳；新增 401 码默认不触发登出，属于「会话失效」语义才往白名单补
  - 注册：`apps/admin/app/_components/unauthorized-redirect.tsx`（tiny client 组件）在根 layout 挂一次
- 服务端响应优先使用 `@cloud/request/server` 提供的响应辅助函数
- 成功 JSON 响应必须走 `successResponse()` / `createdResponse()`，body 形状为 `{ code: "OK", message: "success", data, page?, limit?, total?, totalPages?, nextCursor?, prevCursor?, hasNextPage?, hasPrevPage?, traceId }`，分页字段与 `data` 同级
- DELETE 或其他无需 body 的接口使用 `noContentResponse()` 返回 204，response body 必须为空
- 分页分两种，按需选用，不要混用：
  - 偏移分页用 `Pager`（`page` / `limit` / `total` / `totalPages`），适合需要页码、总页数的场景
  - 双向游标分页统一走 `@cloud/request/server` 的 `readCursorQuery(token, direction)` + `buildCursorPage()`，配合 `CursorPager`，响应带 `nextCursor` / `prevCursor` / `hasNextPage` / `hasPrevPage`
  - 游标 token 由服务端 `encodeCursor()` 签发、只编码锚点 id、对客户端不透明；翻页方向是独立的 `direction` 参数，由客户端显式传，**不编进 token**
  - 服务端按 `query.sortOrder` 设 `orderBy`、`take: limit + 1` 多取一条探测，再交给 `buildCursorPage()` 切片、翻回升序、签发双向游标；不要在 Route Handler 里手写这套逻辑
  - 客户端用 `apps/admin/lib/use-cursor-pagination.ts` 的 `useCursorPagination()` 原样回传服务端给的游标 + 方向，**绝不从行 id 自己拼游标**，也不缓存历史游标
- 新增接口时，优先放在 `apps/admin/app/api/*`，且**只做 HTTP 适配**，业务逻辑落到 `service/<domain>/`（见「服务端分层」）
- Route Handler 默认做两层权限：
  - 登录态 / 粗粒度权限码：优先用 `assertPermissions()`（在 route 里做）
  - 业务归属 / 范围校验：例如 `entityId`、`roleId`、`userId` 是否属于当前租户——落在 service / policy 层
- Route Handler 的异常兜底统一走 `apps/admin/lib/api-handler.ts`（设计与示例见 `docs/exception-handling.md`）
  - **业务异常一律 throw 类型化异常，不再 return 错误响应**：参数校验、业务冲突、数据不存在等可预期错误用 `throw new BusinessError(code, status?, params?)`（`@cloud/request`），由 `withApiHandler` 捕获后统一出 40x `{ code, message, traceId }`
    - `code` 走 `PMMNNN` 数字码（注册表内才本地化）；`status` 限 `400|401|403|404|409|422`，默认 400；`params` 是 `{name}` 占位插值参数，渲染进文案、不进响应体
    - 中间件/基础设施故障（DB 连接、Redis、邮件等）用 `throw new MiddlewareError(ERR_MW_*)`，统一掩码成 503 通用文案（对客户不透明，开发凭 code + traceId 在日志识别）
    - 开发者诊断信息自己 `console.error` 打（`BusinessError` 不带 devMessage）；所有被捕获的异常都会连堆栈进日志
  - **仍然禁止 `throw new Error("文本字符串")`** 表达业务错误——要带稳定 `code`，用 `BusinessError` / `MiddlewareError`，不要裸 `Error`
  - `badRequestResponse()` / `notFoundResponse()` / `errorResponse()` 降级为「mapper 内部构造 Response 用」，业务代码不再直接调用；rsc 页面级预期错误仍走 `notFound()` / `redirect("/403")`
  - 默认用 `withApiHandler()` 包裹整个 handler，不要在每个文件里手写 `try { ... } catch (error) { return handleApiError(error) }`
    - 写法：`export const POST = withApiHandler(async (req) => { ... })`
    - 带动态路由参数时第二个参数照常透传：`withApiHandler(async (req, { params }) => { ... })`
    - S3 / 存储接口把 `onError` 作为 `withApiHandler()` 的第二个参数：`withApiHandler(async () => { ... }, { onError: s3ErrorResponse })`
    - handler 内部解析 JSON / formData 的局部 `try / catch` 不受影响，照常保留
  - `withApiHandler()` 内部捕获异常后调用 `handleApiError()`；确需手动兜底时仍可直接 `return handleApiError(error)` / `return handleApiError(error, { onError: s3ErrorResponse })`
  - `handleApiError()` 已统一处理 `AuthzError`、常见 Prisma 错误和未知异常；不要在每个 API 文件里重复写 `AuthzError` 分支
  - Next 控制流异常（redirect / notFound）必须继续抛出，不能被自定义 catch 吞掉
- 错误码是接口协议，message 是展示文案
  - 前端逻辑、测试、监控优先依赖稳定 `code`
  - `message` 可以调整和国际化，不应作为业务判断依据
  - 成功和失败 JSON 响应都带 `traceId`；204 无 body 响应不带 `traceId`
  - 错误文案由服务端按当前 locale 本地化，**code 为准**：`@cloud/request/error-messages` 注册表里有该 `code` 就按 locale 出文案，`errorResponse()` 的 `message` 参数只是「注册表外 code」（如 `storage.*` / `database.*` / permissions 的 `forbidden`）的兜底
    - `handleApiError` 把 `AuthzError` 401 统一映射成注册表内的 `ERR_UNAUTHORIZED`（包内置三语、始终在场，全路由可本地化）；403 暂仍用 `forbidden` + 英文兜底
    - 注册表内的 code 走 `@cloud/request` 的错误码（`ERR_*`），新增错误码时同步在 `error-messages/{en,zh-CN,ja}.ts` 补三语，少补会编译报错
    - locale 由 `withApiHandler()` 在进 handler 前读 `LOCALE_COOKIE` 解析、用 `runWithLocale()` 注入请求级上下文；`errorResponse()` 等响应辅助保持同步，不在里面读 cookie
    - 没走 `withApiHandler()`（或非请求上下文）时 locale 回退英文
- 不要把“前端看不到入口”当作接口安全前提

### 国际化 / i18n

- **页面文案禁止硬编码**：所有面向用户的可见文案（页面、组件、表单、按钮、提示、空态、错误展示等）一律走 i18n，从 message 取，不在 JSX / 字符串里写死中英文字面量
  - 客户端组件用 `useTranslations`，RSC 用 `getTranslations`，文案落到 `apps/admin/i18n/messages/`，`en.json` 为基底
  - 新增文案先补 key，再在页面引用，不要先硬编码再说
  - 新增或修改面向用户的文案时，`en` / `zh-CN` / `ja` 三种 locale 都要同步补齐；初版可以先用机器翻译占位，但不要只写英语依赖回退
  - 例外：日志、调试信息、不展示给用户的内部标识不强制
- 国际化统一走 `@cloud/i18n`（`next-intl` 薄封装），**禁止在业务或 UI 里直接 import `next-intl`**，lint 会拦
  - RSC / route handler 用 `@cloud/i18n/server`（`createI18nRequestConfig` / `deepMerge` / `set*Action`）
  - 客户端组件用 `@cloud/i18n/client`（`useTranslations` / `useFormatter` / `TimeZoneInit` 等）；语言切换的 server action 从 `@cloud/i18n/actions` 取
  - 共享常量、类型用根入口 `@cloud/i18n`（`locales` / `Locale` / `isLocale` / cookie 常量 / `formats`）
- locale 清单固定为 `["en", "zh-CN", "ja"]`，一律 `import { locales }`，不要在应用层重写数组；增删语言改 `packages/i18n`
- cookie 名用常量 `LOCALE_COOKIE` / `TZ_COOKIE`，禁止硬编码 `"NEXT_LOCALE"`、`"locale"` 字面量
- locale / 时区收窄用 `isLocale(x)`，禁止 `as Locale`；`set*Action` 对非法输入静默 no-op，需要给用户反馈就在输入边界自行校验
- message 以 `en` 为基底，其余 locale 只写与英文不同的 key，缺 key 自动回退英文；回退只作为兼容兜底，不作为新增文案时偷懒不翻译的理由
- namespace 用点分层级、与模块对应（`auth.login.*`、`system.users.*`、`ui.datePicker.*`）；`ui.*` 命名空间归 `@cloud/ui` 占用，使用其日期组件的页面必须提供 `ui.datePicker.*`，否则开发期触发 missing message
- 数字 / 日期格式化走 `formats` 预设（`useFormatter` + `numberFormats` / `dateTimeFormats`），不在业务里散落 `Intl.NumberFormat` 配置；新增样式改 `packages/i18n` 的 `formats.ts`
- 切换语言 / 时区只通过 `set*Action`（`@cloud/i18n/actions`）+ `router.refresh()`，不自己写 cookie；语言切换 UI（`LocaleSwitcher`）在 `apps/admin` 用 `@cloud/ui` 的 `Popover` 组合（不用 `DropdownMenu`：header 是 `sticky z-sticky`，而 `DropdownMenuContent` 钉死 `z-50` 且不暴露 Positioner className，会被 header 盖住；`Popover` 用 `z-popover` 高于 header），不放回 `@cloud/i18n`（否则与 `@cloud/ui → @cloud/i18n` 循环依赖）
- 开发期 `missing message` 抛错是特性，补 key，不要去关 `getMessageFallback`
- 接入新应用必须四件套齐全：`withNextIntl` 插件 → request config 调 `createI18nRequestConfig` → root layout 包 `NextIntlClientProvider` → 树内挂 `TimeZoneInit`；root layout 的 `<html lang>` 读实际 locale，不要硬编码

### 默认开发链路

1. 在 `app/(portal)` 下新增页面
2. 在 `packages/db/prisma/seed.ts` 或数据库里补齐菜单
3. 判断页面是“只需登录”还是“需要明确权限”
4. 页面分别接 `requireSession()` 或 `requirePermissions()`
5. 在 `app/api/*` 下新增接口
6. 接口优先用 `assertPermissions()` 做服务端权限守卫
7. 前端通过 `@cloud/request/client` 调接口
8. 最后再补客户端的按钮显隐和交互细节




## 代码规范

- 除非专门提及，否则默认使用 TypeScript，尽可能把类型写好
- 除非特地指出，否则不要修改 `packages/*` 下面的代码
- 不要用 JSDoc，用 TypeScript 类型系统，不要 `any`
- 命名
  - 变量和函数使用驼峰命名法（camelCase）
  - 类和接口使用帕斯卡命名法（PascalCase）
  - 常量使用全大写加下划线（UPPER_SNAKE_CASE）
  - 文件和目录使用小写加连字符（kebab-case）
  - 避免使用缩写，除非是广泛认可的缩写
  - 函数使用动词或动宾短语命名，类使用名词命名，bool 变量使用 is/has/can 开头
- 单组件、库、脚本的长度不要超过 400 行，尽量控制在 300 行附近
- 适量注释，配置项、变量要足够
- 新增或迁移代码要适当补充注释，优先解释业务意图、架构边界、兼容壳、迁移原因和安全取舍；不要写复述代码表面行为的注释



## 安全

<!-- - 不要访问项目里面的 .env 文件 -->
- 如果你需要做一些操作，必须 .env，可以通过编写脚本，由我运行。比如，你要从数据库同步一些数据当作参考，就可以这么做。

## 数据库

如果数据库的 key 名没有重复和歧义，尽量保持所有的表一致。
数据的关联关系大部分都是通过关联关系表进行查询。 除非是为了性能优化，且 关联关系值为单值。 数组是不行的 

### 已批准例外：角色/权限关联用 JSONB 数组

- 对齐系统 DB 脚本（Partner/Contract/Role/User/MFA/Invite）后，**两处**关联刻意用 JSONB 数组替代关联表，是上面「数组不行」规则的**已批准例外**：
  - `sys_partner_user.roles`：用户在某 partner 下绑定的角色，`List<{roleId}>`，取代旧 `sys_user_role` join 表
  - `sys_role.permission_codes`：角色含的权限码，`List<string>`，取代旧 `sys_role_permission` join 表
- 理由：读多写少、反查频率低（「哪些用户绑角色 X / 哪些角色含权限 Y」），会话聚合一次性读出后在内存里派生；脚本也为这两列配了 GIN 反查索引意图（Prisma 暂不发 GIN，反查走 `array_contains`）。
- **不要扩大这个例外**：新增关联关系仍默认走关联表；只有同样满足「读多写少 + 单一聚合入口 + 反查低频」时，回到本节讨论后再加。
