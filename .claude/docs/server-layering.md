# 服务端分层（route / service / schema / policy / data）

> 归属：`apps/*/service/<domain>/` 的服务端业务分层约定。**写 service / route / repository 前必读。**

> 业务实现按层拆分，落在 `apps/admin/service/<domain>/`。**不要再把业务逻辑堆在 route handler 里，也不要放进 route 目录下的 `_server/`**——`_server/` 是历史遗留写法（lint 会拦 route 直接 import `*.repository` / `*.mapper` / `@cloud/db`），见到顺手迁到 `service/`。

- **route**（`app/api/**/route.ts`）：只做 HTTP 适配。顺序 `assertPermissions → 解析参数 / zod parse → 调 service → 返回 envelope`，整体包在 `withApiHandler` 里。route **不直接 `import @cloud/db`**，也不直接 import `*.repository` / `*.mapper`，只依赖 service（需要 mapper 的纯 helper 时由 service re-export 转出）。
- **schema**（`service/<domain>/schemas/<domain>.schema.ts`）：client + server 共享的 zod，在 route parse、不在 service 里 parse。放在 `server/` 外面，因为客户端表单也要 import。
- **service**（`service/<domain>/server/<domain>.service.ts`）：业务编排。入参是「已解析的类型化数据 + 当前会话」，**绝不接收 `Request` / `NextRequest` / `URLSearchParams`**。可预期错误一律 `throw BusinessError`，由 route 的 `withApiHandler` 统一兜底。
- **policy**（`service/<domain>/server/<domain>.policy.ts`）：范围 / 实体级权限校验（例如「这条记录是否属于当前租户」「当前用户能否改这个目标」），尽量写成纯函数便于单测。
- **data**（`service/<domain>/server/<domain>.repository.ts` + `*.mapper.ts`）：repository 只做 prisma 查询 / 变更，无 session / 权限 / HTTP 感知；mapper 只做 Entity → VO。
- `server/` 下所有文件加 `import "server-only"`。
- 跨 domain 复用的纯 helper（如解析角色 JSONB 的 `service/_shared/role-codes.ts`）放 `service/_shared/`，不要让一个 domain reach 进另一个 domain 的 `server/`。
- 两层权限：route 做粗粒度码校验（`assertPermissions(['xxx.UPD'])`），service / policy 做范围校验；按钮显隐只是体验层，不是安全边界。

## 页面取数

- 页面保持薄：`page.tsx` 只做鉴权 + 顶层取数 + 组合，取数调对应 domain 的 service（见「服务端分层」），不在 page 里手写 prisma 查询或业务逻辑
