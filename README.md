# Cloud Frontend Scaffold

内部使用的 Next.js App Router Monorepo 脚手架仓库。当前仓库本身就是脚手架源码仓，同时也保留了一套可直接运行的后台基线。

## 默认保留的基线能力

- `apps/web`：唯一应用（原 `apps/admin` + `apps/portal` 已合并）——登录前页 `app/(portal)` + 控制台 `app/(dashboard)`，业务实现在 `modules/<cat>/<mod>/`
- `packages/ui`：基础 UI 组件与样式
- `packages/request`：通用请求封装与错误码
- `packages/api-kit`：API 兜底骨架与本栈默认错误映射（跨 app 复用）
- `packages/config`：环境变量校验
- `packages/cache`：Redis 客户端与 JSON KV 缓存封装
- `packages/storage`：Amazon S3 上传会话、对象校验、服务端上传与下载链接封装
- `packages/db`：Prisma + PostgreSQL 数据层
- `packages/security`：密码哈希、RSA 加解密
- `packages/permissions`：权限判断 + 服务端登录态与前端权限 hook
- `apps/web/modules/system/*`：系统管理模块（用户管理、角色管理）
- API 统一错误响应、权限异常兜底、页面级错误边界
- 登录页、登录态、Partner 选择页、锁定说明页
- Entity / 合同 / 用户 / 角色 数据模型 + CoC 声明的菜单 / 权限（零 DB 菜单）
- 左侧菜单 + 顶部导航 layout
- 默认管理员种子账号

## 启动当前仓库

要求 Node.js `>=20.19.0`（Prisma 7 要求）。单一应用 `apps/web`，本地跑在 **http://localhost:3000**。

### 一次性准备

```bash
pnpm install
cp .env.example .env                       # 根 .env：数据库 / 认证密钥 / Redis
cp apps/web/.env.example apps/web/.env     # web app 级变量（展示名等）
docker compose up -d                       # 本地 PostgreSQL + Redis
pnpm db:setup                              # generate + push + seed
```

### 启动开发服务器

```bash
pnpm dev        # = pnpm dev:web，跑在 :3000
```

打开 http://localhost:3000。登录入口 `/login`（在 `app/(portal)` 内）；登录成功后在 `/select-partner` 选择 partner（只有一个可选时自动跳过），校验归属、生成完整权限 session 后进入控制台 `app/(dashboard)`。登出回到 `/login`。

默认种子账号：

- 账号：`admin`
- 密码：`ChangeMe!123`

## 当前工作区

- `apps/web`
- `packages/api-kit`
- `packages/config`
- `packages/cache`
- `packages/db`
- `packages/i18n`
- `packages/permissions`
- `packages/request`
- `packages/security`
- `packages/storage`
- `packages/ui`

## 仓库结构

```txt
apps/
  web/                    # 唯一应用（原 admin + portal 合并）
    app/
      (portal)/           # 登录前页面（login, select-partner, onboarding, locked）
      (dashboard)/        # 登录后控制台页面 + layout / 面包屑
      api/                # API 路由（只做 HTTP 适配）
      _components/        # app 级共享组件
    modules/              # 业务模块 <cat>/<mod>/：server / ui / client / schema + CoC manifest.ts + i18n
    manifest/             # CoC 声明与采集：menu-tree / collect / catalog / _generated（产物，gitignored）
    lib/                  # app 私有工具（session-snapshot、session-menus 等）
    i18n/messages/        # 全局文案
packages/
  api-kit/                # API 兜底骨架 createApiHandler + 本栈默认错误映射
  cache/                  # Redis client + JSON KV cache
  config/                 # 环境变量校验
  db/                     # Prisma schema + 种子数据
  i18n/                   # next-intl 薄封装：locale/时区 cookie + 英文基底合并 + 格式预设
  permissions/            # PermissionChecker + 登录态、DAL、session cookie + client hooks
  request/                # 请求封装 + 响应辅助 + 错误码
  security/               # argon2 密码哈希, RSA 加解密
  storage/                # Amazon S3 上传会话 + 服务端上传 + 下载链接
  ui/                     # 基础 UI 组件
scripts/
  prisma.mjs              # Prisma 统一调用脚本
```

