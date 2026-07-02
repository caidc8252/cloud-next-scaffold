# e2e 测试约定

Playwright 端到端测试。本文讲一轮测试怎么跑，尤其是鉴权怎么处理。
机械操作看根目录 `package.json` 的 `test:e2e` 脚本与 `playwright.config.ts`。

## 核心：零注入本地跑法

e2e 不伪造权限、不绕过守卫，也不新增认证旁路 HTTP 接口。当前跑法是：

1. `.env.test` 显式设置 `DEV_AUTH_BYPASS=1`。
2. `global-setup` 只校验基础 env，不调用认证 API，不写 `e2e/.auth/*.json`。
3. Playwright 用空浏览器上下文发请求。
4. 服务端 `getSession()` 在没有 `sid` cookie 时，通过 `@cloud/permissions` 的 fallback provider 为 localhost 请求构建一份 DB 派生 session。

关键区别：

- 跳过的是“证明身份”的动作，不是鉴权。
- party / contract / role / permissions 仍来自真实数据库快照。
- `requireSession()` / `requirePermissions()` / `assertPermissions()` 照常运行。
- provider 不写 cookie、不写 Redis、不创建 storageState 文件。

安全闸：

- `DEV_AUTH_BYPASS` 必须显式为 `1`。
- `NODE_ENV=production` 或 `CI=true` 时永远不生效。
- 只接受 `localhost` / `127.0.0.1` / `[::1]` host；存在公共 `x-forwarded-host` 时拒绝。
- 默认身份是 seed admin：`admin@newlandnpt.com`。需要覆盖时设置 `DEV_AUTH_BYPASS_EMAIL`。

## 完整一轮 e2e

`pnpm test:e2e` = `test:e2e:spec && check:e2e-orphans`。

### 阶段 0 · 起基建

- `docker compose -f e2e/docker-compose.e2e.yml up -d --wait`：拉起临时 Postgres + Redis。
- `db push`：把 Prisma schema 刷进空库。
- `db seed`：通过 `.env.test` 里的 `E2E_SEED=1` 种入测试专用账号。`E2E_SEED` 门控保证这些账号不进真实环境。

### 阶段 1 · 认证

`global-setup` 校验：

- `E2E_BASE_URL`
- `DATABASE_URL`
- `REDIS_URL`
- `DEV_AUTH_BYPASS=1`

校验通过后直接返回。认证身份由服务端本地 fallback provider 在请求期按需补齐。

### 阶段 2 · 跑用例

- 管理员用例使用空上下文；本地 provider 按 seed admin 补齐 session。
- 匿名用例也使用空上下文；如需测试“真正匿名”，该 spec 需要临时关闭 `DEV_AUTH_BYPASS` 或使用独立项目配置。
- 每个测试前 `fixtures/db.ts` 的 `truncateAll()` 清业务表，但 KEEP 身份/RBAC 表：
  `sys_user` / `sys_party` / `sys_party_user` / `sys_party_contract` / `sys_role`。

### 阶段 3 · 收尾

- `check:e2e-orphans` 扫 route/middleware/auth 边界上的 `@e2e-cell` 标记。

## 本地跑

1. 复制 `.env.test.example` 为 `.env.test`。
2. 保持 `E2E_SEED=1` 和 `DEV_AUTH_BYPASS=1`，确认 `DEV_AUTH_BYPASS_EMAIL` 指向 seed 账号。
3. 跑 `pnpm test:e2e`。

不要在共享机器、公网转发地址或任何线上环境开启 `DEV_AUTH_BYPASS`。
