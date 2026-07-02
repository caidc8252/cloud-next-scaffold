# Testing

**Pick the lowest level that exercises the real behavior:**

| Behavior | Level |
|---|---|
| Pure function, Zod schema, service orchestration over an injected fake repo (no DB) | Unit — Vitest, `pnpm test` |
| Service + real schema/policy, or repository against a real test DB / backing service | Integration — Vitest, `pnpm test` |
| Auth / login / logout / role-gated redirect / party-scoping / cross-page full-stack flow | e2e — Playwright spec under `e2e/`, `pnpm test:e2e` |

- **Colocate unit and component tests next to the code they exercise; e2e specs live under `e2e/`** as `e2e/<feature>.spec.ts`.
- **Party-scoping authorization-negatives are REQUIRED for every owner-scoped table.** Diff-coverage won't flag a missing negative, so write all four as Vitest service/repository tests:
  - **list scoping** — a query as party A returns only A's rows (assert contents, not status).
  - **resource denial** — looking up party B's id while scoped to A returns not-found / zero rows.
  - **wrong-party mutation rejected** — an update/delete of B's row scoped to A affects nothing.
  - **nested-write backstop / fail-closed** — a nested child can't be written with another party's id; a query with no `currentPartyId` must not leak across parties.
- **Every `route.ts`, boundary `page.tsx`, `middleware.ts`, and session/permission gate carries a JSDoc `@e2e-cell` marker** (`/** @e2e-cell feature=<name> kind=<route|middleware|auth-boundary> */`). The `require-e2e-cell` eslint rule forces one on every `route.ts` / `middleware.ts` — ship it or opt out with `/** @e2e-cell-skip reason=… */`; `kind=auth-boundary` is not lint-forced, add it by hand.
- **`pnpm check:e2e-orphans` (run inside `pnpm test:e2e`) requires a matching `e2e/<feature>.spec.ts`** for each marker — join is by feature+kind presence: `kind=route` covered by any `test(` in the spec, `kind=middleware` by a `@middleware:` tag, `kind=auth-boundary` by an `@authBoundary:` tag.
- **When acceptance test cases are supplied, treat them as exhaustive** — transcribe every case at the level the picker gives; never summarize, sample, or drop one. A case no module can satisfy is a GAP — surface it, don't quietly omit. A case that contradicts another input (schema, spec rule) is an OPEN decision — flag it for a human; never silently pick a winner.
- **e2e runs authorization for real** — never fake auth, never bypass guards. The suite logs in once (real login, real server session), snapshots the cookie, and reuses it; every request still exchanges `sid` for the Redis session and runs `requirePermissions()` / `assertPermissions()`.
- **e2e KEEP-table discipline** — the identity/RBAC tables (`sys_user`, `sys_party`, `sys_party_user`, `sys_party_contract`, `sys_role`) are KEEP-listed and never truncated between specs (the reused login snapshot depends on them). A spec touching a KEEP table MUST create uniquely-named rows and assert only its own; business tables are truncated per-test, so they start clean.

## 从义务派生测试（覆盖清单 → 测试用例，收敛循环的「零」）

`/coding` 阶段 D 的收敛循环以「测试全绿」为不动点。测试从 `coverage.json`（见 `logic-analyze/references/obligation-schema.md`）的**可测义务**机械派生——每条派生测试对应一个 obligation key，绿了就 `node .claude/skills/coding/coverage.mjs cover <dir> <key> implemented <at>`（`<at>` 是自由串，**约定**填 `<testfile:testname>`；工具不校验格式）。

| obligation kind | 派生成什么测试 |
|---|---|
| `SM-n/t<k>`（状态机每条 transition，**逐条**） | **正向** 1 条：置于「起始」态 + 施加「事件/动作」（守卫满足）→ 断言到达「目标」态。该 transition 若有**守卫条件**，再加 **负向** 1 条：守卫不满足 → 状态不变 / 动作被拒。 |
| `R-n`（业务规则） | ≥1 条断言编码该规则的可判部分（如 R-7「导入/退订需权限」→ 无权限被拒 + 有权限通过）。纯说明性、无可判行为的 R → **不硬凑**，dispositize 成 `gap(理由)`（应可测但本轮未落）或 `out-of-scope(信息性)`，或标明由哪条义务覆盖。 |
| `entity … .party_id` | **复用**本文件上方「party-scoping 四负向」，别另造。 |
| `view` / `behavior`（原型） | 行为 parity：`custom` 交互单元 → 组件/单元测试；跨页/鉴权流 → e2e。状态切换(`absorbed`)不测（`@cloud/ui` 组件自带）。 |

规则：
- **可测义务必须有对应测试**；不可机械测的义务要**显式** dispositize（`gap`/`out-of-scope` 带理由），**不许静默跳过**——否则 `coverage.mjs gate` 该拦的拦不住、收敛循环的「零」失真。
- 状态机**逐 transition** 派生，别把整个 `SM-n` 压成一条测试（对齐义务粒度 `SM-n/t<k>`）。
- 派生用例视同「供给的验收用例」：**穷尽转写**（见上一节），冲突 → 上抛人工，不自选赢家。

示例（`SM-1` 某 transition `失效 --重订--> 有效`，仅示意其形状）：

```ts
// modules/apps/store/server/app-store.service.test.ts
test('SM-1/t3: 失效的订阅重订后变为有效', async () => {
  const svc = makeService({ repo: fakeRepoWith({ id: 1, partyId: 7, status: '失效' }) })
  await svc.reSubscribe({ id: 1 }, { currentPartyId: 7 })
  expect(await svc.getStatus(1, 7)).toBe('有效')
})
```
