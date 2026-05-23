# 开发笔记 / DEV_NOTE

> 只保留脚手架长期维护需要知道的决策。运行方式看 README，临时任务看 WIP。

## 当前定位

- 这个仓库本身是脚手架源码仓，不再承载旧业务应用。
- 当前默认基线不是“极简空壳”，而是一套可直接登录的后台骨架。
- 当前开发方式是直接在仓库本体上迭代，不再提供 `init:project` 生成新项目。
- 当前默认工作区：
  - `apps/web`
  - `packages/config`
  - `packages/db`
  - `packages/permissions`
  - `packages/request`
  - `packages/security`
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

- 根 `.env` 负责数据库和认证密钥。
- `apps/web/.env` 负责应用展示名等 app 级变量。
- Prisma 统一通过根脚本 [scripts/prisma.mjs](/d:/codes/cloud-frontend2/scripts/prisma.mjs) 触发，避免 workspace 下 `.env` 路径不一致。
- `packages/config` 会主动加载根 `.env`，否则 Next 应用构建时拿不到数据库配置。

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
