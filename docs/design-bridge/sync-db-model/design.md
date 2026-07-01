# 设计：`/sync-db-model` skill

- 日期：2026-07-01
- 状态：已定稿，待实现
- 相关：`.claude/skills/sync-db-model/SKILL.md`（待建）、`packages/db/prisma/schema.prisma`、`../pep-data-model-docs/specs/physical-model/app.sql`

## 1. 目的

把数据模型空间的物理 DDL `../pep-data-model-docs/specs/physical-model/app.sql`（上游**数据模型真理**）同步到本地 Prisma schema `packages/db/prisma/schema.prisma`。

产物形态：**差异报告 + 人工确认改写**。skill 读两边 → 用固定约定规则算语义漂移 → 向操作员展示结构化 drift 报告 → 只对操作员**确认**的条目改 `schema.prisma`、再校验。

原则一句话：**照 app.sql 落，忠实镜像，不发明新逻辑；真遇到 app.sql 没说、又必须决定的，停下问操作员、确认后再做。**

边界：**无状态**（不维护映射/台账文件）、**不碰真库**（不 `db push`/`seed`/迁移）、**不落报告文件**（报告 inline 展示）。

## 2. 背景：两边已结构性分叉

`app.sql` 与 `schema.prisma` 不是同一模型的两种编码，几乎每个维度都不同：

| 维度 | `app.sql`（数据模型仓） | `schema.prisma`（本地现状） |
|---|---|---|
| Schema/前缀 | `app.*` | 无 schema，表名前缀 `sys_` |
| 表名 | `user` `role` `party` `party_contract` `party_user` `party_user_role` `user_credential` | `sys_party` `sys_role` `sys_user` `sys_party_user` … |
| 主键类型 | `bigint … identity` | `Int @default(autoincrement())` |
| 审计列 | `created_at` / `updated_at` | `cre_time` / `upd_time` + `cre_user_id` / `upd_user_id` |
| 角色↔用户 | join 表 `party_user_role` | JSONB 数组 `SysPartyUser.roles`（无 join 表） |
| 权限 | `role.permissions jsonb` | `SysRole.permissionCodes` |
| 邮箱 | `varchar(254)` | `citext` |

范围也不同：

- **仅 app.sql 有**：`user_credential`、`party_user_role`
- **仅 Prisma 有**：`sys_party_contract_event`、`sys_mfa_info`、`sys_operator_invite`、`sys_operation_log`、`sys_notice`

因此这不是机械翻译，需要明确的「同步语义」而非「翻译并覆盖」。本设计的所有决策围绕此分叉展开。

## 3. 决策记录（brainstorm 结论）

1. **产物 = 差异报告 + 人工确认改写**。skill 不自动覆盖，尊重「先看再改」。
2. **对齐靠约定规则自动推导，无映射文件**。系统性差异写成固定转换规则，两边归一化后再比；结构性特例硬编码处理。无状态、幂等。
3. **写回边界 = 改 `schema.prisma` + 校验就停**（`prisma validate` + `pnpm db:generate`），不碰真库。
4. **忠实镜像 app.sql，不发明**（操作员对初版约定的修正）：
   - 前缀 `sys_` → 领域前缀 `app_`；model 名 `App<T>`，`@@map("app_<t>")`。
   - app.sql 没有的字段**不生成**（如 `cre_user_id`/`upd_user_id`）。
   - 无物理外键 → **不写 `@relation`**，只留标量列 + `@@index`。
   - 主键 `<t>.id bigint identity` → `<t>Id Int @default(autoincrement()) @map("id")`（列名就是 `id`）。
   - 结构性差异（`party_user_role` join 表、`role.permissions`、`email varchar`）**照 app.sql 忠实建成**，不再折成 JSONB / 改名 / 自造 `citext`。
5. **app.sql 未覆盖的 5 张 Prisma-only 表 → 保留不动，只提示**。删除是破坏性且 app.sql 未授权，不自动删。
6. **类型策略（见 4.1）**：整数默认 `Int`（有界实体 + 铁律 #7 + JS `number` 安全），但 `app.sql=bigint / Prisma=Int` 作**显式偏差**入报告、可按表 override `BigInt`；金额用 `Decimal @db.Decimal(p,s)` 禁 `Float`；`BigInt`/`Decimal` 在 API 边界统一序列化为 string。

## 4. 约定归一化规则（核心）

比对前先按约定把两边归一化，让「房间风格差异」消失、只剩真漂移。作为规则表写死进 SKILL.md：

