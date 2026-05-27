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
  - `packages/permissions`
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
- `packages/permissions` 同时承载 `PermissionChecker`、服务端登录态实现，以及 `@cloud/permissions/client` 提供的前端权限 hook。业务代码统一从 `@cloud/permissions/server` 引用，不再保留 `apps/web/lib/auth.ts` 兼容转发。
- `packages/storage` 统一承载 Amazon S3 上传会话、STS 临时凭证和服务端上传；业务代码连接 S3 默认走 `@cloud/storage/server`。
- 系统管理页面组件（users / roles）属于 `apps/web` 业务代码，按 Next.js 惯例放在 `app/(portal)/system/<feature>/` 下：
  - `page.tsx` 服务端入口（鉴权 + 数据加载）
  - `_components/`：客户端组件（list / detail / modal 等）
  - `_server/`：服务端工具（mapper、纯查询逻辑），文件需 `import "server-only"`
  - 跨 feature 共享的类型 / helper 放 `app/(portal)/system/_shared/`
- 跨目录引用一律走 `@/...` 路径别名（tsconfig 已配置），不要再写 `../../../..`。

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