Prisma 7 使用 `packages/db/prisma.config.ts` 作为 CLI 配置入口，Prisma Client 生成到 `packages/db/generated/prisma`。该目录不提交到 git，首次启动、构建前需要执行 `pnpm db:generate`。

## 数据模型

当前基线采用 Entity（组织）+ Contract（合同）驱动的多租户权限模型。

### 核心表关系

```
Entity ──┬── EntityContract（合同：决定该 Entity 解锁哪些 CoC 菜单 / 权限）
         ├── EntityUser ── User   （authorizingType: NORMAL / ADMIN）
         └── Role（PRIVATE，permission_codes JSONB）── UserRole（entity + user + role）
```

> 菜单 / 权限 / GLOBAL 角色**不在数据库**：由 CoC 声明系统生成（零 DB，无 `sys_menu` / `sys_permission`），见 `.claude/context/injections/references/coding-rules/coc-declaration.md`。DB 只存 Entity / 合同 / 用户 / 关联 / PRIVATE 角色。

### 关键概念

| 概念           | 说明                                                                                   |
| -------------- | -------------------------------------------------------------------------------------- |
| Entity         | 组织/租户(party)。用户通过 EntityUser 关联到 Entity                                    |
| EntityContract | 该 Entity 持有的合同；合同决定 CoC 里解锁哪些叶子菜单 / 权限码（即 party scope）         |
| EntityUser     | 用户与组织的关联，含 `authorizingType`（NORMAL/ADMIN）和 `status`（ACTIVE/INACTIVE）   |
| Role           | 角色。GLOBAL（roleId ≤ 1000）由 CoC 死写不入库；PRIVATE（≥ 1001）入 `sys_role`、权限码存 `permission_codes` JSONB |
| 菜单 / 权限    | **CoC 声明、零 DB**（见 `.claude/context/injections/references/coding-rules/coc-declaration.md`），不是数据库表              |

### 两种锁定机制

1. **密码错误锁定（用户级）**：连续错误 5 次自动锁定 `sys_user.status = LOCKED`，30 分钟后自动解锁
2. **管理员停用（Entity-User 级）**：管理员手动切换 `sys_entity_user.status` ACTIVE/INACTIVE，只影响该用户在该组织内的访问

### ADMIN 授权类型

当 `EntityUser.authorizingType = ADMIN` 时：

- 有效权限 = 整个 party scope（合同解锁的全部 CoC 权限码），无视所绑角色（§7 结构旁路）
- 角色仍正常加载用于展示，但不参与 ADMIN 的权限计算
- 管理员不能对 ADMIN 用户执行停用、重置密码、角色变更等操作，只能修改备注

## 登录与鉴权

### 登录流程

```
密码验证通过
  → 仅一个 ACTIVE Entity → 直接进入后台
  → 多个 Entity，有 ACTIVE → 跳转 /select-entity 选择
  → 所有 Entity 都被停用 → 跳转 /locked 说明页
```

### Session

核心实现：`packages/permissions/src/server/*`

登录态 / 守卫一律从 `@cloud/permissions/server` 直接引入，不在业务里写很深的相对路径。

- `getSession()` — 获取完整会话（含 party、roles、permissions、contractTypes），未登录返回 null（菜单不在会话里，运行时现算）
- `getPartialSession()` — 获取部分会话（仅用户信息），用于 Entity 选择页和锁定页
- `requireSession()` — 要求完整登录态，根据失败原因跳转不同页面
- `createSession(userId, entityId)` — 创建 session，entityId 可为 null（部分 session）
- `upgradeSession(entityId)` — 选择 Entity 后升级为完整 session
- `downgradeSession()` — 被锁定时降级为部分 session

