# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# AI 行为准则

本文件是 AI 在本项目的**常驻**行为准则：哲学 + 目录语义 + 铁律 + 脚手架工作流。深度规格按需查团队编码规则索引 `.claude/context/injections/references/coding-rules.md`（路由，按主题分篇：`server-layering` / `api-and-requests` / `auth-guards` / `coc-declaration` / `module-layout` / `i18n` / `storage` / `logging` / `notice` / …）。

- 要勇于指出我的错误，当我的要求与上面的目标冲突时，直截了当跟我沟通

## 这是什么
Next.js（App Router）**大单体** `apps/web` + `@cloud/*` 参考骨架 + `.claude/` AI 脚手架。
左侧菜单不写死，由"用户登录→选公司(Party)→角色×合同 交叉算出有效权限→投影菜单"得来。
脚手架层（AI 逻辑）已**正式生产接入**：`/sync`、`/start-work` 接真实飞书（FeiShu Project MCP）；`/logic-converge`、`/submit-work` 接真实文档 repo（需求空间 + 数据模型空间）。完整链路见下方「脚手架工作流」。


## 目录语义（一句话职责）
- 根目录只放 monorepo/构建配置与项目文档；`.next`/`node_modules`/产物/缓存/生成文件不手改、不作依赖。
- `apps/web/modules/<cat>/<mod>/` — **AI 生成落点**，纯业务单元（`manifest.ts`+`server/`+`schema/`+`client/`+`ui/`+`overview.md`）。各子目录分层见 `.claude/context/injections/references/coding-rules/server-layering.md`；`overview.md` 规约见 `.claude/context/injections/references/coding-rules/module-layout.md`。
- `apps/web/commons/<mod>/` — **通用模块**，与 `modules/` **同级**；由 `modules/` 下模块**提升(promote)上来**的可复用单元（纯技术、无自有菜单、不受合同闸门、不反调业务模块）。详见 `apps/web/commons/README.md`。
- `apps/web/app/` — **薄路由层**（page/route/layout）。只做 HTTP 适配，调 `modules` 的 service，不放厚业务逻辑。
- `apps/web/manifest/` — CoC 声明与采集；生成物在 `manifest/_generated/`（`*.generated.ts` + i18n，由 `pnpm gen:coc` 产，勿手改）。
- `apps/web/i18n/` — 全局文案 `i18n/messages`。
- `apps/web/manifest/catalog/` — 声明式「投影输入」，两类：`{roles,contract-types, menu-tree}.ts` 是**商业策略**（非明确指定 AI 不轻易修改**。
- `e2e` 放端到端测试；单测/组件测试就近放；`scripts` 放仓库级脚本（只服务单包的放包内）。
- `packages/*` — `@cloud/*` 基础设施（permissions/db/request/...），只放项目级共享能力，**禁止 import `apps/`**。


## 默认开发链路

1. 权限化模块在 `modules/<cat>/<mod>/manifest.ts` 声明菜单 + 4 段权限码, 由AI维护
2. 页面分别接 `requireSession()` 或 `requirePermissions()`
3. 在 `app/api/*` 下新增接口
4. 接口优先用 `assertPermissions()` 做服务端权限守卫
5. 前端通过 `@cloud/request/client` 调接口
6. 最后再补客户端的按钮显隐和交互细节

> 菜单/权限 i18n key 由 `menuCode`/`code` 派生（生成物字段名仍是 `title`/`label`/`desc`），作者只写 code + 各语言 `i18n/*.ts` 翻译。


## 铁律（违反 = 编译/CI/提交失败，不靠自觉）
1. **写入口只在 route handler**（`app/api/*`）。禁用 server action（`'use server'`）。
2. **`assertPermissions` 只用生成的 `PermissionCode` 类型，不用裸字符串** — 拼错/失效码当场编译报错。
3. **`apps/web/manifest/_generated/*.generated.ts` 与 seed 永不手改** — 改 `manifest.ts` 后跑 `pnpm gen:coc` 重生成。
4. **权限码只增不改**：删/改名要标 `@deprecated`（registry 守门）。
5. **`commons` 是叶子层**：通用模块、纯技术、无自有菜单、不受合同闸门、**不反调业务模块**。
6. **业务数据访问按当前 party 手工限定**（无 RLS）：`@cloud/db` 只导出 `prisma`（无 `tenantCtx`/`withTenantTx`/`systemDb`）。每条查询/变更在 `where`（及 INSERT 的 data）里用会话 `currentPartyId`（`Int`）限定；`currentPartyId` 由 controller 从会话取出、显式传入 service/repository。RSC/页面经模块 service / `*.public` 取数，绝不直接调 `prisma`。
7. **业务表必含 `party_id Int @map("party_id")` + index**；按 party 隔离的唯一约束用 `@@unique([partyId, <key>])`。
8. **跨模块前向声明 = 可 import 的 `*.stub.ts`**：依赖另一模块尚未构建的东西（其 `*.public`/`*.api` 的函数/类型，或一个权限码）→ 写同级 `modules/<cat>/<mod>/<name>.stub.ts`（带 `@stub-owner`/`@stub-consumer`/`@stub-reason` 头），**import 它**顶着开发。`stub-notice`（warn）在每次 lint 列出 owner/consumer；owner 造出真身后，consumer 把 import 换到真实 `*.public`/`*.api`/真码并**删除 stub**。唯一硬闸门在 `/submit-work`（`check-stubs.mjs`）——任何 `*.stub.*` 都不得并入 `develop`。权限码的 stub 导出 `code as PermissionCode`（不进 manifest、不经 `gen:coc`），运行期 fail-closed 直到 owner 落码。类型/函数窄面见 `cross-module-stub.md` 与 `coding-rules/cross-module-refs.md`。

