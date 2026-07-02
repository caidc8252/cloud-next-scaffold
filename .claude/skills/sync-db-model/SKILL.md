---
name: sync-db-model
description: /sync-db-model —— 把数据模型空间的物理 DDL（../pep-data-model-docs/specs/physical-model/app.sql）同步到本地 Prisma schema（packages/db/prisma/schema.prisma）。按固定约定规则算语义漂移 → 展示差异报告 → 只对操作员确认的条目改 schema.prisma → prisma validate + pnpm db:generate 校验就停。无状态、不碰真库、不落报告文件。当操作员要把上游数据模型同步进 Prisma 时使用。
---

# sync-db-model

把上游**数据模型真理** `../pep-data-model-docs/specs/physical-model/app.sql` 同步到本地 Prisma schema `packages/db/prisma/schema.prisma`。用法：`/sync-db-model`。

产物 = **差异报告 + 人工确认改写**：读两边 → 按固定约定规则算语义漂移 → inline 展示结构化 drift 报告 → 只对操作员**确认**的条目改 `schema.prisma` → `prisma validate` + `pnpm db:generate` 校验就停。

设计与决策依据见 `docs/design-bridge/sync-db-model/design.md`。

> **原则**：照 app.sql 落，**忠实镜像，不发明新逻辑**；真遇到 app.sql 没说、又必须决定的，停下问操作员、确认后再做。
> **边界铁律**：**无状态**（不维护映射/台账文件）、**不落报告文件**（报告仅 inline）、**不碰真库**（不 `db push`/`seed`/迁移）、**不改 `apps/web` 下游代码**。

## 数据源

- **上游**：`../pep-data-model-docs/specs/physical-model/app.sql`（只读输入）。缺失 → 提示操作员按脚手架约定 `git clone`（`Newland-Payment-Technology-US-Co-Ltd/pep-data-model-docs`），未就绪则退出。
- **目标**：`packages/db/prisma/schema.prisma`（只读比对 + 确认后改写目标）。
- 两边命名体系不同（`app.*` vs `sys_*`、bigint vs Int、`created_at` vs `cre_time`），靠下方**约定规则归一化**后再比，只报归一化后仍存在的真漂移。

## 约定归一化规则（比对前对齐，抹平房间风格差异）

| app.sql | ⇄ Prisma | 说明 |
|---|---|---|
| 表 `app.<t>`（schema `app` + 表 `<t>`） | model `App<T>` / `@@map("<t>")` + `@@schema("app")` | `app` 是真 PG schema，用 multiSchema，非扁平前缀（见「multiSchema」节） |
| 主键 `<t>.id bigint identity` | `<t>Id Int @default(autoincrement()) @map("id")` | 列名就是 `id`；整数类型走「类型策略」 |
| `bigint` | 默认 `Int`（**显式偏差**）/ 按表可 override `BigInt` | 见「类型策略」，非静默归一化 |
| `numeric(p,s)` / `decimal(p,s)`（金额） | `Decimal @db.Decimal(p,s)` | 禁 `Float`，见「类型策略」 |
| `varchar(n)` | `@db.VarChar(n)` | 忠实转换 |
| `timestamp` | `@db.Timestamp(3)` | 忠实转换 |
| `jsonb` | `Json` | 忠实转换 |
| `char(n)` | `@db.Char(n)`（`status char(1)` 等短码列可按语义放宽为 `@db.VarChar`，报告标注理由） | 忠实转换 |
| app.sql 没有的字段 | **不生成** | `cre_user_id`/`upd_user_id` 等不再造 |
| 无物理外键（仅索引） | **不写 `@relation`**，只留标量列 + `@@index` | 完全照 app.sql |
| `email varchar(254)` | `@db.VarChar(254)` | 不再自造 `citext` |
| `role.permissions` / `party_user_role` join 表 | 忠实建成 `permissions Json` / `AppPartyUserRole` model | 不折成 JSONB / 不改名 |
| 唯一索引 `..._uidx` | `@@unique([...])` / 单列 `@unique` | 按索引列集对齐 |
| 普通索引（外键字段） | `@@index([...])` | 按索引列集对齐 |
| `comment on ...`（受控取值，如 status `0/1/2`） | Prisma 字段注释（advisory） | 不表达 CHECK，只沉淀注释 |