Session 内包含的数据：

```typescript
{
  userId, displayName, email,
  currentPartyId, partyName, contractTypes: string[],
  authorizingType: "ADMIN" | "NORMAL" | null,
  roles: SessionRole[],
  permissions: string[],     // 已算好的有效权限码（菜单不在会话里）
  partners: SessionPartyRef[] // 可切换的公司列表
}
```

有效权限计算（切公司时算好、写进会话，见 `apps/web/lib/session-snapshot.ts`）：

- `party scope` = 当前 Entity 有效合同解锁的全部 CoC 权限码并集
- NORMAL 用户：所绑角色权限码并集 **∩** party scope
- ADMIN 用户：**整个 party scope**（§7 结构旁路，无视角色）
- 菜单不入会话：运行时由 `getSessionMenus` / `buildMenuTree` 按有效权限现算

### 权限判断

```ts
import { PermissionChecker } from "@cloud/permissions";

const checker = new PermissionChecker(session);
checker.has("system.user.create"); // 有其中一个即可
checker.has(["user.read", "user.write"]); // OR
checker.hasAll(["user.read", "user.write"]); // AND
```

服务端如果需要在 page / layout / Route Handler 里做权限守卫，优先使用 `@cloud/permissions/server`（本项目不使用 Server Action，mutation 一律走 `app/api/*`）：

```ts
import { requirePermissions, assertPermissions } from "@cloud/permissions/server";

// page / layout
const session = await requirePermissions({ all: ["system.users.user.view"] });

// route handler
const session = await assertPermissions({ any: ["system.roles.role.view", "system.roles.role.update"] });
```

前端如果已经拿到权限数组，也可以通过 `@cloud/permissions/client` 做 UI 级权限判断：

```tsx
"use client";

import { Can, PermissionsProvider, useCan } from "@cloud/permissions/client";

function CreateButton() {
  const canCreate = useCan({ any: ["system.user.create"] });
  return canCreate ? <button>Create user</button> : null;
}

export function UsersActions({ permissions }: { permissions: string[] }) {
  return (
    <PermissionsProvider permissions={permissions}>
      <CreateButton />
      <Can all={["system.user.read", "system.user.write"]}>
        <button>Bulk edit</button>
      </Can>
    </PermissionsProvider>
  );
}
```

### 客户端会话失效自动登出

服务端守卫（`requireSession` / `requirePermissions`）在 401 时会 `redirect("/api/auth/logout")`；客户端的 API 调用也有对称行为。`@cloud/request/client` 在收到 401 时会回调应用注册的处理器，由 [apps/web/lib/session-expiry.ts](apps/web/lib/session-expiry.ts) 判断——只有「会话失效类」错误码（`"unauthenticated"` / `ERR_UNAUTHORIZED` / `ERR_AUTH_NOT_AUTHENTICATED`）才整页跳 `/api/auth/logout`（清残留 cookie → portal `/login`）。portal 登录页的凭证错误 `ERR_AUTH_INVALID_CREDENTIALS` 也是 401，但不在白名单，不会把登录失败误判为会话过期。

机制在包（`setUnauthorizedHandler`，不认识任何 app 路由），策略在 app，通过根 layout 里的 `UnauthorizedRedirect` 组件注册一次。业务组件正常 `catch` + `toastError` 即可，不需要、也不应该自己写 401 跳转。

## S3 存储

Amazon S3 相关能力统一走 `@cloud/storage/server` / `@cloud/storage/client`，不要在业务代码里直接初始化 AWS SDK 客户端。

服务端可用 `createS3UploadSession()` 生成带临时 STS 凭证的上传会话，适合前端直传；也可用 `uploadFileToS3FromServer()` 由服务端直接上传文件。上传完成后，S3 返回的文件信息由各业务表按需保存；私有下载时先校验业务权限和业务对象归属，再用 `objectKey` 生成短期 S3 GET 链接。

