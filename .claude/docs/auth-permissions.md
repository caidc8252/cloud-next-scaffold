# 鉴权与权限

> 归属：`@cloud/permissions` 登录态 / 守卫、route 两层权限校验。**接任何登录态 / 权限校验前必读。** 菜单 / 权限 / 角色的**声明**走 CoC，见 `.claude/docs/coc-declaration.md`。

- 登录态与权限守卫优先直接从 `@cloud/permissions/server` 引入，不要在业务代码里继续写很深的相对路径
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
- 权限模型：`party scope = resolvePartyScope(contractTypes)` = 当前 party 有效契约解锁的全部权限码并集
  - `authorizingType === "ADMIN"` → 有效权限 = **整个 party scope**（结构旁路，无视所绑角色，仍受合同闸门框住）
  - 否则(NORMAL) → 有效权限 = 所绑角色权限码并集 **∩** party scope
  - 角色两类：**GLOBAL 死写角色**（roleId ≤ 1000，定义在 `apps/web/manifest/catalog/roles.ts`，只读、不入库）+ **DB PRIVATE 角色**（roleId ≥ 1001，`sys_role` 表）
  - 会话权限在 `apps/web/lib/session-snapshot.ts` 切公司时按上式算好、写进快照
- 新增细粒度权限走 CoC（详见 `.claude/docs/coc-declaration.md`）：
  - 在模块 `manifest.ts` 加 4 段权限码 `<cat>.<mod>.<fn>.<action>`，跑 `pnpm gen:coc`
  - 角色绑定该码（GLOBAL 改 `catalog/roles.ts`；DB 角色改 `sys_role.permission_codes`）
  - 页面、接口接入服务端守卫（`requirePermissions` / `assertPermissions`），用 4 段码

## 菜单约定

菜单的声明与投影规则已统一到 CoC 系统，见 `.claude/docs/coc-declaration.md`。要点：菜单不入库、由各模块 `manifest.ts` 声明、合同闸门在 `catalog/contract-types.ts` 单一真源、运行时按有效权限 `buildMenuTree` 投影（叶子命中即可见、祖先目录连带、空目录裁掉）；B 类页面（dashboard 等）不进投影、由 layout 写死直链。

## 页面鉴权

- 只需要登录态的页面，调用 `requireSession()`
- 页面本身有明确权限要求时，优先调用 `requirePermissions()`，不要只在前端做按钮显隐
- 页面级异常兜底沿用现有文件：
  - `apps/web/app/(dashboard)/error.tsx`
  - `apps/web/app/(portal)/error.tsx`
  - `apps/web/app/global-error.tsx`
  - `apps/web/app/not-found.tsx`
- 调整错误边界前先阅读 `node_modules/next/dist/docs/` 中当前 Next.js 版本的错误处理约定；当前错误边界重试入口是 `unstable_retry()`
