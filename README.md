# Cloud Frontend Scaffold

内部使用的 Next.js App Router Monorepo 脚手架仓库。当前仓库本身就是脚手架源码仓，同时也保留了一套可直接运行的后台基线。

## 默认保留的基线能力

- `apps/web`：单个后台应用
- `packages/ui`：基础 UI 组件与样式
- `packages/request`：通用请求封装
- `packages/config`：环境变量校验
- `packages/db`：Prisma + PostgreSQL 数据层
- `packages/security`：密码哈希等安全能力
- 登录页、基础登录态
- 用户 / 角色 / 菜单三张基础表
- 左侧菜单 + 顶部导航 layout
- 默认一条工作台菜单和一个管理员种子账号

## 启动当前仓库

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
- `packages/db`
- `packages/permissions`
- `packages/request`
- `packages/security`
- `packages/ui`

## 开发方式

当前仓库不再提供 `init:project` 生成新项目。

推荐工作方式：

- 直接在 `apps/web` 下开发业务页面和路由
- 直接在 `packages/*` 下维护共享能力
- 把当前仓库本体当作你的项目基线

## 仓库结构

```txt
apps/
  web/
packages/
  config/
  db/
  permissions/
  request/
  security/
  ui/
scripts/
  prisma.mjs
```

## 开发指南

### 页面放在哪里

- 登录前页面放在 `apps/web/app/(public)`
- 登录后的后台页面放在 `apps/web/app/(portal)`
- API 路由放在 `apps/web/app/api`
- 共享服务端逻辑优先放在 `apps/web/lib` 或 `packages/*`

当前基线已经把后台壳子接在 `app/(portal)` 上，所以大多数业务页面都应该加在这个分组里。

### 怎么加一个后台页面

1. 在 `apps/web/app/(portal)` 下创建新目录，例如 `reports/page.tsx`
2. 默认导出一个 App Router 页面组件
3. 页面里如果需要登录态，直接调用 `requireSession()`

示例：

```tsx
import { requireSession } from "../../lib/auth";

export default async function ReportsPage() {
  const session = await requireSession();

  return <div>Hello, {session.name}</div>;
}
```

### 怎么加菜单

当前基线的菜单来自数据库里的 `menu` 表，不是写死在前端代码里。

相关模型在：
- `packages/db/prisma/schema.prisma`
- `packages/db/prisma/seed.ts`

当前 `Menu` 结构：
- `key`
- `label`
- `path`
- `icon`
- `sortOrder`
- `roleId`

最直接的做法有两种：

1. 修改 seed
适合默认基线菜单、初始化项目时就要存在的菜单。

```ts
await prisma.menu.upsert({
  where: { key: "reports" },
  update: {
    label: "Reports",
    path: "/reports",
    icon: "layout-dashboard",
    sortOrder: 2,
    roleId: adminRole.id,
  },
  create: {
    key: "reports",
    label: "Reports",
    path: "/reports",
    icon: "layout-dashboard",
    sortOrder: 2,
    roleId: adminRole.id,
  },
});
```

改完后执行：

```bash
pnpm db:seed
```

2. 用 Prisma Studio 直接改表
适合本地调试或临时验证。

```bash
pnpm db:studio
```

要让菜单真正可访问，还需要确保：
- `path` 对应的页面文件已经存在
- 该菜单挂在当前用户角色对应的 `roleId` 下

### 怎么做鉴权

当前基线内置的是“登录态鉴权”，核心文件是 `apps/web/lib/auth.ts`。

最常用的两个入口：

- `getSession()`
  - 获取当前会话
  - 未登录时返回 `null`
- `requireSession()`
  - 要求必须登录
  - 未登录时会跳转到登出路由并清理状态

页面鉴权示例：

```tsx
import { requireSession } from "../../lib/auth";

export default async function ProtectedPage() {
  const session = await requireSession();
  return <div>{session.account}</div>;
}
```

API 鉴权示例：

```ts
import { requireSession } from "../../../lib/auth";
import { successResponse, unauthorizedResponse } from "@cloud/request/server";

export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return unauthorizedResponse();
  }

  return successResponse({ account: session.account });
}
```

### 怎么做权限判断

当前仓库已经带上 `packages/permissions`，但注意：

- 现在默认基线里只有 `user / role / menu`
- 还没有独立的 permission 表
- 所以 `@cloud/permissions` 目前是一个可复用的权限判断工具，不是完整权限系统

核心类：

```ts
import { PermissionChecker } from "@cloud/permissions";
```

用法示例：

```ts
const checker = new PermissionChecker({
  roles: ["admin"],
  permissions: ["admin.report.read", "admin.report.export"],
});

checker.has("admin.report.read");
checker.can("report", "read");
checker.can("report", ["read", "export"]);
```

如果你要做真正的细粒度鉴权，建议下一步补：

- permission 表
- role 与 permission 的关系
- 登录态中的 permission 聚合

然后再在页面或 API 中统一调用 `PermissionChecker`。

### 怎么请求接口

统一请求封装在 `packages/request`。

客户端请求：

```ts
import { request } from "@cloud/request/client";

const result = await request.get<{ items: string[] }>("/api/health");
console.log(result.data);
```

带 query：

```ts
await request.get("/api/reports", {
  query: { page: 1, limit: 20 },
});
```

POST 示例：

```ts
await request.post("/api/reports", {
  name: "Weekly Report",
});
```

服务端返回建议统一走 `@cloud/request/server`：

```ts
import {
  badRequestResponse,
  createdResponse,
  successResponse,
} from "@cloud/request/server";

export async function GET() {
  return successResponse({ ok: true });
}

export async function POST() {
  return createdResponse({ id: "new-id" });
}
```

可用的响应辅助包括：

- `successResponse`
- `createdResponse`
- `noContentResponse`
- `badRequestResponse`
- `unauthorizedResponse`
- `forbiddenResponse`
- `notFoundResponse`

### 一个最常见的开发流程

1. 在 `app/(portal)` 下加页面
2. 在 `packages/db/prisma/seed.ts` 或数据库里加菜单
3. 用 `requireSession()` 先把登录态保护起来
4. 用 `app/api/*` 新增接口
5. 前端用 `@cloud/request/client` 调接口
6. 如果需要更细权限，再把 `@cloud/permissions` 接进来

## 常用命令

```bash
pnpm dev
pnpm db:setup
pnpm db:studio
pnpm lint
pnpm exec tsc --noEmit
pnpm --filter web build
pnpm test
```
