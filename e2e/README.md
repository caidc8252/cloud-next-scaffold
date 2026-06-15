# e2e 测试约定

Playwright 端到端测试。本文讲**逻辑**：一轮测试怎么跑、尤其是**鉴权**是怎么处理的。
机械操作看根目录 `package.json` 的 `test:e2e` 脚本与 `playwright.config.ts`。

## 核心：登录一次（真登录），之后每个测试复用会话、跳过登录界面——但服务端鉴权永远真跑

e2e **不伪造权限、不绕过守卫**。套路叫 **storageState（会话快照）**：

1. **全程只在 `global-setup` 里真登录一次**：走完整登录流程（不是 mock），拿到**真实的服务端会话**（Redis 里的 session + 浏览器里的 `sid` cookie）。
2. 把这套**已登录的 cookie 存成文件**（`e2e/.auth/admin.json`）。
3. **每个测试启动时，把文件里的 cookie 注入一个全新的浏览器上下文**——于是测试“一开始就是已登录态”，**不用再点一遍登录界面**。

关键区别：

- **跳过的是「登录界面/登录动作」，不是「鉴权」。**
- 每个请求到了服务端，`sid` cookie 照样换 Redis 里的 session，`requirePermissions()` / `assertPermissions()` 照样校验。**服务端的权限逻辑真实运行**，测的就是真东西。
- 我们**没有**选「直接往 Redis 塞假 session + 手写 cookie」这种伪造捷径——登录密码是前端 RSA 加密的，与其复刻加密，不如让真实前端跑一遍（顺带把登录流程本身也测了）。

> 一句话：**真发一次会话 → 冻成文件 → 各测试解冻复用 → 省掉登录动作，但服务端授权一个都不少。**

## 完整一轮 e2e 的逻辑步骤

`pnpm test:e2e` = `test:e2e:spec && check:e2e-orphans`，展开如下。

### 阶段 0 · 起基建

- `docker compose -f e2e/docker-compose.e2e.yml up -d --wait`：拉起**临时** Postgres + Redis，数据在 tmpfs——**每次全新、跑完即弃**。host 端口默认 PG `5434` / Redis `6380`（避让本地 docker 占用的 5432/5433/6379）。
- `db push`：把 Prisma schema 刷进空库。
- `E2E_SEED=1 db seed`：种入**测试专用账号**（admin + 非 admin 的 `e2e-user`，已知密码）。`E2E_SEED` 门控保证这些已知密码账号**绝不进真实环境**（见 `packages/db/prisma/seed.ts`）。

### 阶段 1 · 认证（`global-setup`，全程一次）

本仓难点在这里，因为登录是**跨 host** 的：登录在 **portal(3100)**、被测应用在 **admin(3000)**。`global-setup` 用真实浏览器驱动 portal 登录页，让应用自身完成 RSA 加密与 handoff，最后把 **admin 会话**落盘：

1. 浏览器打开 portal 登录页，填 email + 密码、提交；
2. 前端：`GET /api/auth/login-challenge` 拿一次性 nonce → RSA 把密码加密成登录包 → `POST /api/auth/password`；
3. 服务端验 nonce、解密验密码、**在 Redis 建 session**；（有 MFA 走 `mfa-verify`、多公司走 `select-partner`——e2e 账号刻意设成单公司、无 MFA，跳过）
4. portal 签发 **session-handoff token** → 跳到 admin 的 `GET /api/auth/session-handoff?token=`，admin **在自己 host 写下 `sid` cookie** → 跳 `/`；
5. 等浏览器落到 admin host（handoff 完成、`sid` 已写），`storageState({ path })` 把 cookie 存进 `e2e/.auth/admin.json`。

> 现状：`global-setup` 目前只登录 **admin** 账号、产出 `admin.json`。非 admin 的 `e2e-user`（已在 seed 里预置、`roles:[]` 零权限）是**下一步**——给它单独签一份 `user.json`，用来断言「普通用户 vs 管理员」的按角色显隐差异。env 里的 `E2E_USER_*` 为此预留。

### 阶段 2 · 跑用例（每个 spec）

- project 划分见 `playwright.config.ts`。当前只接了 `anon`（不带 cookie → 测“未登录是否被正确挡住/重定向”）；`global-setup` 已经产出 `admin.json`，接上 `admin`（注入 `admin.json` → 测管理员完整能力）与未来的 `user` 工程即可扩出按角色的覆盖。
- **每个测试前** `fixtures/db.ts` 的 `truncateAll()` 清库，但 **KEEP 列表保住身份/RBAC 表**（`sys_user` / `sys_party` / `sys_party_user` / `sys_party_contract` / `sys_role`）：
  - **为什么必须 KEEP**：快照里的 cookie 指向一个 `sid`，服务端每次请求都要用它**反查“哪个用户、绑哪个公司、有哪些角色”**。身份表被清 → 第一个测试之后全部 401，快照作废。
  - 业务表（如 `sys_notice`）**不 KEEP**，每个测试从干净状态开始，互不污染。改动 KEEP 表的 spec 须造唯一命名的行、只断言自己的行。

### 阶段 3 · 收尾

- `check:e2e-orphans`：扫 route/middleware/auth 边界上的 `@e2e-cell` 标记，确保没有“有守卫却没被 e2e 覆盖”的孤儿。

## 设计取舍

| 取舍 | 选择 | 理由 |
|---|---|---|
| 每测试登录 vs 登录一次复用 | **一次复用（storageState）** | 登录跨 host + RSA + 多步，逐用例重跑又慢又脆 |
| 伪造 session vs 真登录 | **真登录** | 密码前端 RSA 加密，复刻易错；真跑也顺带测了登录本身 |
| 全清库 vs 清库保身份表 | **truncate + KEEP** | 测试间隔离，但登录态（依赖身份表）须跨测试存活 |
| API 调 vs 驱动真实 UI 登录 | **驱动真实 portal UI** | 让前端 crypto/handoff 自然发生，不在测试里重写加密 |

## 本地跑

1. 复制 `.env.test.example` → `.env.test`（gitignored），填账号凭证。默认 host 端口 PG `5434` / Redis `6380`。
2. `pnpm test:e2e`。
