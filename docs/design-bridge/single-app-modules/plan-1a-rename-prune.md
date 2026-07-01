# Step 1a — 改名 admin→web & 删除 customer  实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: 用 superpowers:subagent-driven-development(推荐)或 superpowers:executing-plans 逐任务执行。步骤用 `- [ ]` 复选框跟踪。

**Goal:** 把 `apps/admin` 原地改名为 `apps/web`(保留 git history)、删除 `apps/customer`,并同步所有全局接线,使 `web` 单 app 能像原 admin 一样编译/启动;`portal` 在本阶段保持独立可跑。

**Architecture:** 纯结构搬运,**零行为变更**——不动模块结构、不动路由分组、不动 API 路径、不动 portal。本阶段没有"新功能"可写测试,验收 = 既有测试 + typecheck + lint + build 保持全绿(既有测试套件是安全网)。

**Tech Stack:** pnpm workspace、Next 16、TypeScript、ESLint、Vitest、Playwright。

## Global Constraints

- 每个任务结束仓库都必须可编译、可启动、既有测试全绿。
- **不修改 `packages/*` 下代码**(AGENTS.md 铁律)。`packages/permissions/src/server/dal.ts:10` 里一条提到 `apps/admin/lib/session-menus.ts` 的**注释**本阶段不动(无功能影响,留待后续统一更新)。
- 文件/目录 kebab-case。
- 用 `git mv` / `git rm` 保留历史,不要手动删建。
- 分支:`refactor/single-app-modules`(已存在,spec 已在其上)。
- 本阶段**不改** API 路径、不改路由分组 `(portal)`/`(public)`(留给 1b)。

## File Structure(本阶段触碰的文件)

- 重命名:`apps/admin/` → `apps/web/`(整目录,git mv)
- 删除:`apps/customer/`(整目录,git rm)
- 改:`apps/web/package.json` — `name` 字段
- 改:`pnpm-workspace.yaml` — 工作区成员清单
- 改:`tsconfig.json` — include 路径
- 改:`package.json`(根) — scripts 里的 `admin` filter
- 改:`playwright.config.ts` — `-F admin` filter
- 自动重写:`pnpm-lock.yaml`(由 `pnpm install` 生成,需提交)

---

### Task 1: 原地改名 apps/admin → apps/web

**Files:**
- Rename: `apps/admin/` → `apps/web/`
- Modify: `apps/web/package.json`(name)
- Modify: `pnpm-workspace.yaml:2`
- Modify: `tsconfig.json:50-52`
- Modify: `package.json`(根 scripts)
- Modify: `playwright.config.ts:32`

**Interfaces:**
- Consumes: 无(起点任务)。
- Produces: 工作区出现名为 `web` 的包(`pnpm --filter web …` 可用);`apps/web` 目录就位;`portal` 仍名为 `portal` 且可独立 build。

- [ ] **Step 1: 用 git mv 整目录改名**

```bash
cd /workspaces/cloud-next-scaffold
git mv apps/admin apps/web
```

- [ ] **Step 2: 改包名 admin→web**

`apps/web/package.json` 第 2 行:
```json
  "name": "admin",
```
改为:
```json
  "name": "web",
```

- [ ] **Step 3: 改 pnpm-workspace.yaml 成员**

`pnpm-workspace.yaml` 第 2 行:
```yaml
  - "apps/admin"
```
改为:
```yaml
  - "apps/web"
```
(本步**不动** `apps/customer` 行,它在 Task 2 删。)

- [ ] **Step 4: 改根 tsconfig.json include**

`tsconfig.json` 第 50-52 行:
```json
    "apps/admin/**/*.ts",
    "apps/admin/**/*.tsx",
    "apps/admin/next-env.d.ts",
```
改为:
```json
    "apps/web/**/*.ts",
    "apps/web/**/*.tsx",
    "apps/web/next-env.d.ts",
```

- [ ] **Step 5: 改根 package.json 的 admin filter scripts**

逐项替换(保留所有 `portal` 脚本不动):
```json
    "predev:admin": "pnpm gen:manifest",
    "prebuild:admin": "pnpm gen:manifest",
    "dev": "pnpm --filter admin dev",
    "dev:admin": "pnpm --filter admin dev",
    "build:admin": "pnpm --filter admin build",
```
改为:
```json
    "predev:web": "pnpm gen:manifest",
    "prebuild:web": "pnpm gen:manifest",
    "dev": "pnpm --filter web dev",
    "dev:web": "pnpm --filter web dev",
    "build:web": "pnpm --filter web build",
```
并把 `lint` 脚本里的 `apps/admin` 改成 `apps/web`(`apps/portal` 不动):
```json
    "lint": "eslint apps/admin apps/portal packages/api-kit/src ...
```
改为:
```json
    "lint": "eslint apps/web apps/portal packages/api-kit/src ...
```
(其余 `predev`/`prebuild`/`pretest`/`build`(`-r --filter './apps/*'`)等不含 `admin` 字样的脚本**不动**。)