```ts
import {
  createS3DownloadUrl,
  createS3UploadSession,
  getS3ObjectMetadata,
  uploadFileToS3FromServer,
} from "@cloud/storage/server";

const s3Config = {
  bucket: process.env.AWS_S3_BUCKET!,
  regionId: process.env.AWS_REGION!,
  maxSizeBytes: process.env.AWS_S3_MAX_SIZE_BYTES
    ? Number(process.env.AWS_S3_MAX_SIZE_BYTES)
    : undefined,
  multipartThresholdBytes: process.env.AWS_S3_MULTIPART_THRESHOLD_BYTES
    ? Number(process.env.AWS_S3_MULTIPART_THRESHOLD_BYTES)
    : undefined,
  multipartPartSizeBytes: process.env.AWS_S3_MULTIPART_PART_SIZE_BYTES
    ? Number(process.env.AWS_S3_MULTIPART_PART_SIZE_BYTES)
    : undefined,
};

const session = await createS3UploadSession(s3Config, {
  filename: "contract.pdf",
  contentType: "application/pdf",
  size: 1024,
  directory: "contracts",
});

const storedObject = await uploadFileToS3FromServer(s3Config, {
  body: new Uint8Array([1, 2, 3]),
  filename: "debug.bin",
  contentType: "application/octet-stream",
});

const metadata = await getS3ObjectMetadata(s3Config, {
  objectKey: storedObject.objectKey,
});

const downloadUrl = await createS3DownloadUrl(s3Config, {
  objectKey: metadata.objectKey,
  filename: "debug.bin",
});
```

admin 应用侧只读取这些 S3 环境变量：

```txt
AWS_S3_BUCKET
AWS_REGION
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_S3_MAX_SIZE_BYTES
AWS_S3_MULTIPART_THRESHOLD_BYTES
AWS_S3_MULTIPART_PART_SIZE_BYTES
```

`s3Config` 必填 `bucket` 和 `regionId`。默认 `uploadUrl` 会生成 `https://{bucket}.s3.{regionId}.amazonaws.com`。服务端 AWS SDK 使用 `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`；浏览器直传 session 通过 STS `GetFederationToken` 生成临时凭证。

用于上传/下载的 AWS 身份除了写入权限，也必须具备读取权限。上传普通文件和公开图片都需要目标 prefix 的 `s3:PutObject`；下载签名链接使用 `s3:GetObject`，下载前的对象校验使用 `HeadObject`，AWS 侧同样要求身份具备 `s3:GetObject`。浏览器直传还需要允许应用身份调用 STS `GetFederationToken`；session policy 只能收窄权限，不能放大身份原本没有的权限。

公开图片使用业务约定的公开 profile。公开上传只允许 `image/*`，并且对象 key 必须落在 `public/` 前缀下；公开文件的 `objectUrl` 可由业务 DTO 作为头像、Logo、公开图片等 `<img src>` 场景的 URL 返回。S3 侧不要公开整个 bucket，只给 `public/*` 配只读 bucket policy。这个 bucket policy 只解决匿名读取，不给应用 AWS 身份增加上传权限；应用身份仍需要 IAM policy 允许 `s3:PutObject` 到 `public/*`。

```json
{
  "Effect": "Allow",
  "Principal": "*",
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::your-bucket/public/*"
}
```

浏览器直传使用 `@cloud/storage/client`：

```ts
import { uploadFileToS3FromBrowser } from "@cloud/storage/client";

await uploadFileToS3FromBrowser({
  file,
  session,
  onProgress: ({ percent, isMultipart }) => {
    console.log(percent, isMultipart);
  },
});
```

当前脚手架保留 `@cloud/storage` 包和 app 侧 storage helper，也提供一个无鉴权的本地 S3 调试页 `/s3-debug`。生产业务仍不提供统一文件表；业务应用需要文件上传时，应在对应 domain 下按上面的 package 能力接入，并把需要的文件信息写入业务表字段。