## 类型策略（整数宽度 / 金额）

关键机制：**决定 JS 运行时类型的是 Prisma scalar，不是 PG 列宽**（`Int`→`number`；`BigInt`→JS `bigint`，不能 `JSON.stringify`；`Decimal`→`Prisma.Decimal`，`toJSON` 出 string）。本仓本地/e2e 库由 `pnpm db:push` 从 `schema.prisma` 生成 → Prisma 声明类型即实际物理类型，app.sql 的 bigint 是建模意图，不一致是**该被看见的偏差**。

- **整数/ID 默认 `Int`**：app.sql 那 7 张是有界 B2B 关系表，int4 上限非真天花板；`Int` 满足铁律 #7（`party_id Int`）+ 前端 `number` 干净。
  - `app.sql=bigint / Prisma=Int` **在报告里列为一条显式偏差**（理由：有界实体 + 铁律#7 + JS number 安全），不吞进风格归一化。
  - 逃生舱：某表确为高 volume → 逐表 override `BigInt @db.BigInt`，并在 API 边界统一序列化为 string。默认不启用。
- **金额禁 `Float`**：`numeric(p,s)`/`decimal(p,s)` → `Decimal @db.Decimal(p,s)`；遇到金额语义的 `Float` 直接报警。app.sql 现无金额列（前置约定）。
- `BigInt`/`Decimal` 均不原生 JSON 序列化 → 跨层约定统一在 `@cloud/request`/API 边界序列化为 string。

## multiSchema（`app` 是真 PG schema，不是表名前缀）

app.sql 头部 `create schema if not exists app;`，`app.user`/`app.party`… 是 schema `app` 下的表，**表名不含 `app`**。用 Prisma **multiSchema** 忠实表达（Prisma 7.x multiSchema 已 GA，**无需 `previewFeatures`**）：

- datasource：`db { schemas = ["app", "public"] }`。
- app.sql 每表：`model App<T> { … @@map("<t>") @@schema("app") }`。
- `pnpm db:push` 会 `create schema app` 并把表建进 `app`；`DATABASE_URL` 现 `?schema=public`，multiSchema model 显式限定 schema、不受影响。

**全有全无（强制配套）**：datasource 一开 `schemas=[...]`，**每个 model 都必须带 `@@schema(...)`**，否则 `prisma validate` 报错。故随首个 `app` 表落地，须一次性：① app.sql 的 7 表 → `@@schema("app")`；② 现有 5 张 Prisma-only 表（notice/mfa/operator_invite/operation_log/party_contract_event，「保留不动」）→ 各补 `@@schema("public")` 保持现位；③ `citext` 等扩展指明 schema（如 `citext(schema: "public")`）。都是确定性改动、不改语义。

## Steps

1. **就绪校验**：确认 `../pep-data-model-docs/specs/physical-model/app.sql` 与 `packages/db/prisma/schema.prisma` 均存在可读；上游缺失 → 提示 `git clone` 后退出。
2. **解析两边**：
   - 解析 app.sql → 表/列/类型/可空/默认/索引·唯一/comment。
   - 解析 schema.prisma → model/字段/`@db.*`/`@@map`/`@@unique`/`@@index`。
