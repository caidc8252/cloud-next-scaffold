# Cloud Frontend Scaffold

内部使用的 Next.js App Router Monorepo 脚手架仓库。当前仓库本身就是脚手架源码仓，同时也保留了一套可直接运行的后台基线。

## 默认保留的基线能力

- `apps/web`：单个后台应用
- `packages/ui`：基础 UI 组件与样式
- `packages/request`：通用请求封装与错误码
- `packages/config`：环境变量校验
- `packages/cache`：Redis 客户端与 JSON KV 缓存封装
- `packages/storage`：Amazon S3 上传会话、对象校验、服务端上传与下载链接封装
- `packages/db`：Prisma + PostgreSQL 数据层
- `packages/security`：密码哈希、RSA 加解密
- `packages/permissions`：权限判断 + 服务端登录态与前端权限 hook
- `apps/web/system`：系统管理页面组件（用户管理、角色管理）
- API 统一错误响应、权限异常兜底、页面级错误边界
- 登录页、登录态、Entity 选择页、锁定说明页
- 完整的 Entity / 合同 / 用户 / 角色 / 权限 / 菜单 数据模型
- 左侧菜单 + 顶部导航 layout
- 默认管理员种子账号

## 启动当前仓库

要求 Node.js `>=20.19.0`（Prisma 7 要求）。

```bash
pnpm install
cp .env.example .env
cp apps/web/.env.example apps/web/.env
docker compose up -d
pnpm db:setup
pnpm dev
```

打开 http://localhost:3000。

默认种子账号：

- 账号：`admin`
- 密码：`ChangeMe!123`

## 当前工作区

- `apps/web`
- `packages/config`
- `packages/cache`
- `packages/db`
- `packages/permissions`
- `packages/request`
- `packages/security`
- `packages/storage`
- `packages/ui`

## 仓库结构

```txt
apps/
  web/                    # 后台应用
    app/
      (public)/           # 登录前页面（login, select-entity, locked）
      (portal)/           # 登录后页面（system/users, system/roles）
      api/                # API 路由
    lib/
      auth.ts             # 鉴权兼容导出，实际实现位于 packages/permissions
      user-mapper.ts      # 用户数据映射
      role-mapper.ts      # 角色数据映射
    system/               # 系统管理业务 UI（users, roles）
packages/
  cache/                  # Redis client + JSON KV cache
  config/                 # 环境变量校验
  db/                     # Prisma schema + 种子数据
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
Entity ──┬── EntityContract ── ContractDefine ── Menu ── Permission
         ├── EntityUser ── User
         └── Role ── RolePermission ── Permission
              └── UserRole（entity + user + role 三方关联）
```

### 关键概念

| 概念           | 说明                                                                                   |
| -------------- | -------------------------------------------------------------------------------------- |
| Entity         | 组织/租户。用户通过 EntityUser 关联到 Entity                                           |
| ContractDefine | 合同类型，决定该 Entity 可使用哪些菜单和权限                                           |
| EntityUser     | 用户与组织的关联，包含 `authorizingType`（NORMAL/ADMIN）和 `status`（ACTIVE/INACTIVE） |
| Role           | 角色，归属于 Entity，通过 RolePermission 关联权限                                      |
| Permission     | 权限码，关联到 Menu                                                                    |
| Menu           | 菜单树，归属于 ContractDefine                                                          |

### 两种锁定机制

1. **密码错误锁定（用户级）**：连续错误 5 次自动锁定 `sys_user.status = LOCKED`，30 分钟后自动解锁
2. **管理员停用（Entity-User 级）**：管理员手动切换 `sys_entity_user.status` ACTIVE/INACTIVE，只影响该用户在该组织内的访问

### ADMIN 授权类型

当 `EntityUser.authorizingType = ADMIN` 时：

- 自动获取该 Entity 合同下的所有权限，无需配置角色
- 角色仍正常加载但不影响权限
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

`apps/web/lib/auth.ts` 当前只保留兼容导出，内部转发到 `@cloud/permissions/server`，避免应用侧相对路径 import 一次性大面积改动。