| app.sql | ⇄ Prisma | 定性 |
|---|---|---|
| 表 `app.<t>` | model `App<T>` / `@@map("app_<t>")` | 前缀 `sys_`→`app_`，领域即前缀 |
| 主键 `<t>.id bigint identity` | `<t>Id Int @default(autoincrement()) @map("id")` | 列名就是 `id`；类型走 4.1，默认 `Int` |
| `bigint` | 默认 `Int`（**显式偏差**）/ 按表可 override `BigInt` | **非静默归一化**，见 4.1 |
| `numeric(p,s)` / `decimal(p,s)`（金额） | `Decimal @db.Decimal(p,s)` | 禁 `Float`，见 4.1 |
| `varchar(n)` | `@db.VarChar(n)` | 忠实转换 |
| `timestamp` | `@db.Timestamp(3)` | 忠实转换 |
| `jsonb` | `Json` | 忠实转换 |
| `char(n)` | `@db.Char(n)`（`status char(1)` 等短码列可按语义放宽为 `@db.VarChar`，报告里标注理由） | 忠实转换 |
| app.sql 没有的字段 | **不生成** | `cre_user_id`/`upd_user_id` 等不再造 |
| 无物理外键（仅索引） | **不写 `@relation`**，只留标量列 + `@@index` | 完全照 app.sql |
| `email varchar(254)` | `@db.VarChar(254)` | 不再自造 `citext` |
| `role.permissions` / `party_user_role` join 表 | 忠实建成 `permissions Json` / `AppPartyUserRole` model | 不折成 JSONB / 不改名 |
| 唯一索引 `..._uidx` | `@@unique([...])` / 单列 `@unique` | 按索引列集对齐 |
| 普通索引（外键字段） | `@@index([...])` | 按索引列集对齐 |

**表名 → Prisma model 映射说明**：本设计按操作员指令取「扁平前缀」`@@map("app_<t>")`（单 schema、表名带 `app_` 前缀），而非 Prisma multiSchema（`@@schema("app")` + `@@map("<t>")`）。如后续要改用真 PG 多 schema，此规则单点可翻。

**枚举/注释**：app.sql 用 `comment` 描述受控取值（如 `status is '0=未激活; 1=启用; 2=暂停'`）。Prisma 不表达 CHECK，这类沉淀为 Prisma 字段注释（advisory），不生成约束。

### 4.1 类型策略（整数宽度 / 金额）

关键机制：**决定 JS 运行时类型的是 Prisma scalar，不是 PG 列宽**。`Int`→JS `number`（安全整数 ±2⁵³）；`BigInt`→JS `BigInt`（不能 `JSON.stringify`、前端 `number` 接不住）；`Decimal`→`Prisma.Decimal`（`toJSON` 出 string）。且本仓本地/e2e 库由 `pnpm db:push` 从 `schema.prisma` 生成 —— **Prisma 声明的类型就是实际物理类型**，app.sql 的 `bigint` 是数据建模方的意图，两者不一致是一条**该被看见的偏差**，不做静默归一化。

**整数 / ID 策略：**
- **默认 `Int`**：app.sql 那 7 张是有界 B2B 关系表（party/user/role/合同/归属），int4 的 21 亿上限非真天花板；`Int` 同时满足 AGENTS.md 铁律 #7（`party_id Int`）与前端 `number` 干净。
- app.sql `bigint` → Prisma `Int` 这条，**在报告里显式列为一条偏差**（`app.sql=bigint / Prisma=Int / 理由=有界实体+铁律#7+JS number 安全`），不吞进「风格归一化」。
- **逃生舱**：某表确为高 volume → 逐表 override 成 `BigInt @db.BigInt`，并在 `@cloud/request` / API 边界统一序列化为 string。默认不启用。

**金额策略：**
- 金额**绝不用** `Float`/`number`（二进制浮点丢精度）。
- `numeric(p,s)` / `decimal(p,s)` → `Decimal @db.Decimal(p,s)`（推荐默认）；`Prisma.Decimal` 出线为 string，前端以 string 存/展示、算术用 decimal 库，禁 `parseFloat` 参与运算。
- 备选「整数最小币种单位（分）存 `bigint`」适合高频清算场景，回到上面的 `BigInt` 序列化约束、前端自行 /100；采用时须在 app.sql 注释标明单位。
- app.sql 现无金额列 —— 这是**给数据建模方的前置约定**：金额优先 `numeric(p,s)`（p/s 由业务定，如 `numeric(18,2)`）。skill 只按上表规则映射，遇到 `numeric/decimal` 落 `Decimal`、遇到金额语义的 `Float` 直接报警。
- `BigInt` / `Decimal` 均不原生 JSON 序列化 —— **统一在 API 边界（`@cloud/request` 出参）序列化为 string** 作为跨层约定。