3. **归一化对齐**：按上方「约定归一化规则 + 类型策略」把两边归一到同一语义面，仅保留归一化后仍存在的差异。结构性特例（`party_user_role`↔join 表、`role.permissions`、`user_credential`）按规则表处理，不当作漂移噪声。
4. **算 drift 并分类**（只覆盖 app.sql 的 7 张表 → `App<T>`）：

   | 分类 | 含义 | 默认动作 |
   |---|---|---|
   | **缺表** | app.sql 有、Prisma 无对应 `App<T>`（如 `AppUserCredential`、`AppPartyUserRole`） | 建议新增整表 → 待确认 |
   | **缺列** | 表在、app.sql 有列 Prisma 无 | 建议加列 → 默认勾选 |
   | **属性漂移** | 归一化后类型/长度/可空仍不同 | 建议对齐 → 默认勾选 |
   | **索引漂移** | app.sql 的 unique/index 与 `@@unique`/`@@index` 不一致 | 建议对齐 → 默认勾选 |
   | **枚举/注释** | app.sql comment 定义取值；Prisma 不表达 CHECK | 同步成 Prisma 注释 → advisory |
   | **整数宽度偏差** | `app.sql=bigint / Prisma=Int` | 列出为**显式偏差**（默认保 Int，不改；可手动 override BigInt） |
   | **多列（app.sql 未定义）** | Prisma 有、app.sql 无的列（如 `cre_user_id`） | 列出 → **默认不勾**（删除破坏性，需显式确认） |
   | **app.sql 未覆盖表** | 5 张 Prisma-only（notice/mfa/operator_invite/operation_log/party_contract_event） | 列出、**不动** |

5. **展示报告**（inline、不落文件，按表分组）：每条含 `编号 / 表 / 列 / app.sql 侧 / Prisma 侧 / 分类 / 建议改法 / 默认动作`。
6. **操作员确认**：逐条或批量勾选要应用的项。新增/对齐类默认勾选；删列/删表、bigint→BigInt override 默认不勾，需显式确认。**无确认项 → 直接结束**（纯只读，无副作用）。
7. **改写**：对确认项用 Edit 改 `packages/db/prisma/schema.prisma`。遵循约定规则表逐条落（model 名 `App<T>`、`@@map("<t>")` + `@@schema("app")`、`@map("id")`、无 `@relation`、类型策略）。**首次引入 `app` schema 时的 multiSchema 强制配套**（见「multiSchema」节）随之一次性做：datasource 补 `schemas=["app","public"]`、现有 5 张 Prisma-only 表补 `@@schema("public")`、`citext` 等扩展指明 schema。
8. **校验**：
   - 在 `packages/db` 跑 `prisma validate`（经 `prisma.config.ts`）。
   - 跑 `pnpm db:generate` 重生成 client。
   - 任一失败 → 报错、指明失败点；已改的 schema **保留**（操作员可 `git` 回滚），退出。
9. **汇报**：列出改了哪些条、validate/generate 结果。**若涉及改名/重构** → 明确提示「下游 `apps/web` 里 `SysXxx` / `prisma.sysXxx.*` 引用会编译不过，属本 skill 范围外，需另行修复」。

## I/O contract

- **Input**：`app.sql`（只读）+ `schema.prisma`（只读比对 + 确认后改写目标）。
- **Output**：inline drift 报告 + （确认后）`schema.prisma` 编辑 + `prisma validate`/`pnpm db:generate` 结果。**不读写任何 `.work/*`，不落报告文件，不碰真库。**
- **半幂等**：报告阶段纯只读、可重复；应用后再跑，漂移收敛（已对齐项不再出现）。
- **范围外**：`apps/web` 下游编译修复、`db push`/`seed`/迁移、逻辑模型（`.dbml`）同步、app.sql 未覆盖的 5 张表。

## AUTONOMOUS_MODE

- 唯一交互点：步骤 6 的确认勾选（哪些 drift 项应用、是否删多列、是否 override BigInt）。其余无分支。
- 无确认项时无需交互，直接结束。
- 数据以 app.sql 为准，**不得编造** app.sql 未描述的表/列/约束；真需要新增逻辑 → 停下问操作员，确认后再做。

## Failure / exit code

- 上游缺失 / 解析失败 → 报错退出，**无文件副作用**（步骤 1–6 全只读）。
- 步骤 7 已改 schema、步骤 8 校验失败 → 报错并指明；**保留已改内容**（不自动回滚，交操作员 `git` 处置）；不触发 `db:generate` 之外任何库操作。
