# Generic cross-module stub — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the permission-code-only stub with a generic, importable forward-declaration for any unbuilt cross-module dependency, and strip all stub awareness out of `gen:coc`.

**Architecture:** A `*.stub.ts` becomes an importable placeholder (function/type/permission-code) governed by lint + team-rule guidance across create/implement/delete, with one hard gate at `/submit-work`. `gen:coc`, `build-registry`, and `permissionSchema` are left untouched — the permission-code stub is a localized `as PermissionCode` cast that never enters the registry.

**Tech Stack:** Node ESM scripts (`scripts/*.mjs`), ESLint flat-config preset (`eslint.nextkit.mjs`), Markdown injection docs under `.claude/`, the `/submit-work` skill.

**Design doc:** `docs/superpowers/specs/2026-07-01-generic-cross-module-stub-design.md`

## Global Constraints

- **`eslint.nextkit.mjs` is a VENDORED artifact** — its header says "Copied into consumer repos by `tools/setup` (`bin/setup eslint`)". Editing it in this repo is correct for the behavior change, but the **same edit must be carried upstream to next-kit**, or a future `bin/setup eslint` sync overwrites it. Note this in the commit body for Task 2.
- **No committed CI workflow exists.** The hard "no stub reaches `develop`" gate lives in the `/submit-work` skill, mirroring its existing groom-residue gate.
- **No `*.stub.ts` files exist in the repo today** — the mechanism is latent. Verifications that need a stub create a throwaway fixture and delete it.
- **`gen:coc` / `build-registry` / `permissionSchema` are OUT of scope** — do not edit `define-module.ts` or `build-registry.ts`.
- Work on the current branch `feature/new-arch-claude`. Commit after every task.
- Doc files under `docs/` and `.claude/` design docs are gitignored in this repo but tracked via `git add -f` (see the existing tracked `docs/superpowers/specs/2026-06-14-*.md`). Use `git add -f` for new files under `docs/`.

---

### Task 1: Strip stub awareness from `gen:coc`

**Files:**
- Modify: `scripts/generate-coc-registry.mjs:24-36`

**Interfaces:**
- Consumes: `collected.modules` from `apps/web/manifest/collect.ts` (unchanged).
- Produces: identical generated output — `buildRegistry` now receives only real modules.

- [ ] **Step 1: Capture the baseline permission-code count**

Run: `pnpm gen:coc`
Expected: succeeds, prints a line like `[gen:coc] … N permission code(s)`. Record N (with no stubs present, this is the real-module count).

- [ ] **Step 2: Delete the stub glob block**

In `scripts/generate-coc-registry.mjs`, delete the entire block at lines ~24–33 (the comment `// 0b. 跨模块前向声明 stub 聚合…` through the closing `}` of the `for await` loop):

```js
// 0b. 跨模块前向声明 stub 聚合(provisional 自动扫描)。
// 作者引用另一模块尚未声明的 token 时,写 modules/<cat>/<mod>.stub.ts(default export = 一份
// partial defineModule 结果,与 manifest 同形)使其编译。此处自动扫描所有 *.stub.ts 动态 import
// (同 collect.ts:Node 类型擦除友好),并入 buildRegistry 的 modules。真实 manifest 声明该 token 后,
// 真实 + 残留 stub 重名 → buildRegistry 的 duplicate-code 诊断报错(= 删 stub 信号)。
const stubModules = [];
for await (const rel of glob("modules/**/*.stub.ts", { cwd: webDir })) {
  const mod = await import(pathToFileURL(join(webDir, rel)).href);
  if (mod.default) stubModules.push(mod.default);
}
```

- [ ] **Step 3: Drop the `...stubModules` spread**

Change the `buildRegistry` call (was line ~36) from:

```js
const result = buildRegistry({ modules: [...modules, ...stubModules], menuTree });
```

to:

```js
// 1. 汇总 + 结构 guard(仅真实 modules;跨模块前向声明改由 *.stub.ts 承载,gen:coc 不再感知 stub)
const result = buildRegistry({ modules, menuTree });
```

- [ ] **Step 4: Remove the now-unused `glob` import if unreferenced**

Check whether `glob` (imported from `node:fs/promises` at the top) is used anywhere else in the file. Run: `grep -n "glob(" scripts/generate-coc-registry.mjs`
If Step 2 removed the only use, delete `glob` from the import: change `import { glob } from "node:fs/promises";` — if the line imports only `glob`, delete the whole line; otherwise remove just the `glob` binding. If `grep` still shows other uses, leave the import.