- [ ] **Step 6: 改 playwright.config.ts 的 web server filter**

`playwright.config.ts:32`:
```ts
      command: "pnpm -F admin dev",
```
改为:
```ts
      command: "pnpm -F web dev",
```
(同文件 `pnpm -F portal dev` 块不动。)

- [ ] **Step 7: 重装依赖,刷新 lockfile 与软链**

```bash
pnpm install
```
Expected:完成且无报错;`pnpm-lock.yaml` 中 `apps/admin:` 段变为 `apps/web:`。

- [ ] **Step 8: typecheck web**

```bash
pnpm --filter web exec tsc --noEmit -p tsconfig.json
```
Expected:无类型错误(退出码 0)。

- [ ] **Step 9: lint 全仓**

```bash
pnpm lint
```
Expected:无错误。

- [ ] **Step 10: 跑既有单测(安全网)**

```bash
pnpm test
```
Expected:全部通过(沿用既有用例,无新增/删除)。

- [ ] **Step 11: build 验证启动就绪**

```bash
pnpm --filter web build
```
Expected:`next build` 成功产出。(若因本地缺 env 失败,记录所缺变量;typecheck+lint+test 已绿即可放行 build 到 1d 统一 e2e 复核。)

- [ ] **Step 12: 提交**

```bash
git add -A
git commit -m "refactor: rename apps/admin to apps/web

Pure in-place rename (git mv preserves history) plus workspace/tsconfig/
root-scripts/playwright filter updates. Zero behavior change; routes, API
paths and route groups untouched. portal remains independent.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: 删除 apps/customer

**Files:**
- Delete: `apps/customer/`
- Modify: `pnpm-workspace.yaml`(移除 customer 行)

**Interfaces:**
- Consumes: Task 1 完成后的工作区(`web` 已就位)。
- Produces: 工作区只剩 `apps/web` 与 `apps/portal` 两个 app;`apps/customer` 及其 lockfile 段消失。

- [ ] **Step 1: 确认无人依赖 customer**

```bash
grep -rn "apps/customer\|\"customer\"" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.mjs" --include="*.mts" --include="*.yaml" --include="*.yml" . | grep -v node_modules | grep -v "apps/customer/"
```
Expected:仅 `pnpm-workspace.yaml` 与 `pnpm-lock.yaml` 命中(均本任务处理);无业务代码/其他 app 引用 customer。若有意外命中,停下来报告。

- [ ] **Step 2: 删除 customer 目录**

```bash
git rm -r apps/customer
```

- [ ] **Step 3: 从 workspace 清单移除 customer**

`pnpm-workspace.yaml` 删除该行:
```yaml
  - "apps/customer"
```

- [ ] **Step 4: 重装依赖刷新 lockfile**

```bash
pnpm install
```
Expected:完成无报错;`pnpm-lock.yaml` 不再有 `apps/customer:` 段。

- [ ] **Step 5: 复核两 app 仍可编译 + 全绿**

```bash
pnpm --filter web exec tsc --noEmit -p tsconfig.json && pnpm --filter portal exec tsc --noEmit -p tsconfig.json && pnpm lint && pnpm test
```
Expected:全部退出码 0 / 全通过。

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "chore: remove apps/customer

Drop the customer app and its workspace/lockfile entries. No remaining
references; web and portal unaffected.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage(对照 design.md Step 1 表"1a 改名 & 删除"):**
- admin→web 改名(git mv 保 history)✓ Task 1
- 包名 admin→web ✓ Task 1 Step 2
- 删 customer ✓ Task 2
- 清理 workspace / tsconfig / 根 scripts / lock ✓ Task 1 Step 3-5,7 + Task 2 Step 3-4
- playwright filter ✓ Task 1 Step 6
- "不动模块结构、不动 portal" ✓ 全程未触碰 modules/路由分组/portal 源码
- 可运行验收线 ✓ Task 1 Step 8-11、Task 2 Step 5

**Placeholder 扫描:** 无 TODO/“适当处理”类占位;每个改动给了精确文件、行号、前后文。

**类型/命名一致性:** 全程仅做字符串替换 `admin`→`web`;包名、filter、路径三处一致;未引入新符号。

**留意:** Step 11 的 `next build` 若缺本地 env 可能失败,已说明降级处理(不阻断本阶段,e2e 在 1d 统一复核)。`dal.ts` 注释按 Global Constraints 有意不动。
