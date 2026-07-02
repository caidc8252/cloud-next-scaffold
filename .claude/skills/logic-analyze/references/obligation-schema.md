# Obligation schema — the reader → `coverage.mjs ingest` contract

The three reader subagents each emit a **JSON array of obligations**. `/logic-analyze`
merges the arrays and pipes them to `node .claude/skills/coding/coverage.mjs ingest <dir>`
(stdin = the JSON array). Each obligation is one atomic thing the code must satisfy —
**an anchor into a truth, not a restatement of business.**

## Shape

```json
[
  { "kind": "R", "anchor": "app-store.md#R-7", "source": "spec", "desc": "导入/退订需客户内有权限用户操作" }
]
```

| field | required | value |
|---|---|---|
| `kind` | yes | one of `R` `P` `SM` `view` `behavior` `entity` |
| `anchor` | yes | 细锚点，指回真源的具体片段（见下表）。`ingest` 用 `key = \`${kind}:${anchor}\`` 去重，所以 anchor 必须稳定、唯一 |
| `source` | yes | one of `spec` `prototype` `data-model` `logic` |
| `desc` | yes | 一行：这条义务**是什么**（不是怎么实现）。禁止业务长篇复述 |

## Anchor 约定（按 kind）

| kind | anchor 形如 | 例 |
|---|---|---|
| `R` (rule) | `<specfile>#R-n` | `app-store.md#R-7` |
| `P` (process) | `<specfile>#P-n` | `app-store.md#P-2` |
| `SM` (状态机 transition，**每条单列**) | `<specfile>#SM-n/t<k>` | `app-store.md#SM-1/t3` |
| `view` (原型界面/区块) | `<CAT>/<Proto>.html#<view-id 或区块名>`（带分类前缀防重名撞车） | `APPS/STORE.html#view-detail` |
| `behavior` (原型 custom 行为单元) | `<fnName>`（取自 behavior.json 的 custom 单元名） | `doImport` |
| `entity` (数据实体/字段) | `app.<table>[.<col>]`（物理名，表名 = DBML 表名去域前缀） | `app.party_contract.contract_data` |

## 规则

- **一条义务一行**；状态机拆到 transition 粒度（`SM-1/t3`），不要把整个 SM-1 塞成一条。
- **anchor 幂等**：同一义务跨轮必须产出同一 anchor（`ingest` 靠它避免重复、保留已有落点）。
- **只发义务，不判落点**：`disposition` 由 coding 经 `coverage.mjs cover` 填，reader 不碰。
- **desc 不复述业务**：一行点名即可；细节留在真源，coding 按 anchor 回读。
- **`source:"logic"` 不经 reader**：logic.md 通常小，其决策/缺口由 `/logic-analyze` 主线程直读并入（`ingest` 一条 `source:"logic"` 的义务），三个 reader 子代理只产 `spec`/`prototype`/`data-model`。
- **`source` 必填且被 `coverage.mjs ingest` 校验**：缺失或非枚举值当场报错（不静默默认）。