- [ ] **Step 5: Verify identical output**

Run: `pnpm gen:coc`
Expected: succeeds, prints the SAME `N permission code(s)` as Step 1 (no stubs existed, so the number is unchanged), no new diagnostics.

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-coc-registry.mjs
git commit -m "refactor(scaffold): remove stub glob from gen:coc

gen:coc now aggregates only collect.ts modules; cross-module forward
declaration moves entirely to *.stub.ts (importable), which gen:coc no
longer scans."
```

---

### Task 2: ESLint — allow importing stubs and generalize `stub-notice`

**Files:**
- Modify: `eslint.nextkit.mjs:44,47` (remove `STUB_PATTERN`) and `eslint.nextkit.mjs:157-213` (generalize the `stub-notice` rule)

**Interfaces:**
- Consumes: nothing new.
- Produces: importing a `*.stub` no longer errors; `stub-notice` warns kind-agnostically and its `present` message names `{{kind}}` / `{{owner}}` / `{{consumer}}`.

- [ ] **Step 1: Remove the import ban (`STUB_PATTERN`)**

Delete the `STUB_PATTERN` declaration at line ~44:

```js
const STUB_PATTERN = { group: ['**/*.stub', '**/*.stub.*'], message: 'no-stub-import: a *.stub is a temporary forward declaration that lets a cross-module reference compile until the real one exists — not an importable module. Reference the real declaration, never the stub.' };
```

Then remove `STUB_PATTERN` from `ALL_PATTERNS` (line ~47):

```js
const ALL_PATTERNS = [NEXT_AUTH_PATTERN, NEXT_INTL_PATTERN, VALIDATORS_PATTERN, EMOTION_PATTERN];
```

- [ ] **Step 2: Rewrite the `stub-notice` rationale comment (lines ~157-171)**

Replace the block comment above `const STUB_FILE_RE` with the generic model:

```js
// ---- custom rule: stub-notice ----------------------------------------------
// A `*.stub.ts` is a temporary, importable forward-declaration of an unbuilt
// cross-module dependency — a function/type/service you build against now, or a
// permission code referenced before its owner ships (AGENTS 铁律 #8). Its
// existence is a standing two-audience TODO: the OWNER (@stub-owner) who must
// build the real thing, and the CONSUMER (@stub-consumer) depending on it now and
// responsible for the swap + delete. This rule surfaces that as a `pnpm lint`
// notice (Claude runs lint during dev, so the reminder reaches it), naming both
// from the @stub-* header so it's never anonymous, and nagging when the header is
// incomplete so the notice can't be silent. Severity is `warn`, NOT `error`: a
// stub is legitimately present mid-development. Removal is guidance (lint) +
// team-rule; the one hard gate is `/submit-work` (no *.stub ships to develop).
// Like require-e2e-cell, it asserts the PRESENCE/SHAPE of a comment, which
// no-restricted-syntax cannot (comments aren't in the esquery AST).
```

- [ ] **Step 3: Generalize the `present` message and add `{{kind}}`**

In the `stubNotice` object, replace the `messages.present` string and the `context.report` `data` for the present branch.

Change `messages` (lines ~183-190) to:

```js
    messages: {
      present:
        'STUB [{{kind}}] — owner `{{owner}}` must build this then this stub is deleted ' +
        '(needed now by `{{consumer}}`: {{reason}}). Import it now; swap to the owner’s real ' +
        'surface when it lands. This notice clears when the stub is gone.',
      incomplete:
        'Stub header incomplete (missing {{missing}}). A *.stub.ts MUST name who owns it and why — ' +
        'see context/injections/references/cross-module-stub.md.',
    },
```

Change the present-branch `context.report` (lines ~205-209) to add `kind`:

```js
        context.report({
          node,
          messageId: 'present',
          data: {
            kind: stubTag(header, 'kind') || 'dep',
            owner: tags.owner,
            consumer: tags.consumer,
            reason: tags.reason,
          },
        });
```

(The `declares` datum is dropped — the message no longer references it.)

- [ ] **Step 4: Create a throwaway fixture to verify behavior**

Create `apps/web/modules/_fixtures/roles-dep.stub.ts`:

```ts
/**
 * @stub-kind     public-api
 * @stub-owner    system/roles
 * @stub-consumer system/users
 * @stub-reason   users page calls roles.assignReviewer before roles ships
 */
