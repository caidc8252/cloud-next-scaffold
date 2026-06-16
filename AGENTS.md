# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# AI 行为准则

本文件是 AI 在本项目的**常驻**行为准则：哲学 + 目录地图 + 硬不变量 + 文档索引。深度细节按需读 `.claude/docs/*`（每条硬不变量都标了「动手前先读 X」）。

## 总则

- 我们的目标是开发稳定可靠的产品
- 所以我们要追求：代码效率、架构稳定、可维护可复用
- 要勇于指出我的错误，当我的要求与上面的目标冲突时，直截了当跟我沟通
- 也要积极帮我思考，找出不同方案间的优劣和 trade off，帮我重塑决策
- 不要过度防御，不要为了兜底而兜底，马奇诺防线没有意义
- 约定大于配置，代码大于文档

## 目录地图

先判断代码归属，再决定目录：产品业务优先落 `apps/*`；跨应用、跨业务可复用能力才沉淀 `packages/*`；不要在业务目录混放测试/脚本/配置。

- `apps/admin`（后台管理，默认主应用）：登录前页面 `app/(public)`；后台页面 `app/(portal)`（大多数业务页默认加这）；API 路由 `app/api`（只做 HTTP 适配）；业务实现 `service/<domain>/`（schema/service/policy/repository/mapper 分层）；私有工具 `lib`；私有组件就近 `_components`；菜单 `manifest`；文案 `i18n/messages`。
- `apps/portal`（对外门户，**不要放后台页面**）：认证 `app/(auth)`；控制台 `app/(console)`；官网/营销 `app/(marketing)`；其余目录约定同 admin。
- 新增应用参考 `apps/admin` 结构（`app`/`service`/`lib`/`manifest`/`i18n/messages`），按职责裁剪，不另起不兼容约定。
- `packages/*` 只放项目级共享能力，新增前先查现有导出避免重复造轮子：`ui`(共享UI/布局/主题) `request`(请求封装/响应辅助/错误码) `permissions`(登录态/守卫/上下文) `db`(Prisma/seed) `security`(哈希/加解密) `storage`(S3) `config`/`platform-config`(env/校验) `i18n`(locale/格式/cookie) `api-kit`(handler 骨架) `cache`。
- `e2e` 放端到端测试；单测/组件测试就近放；`scripts` 放仓库级脚本（只服务单包的放包内）。
- 根目录只放 monorepo/构建配置与项目文档；`.next`/`node_modules`/产物/缓存/生成文件不手改、不作依赖。

## 硬不变量 + 文档索引

下面每条是**绝不能违反**的铁律；「怎么做」的完整规格在对应 doc，**动手前先读**。

