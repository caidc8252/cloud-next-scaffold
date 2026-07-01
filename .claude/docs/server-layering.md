# 服务端分层（route / controller / service / schema / policy / data）

> 归属：`apps/web/modules/<cat>/<mod>/` 的服务端业务分层约定（`server` 分层 + `schema` + `client` + `ui`）。**写 controller / service / repository / route 前必读。**

> 业务实现按层拆分，落在 `apps/web/modules/<cat>/<mod>/`。**不要把业务逻辑堆在 route handler 里**——`app/api/**/route.ts` 只是薄壳，真正的 HTTP 适配在模块的 `server/<mod>.controller.ts`。

- **route**（`app/api/**/route.ts`）：薄壳，只 re-export 模块 controller 的具名 handler。例：`export { GET, POST } from "@/modules/system/roles/server/roles.controller";`
- **controller**（`modules/<cat>/<mod>/server/<mod>.controller.ts`）：HTTP 适配。顺序 `assertPermissions → 解析参数 / zod parse → 调 service → 返回 envelope`，整体包在 `withApiHandler` 里。controller **不直接 `import @cloud/db`**，也不直接 import `*.repository` / `*.mapper`，只依赖 service。
- **schema**（`modules/<cat>/<mod>/schema/<mod>.schema.ts` + `<mod>.types.ts`）：client + server 共享的 zod 与 VO 类型，在 controller parse、不在 service 里 parse。放在 `server/` 外面，因为客户端表单也要 import。
- **service**（`modules/<cat>/<mod>/server/<mod>.service.ts`）：业务编排。入参是「已解析的类型化数据 + 当前会话」，**绝不接收 `Request` / `NextRequest` / `URLSearchParams`**。可预期错误一律 `throw BusinessError`，由 controller 的 `withApiHandler` 统一兜底。
- **policy**（`modules/<cat>/<mod>/server/<mod>.policy.ts`）：范围 / 实体级权限校验（例如「这条记录是否属于当前租户」「当前用户能否改这个目标」），尽量写成纯函数便于单测。
- **data**（`modules/<cat>/<mod>/server/<mod>.repository.ts` + `*.mapper.ts`）：repository 只做 prisma 查询 / 变更，无 session / 权限 / HTTP 感知；mapper 只做 Entity → VO。
- **跨模块入口**（`modules/<cat>/<mod>/server/<mod>.public.ts`）：本模块对外暴露给**其它模块 server** 调用的窄接口；不要让一个模块 reach 进另一个模块的内部 server 文件。
- `server/` 下所有文件加 `import "server-only"`。
- 跨模块复用的纯 helper（如解析角色 JSONB 的 `role-codes.ts`）放 `apps/web/lib/`，不要塞进某个模块的 `server/`。
- 客户端调用收口到 `modules/<cat>/<mod>/client/<mod>.api.ts`（见 `.claude/docs/api-and-requests.md`）。
- 两层权限：controller 做粗粒度码校验（`assertPermissions({ all: ["system.roles.role.update"] })`，4 段权限码），service / policy 做范围校验；按钮显隐只是体验层，不是安全边界。

## 页面取数

- 页面保持薄：`page.tsx`（或 `modules/<cat>/<mod>/ui/<mod>-page.tsx`）只做鉴权 + 顶层取数 + 组合，取数调对应模块的 service / `<mod>.public.ts`（见上），不在 page 里手写 prisma 查询或业务逻辑
