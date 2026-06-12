# 鉴权与权限

> 归属：`@cloud/permissions` 登录态/守卫、route 两层权限、菜单 role→permission→menu 链路。**接任何登录态 / 权限校验 / 菜单前必读。**

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

## 菜单约定

- 当前菜单来自数据库 `menu` 表，不是写死在前端
- 相关模型优先查看 `packages/db/prisma/schema.prisma` 和 `packages/db/prisma/seed.ts`
- 新增默认菜单时，优先修改 seed，再执行 `pnpm db:seed`
- 临时调试可以使用 `pnpm db:studio` 直接改表
- 菜单要可访问，必须同时满足：
  - `path` 对应页面已存在
  - 菜单绑定到当前用户角色对应的 `roleId`

## 页面鉴权

- 只需要登录态的页面，调用 `requireSession()`
- 页面本身有明确权限要求时，优先调用 `requirePermissions()`，不要只在前端做按钮显隐
- 页面级异常兜底沿用现有文件：
  - `apps/admin/app/(portal)/error.tsx`
  - `apps/admin/app/(public)/error.tsx`
  - `apps/admin/app/global-error.tsx`
  - `apps/admin/app/not-found.tsx`
- 调整错误边界前先阅读 `node_modules/next/dist/docs/` 中当前 Next.js 版本的错误处理约定；当前错误边界重试入口是 `unstable_retry()`