S3 可返回 `bucket`、`regionId`、`uploadUrl`、`objectKey`、`objectUrl`、`contentType`、`sizeBytes`、`etag`、`lastModified` 等信息。业务可以只保存一个 URL，也可以保存完整对象快照；多文件建议用 JSONB 数组保存对象快照，数组顺序就是展示顺序。写入业务表前必须完成业务权限、业务对象归属、文件类型、可见性和 HeadObject 校验。

新增或重置本地数据库后，需要执行：

```bash
pnpm db:push
pnpm db:seed
```

`db:push` 会同步业务 schema；`db:seed` 不再初始化 S3 demo 菜单或 `storage.*` 权限。

## 国际化

国际化统一走 `@cloud/i18n`（对 `next-intl` 的薄封装），不要在业务或 UI 里直接 import `next-intl`。

设计要点：

- locale 清单固定为 `["en", "zh-CN", "ja"]`，`defaultLocale = "en"`；增删语言改 `packages/i18n`，不在应用层硬编码数组。
- 走 **cookie 不走 URL 路由**：自定义 `LOCALE_COOKIE="locale"` / `TZ_COOKIE="tz"`（刻意不用 next-intl 默认的 `NEXT_LOCALE`），没有 `app/[locale]/` 分段，切语言靠写 cookie + `router.refresh()`。
- **英文为基底**：渲染时先加载 `en` 再 `deepMerge` 当前 locale，非英文 bundle 缺 key 自动回退英文，所以各 locale 只需写差异。
- 缺失 key 在开发期由 `getMessageFallback` 直接抛错，生产环境降级为返回 key 字符串。

三入口：

| 入口 | 取什么 | 用在哪 |
| --- | --- | --- |
| `@cloud/i18n` | `locales` / `Locale` / `isLocale` / cookie 常量 / `formats` | 共享常量、类型收窄 |
| `@cloud/i18n/server` | `createI18nRequestConfig` / `deepMerge` / `setLocaleAction` / `setTimeZoneAction` | RSC、route handler |
| `@cloud/i18n/client` | `useTranslations` / `useFormatter` / `useLocale` / `TimeZoneInit` | 客户端组件 |
| `@cloud/i18n/actions` | `setLocaleAction` / `setTimeZoneAction` | 客户端组件里调 server action（如语言切换 UI） |

客户端取文案与格式化：

```tsx
"use client";
import { useTranslations, useFormatter } from "@cloud/i18n/client";

export function Example() {
  const t = useTranslations("system.users");
  const format = useFormatter();
  return (
    <div>
      <h1>{t("title")}</h1>
      <span>{format.dateTime(new Date(), "short")}</span>
    </div>
  );
}
```

`apps/web` 已接通 i18n，对应四件套（接入新应用时照此补齐，缺一不可）：

1. [next.config.ts](apps/web/next.config.ts) 用 `createNextIntlPlugin("./i18n/request.ts")` 包裹配置；
2. [apps/web/i18n/request.ts](apps/web/i18n/request.ts) 调 `createI18nRequestConfig({ loadMessages })`，`loadMessages(locale)` 动态 import `i18n/messages/<locale>.json`；
3. [apps/web/app/layout.tsx](apps/web/app/layout.tsx) 包一层 `NextIntlClientProvider`，且 `<html lang>` 用 cookie + `isLocale` 读实际 locale，不硬编码；
4. Provider 树内挂 `TimeZoneInit`（首屏同步浏览器时区），切语言入口 `LocaleSwitcher` 放在 portal header。

文案放在 [apps/web/i18n/messages/](apps/web/i18n/messages/)，`en.json` 为基底，`zh-CN.json` / `ja.json` 只写差异。当前只落了 `@cloud/ui` 日期组件需要的 `ui.datePicker.*`；新增业务文案按模块往对应 namespace 补即可。现有页面的英文硬编码尚未逐条迁移到 message（独立任务，不影响 i18n 链路本身）。

