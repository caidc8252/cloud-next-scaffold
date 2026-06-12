# 日志

> 归属：`@cloud/log`（`createLogger` + 请求级 trace 上下文）。**打服务端日志前必读。** 这是全局能力，不绑任何单一功能。

- 服务端打日志统一走 `@cloud/log` 的 `createLogger("<scope>")`，**不要裸 `console.*`**；`scope` 标来源模块（如 `mail`/`auth`/`http`）
- 分级 `debug` / `info` / `warn` / `error`，阈值由 `LOG_LEVEL`（默认 `info`；调试设 `debug`）控制；跑 vitest 时默认静音（仅 `error`），显式 `LOG_LEVEL` 优先
- **单一格式：JSON 行**（dev/prod 一致，便于 Render 等平台抓 stdout/stderr 并按字段/级别检索）；本地想好读用 `... | jq`。`debug/info`→stdout，`warn/error`→stderr
- 每行字段：`time`(ISO) / `level` / `traceId` / `seq`(请求内行序号) / `scope` / `msg` / `method` / `path` + 调用传入的 context；`context` 里传 `Error` 会被序列化成 `{name,message,stack}`
- **traceId**：每请求一个，时间可排序、无前缀（`<base36时间>-<随机>`）。`withApiHandler` 在入口经 `AsyncLocalStorage` 起上下文，请求内任何 `@cloud/log` 调用与错误响应体**自动共用同一 traceId**——无需手动透传。入站带 `x-request-id` 头则复用（跨服务串联）
- 补充上下文用 `enrichTrace({ userId, partyId })`（会话解析后调一次，之后日志自动带）；读当前 id 用 `getTraceId()`
- 错误响应（`@cloud/request` 的 `errorResponse`/`successResponse`）的 `traceId` 取自同一上下文，前端拿到的 id == 日志里的 id，端到端可追
- **限制**：trace 上下文目前只覆盖 `/api/*` 路由（`withApiHandler`）；RSC 页面取数暂无 traceId（后续再覆盖）。`@cloud/log` 是 server-only、叶子包（不依赖其他 `@cloud/*`），勿在其中反向依赖业务包