## 命令速查（验证 / 运行）
```
pnpm install
pnpm db:generate        # prisma generate（@cloud/db）
pnpm gen:coc            # 生成 manifest/_generated/*.generated.ts + i18n（改 manifest.ts 后必跑；dev/build 已 pre-hook 自动跑）
pnpm lint               # eslint（apps/web + packages/*）
pnpm test               # vitest 单测/组件（--passWithNoTests）
pnpm test:e2e           # 端到端：docker compose 起 e2e pg/redis + db push/seed + playwright
# 本地全栈：先 pnpm db:setup（generate+push+seed，需本地 Postgres）→ pnpm dev:web → http://localhost:3000/login
```

## 脚手架工作流（skills）
脚手架把"一个飞书开发任务"从开工到收尾串成 6 个 skill，**单活跃任务锁**落在 `.work/workbench.json`（结构见 `.work/workbench.schema.json`），同一时间只允许一个活跃任务（空 `{}` = 无活跃任务）。

**前置 / 约定：**
- **飞书 MCP**：`/sync`、`/start-work` 依赖飞书 MCP（FeiShu Project MCP）；字段/节点/角色 key 与每机搭建步骤一律以 `.claude/feishu/feishu.config.json` 为准（不得编造）。**未配置则二者取不到数据**。
- **基线分支**：feature 分支基于 `develop`，PR 目标也是 `develop`。
- **文档仓**（与本仓同级，缺失则自动 `git clone`）：需求空间 `../pep-webapp-docs`（specs + prototype，`Newland-Payment-Technology-US-Co-Ltd/pep-webapp-docs`）、数据模型空间 `../pep-data-model-docs`（`Newland-Payment-Technology-US-Co-Ltd/pep-data-model-docs`）。

**链路：**
1. **`/sync`**（只读，不写文件）— 展示「归我（FE 角色=当前飞书账号）且在 `NextJS开发(Claude)` 节点」的任务清单。
2. **`/start-work {task编号}`** — 校验唯一活跃任务锁 → 飞书按编号拉任务信息 → 基于最新 `develop` 建/切 `feature/task-{task编号}` → 全部成功才写 `workbench.json.current_task` + `start_time`。
3. **`/logic-groom`**（捕获模式）— 随时把零散的需求/实现逻辑/UI 碎片**只追加**进 `.work/logics/<cat>/<name>/<name>.groom.md`（`待处理`），持续到 `/submit-work` 关闭。只捕获，不分析。
4. **`/logic-converge`** — 读「需求 specs（含 `_common` 共享层）+ 原型 + 数据模型 + 现有代码 + groom 碎片」，把**跨制品的冲突**（矛盾/差异/阻断实现的沉默）逐条与操作员**收敛**，决策沉淀进 `logic.md`——它是**叠加在各输入之上的补充件（supplement），不是替代**：`/coding` 同时读原始输入与 `logic.md`。文档仓按其自描述 README 导航（不硬编码路径），并回写 workbench 文档基线。**只读** `apps/web/commons/<mod>/overview.md` 与各模块 `overview.md` 做全局认识——这些 `overview.md` 由专门的 **commons 维护 skill** 生成/维护（建设中），`/logic-converge` 不写入它们。
5. **`/coding`** — 消费**全部输入 + `logic.md`**（后者是补充件，非唯一来源），起 superpowers 流水线（`writing-plans → executing-plans`）生成/改模块（`gen:coc` + 测试全绿）；流水线 review 的 findings → 人工触发 **`/logic-groom`** 回灌为碎片（`待处理`），走 groom→converge→code 闭环重新消费，不在此就地 debug。不回写飞书、不开 PR（那是 `/submit-work`）。
6. **`/submit-work`** — groom 残留闸门（有未消费碎片则拦截）→ 提交代码 → 询问是否对三仓（本代码仓 + 两文档仓）的 `feature/task-*` 开 PR 到 `develop`（默认不提交）→ 清空 `workbench.json` 释放活跃任务锁。

> `logic.md` / `<name>.groom.md` 是**模块级累积**，跨 task 保留；`/submit-work` 只清 `workbench.json`。`logic.md` 是**收敛决策的补充件**（累积但会随输入演进被**修订/取代**，不是只增不删、不是任务清单），**唯一写者是 `/logic-converge`**；任何人（含 `/coding`、`/logic-groom`）不手改。

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
