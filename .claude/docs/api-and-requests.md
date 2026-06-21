# 接口与请求

> 归属：Route Handler / `@cloud/request` 响应协议 / 分页 / 游标 / 错误码 i18n。**写任何 API、改请求或响应前必读。** 异常处理细节另见 `docs/exception-handling.md`。

- 本项目不使用 Server Action
  - 所有表单提交、数据 mutation 一律走 Route Handler（`apps/admin/app/api/*`）
  - 鉴权、登录、选择组织等公开页面的提交同样走 API，不写 `"use server"` action
  - 客户端用 `@cloud/request/client` 调接口，拿到返回后再自行用 `useRouter()` 跳转
  - 历史遗留的 Server Action 见到即顺手改成 API，不要新增
- 统一通过 `packages/request` 发起请求
- 客户端使用 `@cloud/request/client`
- 客户端收到「会话失效类」401 会自动跳登出，机制在包、策略在 app，**不要在业务组件里手写 401 跳转**：
  - 包：`@cloud/request/client` 的 `setUnauthorizedHandler(fn)` 在 `status===401` 时回调 `fn(RequestError)`，然后照常 throw（不吞错，组件原有 `catch` / `toastError` 不变）；包不认识任何 app 路由或错误码
  - 策略：`apps/admin/lib/session-expiry.ts` 的 `handleUnauthorized` 按**白名单 code** 决定是否登出——`{ "unauthenticated", ERR_UNAUTHORIZED, ERR_AUTH_NOT_AUTHENTICATED }` 命中才 `window.location.replace("/api/auth/logout")`（与服务端 `requirePermissions` 401 出口一致：清残留 cookie → 303 `/login`）；模块级 `redirecting` 锁防并发重复跳
  - 登录页凭证错误 `ERR_AUTH_INVALID_CREDENTIALS` 也是 401，但**刻意不在白名单**，不会误跳；新增 401 码默认不触发登出，属于「会话失效」语义才往白名单补
  - 注册：`apps/admin/app/_components/unauthorized-redirect.tsx`（tiny client 组件）在根 layout 挂一次
- 服务端响应优先使用 `@cloud/request/server` 提供的响应辅助函数
- 成功 JSON 响应必须走 `successResponse()` / `createdResponse()`，body 形状为 `{ code: "OK", message: "success", data, page?, limit?, total?, totalPages?, nextCursor?, prevCursor?, hasNextPage?, hasPrevPage?, traceId }`，分页字段与 `data` 同级
- DELETE 或其他无需 body 的接口使用 `noContentResponse()` 返回 204，response body 必须为空
- 分页分两种，按需选用，不要混用：
  - 偏移分页用 `Pager`（`page` / `limit` / `total` / `totalPages`），适合需要页码、总页数的场景
  - 双向游标分页统一走 `@cloud/request/server` 的 `readCursorQuery(token, direction)` + `buildCursorPage()`，配合 `CursorPager`，响应带 `nextCursor` / `prevCursor` / `hasNextPage` / `hasPrevPage`
  - 游标 token 由服务端 `encodeCursor()` 签发、只编码锚点 id、对客户端不透明；翻页方向是独立的 `direction` 参数，由客户端显式传，**不编进 token**
  - 服务端按 `query.sortOrder` 设 `orderBy`、`take: limit + 1` 多取一条探测，再交给 `buildCursorPage()` 切片、翻回升序、签发双向游标；不要在 Route Handler 里手写这套逻辑
  - 客户端用 `apps/admin/lib/use-cursor-pagination.ts` 的 `useCursorPagination()` 原样回传服务端给的游标 + 方向，**绝不从行 id 自己拼游标**，也不缓存历史游标
- 新增接口时，优先放在 `apps/admin/app/api/*`，且**只做 HTTP 适配**，业务逻辑落到 `service/<domain>/`（见「服务端分层」）
- Route Handler 默认做两层权限：
  - 登录态 / 粗粒度权限码：优先用 `assertPermissions()`（在 route 里做）
  - 业务归属 / 范围校验：例如 `entityId`、`roleId`、`userId` 是否属于当前租户——落在 service / policy 层
