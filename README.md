# Cloud Frontend Scaffold

内部使用的 Next.js App Router Monorepo 脚手架仓库。当前仓库本身就是脚手架源码仓，同时也保留了一套可直接运行的后台基线。

## 默认保留的基线能力

- `apps/web`：单个后台应用
- `packages/ui`：基础 UI 组件与样式
- `packages/request`：通用请求封装与错误码
- `packages/config`：环境变量校验
- `packages/cache`：Redis 客户端与 JSON KV 缓存封装
- `packages/db`：Prisma + PostgreSQL 数据层
- `packages/security`：密码哈希、RSA 加解密
- `packages/permissions`：权限判断 + 服务端登录态与前端权限 hook
- `apps/web/system`：系统管理页面组件（用户管理、角色管理）
- 登录页、登录态、Entity 选择页、锁定说明页
- 完整的 Entity / 合同 / 用户 / 角色 / 权限 / 菜单 数据模型
- 左侧菜单 + 顶部导航 layout
- 默认管理员种子账号

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
- `packages/cache`
- `packages/db`
- `packages/permissions`
- `packages/request`
- `packages/security`
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
  ui/                     # 基础 UI 组件
scripts/
  prisma.mjs              # Prisma 统一调用脚本
```

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

服务端如果需要在 page / Server Action / Route Handler 里做权限守卫，优先使用 `@cloud/permissions/server`：

```ts
import { requirePermissions, assertPermissions } from "@cloud/permissions/server";

// page / layout / server action
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
