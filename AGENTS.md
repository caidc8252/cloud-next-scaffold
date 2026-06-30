# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# AI 行为准则

本文件是 AI 在本项目的**常驻**行为准则：哲学 + 目录地图 + 硬不变量 + 文档索引。深度细节按需读 `.claude/docs/*`（每条硬不变量都标了「动手前先读 X」）。

## 总则

- 要勇于指出我的错误，当我的要求与上面的目标冲突时，直截了当跟我沟通
- 也要积极帮我思考，找出不同方案间的优劣和 trade off，帮我重塑决策
- 约定大于配置，代码大于文档

## 这是什么
Next.js（App Router）**大单体** `apps/web` + `@cloud/*` 参考骨架 + `.claude/` AI 脚手架。
左侧菜单不写死，由"用户登录→选公司(Party)→角色×合同 交叉算出有效权限→投影菜单"得来。
脚手架层（AI 逻辑）已**正式生产接入**：`/sync` 接真实飞书、`/start-work`/`/submit-work` 接真实文档 repo。


## 目录语义（一句话职责）
- 根目录只放 monorepo/构建配置与项目文档；`.next`/`node_modules`/产物/缓存/生成文件不手改、不作依赖。
- `apps/web/modules/<cat>/<mod>/` — **AI 生成落点**，纯业务单元（`manifest.ts`+`server/`+`schemas/`+`ui/`）。
- `apps/web/app/` — **薄路由层**（page/route/layout）。只做 HTTP 适配，调 `modules` 的 service，不放厚业务逻辑。
- `apps/web/manifest/` — CoC 声明与采集。
- `apps/web/i18n/` - 全局文案 `i18n/messages`
- `apps/web/manifest/catalog/{roles,contract-types}.ts` — **商业策略，非有明确指定，否则AI不轻易修改**。
- `e2e` 放端到端测试；单测/组件测试就近放；`scripts` 放仓库级脚本（只服务单包的放包内）。

- `packages/*` — `@cloud/*` 基础设施（permissions/db/registry/request/...），只放项目级共享能力, **禁止 import `apps/`**。


## 默认开发链路

1. 权限化模块在 `modules/<cat>/<mod>/manifest.ts` 声明菜单 + 4 段权限码, 由AI维护
2. 页面分别接 `requireSession()` 或 `requirePermissions()`
3. 在 `app/api/*` 下新增接口
4. 接口优先用 `assertPermissions()` 做服务端权限守卫
5. 前端通过 `@cloud/request/client` 调接口
6. 最后再补客户端的按钮显隐和交互细节


## 铁律（违反 = 编译/CI/提交失败，不靠自觉）
1. **写入口只在 route handler**（`app/api/*`）。禁用 server action（`'use server'`）。
2. **`assertPermissions` 只用生成的 `PermissionCode` 类型，不用裸字符串** — 拼错/失效码当场编译报错。
3. **`*.generated.ts` 与 seed 永不手改** — 改 `manifest.ts` 后跑 `pnpm codegen` 重生成。
4. **权限码只增不改**：删/改名要标 `@deprecated`（registry 守门）。
5. **`common.*` 是叶子层**：纯技术、无菜单、不受合同闸门、**不反调业务模块**。
6. **所有业务数据访问必经租户上下文**：API 路由经 `withApiHandler` 绑 `tenantCtx`；RSC 页面自己 `tenantCtx.run({partyId})`。读路径靠 L3 RLS（`@cloud/db`），不靠手写 where。
7. **业务表必含 `party_id uuid` + index**（schema CI）。
8. **完成判据不主观**：`/submit-work` 全绿 = 每条 `acceptance_criteria` 有绿色 verify 锚点 + lint/unit/e2e 通过（`green-gate.ts`）。
9. **修复只在封闭枚举内**（`fix-map.ts` 的 `AREA_FIX_MAP` + 允许文件集）；越界或无法映射 → `blocked`，不自由发挥。
10. **跨模块**：`/coding` 后置 checkpoint 校验引用的目标模块有契约；缺则 `blocked(missing-dependency-contract)`，不让 tsc 裸红（跨模块依赖检查点 + 前向声明 stub 物化，见 `.claude/scaffold/cross-module.ts`）。

## 命令速查（验证 / 运行）
```
pnpm install && pnpm --filter @cloud/db exec prisma generate && pnpm codegen
pnpm typecheck          # 11/11 项目
pnpm test               # 全量（含 13 个真实 RLS e2e）
pnpm --filter platform test demo   # 需求走查 7 用例
# 本地全栈（Next.js 本地开发，零安装 DB；运行时鉴权/数据接入待转生产）：终端1 pnpm dev:db ；终端2 pnpm --filter platform dev → http://localhost:3000/login (demo/acme)
```

## 工作流约定
- 脚手架状态机：`new → in-progress → fixing → submitted`，任意点可 `→ blocked`（经 `/unblock` 恢复，retry 有全局上限）。
- 改动前若涉及框架约定，依据本文件铁律 + 命令/技能/scaffold 逻辑 + 代码关卡，不要凭记忆。

## 代码规范

- 默认 TypeScript，类型写好；不要 `any`，不用 JSDoc 用类型系统
- 除非特地指出，不要修改 `packages/*` 下的代码
- 命名：变量/函数 camelCase；类/接口 PascalCase；常量 UPPER_SNAKE_CASE；文件/目录 kebab-case；避免非通用缩写；函数用动词/动宾、类用名词、bool 用 is/has/can 开头
- 单组件/库/脚本不超过 400 行，尽量 300 行附近
- 适量注释；新增/迁移代码优先解释业务意图、架构边界、兼容壳、迁移原因和安全取舍，不写复述代码表面的注释

## 数据库

- 若 key 名无重复歧义，尽量保持所有表一致。
- 读多写少、聚合入口明确、反查低频的关联可以用 JSONB 数组保存 id，避免无意义的通用关联表。
- 文件信息默认由业务表字段表达：可以只存 URL，也可以存 objectKey、bucket、contentType、sizeBytes、etag 等 S3 返回信息；多文件建议用 JSONB 数组，数组顺序就是展示顺序。
- 写入文件信息前必须在 service 层完成业务权限、业务对象归属、文件类型、可见性和 S3 `HeadObject` 校验；需要反查、去重或清理时由业务域自己评估索引或专门查询方案。