- `getSession()` — 获取完整会话（含 entity、roles、permissions、menus），未登录返回 null
- `getPartialSession()` — 获取部分会话（仅用户信息），用于 Entity 选择页和锁定页
- `requireSession()` — 要求完整登录态，根据失败原因跳转不同页面
- `createSession(userId, entityId)` — 创建 session，entityId 可为 null（部分 session）
- `upgradeSession(entityId)` — 选择 Entity 后升级为完整 session
- `downgradeSession()` — 被锁定时降级为部分 session

Session 内包含的数据：

```typescript
{
  id, username, displayName, email, status,
  entity: { entityId, entityName, contractDefineCode },
  roles: SessionRole[],
  permissions: string[],    // 权限码数组
  menus: SessionMenu[]      // 菜单树
}
```

权限聚合路径：

- 普通用户：`UserRole → Role → RolePermission → Permission`
- ADMIN 用户：直接加载 ContractDefine 下所有 Permission

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
const session = await requirePermissions({ all: ["users.VIEW"] });

// route handler
const session = await assertPermissions({ any: ["roles.VIEW", "roles.UPD"] });
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

## S3 存储

Amazon S3 相关能力统一走 `@cloud/storage/server` / `@cloud/storage/client`，不要在业务代码里直接初始化 AWS SDK 客户端。

服务端可用 `createS3UploadSession()` 生成带临时 STS 凭证的上传会话，适合前端直传；也可用 `uploadFileToS3FromServer()` 由服务端直接上传文件。上传完成后的业务记录保存在 `storage_object` 表，下载时先校验当前租户下的数据库记录，再由服务端生成短期 S3 GET 链接。

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
  directoryPrefix: "uploads",
  stsRoleArn: process.env.AWS_S3_UPLOAD_ROLE_ARN,
  stsExternalId: process.env.AWS_S3_UPLOAD_EXTERNAL_ID,
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

`s3Config` 必填 `bucket` 和 `regionId`。默认 `uploadUrl` 会生成 `https://{bucket}.s3.{regionId}.amazonaws.com`；如果接 CDN 或自定义域名，可传 `uploadUrl`。未配置 `stsRoleArn` 时使用 `GetFederationToken`，配置后使用 `AssumeRole`。

用于上传/下载的 AWS 身份除了写入权限，也必须具备读取权限。上传普通文件和公开图片都需要目标 prefix 的 `s3:PutObject`；下载签名链接使用 `s3:GetObject`，下载前的对象校验使用 `HeadObject`，AWS 侧同样要求身份具备 `s3:GetObject`。如果配置了 `AWS_S3_UPLOAD_ROLE_ARN`，被 assume 的 role 自身策略也要允许目标 bucket/prefix 的 `s3:PutObject` / `s3:GetObject`，session policy 不能放大 role 原本没有的权限。

公开图片使用 `visibility=PUBLIC`，默认仍是 `PRIVATE`。公开上传只允许 `image/*`，并且对象 key 必须落在 `public/` 前缀下；返回记录中的 `accessUrl` 只有公开文件才有值，可直接用于头像、Logo、公开图片等 `<img src>` 场景。S3 侧不要公开整个 bucket，只给 `public/*` 配只读 bucket policy。这个 bucket policy 只解决匿名读取，不给应用 AWS 身份增加上传权限；应用身份仍需要 IAM policy 允许 `s3:PutObject` 到 `public/*`。

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

当前默认策略：`<= 5 MB` 的浏览器文件走服务端上传，`> 5 MB` 走浏览器直传；直传中超过 100 MB 时自动使用 multipart upload。当前 Web 演示页面位于 `/storage/s3-upload`，上传前会先计算 SHA-256 并调用 `/api/storage/uploads/duplicate` 检查同租户、同可见性下是否已有相同内容文件，命中时直接复用旧 `storage_object`。小文件会调用 `/api/storage/s3-upload-server` 并直接写入上传记录；大文件会通过 `/api/storage/s3-upload-session` 获取临时上传会话，浏览器上传完成后调用 `/api/storage/uploads/complete` 做 S3 `HeadObject` 校验并写入记录。历史记录列表来自 `/api/storage/uploads`，下载按钮调用 `/api/storage/uploads/[storageObjectId]/download` 获取 5 分钟下载链接。

