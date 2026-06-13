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
- 权限模型（roleId 驱动）：会话权限 = 所绑角色的权限码并集（预置通配管理员角色 roleId 1/101 → 注入当前 party 的 scope）再 ∩ party scope
  - party scope = `resolvePartyScope(contractTypes)` = 当前 party 有效契约可达菜单声明的全部权限码
  - 角色两类：**编码角色**（roleId ≤ 300，定义在 `apps/*/manifest/_roles.map.ts`，只读、不入库）+ **DB PRIVATE 角色**（roleId ≥ 1001，`sys_role` 表）
  - `authorizingType` 字段保留作展示标志，**不再驱动权限**（管理员靠绑定 Administrator 预置角色获得 scope）
- 如果要新增细粒度权限，保持这条链路一致：
  - 在 `apps/<app>/manifest/_menu.map.ts` 给对应菜单加 permission code，跑 `pnpm gen:manifest`
  - 角色绑定该码（编码角色改 `_roles.map.ts`；DB 角色改 `sys_role.permission_codes`）
  - 页面、接口接入对应的服务端守卫（`requirePermissions` / `assertPermissions`）

## 菜单约定

- 菜单/权限**不入库**：定义在各 app 的 `manifest/_menu.map.ts`，由 `pnpm gen:manifest` 聚合进 `_generated/apps.ts`（**已无 `sys_menu` / `sys_permission` 表**）
- 新增/改菜单：编辑对应 app 的 `_menu.map.ts` → 跑 `pnpm gen:manifest`（构造期做唯一性 / parent / 契约 / 护栏校验）
- 菜单 `contractTypes`：`[]` = 通用（所有控制台/契约可见，取代旧 `*`）；非空 = 仅列出的契约可见。**通用菜单可声明 permissions**，其权限码会进入每个 party 的 scope（即跨控制台共享页，业务自负该 scope 扩散）
- 菜单要可见，必须同时满足：
  - `path` 对应页面已存在
  - 菜单的 `contractTypes` 命中当前 party 的有效契约（或为 `[]` 通用）
  - 该叶子**无 permissions**（登录即可见）**或**当前会话命中其任一 permission code

## 页面鉴权

- 只需要登录态的页面，调用 `requireSession()`
- 页面本身有明确权限要求时，优先调用 `requirePermissions()`，不要只在前端做按钮显隐
- 页面级异常兜底沿用现有文件：
  - `apps/admin/app/(portal)/error.tsx`
  - `apps/admin/app/(public)/error.tsx`
  - `apps/admin/app/global-error.tsx`
  - `apps/admin/app/not-found.tsx`
- 调整错误边界前先阅读 `node_modules/next/dist/docs/` 中当前 Next.js 版本的错误处理约定；当前错误边界重试入口是 `unstable_retry()`