export function assignReviewer(): Promise<void> {
  throw new Error("stub: system/roles not implemented");
}
```

Create `apps/web/modules/_fixtures/importer.ts`:

```ts
import { assignReviewer } from "./roles-dep.stub";
export const run = () => assignReviewer();
```

- [ ] **Step 5: Verify the import is now allowed and the notice names owner/consumer/kind**

Run: `npx eslint apps/web/modules/_fixtures/importer.ts apps/web/modules/_fixtures/roles-dep.stub.ts`
Expected:
- NO `no-restricted-imports` / `no-stub-import` error on `importer.ts`.
- A `next-kit/stub-notice` **warning** on `roles-dep.stub.ts` whose text reads `STUB [public-api] — owner \`system/roles\` … needed now by \`system/users\` …`.

- [ ] **Step 6: Verify the incomplete-header branch still fires**

Temporarily delete the `@stub-owner` line from the fixture stub, then run:
`npx eslint apps/web/modules/_fixtures/roles-dep.stub.ts`
Expected: a `stub-notice` warning `Stub header incomplete (missing @stub-owner). …`. Restore the line.

- [ ] **Step 7: Remove the fixtures and confirm repo lint is clean**

```bash
rm -rf apps/web/modules/_fixtures
pnpm lint
```
Expected: `pnpm lint` passes with no errors (no regression from the rule changes).

- [ ] **Step 8: Commit**

```bash
git add eslint.nextkit.mjs
git commit -m "refactor(scaffold): generic importable stub in eslint preset

Drop the no-stub-import ban (importing a stub is now the mechanism) and
generalize stub-notice to any kind, surfacing @stub-kind/@stub-owner/
@stub-consumer in the message.

NOTE: eslint.nextkit.mjs is vendored from next-kit (bin/setup eslint) —
carry this change upstream or a future setup sync will overwrite it."
```

---

### Task 3: Add the `/submit-work` stub-residue hard gate

**Files:**
- Create: `scripts/check-stubs.mjs`
- Modify: `.claude/skills/submit-work/SKILL.md` (add a gate step)

**Interfaces:**
- Produces: `node scripts/check-stubs.mjs` exits `1` and lists offenders if any `apps/web/**/*.stub.*` exists, else exits `0`. Mirrors `scripts/check-e2e-orphans.mjs` (grep + exit code).

- [ ] **Step 1: Write `scripts/check-stubs.mjs`**

```js
#!/usr/bin/env node
// Hard gate for /submit-work: a *.stub.* is a temporary cross-module
// forward-declaration and must never reach develop. Lists any survivors and
// fails. Mirrors check-e2e-orphans.mjs (grep-based, exit code = gate).
import { execSync } from 'node:child_process';
const ROOT = process.env.STUB_ROOTS || 'apps/web';
let out = '';
try {
  // -l: list files; the glob covers .stub.ts/.tsx/.mts/.cts/.js/.jsx
  out = execSync(`git ls-files -- '${ROOT}/**/*.stub.*'`, { encoding: 'utf8' });
} catch (e) {
  out = e.stdout ?? '';
}
const stubs = out.split('\n').map(s => s.trim()).filter(Boolean);
if (stubs.length) {
  console.error(`stub-residue: ${stubs.length} unresolved *.stub.* file(s) — resolve (owner ships → swap import → delete) before PR to develop:`);
  for (const f of stubs) console.error(`  ${f}`);
  process.exit(1);
}
console.log('stub-residue: none.');
```

- [ ] **Step 2: Verify it passes with no stubs**

Run: `node scripts/check-stubs.mjs`
Expected: prints `stub-residue: none.`, exit code 0. Confirm: `echo $?` → `0`.

- [ ] **Step 3: Verify it fails with a stub present**

```bash
mkdir -p apps/web/modules/_fixtures
printf '/**\n * @stub-owner system/roles\n */\nexport const x = 1;\n' > apps/web/modules/_fixtures/x.stub.ts
git add apps/web/modules/_fixtures/x.stub.ts
node scripts/check-stubs.mjs; echo "exit=$?"
```
Expected: lists `apps/web/modules/_fixtures/x.stub.ts` and `exit=1`. (`git ls-files` only sees tracked files, hence the `git add`.)