- Route Handler 的异常兜底统一走 `apps/admin/lib/api-handler.ts`（设计与示例见 `docs/exception-handling.md`）
  - **业务异常一律 throw 类型化异常，不再 return 错误响应**：参数校验、业务冲突、数据不存在等可预期错误用 `throw new BusinessError(code, status?, params?)`（`@cloud/request`），由 `withApiHandler` 捕获后统一出 40x `{ code, message, traceId }`
    - `code` 走 `PMMNNN` 数字码（注册表内才本地化）；`status` 限 `400|401|403|404|409|422`，默认 400；`params` 是 `{name}` 占位插值参数，渲染进文案、不进响应体
    - 中间件/基础设施故障（DB 连接、Redis、邮件等）用 `throw new MiddlewareError(ERR_MW_*)`，统一掩码成 503 通用文案（对客户不透明，开发凭 code + traceId 在日志识别）
    - 开发者诊断信息自己 `console.error` 打（`BusinessError` 不带 devMessage）；所有被捕获的异常都会连堆栈进日志
  - **仍然禁止 `throw new Error("文本字符串")`** 表达业务错误——要带稳定 `code`，用 `BusinessError` / `MiddlewareError`，不要裸 `Error`
  - `badRequestResponse()` / `notFoundResponse()` / `errorResponse()` 降级为「mapper 内部构造 Response 用」，业务代码不再直接调用；rsc 页面级预期错误仍走 `notFound()` / `redirect("/403")`
  - 默认用 `withApiHandler()` 包裹整个 handler，不要在每个文件里手写 `try { ... } catch (error) { return handleApiError(error) }`
    - 写法：`export const POST = withApiHandler(async (req) => { ... })`
    - 带动态路由参数时第二个参数照常透传：`withApiHandler(async (req, { params }) => { ... })`
    - S3 / 存储接口把 `onError` 作为 `withApiHandler()` 的第二个参数：`withApiHandler(async () => { ... }, { onError: s3ErrorResponse })`
    - handler 内部解析 JSON / formData 的局部 `try / catch` 不受影响，照常保留
  - `withApiHandler()` 内部捕获异常后调用 `handleApiError()`；确需手动兜底时仍可直接 `return handleApiError(error)` / `return handleApiError(error, { onError: s3ErrorResponse })`
  - `handleApiError()` 已统一处理 `AuthzError`、常见 Prisma 错误和未知异常；不要在每个 API 文件里重复写 `AuthzError` 分支
  - Next 控制流异常（redirect / notFound）必须继续抛出，不能被自定义 catch 吞掉
- 错误码是接口协议，message 是展示文案
  - 前端逻辑、测试、监控优先依赖稳定 `code`
  - `message` 可以调整和国际化，不应作为业务判断依据
  - 成功和失败 JSON 响应都带 `traceId`；204 无 body 响应不带 `traceId`
  - 错误文案由服务端按当前 locale 本地化，**code 为准**：`@cloud/request/error-messages` 注册表里有该 `code` 就按 locale 出文案，`errorResponse()` 的 `message` 参数只是「注册表外 code」（如 `storage.*` / `database.*` / permissions 的 `forbidden`）的兜底
    - `handleApiError` 把 `AuthzError` 401 统一映射成注册表内的 `ERR_UNAUTHORIZED`（包内置三语、始终在场，全路由可本地化）；403 暂仍用 `forbidden` + 英文兜底
    - 注册表内的 code 走 `@cloud/request` 的错误码（`ERR_*`），新增错误码时同步在 `error-messages/{en,zh-CN,ja}.ts` 补三语，少补会编译报错
    - locale 由 `withApiHandler()` 在进 handler 前读 `LOCALE_COOKIE` 解析、用 `runWithLocale()` 注入请求级上下文；`errorResponse()` 等响应辅助保持同步，不在里面读 cookie
    - 没走 `withApiHandler()`（或非请求上下文）时 locale 回退英文
- 不要把"前端看不到入口"当作接口安全前提

## 客户端调用层

> 归属：客户端（组件 / hook）怎么发起 HTTP 调用——调用收口、路径、类型、错误展示。**写客户端调接口前必读。**

