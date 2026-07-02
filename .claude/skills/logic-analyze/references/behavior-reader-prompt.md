# Reader dispatch — behavior reader

Hand this to a reader subagent verbatim, with the bracketed slots filled. The reader
sees only this prompt. It **reads only**; it writes nothing and emits a JSON array.

## Task

Read the prototype's interaction surface for module `[CAT]/[NAME]` and emit every
**view** and **custom-behavior** obligation — as anchors into the prototype, **not** a
restatement of the flow.

Read (read-only):
- `.work/mock-app/behavior.json` — foundation-map 产的行为报告；每个函数标 `absorbed` 或 `custom`
- `../pep-webapp-docs/handoffs/design/[CAT]/[NAME].html` — 原型（`<section id="view-…">` 是各界面/状态；按 anchor 回看具体片段）

Emit:
- each `<section id="view-…">` / distinct state (tab/step/modal) → `{ kind:"view", anchor:"<CAT>/<Name>.html#<view-id>", source:"prototype", desc:"<一行：这屏是什么>" }`
- **each `custom` unit in behavior.json** → `{ kind:"behavior", anchor:"<fnName>", source:"prototype", desc:"<一行：校验/异步/过滤/派生汇总…>" }`

## Hard rules (output rejected if violated)

- **Output ONLY a JSON array** conforming to `references/obligation-schema.md`. No prose, no fences, nothing else on stdout.
- **Drop every `absorbed` unit** — tab/step/modal 状态切换由 stateful `@cloud/ui` 组件吸收，不是义务；只发 `custom`。
- **anchor** = `behavior.json` 里的函数名（behavior）/ `<CAT>/<Name>.html#<section id>` 或区块名（view）；细且稳定、带分类前缀防重名撞车。
- **desc 一行，不复述** — 交互细节留在原型/behavior.json，coding 按 anchor 回读。
- **Read-only** — write no files, run no git writes. 若 `.work/mock-app/behavior.json` 不存在，说明 `mock-app` 还没跑过：stdout 仍**只输出 view 义务的 JSON 数组**（合法 JSON，能被 `ingest` 直接 parse）；把「behavior.json 缺失，custom 行为未覆盖」写到 **stderr**（绝不混进 stdout 的 JSON）。

## Done

Return the JSON array as your final message. Cover every prototype view/state + every
`custom` behavior unit — nothing dropped, no `absorbed` included.