## 5. Drift 分类与报告

对 app.sql 的 7 张表（映射到 `App<T>`）逐表算漂移，每条归一类：

| 分类 | 含义 | 默认动作 |
|---|---|---|
| **缺表** | app.sql 有、Prisma 无对应 `App<T>`（如 `AppUserCredential`、`AppPartyUserRole`） | 建议新增整表 → 待确认 |
| **缺列** | 表在、app.sql 有列 Prisma 无 | 建议加列 → 默认应用 |
| **属性漂移** | 归一化后类型/长度/可空仍不同 | 建议对齐 → 默认应用 |
| **索引漂移** | app.sql 的 unique/index 与 `@@unique`/`@@index` 不一致 | 建议对齐 → 默认应用 |
| **枚举/注释** | app.sql comment 定义了取值；Prisma 不表达 CHECK | 同步成 Prisma 注释 → advisory |
| **多列（app.sql 未定义）** | Prisma 有、app.sql 无的列（如 `cre_user_id`） | 列出 → **默认跳过**（删除破坏性，需显式勾选） |
| **app.sql 未覆盖表** | 5 张 Prisma-only（notice/mfa/operator_invite/operation_log/party_contract_event） | 列出、**不动** |

报告 **inline、不落文件**，按表分组，每条含：`编号 / 表 / 列 / app.sql 侧 / Prisma 侧 / 分类 / 建议改法 / 默认动作`。

## 6. 确认 → 改写 → 校验流程

1. 展示报告，操作员逐条或批量勾选要应用的项（新增/对齐类默认勾选；删列/删表默认不勾，需显式确认）。
2. 对确认项用 Edit 改 `packages/db/prisma/schema.prisma`。
3. 跑 `prisma validate`（经 `packages/db/prisma.config.ts`）。
4. 跑 `pnpm db:generate` 重生成 client。
5. 汇报：改了哪些条、validate/generate 是否过；若涉及改名/重构，**提示下游 `apps/web` 的 `SysXxx` 引用会编译不过，属本 skill 范围外**。
6. 任一步失败 → 报错并指明；已改的 schema 保留（操作员可 `git` 回滚）。**全程不碰真库**。

## 7. I/O 契约

- **Input**：`../pep-data-model-docs/specs/physical-model/app.sql` + `packages/db/prisma/schema.prisma`（两者皆只读输入；后者是改写目标）。
- **Output**：inline drift 报告 + （确认后）`schema.prisma` 编辑 + `prisma validate`/`pnpm db:generate` 结果。**不读写任何 `.work/*`，不落报告文件**。
- **半幂等**：报告阶段纯只读、可重复；应用后再跑，漂移收敛。
- **前置**：数据模型仓 `../pep-data-model-docs` 存在（缺失则提示操作员，按脚手架约定可 `git clone`）。

## 8. 连带后果（如实标注，不替操作员决定）

- **后果 A —— 这实质是把现有 `sys_*` 模型重写成 `app_*` 忠实镜像**。不只是改字段：`SysPartyUser.roles`(JSONB) 要拆回 `AppPartyUserRole` join 表、`permissionCodes`→`permissions`、所有表改名。skill 边界止于「改 schema + 校验」，`prisma validate`/`generate` 能过，但 `apps/web` 里所有 `import { SysParty }`、`prisma.sysParty.*` 会编译不过 —— 那批下游修复**不在本 skill 范围**，是另一件事。skill 需在完成汇报里明确提示。
- **后果 B —— app.sql 只覆盖 7 张表，Prisma 现有 5 张它没有**。按决策 5「保留不动、只提示」，不自动删。

## 9. 文件布局

- `.claude/skills/sync-db-model/SKILL.md` 单文件，仿 `.claude/skills/sync/SKILL.md`、`start-work/SKILL.md` 风格：frontmatter（`name` + 中文 `description`）→ `# /sync-db-model` → Steps → I/O contract → AUTONOMOUS_MODE → Failure / exit code。
- 约定规则表（第 4 节）直接写进 SKILL.md（app.sql 才 161 行，不必拆独立 reference）。

## 10. 非目标（YAGNI）

- 不做映射/漂移台账文件（无状态）。
- 不 `db push` / `seed` / 生成 migration。
- 不改 `apps/web` 下游代码（改名后的编译修复是单独任务）。
- 不处理 app.sql 未覆盖的 Prisma-only 表（只提示）。
- 不做逻辑模型（`.dbml`）→ 物理模型同步；只认物理 DDL `app.sql`。