## 用户管理

### 用户邀请

通过邮箱邀请新用户，生成邀请链接 `https://{域名}/onboarding?token=xxx`。邀请人可预分配角色，受邀人完成注册后角色生效。

### 用户操作权限

| 操作       | 普通用户 | ADMIN 用户 / 自己 |
| ---------- | -------- | ----------------- |
| 修改备注   | 可以     | 可以              |
| 修改显示名 | 可以     | 禁止              |
| 修改角色   | 可以     | 禁止              |
| 停用/启用  | 可以     | 禁止              |
| 重置密码   | 可以     | 禁止              |

## 开发指南

### 页面放在哪里

- 登录前页面放在 `apps/web/app/(portal)`
- 登录后的控制台页面放在 `apps/web/app/(dashboard)`
- API 路由放在 `apps/web/app/api`
- 业务实现放在 `apps/web/modules/<cat>/<mod>/`；共享服务端逻辑放 `apps/web/lib` 或 `packages/*`

### 怎么加一个后台页面

1. 在 `apps/web/app/(dashboard)` 下创建新目录，例如 `reports/page.tsx`
2. 页面里调用 `requireSession()` 保护登录态

```tsx
import { requireSession } from "@cloud/permissions/server";

export default async function ReportsPage() {
  const session = await requireSession();
  return <div>Hello, {session.displayName}</div>;
}
```

### 怎么加菜单 / 权限

菜单 / 权限 / 角色**不入库**（无 `sys_menu` / `sys_permission`），由 **CoC 声明系统**管理 —— 完整规约见 [.claude/context/injections/references/coding-rules/coc-declaration.md](.claude/context/injections/references/coding-rules/coc-declaration.md)。简述：

1. 在模块 `apps/web/modules/<cat>/<mod>/manifest.ts` 用 `defineModule` 声明 `menuCode` + 4 段权限码（`<cat>.<mod>.<fn>.<action>`）+ i18n 文案
2. 在 `apps/web/manifest/catalog/contract-types.ts` 的 `CONTRACT_MENUS` 把该菜单挂到对应合同闸门
3. 跑 `pnpm gen:coc`（生成 `manifest/_generated/*`；有 error 拒写）

菜单可见的前提：`path` 对应页面已存在；当前 party 的合同解锁了该菜单；当前会话命中其任一权限码（或 `authorizingType=ADMIN` 直取合同 scope）。

### 怎么请求接口

客户端：

```ts
import { request } from "@cloud/request/client";

const result = await request.get<{ items: string[] }>("/api/health");
await request.post("/api/reports", { name: "Weekly Report" });
```

服务端响应：

```ts
import { successResponse, badRequestResponse, unauthorizedResponse } from "@cloud/request/server";

export async function GET() {
  return successResponse({ ok: true });
}
```

成功 JSON 响应统一形状：

```json
{
  "code": "OK",
  "message": "success",
  "data": {},
  "traceId": "BIZ-xxxxxx"
}
```

分页响应会把分页字段放在和 `data` 同级，不再包一层 `pager`。分页分两种，按需选用：

**偏移分页（`Pager`）** —— 适合需要页码、总页数的场景：

```json
{
  "code": "OK",
  "message": "success",
  "data": [],
  "page": 1,
  "limit": 20,
  "total": 100,
  "totalPages": 5,
  "traceId": "BIZ-xxxxxx"
}
```

**双向游标分页（`CursorPager`）** —— 适合大列表、深翻页，避免 `OFFSET` 扫描：

```json
{
  "code": "OK",
  "message": "success",
  "data": [],
  "limit": 20,
  "total": 100,
  "nextCursor": "eyJpZCI6MjB9",
  "prevCursor": null,
  "hasNextPage": true,
  "hasPrevPage": false,
  "traceId": "BIZ-xxxxxx"
}
```

