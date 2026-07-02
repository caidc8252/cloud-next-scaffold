# Reader dispatch — spec reader

Hand this to a reader subagent verbatim, with the bracketed slots filled. The reader
sees only this prompt. It **reads only**; it writes nothing and emits a JSON array.

## Task

Read the business specs of module `[CAT]/[NAME]` and emit every **obligation** the code
must satisfy — as anchors into the specs, **not** a restatement of the business.

Read (read-only):
- `../pep-webapp-docs/specs/[CAT]/[NAME]/rules/*.md` — 业务规则 `R-n`
- `../pep-webapp-docs/specs/[CAT]/[NAME]/processes/*.md` — 流程 `P-n`
- `../pep-webapp-docs/specs/[CAT]/[NAME]/states/*.md` — 状态机 `SM-n`

Emit one obligation per atomic item:
- each `R-n` → `{ kind:"R", anchor:"<file>#R-n", source:"spec", desc:"<一行>" }`
- each `P-n` → `{ kind:"P", anchor:"<file>#P-n", source:"spec", desc:"<一行>" }`
- **each state-machine transition, ONE obligation** → `{ kind:"SM", anchor:"<file>#SM-n/t<k>", source:"spec", desc:"<起态→事件→目标>" }`
  (do NOT collapse a whole `SM-n` into one row — split per transition row of its table.)

## Hard rules (output rejected if violated)

- **Output ONLY a JSON array** conforming to `references/obligation-schema.md`. No prose, no markdown fences around it, nothing else on stdout.
- **anchor 细且稳定** — use the exact `R-n`/`P-n`/`SM-n` ids present in the files; transitions numbered by their table row order (`t1, t2, …`).
- **desc 一行，不复述业务** — name what the obligation is; the detail stays in the spec (coding reads it back by anchor).
- **Do not invent** rules not in the files; do not judge implementation or落点.
- **Read-only** — write no files, run no git writes.

## Done

Return the JSON array as your final message (it IS the return value). Cover every `R-n`,
`P-n`, and every transition of every `SM-n` in the three directories — nothing dropped.