- **服务端分层**：业务逻辑落 `service/<domain>/`，route 只做 HTTP 适配，不直接 `import @cloud/db` / `*.repository` / `*.mapper`；`_server/` 是历史遗留，见到顺手迁 `service/`；页面保持薄、默认 RSC（有交互才加 `"use client"`）、取数调 service。→ 写 service/route/页面取数前读 `.claude/docs/server-layering.md`
- **接口与请求**：**不用 Server Action**，一切 mutation 走 Route Handler；业务错误一律 `throw BusinessError`（带 `PMMNNN` 码）/ `MiddlewareError`，**不裸 `throw new Error("文本")`**；成功走 `successResponse()`/`createdResponse()`，204 用 `noContentResponse()`；默认 `withApiHandler()` 兜底；错误码是协议、message 是展示。→ 写接口/改请求响应/分页前读 `.claude/docs/api-and-requests.md`
- **i18n**：所有用户可见文案走 message、**禁止硬编码**；统一走 `@cloud/i18n`，禁止直接 import `next-intl`；`en`/`zh-CN`/`ja` 同步补齐，`en` 为基底。→ 新增/改文案前读 `.claude/docs/i18n.md`
- **鉴权与权限**：前端只是体验层，**读写保护必须落服务端守卫**；route 用 `assertPermissions()`，page/layout 用 `requirePermissions()`，范围校验落 service/policy；菜单走 role→permission→menu 链路。→ 接登录态/权限/菜单前读 `.claude/docs/auth-permissions.md`
- **存储与 S3**：统一走 `@cloud/storage`，不在业务里 new AWS SDK；配置由业务侧注入、包不读 `.env`；项目不提供统一文件表，S3 返回的文件信息由各业务表按需保存；公开文件限 `public/` 前缀。→ 动 S3/上传下载前读 `.claude/docs/storage-s3.md`
- **邮件**：发邮件统一走 `@cloud/mail` 推 Redis `mail:queue`（外部平台消费发信），不直接发信 / 不直接 `lpush`；`content` 极简 HTML 且变量 `escapeHtml`、`title` 纯文本；模板落各 app `lib/email/`、文案走 i18n `email.*`、译者 app 注入；队列背压 500 + 用户可触发邮件按收件人节流；包不读 env。→ 发邮件前读 `.claude/docs/email-capability.md`
- **能力归属**：能力两端（client/server）不拆散、整体进同一包双入口；包只做纯能力、配置业务侧注入、不偷读 env；部署常量留 app。→ 抽包/调整能力归属前读 `.claude/docs/capability-ownership.md`
- **UI 页面样式**：portal 业务页（列表/新增/详情）只用 `@cloud/ui` 原语 + 语义/圆角 token，**不写任意值**字号/间距/宽高/颜色/圆角；选中态压过 hover、危险操作必带 danger 变体、icon-only 按钮只 `ghost`/`ghost-danger`；吸附到刻度不照搬原型像素。→ 写 portal 列表/新增/详情页前读 `.claude/docs/portal-page-style-spec.md`
- **日志**：服务端打日志统一走 `@cloud/log` 的 `createLogger("<scope>")`，**不裸 `console.*`**；单一 JSON 行格式、`LOG_LEVEL` 控级；请求级 `traceId`/`seq` 由 `withApiHandler` 经 `AsyncLocalStorage` 自动携带，错误响应与日志共用同一 traceId。→ 打服务端日志前读 `.claude/docs/logging.md`
- **站内通知**：给用户发站内通知统一走 `service/notification` 的服务端内部 `createNotice`（唯一生产者、不暴露建通知 API、跨 app 可写同 `sys_notice`），**不自己 `prisma.sysNotice.create`**；payload 四件套 `summary`+`detail`(均必含非空)/`fields[]`/`links[]`；`noticeType="<module>.<event>"`（module 前端派生不落库）；文本按**收件人 `sys_user.locale`** 渲染好再传（展示端不翻译）、`links.url` 生产者拼好；埋点在业务事件点 `try/catch` 调、**失败非阻断**。→ 发通知/接埋点前读 `.claude/docs/notice.md`

## 默认开发链路

1. 在 `app/(portal)` 下新增页面
2. 在 `packages/db/prisma/seed.ts` 或数据库里补齐菜单
3. 判断页面是「只需登录」还是「需要明确权限」
4. 页面分别接 `requireSession()` 或 `requirePermissions()`
5. 在 `app/api/*` 下新增接口
6. 接口优先用 `assertPermissions()` 做服务端权限守卫
7. 前端通过 `@cloud/request/client` 调接口
8. 最后再补客户端的按钮显隐和交互细节

## 代码规范

- 默认 TypeScript，类型写好；不要 `any`，不用 JSDoc 用类型系统
- 除非特地指出，不要修改 `packages/*` 下的代码
- 命名：变量/函数 camelCase；类/接口 PascalCase；常量 UPPER_SNAKE_CASE；文件/目录 kebab-case；避免非通用缩写；函数用动词/动宾、类用名词、bool 用 is/has/can 开头
- 单组件/库/脚本不超过 400 行，尽量 300 行附近
- 适量注释；新增/迁移代码优先解释业务意图、架构边界、兼容壳、迁移原因和安全取舍，不写复述代码表面的注释

## 数据库

- 若 key 名无重复歧义，尽量保持所有表一致。
- 读多写少、聚合入口明确、反查低频的关联可以用 JSONB 数组保存 id，避免无意义的通用关联表。
- 文件信息默认由业务表字段表达：可以只存 URL，也可以存 objectKey、bucket、contentType、sizeBytes、etag 等 S3 返回信息；多文件建议用 JSONB 数组，数组顺序就是展示顺序。
- 写入文件信息前必须在 service 层完成业务权限、业务对象归属、文件类型、可见性和 S3 `HeadObject` 校验；需要反查、去重或清理时由业务域自己评估索引或专门查询方案。