- 每个业务域把客户端调用收口到 `apps/<app>/service/<domain>/api.ts`（**非 server-only**）；**组件不裸调 `request.*`、不在调用点内联 `/api/...` 路径字面量**
  - `service/<domain>/` 下只有 `api.ts` 与 `schemas/` 可被客户端 import；`server/` 等其余文件是 server-only，客户端不得 import
- `api.ts` 只导出**具名函数**：不导出对象（`export const xxxApi = {...}` 会让整组函数一起进 chunk、破坏 tree-shaking）、不建跨域 `index.ts` 桶、调用方也不要 `import * as`
  - 组件内常有同名 handler（如 `createUser` 包了 api 调用 + 乐观更新 + toast），与 api 函数撞名时**在 import 处 alias**（`import { createUser as createUserApi }`），不要为此改用 `import *`
- **不写 `const BASE`**，每个函数写**全量路径**——一个函数自带完整 URL，好 grep、可直接复制
- 命名 `<动词><实体>`，**实体一律单数**，复数 / 集合语义由动词表达；动词表固定，不要自由发挥（不写 `fetchUsers` / `getUserList`）：
  - `getXxx(id)` 取单条；`listXxx(params?)` 取集合 / 分页；`createXxx(input)`；`updateXxx(id, input)`；`deleteXxx(id)`
  - 超出 CRUD 的端点：**聚合读**用 `get<Entity><名>`（如 `getNoticeUnreadCount`、`getUnreadByParty`）；**领域动作**用 `<动作><Entity>`，动作动词取领域语义（`markNoticeRead` / `lockUser` / `resendUserInvite`）——动作动词不强求落在固定表内，但仍须**实体限定、防撞名**
- 请求 / 响应类型从该域**共享类型源** import：优先 `service/<domain>/schemas/` 的 `z.infer`（就是 Route parse 用的那份，client / server 同源），已有 `types.ts` VO 的沿用；**禁止在组件里内联 `type XxxResponse`**
- 函数**原样返回** `request.*` 的 envelope，调用点读 `.data`；列表的分页字段（`total` / `nextCursor` 等）与 `data` 同级，**不要在 `api.ts` 里 `.then(r => r.data)` 提前 unwrap**，否则列表拿不到分页
- 错误展示：
  - 默认 `toastError(err)`（`@cloud/request/error-toast`）弹瞬时 / 全局错误
  - 需要内联渲染的错误（如表单下方红字），组件自行 `catch` 后 `setState`
  - 需要按错误类型走不同分支时，判 `err.body?.code`（`ERR_*` 常量），**绝不判 `message`**（message 是随 i18n 变的展示文案）
  - 后台静默刷新（轮询、挂载预取）可吞错，但 UI 必须降级可见（保留上次值 / 空态），不能转圈卡死
  - 「会话失效类」401 的登出由包 + app 策略统一处理，**不在业务组件手写 401 跳转**（见上文）

```ts
// ❌ before：路径、类型、调用全散在组件里，每个组件各写一份
const API_BASE = "/api/system/users";
type UserResponse = { id: string; name: string };           // 内联重定义，与服务端脱钩
const res = await request.get<UserResponse[]>(API_BASE);    // 调用点直连 request.*
```

```ts
// ✅ after — apps/admin/service/users/api.ts：该域客户端调用的唯一出处
import { request } from "@cloud/request/client";
import type { UserVo, CreateUserInput, UpdateUserInput } from "./schemas/user.schema";

export const getUser    = (id: string)              => request.get<UserVo>(`/api/system/users/${id}`);
export const listUser   = ()                        => request.get<UserVo[]>("/api/system/users");
export const createUser = (input: CreateUserInput)  => request.post<UserVo>("/api/system/users", input);
export const updateUser = (id: string, input: UpdateUserInput) =>
  request.put<UserVo>(`/api/system/users/${id}`, input);
export const deleteUser = (id: string)              => request.delete(`/api/system/users/${id}`);

// 组件：只 import 用到的，bundler drop 掉其余；类型 / 路径都不在这里出现
import { listUser, updateUser } from "@/service/users/api";
const res = await listUser();
setUsers(res.data);
```
