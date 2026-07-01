# 能力归属与复用

> 归属：`packages/*` 复用边界、能力两端不拆散、包不偷读 env、部署常量留 app。**新增/调整共享能力或抽包前必读。**

## 共享能力复用

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

## 能力归属与配置注入（架构 rule，持续维护）

> 本节是踩坑沉淀的硬规则，新增/调整能力归属时回来更新，别让它过期。

- **能力的两端不要拆散**：一个能力若同时有客户端和服务端实现（加解密、请求封装、权限上下文、上传直传等），**整体沉淀进同一个 `packages/*` 包**，用 `./client` / `./server` 双入口（分别加 `client-only` / `server-only` 守卫），不要把其中一端留在 `apps/*` 里平行实现。
  - 反例（本仓真实踩坑）：RSA 登录加密——解密放了 `@cloud/security/server`，却差点把浏览器端加密写在 `apps/web`。正确做法是同包加 `@cloud/security/client` 的 `encryptRsaOaep`，与 `server` 的 `decryptRsaOaep` 成对。
  - 判断「该不该进包」：跨业务可复用、职责边界清晰 → 进包双入口；仅当前页面私有逻辑 → 留业务目录，别过早抽公共层。
- **包只做纯能力，配置由业务侧注入**：密钥、凭证、连接串、bucket、私钥/公钥等**运行期配置不在包内读 `.env`**，由业务侧（`@cloud/config` 或路由）读出后作为参数显式传入包函数（沿用 `@cloud/storage` 的 S3 配置注入范式）。
  - 包函数签名优先 `fn(input, config)`，而不是 `fn(input)` 内部偷读 env。
- **部署相关的常量留在 app**：写死前端的公钥 PEM、对外 URL、展示名等部署/环境相关字面量留在 `apps/*`（如薄 wrapper），不进通用包；通用包保持与具体部署解耦。
- 新增包能力前，先按上面三条自检：两端是否拆散了？是否在包里偷读 env？是否把部署常量塞进了包？
