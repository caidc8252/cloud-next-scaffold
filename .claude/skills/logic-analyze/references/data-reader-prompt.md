# Reader dispatch — data reader

Hand this to a reader subagent verbatim, with the bracketed slots filled. The reader
sees only this prompt. It **reads only**; it writes nothing and emits a JSON array.

## Task

Read the data model for module `[CAT]/[NAME]`'s entities and emit every **entity
obligation** the code must satisfy — as anchors into the model, **not** a restatement.

Read (read-only):
- `../pep-data-model-docs/specs/logical-model/*.dbml` — 逻辑表/字段/`Ref` 关系
- `../pep-data-model-docs/specs/physical-model/app.sql` — 物理 DDL（`app.<table>`、index）
- `../pep-data-model-docs/specs/json-schema/*.schema.json` — jsonb 列的结构
- `../pep-data-model-docs/specs/enums/*.md` — `char(n)` 编码的取值域

Emit obligations for the entities this module owns/touches:
- each owned table → `{ kind:"entity", anchor:"app.<table>", source:"data-model", desc:"<一行：该表干什么>" }`
- **party 隔离锚**：带 `party_id` 的表 → 一条 `{ kind:"entity", anchor:"app.<table>.party_id", source:"data-model", desc:"按 party_id 隔离" }`
- **jsonb 形状**：每个 jsonb 列 → `{ kind:"entity", anchor:"app.<table>.<col>", source:"data-model", desc:"jsonb，结构见 <schema 文件>；<多态键如有>" }`
- **枚举值域**：`char(n)` 编码列 → `{ kind:"entity", anchor:"app.<table>.<col>", source:"data-model", desc:"枚举 {值:含义…}，见 enums/<file>" }`

## Hard rules (output rejected if violated)

- **Output ONLY a JSON array** conforming to `references/obligation-schema.md`. No prose, no fences, nothing else on stdout.
- **DBML `Ref` 是逻辑关系** — 物理无外键（只有 index）；如需表达关系，desc 里点明「关系靠 index，非 FK」，不要臆造 FK 义务。
- **anchor 用物理名** `app.<table>[.<col>]`（表名 = DBML 表名去域前缀）。
- **desc 一行，不复述** — 细节留在 dbml/sql/schema/enums，coding 按 anchor 回读。
- **Read-only** — write no files, run no git writes.

## Done

Return the JSON array as your final message. Cover every owned table + its `party_id`
anchor + every jsonb column + every enum-coded column — nothing dropped.