- [ ] **Step 4: Clean up the fixture**

```bash
git rm -f --quiet apps/web/modules/_fixtures/x.stub.ts
rmdir apps/web/modules/_fixtures 2>/dev/null || true
node scripts/check-stubs.mjs; echo "exit=$?"
```
Expected: `stub-residue: none.` and `exit=0`.

- [ ] **Step 5: Wire the gate into `/submit-work`**

In `.claude/skills/submit-work/SKILL.md`, insert a new numbered step immediately after step 1 (the groom gate) and before the current step 2 (`提交代码`). Renumber the subsequent steps (old 2→3, 3→4, 4→5), and update the `## AUTONOMOUS_MODE` reference to "步骤 3 的 PR 决策" (was step 3, now still the PR step after renumber → verify it points at the PR-decision step). New step text:

```markdown
2. **stub 残留闸门(硬闸门)** —— 运行 `node scripts/check-stubs.mjs`:
   - 退出码 `1`(列出任何 `apps/web/**/*.stub.*`)→ **拦截提交**。每个 stub 是对另一模块未实现依赖的临时前向声明,不得并入 `develop`。提示:owner 实现真身 → consumer 把 import 换到真实 `*.public`/`*.api`/真码 → 删除 stub;若 stub 位于他人模块树,交人处理而非擅改。
   - 退出码 `0` → 通过。
```

Also update the frontmatter `description` (line 3) to mention the new gate: change `检查 groom 残留 →` to `检查 groom 残留 + stub 残留 →`.

- [ ] **Step 6: Verify the SKILL.md renumbering is consistent**

Run: `grep -nE '^\s*[0-9]+\. \*\*' .claude/skills/submit-work/SKILL.md`
Expected: steps read 1..5 in order (groom gate, stub gate, 提交代码, PR 决策, 闭环收尾), with no duplicate numbers. Confirm `## AUTONOMOUS_MODE` still names the correct PR-decision step number.

- [ ] **Step 7: Commit**

```bash
git add scripts/check-stubs.mjs .claude/skills/submit-work/SKILL.md
git commit -m "feat(scaffold): stub-residue gate in /submit-work

No *.stub.* reaches develop: /submit-work runs check-stubs.mjs and blocks
the PR if any survive, mirroring the groom-residue gate."
```

---

### Task 4: Rewrite the canonical reference — `cross-module-stub.md`

**Files:**
- Modify (full rewrite): `.claude/context/injections/references/cross-module-stub.md`

**Interfaces:**
- Produces: the single source of truth for the stub convention that `planning.md` / `implementation.md` / `code-review.md` / `coding-rules/*` defer to.

- [ ] **Step 1: Replace the file contents entirely**

Write this exact content:

````markdown
<!-- Scaffold-owned reference: the generic cross-module stub convention.
     planning.md / implementation.md / code-review.md / coding-rules/* defer here;
     the eslint `stub-notice` rule enforces the header, and `/submit-work` gates it.
     This is scaffold machinery (the /coding Step-3 logic), distinct from team-owned
     coding-rules. -->

# Cross-module stub (`*.stub.ts`)

## What it is (generic)

A `*.stub.ts` is a **temporary, importable forward-declaration of an unbuilt cross-module dependency**, so a consumer isn't blocked waiting on another module. You **import it** and build against it; you delete it once the real thing lands.

- **You import it.** That is the mechanism (there is no import ban).
- **`@stub-*` header** — `owner`, `consumer`, `reason` are **required**; `kind`, `declares`, `task`, `created` are recommended. Keep each value on one line (the lint parser reads to end-of-line).
- **`stub-notice` lint (warn)** surfaces it on every `pnpm lint`, naming owner + consumer, and nags if the header is incomplete.
- **Soft deletion.** Once the real thing exists, swap the import to the owner's real surface (`server/<mod>.public` / `client/<mod>.api`, or the real code) and delete the stub. Nothing hard-fails mid-development.
- **One hard gate:** `/submit-work` runs `scripts/check-stubs.mjs` and blocks the PR to `develop` if any `*.stub.*` survives. Local dev is unblocked; a stub can never ship.
- `gen:coc` and `build-registry` know nothing about stubs.

Because a stub lives beside the **owner's** module, an AI/reviewer should **surface a stale or inbound stub for a human** rather than editing another team's files unilaterally.

## The `@stub-*` header

| tag | value |
|-----|-------|
| `@stub-kind` | `public-api` (function/service), `type` (type/schema), or `permission-code` |
| `@stub-owner` | `<cat>/<mod>` that must build the real thing (which makes this stub redundant) |
| `@stub-consumer` | `<cat>/<mod>` depending on it now (why the stub exists) |
| `@stub-reason` | one line: what forces the reference before the owner ships |
| `@stub-declares` | the forward-declared symbol(s)/code(s), comma-separated |
| `@stub-task` | originating task id (e.g. `task-1234`) |
| `@stub-created` | date added (`YYYY-MM-DD`) |

## Kinds

### `public-api` / `type` — no extra rules

The generic mechanism is the whole story: a fake importable file, swapped to the owner's real surface when it lands. A wrong fake fails **loudly at the call site**.

```ts
// modules/system/users/roles-dep.stub.ts
/**
 * @stub-kind     public-api
 * @stub-owner    system/roles
 * @stub-consumer system/users
 * @stub-reason   users page calls roles.assignReviewer before roles ships
 */