游标 token 由服务端 `encodeCursor()` 签发、只编码锚点 id、对客户端不透明；**翻页方向是独立的 `direction` 参数，由客户端显式传，不编进 token**。服务端统一用 `@cloud/request/server` 的 `readCursorQuery(token, direction)` + `buildCursorPage()`，不要手写切片和游标：

```ts
import { buildCursorPage, readCursorQuery, successResponse } from "@cloud/request/server";

const url = new URL(req.url);
const limit = 20;
// 游标 token + direction 都来自 query
const query = readCursorQuery(url.searchParams.get("cursor"), url.searchParams.get("direction"));

const [total, rows] = await Promise.all([
  prisma.menu.count({ where }),
  prisma.menu.findMany({
    where,
    orderBy: [{ sort: query.sortOrder }, { id: query.sortOrder }],
    take: limit + 1, // 多取一条用于探测该方向是否还有下一页
    ...(query.cursor ? { cursor: { id: Number(query.cursor.id) }, skip: 1 } : {}),
  }),
]);

// 切片、向前翻翻回升序、签发双向游标都收敛在 helper 里
const { items, pager } = buildCursorPage({ rows, limit, query, total, idOf: (m) => m.id });
return successResponse(items.map(toRow), pager);
```

客户端用 `apps/web/lib/use-cursor-pagination.ts` 的 `useCursorPagination()`，**原样回传服务端给的游标 + 方向，绝不从行 id 自己拼游标，也不缓存历史游标**：

```tsx
"use client";

import { useState } from "react";
import { request } from "@cloud/request/client";
import { useCursorPagination, type CursorPageRequest } from "@/lib/use-cursor-pagination";

export function MenuList() {
  const [rows, setRows] = useState<MenuRow[]>([]);
  const pager = useCursorPagination();

  async function load(req: CursorPageRequest) {
    const res = await request.get<MenuRow[]>("/api/menus", {
      query: { limit: 20, cursor: req.cursor, direction: req.direction },
    });
    setRows(res.data);
    // 吸收这一页返回的双向游标 + 翻页标志，下一次翻页只用它们
    pager.sync(
      {
        nextCursor: res.nextCursor,
        prevCursor: res.prevCursor,
        hasNextPage: res.hasNextPage,
        hasPrevPage: res.hasPrevPage,
      },
      req.page,
    );
  }

  return (
    <>
      <button onClick={() => void load(pager.reset())}>查询</button>
      {/* 渲染 rows ... */}
      <button
        disabled={!pager.canPrev}
        onClick={() => {
          const req = pager.toPrev();
          if (req) void load(req);
        }}
      >
        上一页
      </button>
      <button
        disabled={!pager.canNext}
        onClick={() => {
          const req = pager.toNext();
          if (req) void load(req);
        }}
      >
        下一页
      </button>
    </>
  );
}
```

- `pager.reset()` 产出首页请求（`cursor: null, direction: "next"`），`cursor` 为 `null` 时 `@cloud/request/client` 会自动跳过该 query 参数
- 按钮禁用直接看 `pager.canPrev` / `pager.canNext`（来自服务端 `hasPrevPage` / `hasNextPage`），前端不用自己算
- `pager.page` 只是「第 N 页」展示标签，不参与数据库定位

DELETE 这类无内容响应使用 `noContentResponse()`，HTTP status 为 204，response body 为空。

### API 异常兜底

Route Handler 的业务校验错误应该显式返回响应，例如 `badRequestResponse()`、`notFoundResponse()`；不要用 `throw new Error("A valid email is required.")` 表达可预期错误。错误码是接口协议，message 是给用户看的兜底文案。

```ts
import { badRequestResponse } from "@cloud/request/server";
import { ERR_USER_EMAIL_INVALID } from "@cloud/request/error-codes";

if (!email) {
  return badRequestResponse(ERR_USER_EMAIL_INVALID, "A valid email is required.");
}
```

