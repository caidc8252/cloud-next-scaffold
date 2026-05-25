# WIP

## 当前任务

为 `packages/permissions` 增加前端可用的权限上下文与 React hook，参考 `D:\codes\cloud-frontend2\packages\auth` 的 client 能力。

## Todo

- [x] 查看参考项目 auth client 实现与当前 permissions 包结构
- [x] 增加 `@cloud/permissions/client` 入口
- [x] 实现 `PermissionsProvider`、`usePermissions`、`useCan`、`Can`
- [x] 补充最小测试与导出
- [x] 跑通类型检查与针对性静态检查

## 验证

- [x] `pnpm exec tsc --noEmit`
- [x] `pnpm exec eslint packages/permissions apps/web packages/config/src packages/db packages/request/src packages/security packages/ui/src scripts/prisma.mjs eslint.config.mjs vitest.config.mts`
- [ ] `pnpm exec vitest run packages/permissions/test/use-permission.test.tsx packages/permissions/test/can.test.tsx`（当前环境缺少 `@rolldown/binding-win32-x64-msvc`，Vitest 启动失败）