文件业务归属不要写进 `storage_object`。`storage_object` 只保存文件本体；应用包、头像、合同附件等业务关系写入 `storage_attachment`。通用接口 `/api/storage/attachments` 支持按 `subjectType + subjectId + purpose` 查询附件，也支持把已上传完成的 `storageObjectId` 绑定到业务对象。常用约定示例：应用安装包 `APP / <appId> / PACKAGE`，用户头像 `SYS_USER / <userId> / AVATAR`，合同附件 `CONTRACT / <contractId> / ATTACHMENT`。

新增或重置本地数据库后，需要执行：

```bash
pnpm db:push
pnpm db:seed
```

`db:push` 会创建 `storage_object` / `storage_attachment` 表，`db:seed` 会补齐 Storage 菜单和 `storage.VIEW` / `storage.UPLOAD` / `storage.DOWNLOAD` 权限。

## 用户管理

### 用户邀请

通过邮箱邀请新用户，生成邀请链接 `https://{域名}/invite?token=xxx`。邀请人可预分配角色，受邀人完成注册后角色生效。

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

- 登录前页面放在 `apps/web/app/(public)`
- 登录后的后台页面放在 `apps/web/app/(portal)`
- API 路由放在 `apps/web/app/api`
- 共享服务端逻辑优先放在 `apps/web/lib` 或 `packages/*`

### 怎么加一个后台页面

1. 在 `apps/web/app/(portal)` 下创建新目录，例如 `reports/page.tsx`
2. 页面里调用 `requireSession()` 保护登录态

```tsx
import { requireSession } from "../../lib/auth";

export default async function ReportsPage() {
  const session = await requireSession();
  return <div>Hello, {session.displayName}</div>;
}
```

### 怎么加菜单

菜单来自数据库 `sys_menu` 表，通过 Permission 关联到用户可见范围。

添加方式：

1. 修改 `packages/db/prisma/seed.ts`，执行 `pnpm db:seed`
2. 或用 `pnpm db:studio` 直接改表

菜单可访问的前提：

- `path` 对应的页面已存在
- 菜单关联了 Permission
- 用户的角色包含该 Permission（或用户为 ADMIN 类型）

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

未预期异常统一交给 `apps/web/lib/api-handler.ts`。默认用 `withApiHandler()` 包裹整个 handler，不要在每个文件里手写 `try / catch`：

```ts
import { withApiHandler } from "@/lib/api-handler";
import { assertPermissions } from "@cloud/permissions/server";
import { successResponse, badRequestResponse } from "@cloud/request/server";

export const POST = withApiHandler(async (req: Request) => {
  const session = await assertPermissions({ all: ["users.LOCK"] });
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

S3 / 存储接口需要保留存储专项错误码，把 `onError` 作为 `withApiHandler()` 的第二个参数：

```ts
import { s3ErrorResponse } from "@/lib/s3-error-response";

export const GET = withApiHandler(
  async () => {
    // ...
    return successResponse(records);
  },
  { onError: s3ErrorResponse },
);
```

注意：`withApiHandler` 只兜 handler 整体的异常，handler 内部用于解析 JSON / formData 的局部 `try / catch` 不受影响，照常保留。如果确实需要在某处手动处理，仍可直接调用 `handleApiError(error)` / `handleApiError(error, { onError: s3ErrorResponse })`。

错误响应包含 `code`、`message`、`traceId`。当前 `traceId` 是响应生成时创建的错误编号，不是完整请求链路的 `requestId`。

### 页面异常兜底

App Router 页面级兜底文件：

- `apps/web/app/(portal)/error.tsx`：后台页面渲染错误
- `apps/web/app/(public)/error.tsx`：登录前页面渲染错误
- `apps/web/app/global-error.tsx`：根布局级错误
- `apps/web/app/not-found.tsx`：404 页面

当前 Next.js 16 错误边界组件使用 `unstable_retry()` 触发重试；新增或调整错误边界前先看 `node_modules/next/dist/docs/` 中对应文档。

### 典型开发流程

1. 在 `app/(portal)` 下加页面
2. 在 seed 或数据库里加菜单 + 权限
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
pnpm lint             # ESLint 检查
pnpm test             # 运行测试
pnpm exec tsc --noEmit  # TypeScript 类型检查
pnpm --filter web build # 构建 Web 应用
```