未预期异常统一交给 `apps/web/lib/api-handler.ts`（通用骨架与本栈默认错误映射在 `@cloud/api-kit`，这里只注入 config 组装出 `withApiHandler` / `handleApiError`）。默认用 `withApiHandler()` 包裹整个 handler，不要在每个文件里手写 `try / catch`：

```ts
import { withApiHandler } from "@/lib/api-handler";
import { assertPermissions } from "@cloud/permissions/server";
import { successResponse, badRequestResponse } from "@cloud/request/server";

export const POST = withApiHandler(async (req: Request) => {
  const session = await assertPermissions({ all: ["system.users.user.lock"] });
  // 业务校验错误仍然显式返回
  if (!ok) return badRequestResponse(ERR_INVALID_ID, "Invalid user ID.");
  // 业务逻辑
  return successResponse(data);
});
```

带动态路由参数时，第二个参数照常传入：

```ts
export const POST = withApiHandler(
  async (_req: Request, { params }: { params: Promise<{ userId: string }> }) => {
    const { userId } = await params;
    // ...
  },
);
```

`withApiHandler()` 内部 `await handler(...args)`，捕获到异常时调用 `handleApiError()` 兜底，效果等价于在每个 handler 外包一层 `try / catch`。`handleApiError()` 当前会统一处理：

- `AuthzError`：未登录返回 401，缺权限返回 403
- Prisma 常见错误：如 `P2002` 唯一约束冲突转为 `database.unique_conflict`
- 未知异常：返回 `ERR_INTERNAL`，避免泄露内部细节
- Next 控制流异常（redirect / notFound）会继续向上抛出，不会被吞掉

专项错误码可以通过 `withApiHandler()` 的第二个参数注入 `onError` mapper。`withApiHandler` 只兜 handler 整体的异常，handler 内部用于解析 JSON / formData 的局部 `try / catch` 不受影响，照常保留。如果确实需要在某处手动处理，仍可直接调用 `handleApiError(error)`，或在业务侧提供对应的 `onError` mapper。

错误响应包含 `code`、`message`、`traceId`。当前 `traceId` 是响应生成时创建的错误编号，不是完整请求链路的 `requestId`。

### 页面异常兜底

App Router 页面级兜底文件：

- `apps/web/app/(dashboard)/error.tsx`：控制台页面渲染错误
- `apps/web/app/(portal)/error.tsx`：登录前页面渲染错误
- `apps/web/app/global-error.tsx`：根布局级错误
- `apps/web/app/not-found.tsx`：404 页面

当前 Next.js 16 错误边界组件使用 `unstable_retry()` 触发重试；新增或调整错误边界前先看 `node_modules/next/dist/docs/` 中对应文档。

### 典型开发流程

1. 在 `app/(dashboard)` 下加页面（业务实现落 `modules/<cat>/<mod>/`）
2. 权限化模块在 `manifest.ts` 声明菜单 + 权限码、`catalog/contract-types.ts` 挂合同闸门，跑 `pnpm gen:coc`（不改 seed）
3. 用 `requireSession()` 或 `requirePermissions()` 保护页面
4. 在 `app/api/*` 新增接口
5. 在 route handler 里优先用 `assertPermissions()` 做接口权限校验
6. 前端用 `@cloud/request/client` 调接口
7. 用 `PermissionChecker` 或 `@cloud/permissions/client` 做 UI 级权限判断

## 常用命令

```bash
pnpm dev              # 启动开发服务器
pnpm db:setup         # 初始化数据库（generate + push + seed）
pnpm db:generate      # 生成 Prisma Client
pnpm db:seed          # 执行种子数据
pnpm db:studio        # 打开 Prisma Studio
pnpm gen:coc          # 生成 CoC 菜单/权限注册表（已挂 predev/prebuild/pretest）
pnpm lint             # ESLint 检查
pnpm test             # 运行测试
pnpm test:e2e         # 端到端测试
pnpm exec tsc --noEmit  # TypeScript 类型检查
pnpm build:web        # 构建 web 应用
```