export function assignReviewer(): Promise<void> {
  throw new Error("stub: system/roles not implemented");
}
```
Consumer imports `assignReviewer`; swaps to `system/roles/server/roles.public` when real, then deletes the stub.

### `permission-code` — a localized cast

A permission code has no runtime symbol to fake. Instead of a `throw`ing function, the stub exports the **code string cast to `PermissionCode`**, confined to the stub file:

```ts
// modules/system/users/roles-dep.stub.ts
import type { PermissionCode } from "@/manifest/_generated/registry-types.generated";
/** @stub-kind permission-code  @stub-owner system/roles  @stub-consumer system/users  @stub-reason users list guards on roles.assign before roles ships */
export const rolesAssignRead = "system.roles.assign.read" as PermissionCode;
```
Consumer imports it and passes it to `assertPermissions({ all: [rolesAssignRead] })`; swaps the import to `system/roles`'s real code and deletes the stub once roles ships.

**Rationale (honest about today):** `assertPermissions` currently types its args as `string[]`, not `PermissionCode` (铁律 #2 is not yet realized — see `coding-rules/permission-codes.md`), so a bare code string *already compiles*. The permission-code stub therefore isn't a compile-unblock today — its value is the **`@stub-owner` coordination notice** (telling the owner someone references their unbuilt code) plus the `/submit-work` no-ship gate. The `as PermissionCode` cast is the forward-looking convention: it keeps you honest per 铁律 #2 and becomes load-bearing the moment `assertPermissions` is typed to the union. The code **fails closed at runtime** until the owner ships and seeds it — consistent with every stub (the owner's functions `throw` anyway).

## Lifecycle

- **Create** (consumer): write the stub + a complete `@stub-*` header; import it. `stub-notice` validates the header.
- **Implement** (owner): `pnpm lint`'s `stub-notice` surfaces every stub whose `@stub-owner` is you — build the real thing in your module.
- **Delete** (consumer): once the real surface exists, swap the import and delete the stub. `stub-notice` keeps warning until it's gone; `/submit-work` blocks the PR if it isn't.
````

- [ ] **Step 2: Sanity-check no stale references remain**

Run: `grep -niE 'provisional|duplicate-code|no-stub-import|never .?import|glob' .claude/context/injections/references/cross-module-stub.md`
Expected: no matches (all removed by the rewrite).

- [ ] **Step 3: Commit**

```bash
git add .claude/context/injections/references/cross-module-stub.md
git commit -m "docs(scaffold): rewrite cross-module-stub.md for the generic model"
```

---

### Task 5: Repoint the coding-rules + code-review docs

**Files:**
- Modify: `.claude/context/injections/references/coding-rules/cross-module-refs.md:10-19`
- Modify: `.claude/context/injections/references/coding-rules/permission-codes.md:9`
- Modify: `.claude/context/injections/code-review.md:8-14`

- [ ] **Step 1: Replace the stub section in `cross-module-refs.md`**

Replace the block from `## Forward-declaration stubs (`*.stub.ts`)` (line 10) through end of file with:

```markdown
## Cross-module stubs (`*.stub.ts`)

A dependency another module hasn't built yet — a function/type from its `*.public`/`*.api`, or a permission code — is forward-declared with a colocated **importable** `modules/<cat>/<mod>/<name>.stub.ts` carrying a `@stub-owner` / `@stub-consumer` / `@stub-reason` header.

- **Import it** — that is the mechanism. `next-kit/stub-notice` surfaces every stub (warn), naming owner + consumer, and nags on an incomplete header. There is no import ban.
- **Delete it** once the owner ships: swap the import to the owner's real `*.public` / `*.api` (or real code) and remove the file. The one hard gate is `/submit-work` (`scripts/check-stubs.mjs`) — no `*.stub.*` reaches `develop`.
- A permission-code stub exports the code `as PermissionCode` (no manifest entry, no `gen:coc` involvement); it fails closed at runtime until the owner ships.
- Full convention, kinds, and template → `../cross-module-stub.md`.
```

- [ ] **Step 2: Fix the stale forward-declare clause in `permission-codes.md:9`**

In the last sentence of line 9, replace:

```
the referenced code must be declared in a manifest (or forward-declared via a same-level `*.stub.ts`), which `pnpm gen:coc` aggregates into `PermissionCode`.
```

with:

```
the referenced code must be declared in a manifest, which `pnpm gen:coc` aggregates into `PermissionCode`. A code an owner hasn't declared yet is referenced via a colocated `*.stub.ts` that exports it `as PermissionCode` (legend → `../cross-module-stub.md`); that cast — not a `gen:coc`-aggregated stub — is what compiles once `assertPermissions` is `PermissionCode`-typed.
```

- [ ] **Step 3: Rewrite the `*.stub` hygiene bullets in `code-review.md:8-14`**

Replace the section from `## `*.stub` hygiene` (line 8) through line 14 with:

```markdown
## `*.stub` hygiene (cross-module forward declaration)

Review a `*.stub.ts` against its purpose — a throwaway, importable forward-declaration carrying a two-way notice (*owner: build this*; *consumer: swap + delete once they do*). Full convention → `references/cross-module-stub.md`.

- **Still present after the owner shipped the real thing → flag.** It's done its job; the consumer should have swapped the import to the owner's `*.public`/`*.api` (or real code) and deleted it. `/submit-work` blocks it from reaching `develop`. Surface a stale stub for a human rather than editing another module's file.
- **Missing its `@stub-owner`/`@stub-consumer`/`@stub-reason` header → flag.** That header *is* the two-way notice; without it the stub is an anonymous orphan no one is told to build or remove (eslint `stub-notice`).
- **A permission-code stub that declares a manifest entry or touches `gen:coc` → flag.** It should be a localized `export const … = "…" as PermissionCode`, nothing more.
```

- [ ] **Step 4: Verify no stale mechanics survive**

Run: `grep -rniE 'no-stub-import|duplicate-code|never .{0,3}import a .{0,3}\*.stub|globs .*stub|provisional' .claude/context/injections/references/coding-rules/cross-module-refs.md .claude/context/injections/references/coding-rules/permission-codes.md .claude/context/injections/code-review.md`
Expected: no matches.

- [ ] **Step 5: Commit**

```bash
git add .claude/context/injections/references/coding-rules/cross-module-refs.md .claude/context/injections/references/coding-rules/permission-codes.md .claude/context/injections/code-review.md
git commit -m "docs(scaffold): repoint coding-rules + code-review to generic stub model"
```

---

### Task 6: Update `AGENTS.md` 铁律 #8, `implementation.md`, `planning.md`

**Files:**
- Modify: `AGENTS.md:51` (铁律 #8)
- Modify: `.claude/context/injections/implementation.md:16-18`
- Modify: `.claude/context/injections/planning.md:9` and `:31`

- [ ] **Step 1: Rewrite 铁律 #8 in `AGENTS.md:51`**

Replace the entire item 8 with:

```markdown
8. **跨模块前向声明 = 可 import 的 `*.stub.ts`**：依赖另一模块尚未构建的东西(其 `*.public`/`*.api` 的函数/类型,或一个权限码)→ 写同级**可 import** 的 `modules/<cat>/<mod>/<name>.stub.ts`(带 `@stub-owner`/`@stub-consumer`/`@stub-reason` 头),**import 它**顶着开发。`stub-notice`(warn)在每次 lint 列出 owner/consumer;owner 造出真身后,consumer 把 import 换到真实 `*.public`/`*.api`/真码并**删除 stub**。唯一硬闸门在 `/submit-work`(`check-stubs.mjs`)——任何 `*.stub.*` 都不得并入 `develop`。权限码的 stub 导出 `code as PermissionCode`(不进 manifest、不经 `gen:coc`),运行期 fail-closed 直到 owner 落码。类型/函数窄面见 `cross-module-stub.md` 与 `coding-rules/cross-module-refs.md`。
```

- [ ] **Step 2: Rewrite the stub paragraph in `implementation.md:16-18`**

Replace the `## When you reference …` heading and its paragraph (lines 16-18) with:

```markdown
## When you depend on something another module hasn't built yet

Forward-declare it with a colocated **importable** `modules/<cat>/<mod>/<name>.stub.ts` (a `throw`ing fake for a function, a placeholder type, or `export const c = "…" as PermissionCode` for a permission code) with a complete `@stub-owner`/`@stub-consumer`/`@stub-reason` header, and **import it** to keep building. Once the owner ships, swap the import to the owner's real `*.public` / `*.api` (or real code) and delete the stub (surface it for a human when it sits in another team's module). Header legend + kinds + template → `references/cross-module-stub.md`. The one hard gate is `/submit-work` — no `*.stub` reaches `develop`.
```

- [ ] **Step 3: Fix the stub clause in `planning.md:9`**

In line 9, replace:

```
A token not yet declared → forward-declare a colocated `modules/<cat>/<mod>.stub.ts`; plan the reference now, the stub is mechanical at impl time (template + legend in `references/cross-module-stub.md`). `pnpm gen:coc` aggregates stubs.
```

with:

```
A dependency the owner hasn't built yet → plan an importable colocated `modules/<cat>/<mod>/<name>.stub.ts` (function/type/permission-code); the stub is mechanical at impl time (kinds + template in `references/cross-module-stub.md`). Removal is gated at `/submit-work`; `gen:coc` is not involved.
```

- [ ] **Step 4: Fix the inbound-stub sweep in `planning.md:31`**

In line 31, replace the parenthetical `(`pnpm lint`'s `stub-notice` lists every stub's owner)` context so the sentence reads that stubs may be any kind. Replace:

```
surface any `*.stub.ts` naming this module as `@stub-owner` (`pnpm lint`'s `stub-notice` lists every stub's owner). Each is a code another module is already building against and expects you to own — declare those for real here (legend → `references/cross-module-stub.md`).
```

with:

```
surface any `*.stub.ts` naming this module as `@stub-owner` (`pnpm lint`'s `stub-notice` lists every stub's owner + consumer). Each is a dependency another module is already building against and expects you to own — build/declare those for real here (legend → `references/cross-module-stub.md`).
```

- [ ] **Step 5: Verify + full regen/lint sanity**

Run:
```bash
grep -niE 'provisional|duplicate-code|gen:coc aggregates stub|no-stub-import' AGENTS.md .claude/context/injections/implementation.md .claude/context/injections/planning.md
pnpm gen:coc && pnpm lint
```
Expected: no `grep` matches; `gen:coc` and `lint` both succeed.

- [ ] **Step 6: Commit**

```bash
git add AGENTS.md .claude/context/injections/implementation.md .claude/context/injections/planning.md
git commit -m "docs(scaffold): rewrite 铁律 #8 + implementation/planning for generic stub"
```

---

## Self-Review

**Spec coverage:**
- gen:coc stub-blind → Task 1. ✓
- eslint import ban dropped + `stub-notice` generalized with owner/consumer in message → Task 2. ✓
- `/submit-work` hard gate (+ `check-stubs.mjs`) → Task 3. ✓
- Docs: `cross-module-stub.md` (Task 4), coding-rules + code-review (Task 5), AGENTS 铁律 #8 + implementation + planning (Task 6). ✓
- `define-module.ts` / `build-registry.ts` untouched → enforced by Global Constraints; no task edits them. ✓
- Migration: no `*.stub.ts` exist → no data task needed. ✓

**Placeholder scan:** every code/edit step contains verbatim content or exact old→new text. No TBD/TODO.

**Type consistency:** `stub-notice` message placeholders (`{{kind}}`, `{{owner}}`, `{{consumer}}`, `{{reason}}`) match the `data` object in Task 2 Step 3; `check-stubs.mjs` exit-code contract (0/1) matches its use in Task 3 Step 5 and the verification steps.
