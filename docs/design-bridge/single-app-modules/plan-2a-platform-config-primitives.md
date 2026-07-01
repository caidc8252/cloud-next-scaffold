# Step 2A · `@cloud/platform-config` CoC 原语 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 `@cloud/platform-config` **增量**加入 CoC 声明系统的纯逻辑原语(类型 + buildRegistry/reconcile + validateCatalog/guards + deriveContractScope + emit + 运行时消费 `createCocConfig`),全部单元测试覆盖,**不触碰任何现有导出、不改变 app 行为**(2A 落地后仓库照常跑旧管线)。

**Architecture:** 纯函数 + 数据进数据出,`packages/*` 绝不 import `apps/*`(参考库 guard 6)。新增文件与现有 `create.ts / validate.ts / define.ts / contract-group.ts` 并存;app 侧的采集脚本与运行时改接在 2B/2D 才发生。

**Tech Stack:** TypeScript strict、zod(shape 校验,沿用现包 `schema.ts` 模式)、vitest(包内单测,文件就近 `*.test.ts`)。

## Global Constraints

- **零 DB**:不生成、不引用任何 `sys_menu` / `sys_permission` / seed。`@cloud/db` 不进本包(本包对它无依赖)。
- **包不 import app**:`packages/platform-config/**` 不得 `import` 任何 `apps/*` 或 `@/...`;manifest 数据由调用方传入。
- **不破坏现有导出**:`createPlatformConfig / validateMenus / validateRoles / defineAppManifest / defineAppRoles / contract-group.*` 全部保留不动,2A 只**新增**。
- **权限码格式**:`<cat>.<mod>.<fn>.<action>`(4 段,全小写 camel 段)。`menuCode = <cat>.<mod>`。`belongToMenuCode == 本模块 menuCode == code 前两段`。
- **i18n**:`label/desc/title` 一律 i18n key,不写字面文案。
- **命名**:文件 kebab-case;函数 camelCase;类型 PascalCase。
- **覆盖本仓"菜单来自 DB 表"的通用规则**:next-kit 注入的"nav 来自 DB `menu` 表 + seed"在本项目被 CoC 系统取代(零 DB),**不适用**——不要去 `packages/db/prisma/seed.ts` 加菜单行。

---

## Step 2 总体相位路线图(本计划只实现 2A)

| 相位 | 范围 | 绿色保证 |
|---|---|---|
| **2A**(本文) | platform-config 增量加 CoC 原语 + 单测 | 纯新增,无人消费,旧管线照跑 |
| 2B | 新 codegen 脚本 + `web/manifest/index.ts` 采集入口,emit 进 `web/manifest/_generated/`(与旧 `apps.ts` 并存) | 手动跑 codegen 验证;app 仍读旧产物 |
| 2C | 拆 `_menu.map.ts` → 各模块 `manifest.ts` + `menu-tree.ts` + `catalog/{contract-types,roles}.ts` + 模块 `i18n/` | 新文件未被消费,旧 monolith 仍驱动运行时 |
| 2D | 运行时切到新产物(`runtime.ts`、`session-snapshot`、`session-menus`、`select`),删旧 monolith + 过时的 contract-group 片段,全绿门 | 行为不变,由现有测试 + e2e 冒烟锁 |

> 2B–2D 的任务依赖 2A 落地后的**真实签名**,在 2A 合并后各自单独成计划。

## 文件结构(2A 新增,均在 `packages/platform-config/src/`)

| 文件 | 职责 |
|---|---|
| `coc/registry-types.ts` | CoC 数据形状:`ModuleManifest` / `ModulePermissionDecl` / `MenuTreeNodeDecl` / `GeneratedPermissionEntry` / `GeneratedMenuEntry` / `RegistryResult` / `RegistryDiagnostic` / `GuardRule` |
| `coc/define-module.ts` | `defineModule()` / `defineMenuTree()`(zod 校验 + freeze) |
| `coc/build-registry.ts` | `buildRegistry()`:汇总 manifests + menu-tree → registry + unions + 诊断(重名 / belongToMenuCode 规则 / 删码需 deprecated / parent 存在);reconcile code-only-grows |
| `coc/validate-catalog.ts` | `validateCatalog()`:catalog 角色码必须存在且未 deprecated;catalog 合同 menu 必须存在且是叶子 |
| `coc/contract-scope.ts` | `deriveContractScope()`:合同 → 权限码并集(反推) |
| `coc/emit.ts` | `emitRegistry()`:把 RegistryResult + contractScope + i18n 写成 5 个 `*.generated.ts` / `.json` 字符串(纯字符串构造,文件写入由调用方/脚本做,保持包对 node:fs 无强依赖)→ 返回 `{ filename: content }` 映射 |
| `coc/create-coc-config.ts` | `createCocConfig()`:消费生成数据,暴露 `resolveRolePermissions / resolvePartyScope / codeToMenu / buildMenuTree` |
| `coc/index.ts` | 汇总 re-export(再由顶层 `src/index.ts` 转出) |
| 各 `*.test.ts` | 就近单测 |

> `emit` 设计成"返回字符串映射"而非直接写盘:保持本包纯净(参考库把 fs 写入留给脚本),2B 的脚本拿映射后落盘。

---

## Task A1: CoC 数据类型 + define 入口

**Files:**
- Create: `packages/platform-config/src/coc/registry-types.ts`
- Create: `packages/platform-config/src/coc/define-module.ts`
- Test: `packages/platform-config/src/coc/define-module.test.ts`

**Interfaces:**
- Produces: `ModuleManifest`, `ModulePermissionDecl`, `MenuTreeNodeDecl`, `GeneratedPermissionEntry`, `GeneratedMenuEntry`, `RegistryDiagnostic`, `GuardRule`, `RegistryResult`; `defineModule(m): ModuleManifest`, `defineMenuTree(n): MenuTreeNodeDecl[]`.

- [ ] **Step 1: 写类型文件 `registry-types.ts`**

```ts
// CoC 声明系统的数据形状(纯类型,无运行时 import)。
// 注:叶子菜单的展示字段(title/parentMenuCode/icon/order)由模块 manifest 携带——
// 模块拥有自己那条叶子菜单;目录(非叶子)节点在 menu-tree 骨架声明。

/** 模块声明的一条权限。label/desc 为 i18n key。 */
export interface ModulePermissionDecl {
  code: string;             // <cat>.<mod>.<fn>.<action>
  belongToMenuCode: string; // 显式;guard 强制 == 本模块 menuCode == code 前两段
  label: string;            // i18n key
  desc: string;             // i18n key
  deprecated?: boolean;
}

/** UI 模块唯一真源。无 contractTypes(合同归属在 catalog)、无 platform、无 require。 */
export interface ModuleManifest {
  moduleCategory: string;
  moduleName: string;
  menuCode: string;            // <cat>.<mod>
  title: string;              // 菜单标题 i18n key
  parentMenuCode: string;     // 挂到 menu-tree 骨架的目录 menuCode
  icon?: string;
  order?: number;
  entry: { url: string };     // 叶子页面 URL(无 category 段)
  permissions: ModulePermissionDecl[];
}

/** 目录(非叶子)骨架节点。无 contractTypes / 无 permissions / 无 path。 */
export interface MenuTreeNodeDecl {
  menuCode: string;
  title: string;              // i18n key
  parentMenuCode: string | null;
  icon?: string;
  order?: number;
}

/** 生成的权限注册表条目。 */
export interface GeneratedPermissionEntry {
  code: string;
  belongToMenuCode: string;
  label: string;
  desc: string;
  deprecated: boolean;
}

/** 生成的菜单注册表条目(叶子 + 目录拍平;无 contractTypes)。 */
export interface GeneratedMenuEntry {
  menuCode: string;
  title: string;
  parentMenuCode: string | null;
  path: string | null;        // 叶子有 path,目录为 null
  icon: string | null;
  order: number;
}

export type GuardRule =
  | "duplicate-code"
  | "deleted-without-deprecated"
  | "belongs-to-menu-rule"
  | "menu-code-required"
  | "parent-missing"
  | "catalog-ref-missing"
  | "catalog-ref-deprecated"
  | "contract-menu-missing"
  | "contract-menu-not-leaf"
  | "dead-menu";

export interface RegistryDiagnostic {
  level: "error" | "warning";
  rule: GuardRule;
  message: string;
  codes?: string[];
}

export interface RegistryResult {
  permissionRegistry: Record<string, GeneratedPermissionEntry>;
  menuRegistry: Record<string, GeneratedMenuEntry>;
  permissionCodeUnion: string[]; // 排序;含 deprecated
  menuCodeUnion: string[];       // 排序
  diagnostics: RegistryDiagnostic[];
}
```

- [ ] **Step 2: 写 `define-module.test.ts`(失败)**

```ts
import { describe, expect, it } from "vitest";
import { defineModule, defineMenuTree } from "./define-module.ts";

describe("defineModule", () => {
  it("freezes a valid manifest", () => {
    const m = defineModule({
      moduleCategory: "system", moduleName: "roles", menuCode: "system.roles",
      title: "menu.roles", parentMenuCode: "system", entry: { url: "/roles" },
      permissions: [{ code: "system.roles.role.view", belongToMenuCode: "system.roles", label: "permission.rolesView", desc: "permission.rolesViewDesc" }],
    });
    expect(Object.isFrozen(m)).toBe(true);
    expect(m.menuCode).toBe("system.roles");
  });

  it("rejects a manifest missing menuCode", () => {
    // @ts-expect-error 故意缺字段
    expect(() => defineModule({ moduleCategory: "system", moduleName: "roles", title: "x", parentMenuCode: "system", entry: { url: "/r" }, permissions: [] })).toThrow();
  });
});

describe("defineMenuTree", () => {
  it("freezes a valid directory skeleton", () => {
    const t = defineMenuTree([{ menuCode: "system", title: "menu.system", parentMenuCode: null, order: 100 }]);
    expect(Object.isFrozen(t)).toBe(true);
    expect(t[0]!.menuCode).toBe("system");
  });
});
```

- [ ] **Step 3: 跑测试确认失败**

Run: `pnpm --filter @cloud/platform-config test define-module`
Expected: FAIL（`define-module.ts` 不存在 / 无法解析）

- [ ] **Step 4: 写 `define-module.ts`**

```ts
import { z } from "zod";
import type { MenuTreeNodeDecl, ModuleManifest } from "./registry-types.ts";

const permissionSchema = z.object({
  code: z.string().min(1),
  belongToMenuCode: z.string().min(1),
  label: z.string().min(1),
  desc: z.string().min(1),
  deprecated: z.boolean().optional(),
});

const moduleSchema = z.object({
  moduleCategory: z.string().min(1),
  moduleName: z.string().min(1),
  menuCode: z.string().min(1),
  title: z.string().min(1),
  parentMenuCode: z.string().min(1),
  icon: z.string().optional(),
  order: z.number().optional(),
  entry: z.object({ url: z.string().min(1) }),
  permissions: z.array(permissionSchema),
});

const menuTreeSchema = z.array(
  z.object({
    menuCode: z.string().min(1),
    title: z.string().min(1),
    parentMenuCode: z.string().min(1).nullable(),
    icon: z.string().optional(),
    order: z.number().optional(),
  }),
);

/** 模块 manifest 入口:编写期类型约束 + 运行期 zod 校验,返回冻结对象。 */
export function defineModule(manifest: ModuleManifest): ModuleManifest {
  return Object.freeze(moduleSchema.parse(manifest) as ModuleManifest);
}

/** 目录骨架入口。 */
export function defineMenuTree(nodes: MenuTreeNodeDecl[]): MenuTreeNodeDecl[] {
  return Object.freeze(menuTreeSchema.parse(nodes) as MenuTreeNodeDecl[]) as MenuTreeNodeDecl[];
}
```

- [ ] **Step 5: 跑测试确认通过**

Run: `pnpm --filter @cloud/platform-config test define-module`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add packages/platform-config/src/coc/registry-types.ts packages/platform-config/src/coc/define-module.ts packages/platform-config/src/coc/define-module.test.ts
git commit -m "feat(platform-config): CoC 数据类型 + defineModule/defineMenuTree"
```

---

## Task A2: `buildRegistry`(汇总 + 结构 guard + reconcile)

**Files:**
- Create: `packages/platform-config/src/coc/build-registry.ts`
- Test: `packages/platform-config/src/coc/build-registry.test.ts`

**Interfaces:**
- Consumes: `ModuleManifest`, `MenuTreeNodeDecl`, `RegistryResult`(A1)。
- Produces: `buildRegistry(input: { modules: readonly ModuleManifest[]; menuTree: readonly MenuTreeNodeDecl[]; previous?: RegistryResult }): RegistryResult`。

**结构 guard(error 级,进 diagnostics):** 重名 real 码;`belongToMenuCode` 必须 `== 本模块 menuCode` 且 `== code 前两段`;模块有 permissions 必有 menuCode(类型已保证非空,这里再校验 code 前缀一致);叶子的 `parentMenuCode` 与目录的 `parentMenuCode` 必须在 menuCode 全集内;**deleted-without-deprecated**(对比 previous:旧 real 码消失且未标 deprecated → error,且 reconcile 仍留存标 deprecated)。

- [ ] **Step 1: 写 `build-registry.test.ts`(失败)**

```ts
import { describe, expect, it } from "vitest";
import { buildRegistry } from "./build-registry.ts";
import type { ModuleManifest, MenuTreeNodeDecl } from "./registry-types.ts";

const menuTree: MenuTreeNodeDecl[] = [{ menuCode: "system", title: "menu.system", parentMenuCode: null, order: 100 }];
const roles: ModuleManifest = {
  moduleCategory: "system", moduleName: "roles", menuCode: "system.roles", title: "menu.roles",
  parentMenuCode: "system", icon: "shield", order: 101, entry: { url: "/roles" },
  permissions: [{ code: "system.roles.role.view", belongToMenuCode: "system.roles", label: "permission.rolesView", desc: "permission.rolesViewDesc" }],
};

describe("buildRegistry", () => {
  it("assembles permission + menu registries and sorted unions", () => {
    const r = buildRegistry({ modules: [roles], menuTree });
    expect(r.diagnostics.filter((d) => d.level === "error")).toEqual([]);
    expect(r.permissionCodeUnion).toEqual(["system.roles.role.view"]);
    expect(r.menuCodeUnion).toEqual(["system", "system.roles"]);
    expect(r.menuRegistry["system.roles"]!.path).toBe("/roles");
    expect(r.menuRegistry["system"]!.path).toBeNull();
    expect(r.permissionRegistry["system.roles.role.view"]!.belongToMenuCode).toBe("system.roles");
  });

  it("errors on duplicate permission_code", () => {
    const dup = { ...roles, moduleName: "roles2", menuCode: "system.roles" };
    const r = buildRegistry({ modules: [roles, dup as ModuleManifest], menuTree });
    expect(r.diagnostics.some((d) => d.rule === "duplicate-code")).toBe(true);
  });

  it("errors when belongToMenuCode != menuCode", () => {
    const bad: ModuleManifest = { ...roles, permissions: [{ ...roles.permissions[0]!, belongToMenuCode: "system.other" }] };
    const r = buildRegistry({ modules: [bad], menuTree });
    expect(r.diagnostics.some((d) => d.rule === "belongs-to-menu-rule")).toBe(true);
  });

  it("errors when a leaf parent is missing from the tree", () => {
    const r = buildRegistry({ modules: [{ ...roles, parentMenuCode: "ghost" }], menuTree });
    expect(r.diagnostics.some((d) => d.rule === "parent-missing")).toBe(true);
  });

  it("retains a vanished real code as deprecated and flags deleted-without-deprecated", () => {
    const prev = buildRegistry({ modules: [roles], menuTree });
    const r = buildRegistry({ modules: [{ ...roles, permissions: [] }], menuTree, previous: prev });
    expect(r.permissionRegistry["system.roles.role.view"]!.deprecated).toBe(true);
    expect(r.permissionCodeUnion).toContain("system.roles.role.view");
    expect(r.diagnostics.some((d) => d.rule === "deleted-without-deprecated")).toBe(true);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @cloud/platform-config test build-registry`
Expected: FAIL（`build-registry.ts` 不存在）

- [ ] **Step 3: 写 `build-registry.ts`**

```ts
import type {
  GeneratedMenuEntry, GeneratedPermissionEntry, MenuTreeNodeDecl,
  ModuleManifest, RegistryDiagnostic, RegistryResult,
} from "./registry-types.ts";

const menuPrefixOf = (code: string): string => code.split(".").slice(0, 2).join(".");

export function buildRegistry(input: {
  modules: readonly ModuleManifest[];
  menuTree: readonly MenuTreeNodeDecl[];
  previous?: RegistryResult;
}): RegistryResult {
  const { modules, menuTree, previous } = input;
  const diagnostics: RegistryDiagnostic[] = [];

  // ---- 菜单注册表:目录(来自骨架)+ 叶子(来自模块) ----
  const menuRegistry: Record<string, GeneratedMenuEntry> = {};
  for (const n of menuTree) {
    menuRegistry[n.menuCode] = {
      menuCode: n.menuCode, title: n.title, parentMenuCode: n.parentMenuCode,
      path: null, icon: n.icon ?? null, order: n.order ?? 0,
    };
  }
  for (const m of modules) {
    menuRegistry[m.menuCode] = {
      menuCode: m.menuCode, title: m.title, parentMenuCode: m.parentMenuCode,
      path: m.entry.url, icon: m.icon ?? null, order: m.order ?? 0,
    };
  }
  const menuCodes = new Set(Object.keys(menuRegistry));

  // ---- 结构 guard:parent 存在 ----
  for (const code of menuCodes) {
    const parent = menuRegistry[code]!.parentMenuCode;
    if (parent !== null && !menuCodes.has(parent)) {
      diagnostics.push({ level: "error", rule: "parent-missing", message: `menu "${code}" references missing parent "${parent}".`, codes: [code] });
    }
  }

  // ---- 收集 real 码 + 结构 guard:belongToMenuCode 规则 + 重名 ----
  const seen = new Map<string, number>();
  const current = new Map<string, GeneratedPermissionEntry>();
  for (const m of modules) {
    for (const p of m.permissions) {
      seen.set(p.code, (seen.get(p.code) ?? 0) + 1);
      if (p.belongToMenuCode !== m.menuCode || p.belongToMenuCode !== menuPrefixOf(p.code)) {
        diagnostics.push({ level: "error", rule: "belongs-to-menu-rule", message: `permission "${p.code}": belongToMenuCode "${p.belongToMenuCode}" must equal module menuCode "${m.menuCode}" and code prefix "${menuPrefixOf(p.code)}".`, codes: [p.code] });
      }
      current.set(p.code, { code: p.code, belongToMenuCode: p.belongToMenuCode, label: p.label, desc: p.desc, deprecated: p.deprecated === true });
    }
  }
  for (const [code, n] of seen) {
    if (n > 1) diagnostics.push({ level: "error", rule: "duplicate-code", message: `duplicate permission_code "${code}" declared by ${n} modules.`, codes: [code] });
  }

  // ---- reconcile:从 previous 起底,叠加 current;消失的旧 real 码留存标 deprecated ----
  const permissionRegistry: Record<string, GeneratedPermissionEntry> = {};
  if (previous) for (const [code, e] of Object.entries(previous.permissionRegistry)) permissionRegistry[code] = { ...e };
  for (const [code, e] of current) permissionRegistry[code] = e;

  if (previous) {
    for (const [code, prev] of Object.entries(previous.permissionRegistry)) {
      if (prev.deprecated) continue;
      if (!current.has(code)) {
        permissionRegistry[code] = { ...prev, deprecated: true };
        diagnostics.push({ level: "error", rule: "deleted-without-deprecated", message: `permission_code "${code}" vanished without an explicit deprecated marker; retained as deprecated. Mark it deprecated in source or restore it.`, codes: [code] });
      }
    }
  }

  const permissionCodeUnion = Object.keys(permissionRegistry).sort();
  const menuCodeUnion = Object.keys(menuRegistry).sort();
  return { permissionRegistry, menuRegistry, permissionCodeUnion, menuCodeUnion, diagnostics };
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @cloud/platform-config test build-registry`
Expected: PASS（5 个用例全绿）

- [ ] **Step 5: 提交**

```bash
git add packages/platform-config/src/coc/build-registry.ts packages/platform-config/src/coc/build-registry.test.ts
git commit -m "feat(platform-config): buildRegistry 汇总 + 结构 guard + code-only-grows reconcile"
```

---

## Task A3: `validateCatalog`(catalog 引用 guard)

**Files:**
- Create: `packages/platform-config/src/coc/validate-catalog.ts`
- Test: `packages/platform-config/src/coc/validate-catalog.test.ts`

**Interfaces:**
- Consumes: `RegistryResult`(A1/A2)。
- Produces: `validateCatalog(args: { result: RegistryResult; roleCodes: readonly string[]; contractMenus: readonly string[] }): RegistryDiagnostic[]`。

**Guards:** catalog 角色引用的码必须存在(`catalog-ref-missing`)且未 deprecated(`catalog-ref-deprecated`);catalog 合同引用的 menuCode 必须存在(`contract-menu-missing`)且是叶子(有 path,`contract-menu-not-leaf`);**dead-menu**(warning):有 path 的叶子菜单不被任何合同引用。

- [ ] **Step 1: 写 `validate-catalog.test.ts`(失败)**

```ts
import { describe, expect, it } from "vitest";
import { buildRegistry } from "./build-registry.ts";
import { validateCatalog } from "./validate-catalog.ts";
import type { ModuleManifest, MenuTreeNodeDecl } from "./registry-types.ts";

const menuTree: MenuTreeNodeDecl[] = [{ menuCode: "system", title: "menu.system", parentMenuCode: null, order: 100 }];
const roles: ModuleManifest = {
  moduleCategory: "system", moduleName: "roles", menuCode: "system.roles", title: "menu.roles",
  parentMenuCode: "system", entry: { url: "/roles" },
  permissions: [{ code: "system.roles.role.view", belongToMenuCode: "system.roles", label: "l", desc: "d" }],
};
const result = buildRegistry({ modules: [roles], menuTree });

describe("validateCatalog", () => {
  it("passes when refs exist", () => {
    const d = validateCatalog({ result, roleCodes: ["system.roles.role.view"], contractMenus: ["system.roles"] });
    expect(d.filter((x) => x.level === "error")).toEqual([]);
  });
  it("errors on a missing role code ref", () => {
    const d = validateCatalog({ result, roleCodes: ["system.roles.role.ghost"], contractMenus: ["system.roles"] });
    expect(d.some((x) => x.rule === "catalog-ref-missing")).toBe(true);
  });
  it("errors on a missing contract menu ref", () => {
    const d = validateCatalog({ result, roleCodes: [], contractMenus: ["system.ghost"] });
    expect(d.some((x) => x.rule === "contract-menu-missing")).toBe(true);
  });
  it("errors when a contract references a directory (non-leaf)", () => {
    const d = validateCatalog({ result, roleCodes: [], contractMenus: ["system"] });
    expect(d.some((x) => x.rule === "contract-menu-not-leaf")).toBe(true);
  });
  it("warns on a dead menu (leaf not referenced by any contract)", () => {
    const d = validateCatalog({ result, roleCodes: [], contractMenus: [] });
    expect(d.some((x) => x.rule === "dead-menu" && x.level === "warning")).toBe(true);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @cloud/platform-config test validate-catalog`
Expected: FAIL

- [ ] **Step 3: 写 `validate-catalog.ts`**

```ts
import type { RegistryDiagnostic, RegistryResult } from "./registry-types.ts";

export function validateCatalog(args: {
  result: RegistryResult;
  roleCodes: readonly string[];
  contractMenus: readonly string[];
}): RegistryDiagnostic[] {
  const { result, roleCodes, contractMenus } = args;
  const out: RegistryDiagnostic[] = [];

  const missingRole = roleCodes.filter((c) => !result.permissionRegistry[c]);
  if (missingRole.length) out.push({ level: "error", rule: "catalog-ref-missing", message: `catalog/roles.ts references absent permission_code(s): ${missingRole.join(", ")}.`, codes: missingRole });

  const deprecatedRole = roleCodes.filter((c) => result.permissionRegistry[c]?.deprecated);
  if (deprecatedRole.length) out.push({ level: "error", rule: "catalog-ref-deprecated", message: `catalog/roles.ts references deprecated permission_code(s): ${deprecatedRole.join(", ")}.`, codes: deprecatedRole });

  const missingMenu = contractMenus.filter((m) => !result.menuRegistry[m]);
  if (missingMenu.length) out.push({ level: "error", rule: "contract-menu-missing", message: `catalog/contract-types.ts references absent menu_code(s): ${missingMenu.join(", ")}.`, codes: missingMenu });

  const nonLeaf = contractMenus.filter((m) => result.menuRegistry[m] && result.menuRegistry[m]!.path === null);
  if (nonLeaf.length) out.push({ level: "error", rule: "contract-menu-not-leaf", message: `catalog/contract-types.ts references directory (non-leaf) menu_code(s): ${nonLeaf.join(", ")}. Only leaf menus may be contract-gated.`, codes: nonLeaf });

  const referenced = new Set(contractMenus);
  const deadMenus = Object.values(result.menuRegistry).filter((m) => m.path !== null && !referenced.has(m.menuCode)).map((m) => m.menuCode);
  if (deadMenus.length) out.push({ level: "warning", rule: "dead-menu", message: `leaf menu(s) declared but referenced by no contract (dead menu): ${deadMenus.join(", ")}.`, codes: deadMenus });

  return out;
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @cloud/platform-config test validate-catalog`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add packages/platform-config/src/coc/validate-catalog.ts packages/platform-config/src/coc/validate-catalog.test.ts
git commit -m "feat(platform-config): validateCatalog 角色/合同引用 guard + dead-menu 警告"
```

---

## Task A4: `deriveContractScope`

**Files:**
- Create: `packages/platform-config/src/coc/contract-scope.ts`
- Test: `packages/platform-config/src/coc/contract-scope.test.ts`

**Interfaces:**
- Consumes: `RegistryResult`(menuRegistry/permissionRegistry)。
- Produces: `deriveContractScope(contractMenus: Record<string, readonly string[]>, result: RegistryResult): Record<string, string[]>`(合同 → 排序去重的权限码;排除 deprecated)。

- [ ] **Step 1: 写 `contract-scope.test.ts`(失败)**

```ts
import { describe, expect, it } from "vitest";
import { buildRegistry } from "./build-registry.ts";
import { deriveContractScope } from "./contract-scope.ts";
import type { ModuleManifest, MenuTreeNodeDecl } from "./registry-types.ts";

const menuTree: MenuTreeNodeDecl[] = [{ menuCode: "system", title: "menu.system", parentMenuCode: null, order: 100 }];
const mk = (mod: string, code: string): ModuleManifest => ({
  moduleCategory: "system", moduleName: mod, menuCode: `system.${mod}`, title: `menu.${mod}`,
  parentMenuCode: "system", entry: { url: `/${mod}` },
  permissions: [{ code, belongToMenuCode: `system.${mod}`, label: "l", desc: "d" }],
});
const result = buildRegistry({ modules: [mk("roles", "system.roles.role.view"), mk("users", "system.users.user.view")], menuTree });

describe("deriveContractScope", () => {
  it("expands each contract's menus into their permission codes", () => {
    const scope = deriveContractScope({ ADMIN: ["system.roles", "system.users"], "US-ISO": ["system.users"] }, result);
    expect(scope.ADMIN).toEqual(["system.roles.role.view", "system.users.user.view"]);
    expect(scope["US-ISO"]).toEqual(["system.users.user.view"]);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @cloud/platform-config test contract-scope`
Expected: FAIL

- [ ] **Step 3: 写 `contract-scope.ts`**

```ts
import type { RegistryResult } from "./registry-types.ts";

/** 合同 → 该合同菜单解锁的全部(未 deprecated)权限码,排序去重。 */
export function deriveContractScope(
  contractMenus: Record<string, readonly string[]>,
  result: RegistryResult,
): Record<string, string[]> {
  const codesByMenu = new Map<string, string[]>();
  for (const e of Object.values(result.permissionRegistry)) {
    if (e.deprecated) continue;
    const arr = codesByMenu.get(e.belongToMenuCode) ?? [];
    arr.push(e.code);
    codesByMenu.set(e.belongToMenuCode, arr);
  }
  const out: Record<string, string[]> = {};
  for (const [contract, menus] of Object.entries(contractMenus)) {
    const set = new Set<string>();
    for (const menu of menus) for (const code of codesByMenu.get(menu) ?? []) set.add(code);
    out[contract] = [...set].sort();
  }
  return out;
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @cloud/platform-config test contract-scope`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add packages/platform-config/src/coc/contract-scope.ts packages/platform-config/src/coc/contract-scope.test.ts
git commit -m "feat(platform-config): deriveContractScope 合同→权限码反推"
```

---

## Task A5: `emitRegistry`(生成文件字符串)

**Files:**
- Create: `packages/platform-config/src/coc/emit.ts`
- Test: `packages/platform-config/src/coc/emit.test.ts`

**Interfaces:**
- Consumes: `RegistryResult`、`deriveContractScope` 输出。
- Produces: `emitRegistry(args: { result: RegistryResult; contractScope: Record<string, string[]>; i18n: Record<string, unknown>; contractTypes: readonly string[] }): Record<string, string>`,键为相对文件名(`registry-types.generated.ts` / `permission-registry.generated.ts` / `menu-registry.generated.ts` / `contract-scope.generated.ts` / `i18n/en.json` …),值为文件内容字符串。

> 纯字符串构造,**不写盘**(2B 脚本负责落 `web/manifest/_generated/`,且"有 error 不落盘"由脚本判 `diagnostics`)。i18n 的多 locale 由调用方分别传 `i18n` 调用或在脚本侧合并;本函数只处理传入的一份 + 类型/注册表。

- [ ] **Step 1: 写 `emit.test.ts`(失败)**

```ts
import { describe, expect, it } from "vitest";
import { buildRegistry } from "./build-registry.ts";
import { deriveContractScope } from "./contract-scope.ts";
import { emitRegistry } from "./emit.ts";
import type { ModuleManifest, MenuTreeNodeDecl } from "./registry-types.ts";

const menuTree: MenuTreeNodeDecl[] = [{ menuCode: "system", title: "menu.system", parentMenuCode: null, order: 100 }];
const roles: ModuleManifest = {
  moduleCategory: "system", moduleName: "roles", menuCode: "system.roles", title: "menu.roles",
  parentMenuCode: "system", icon: "shield", order: 101, entry: { url: "/roles" },
  permissions: [{ code: "system.roles.role.view", belongToMenuCode: "system.roles", label: "permission.rolesView", desc: "permission.rolesViewDesc" }],
};
const result = buildRegistry({ modules: [roles], menuTree });
const contractScope = deriveContractScope({ ADMIN: ["system.roles"] }, result);

describe("emitRegistry", () => {
  it("emits a PermissionCode union and a header on every file", () => {
    const files = emitRegistry({ result, contractScope, i18n: { menu: { roles: "Roles" } }, contractTypes: ["ADMIN"] });
    expect(files["registry-types.generated.ts"]).toContain('export type PermissionCode =');
    expect(files["registry-types.generated.ts"]).toContain('"system.roles.role.view"');
    expect(files["registry-types.generated.ts"]).toContain('export type MenuCode =');
    for (const content of Object.values(files)) {
      if (content.endsWith(".json")) continue;
    }
    expect(files["permission-registry.generated.ts"]).toContain("PERMISSION_REGISTRY");
    expect(files["permission-registry.generated.ts"]).toContain("export function codeToMenu");
    expect(files["menu-registry.generated.ts"]).toContain("MENU_REGISTRY");
    expect(files["contract-scope.generated.ts"]).toContain("CONTRACT_SCOPE");
    expect(files["i18n/en.json"]).toContain('"Roles"');
  });

  it("is deterministic (stable across two runs)", () => {
    const a = emitRegistry({ result, contractScope, i18n: {}, contractTypes: ["ADMIN"] });
    const b = emitRegistry({ result, contractScope, i18n: {}, contractTypes: ["ADMIN"] });
    expect(a).toEqual(b);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @cloud/platform-config test emit`
Expected: FAIL

- [ ] **Step 3: 写 `emit.ts`**

```ts
import type { RegistryResult } from "./registry-types.ts";

const HEADER = `// AUTO-GENERATED by @cloud/platform-config — DO NOT EDIT BY HAND.\n// Regenerate via the codegen script; manual edits are overwritten and fail CI.\n`;
const q = (s: string): string => JSON.stringify(s);

function emitUnion(name: string, codes: readonly string[]): string {
  if (codes.length === 0) return `export type ${name} = never;\n`;
  return `export type ${name} =\n${codes.map((c) => `  | ${q(c)}`).join("\n")};\n`;
}

export function emitRegistry(args: {
  result: RegistryResult;
  contractScope: Record<string, string[]>;
  i18n: Record<string, unknown>;
  contractTypes: readonly string[];
}): Record<string, string> {
  const { result, contractScope, i18n } = args;
  const files: Record<string, string> = {};

  files["registry-types.generated.ts"] =
    HEADER + "\n" + emitUnion("PermissionCode", result.permissionCodeUnion) + "\n" + emitUnion("MenuCode", result.menuCodeUnion);

  files["permission-registry.generated.ts"] =
    HEADER +
    '\nimport type { PermissionCode, MenuCode } from "./registry-types.generated.ts";\n\n' +
    "export interface GeneratedPermissionEntry { code: PermissionCode; belongToMenuCode: MenuCode; label: string; desc: string; deprecated: boolean; }\n\n" +
    "export const PERMISSION_REGISTRY: Record<PermissionCode, GeneratedPermissionEntry> = " +
    JSON.stringify(result.permissionRegistry, null, 2) +
    " as Record<PermissionCode, GeneratedPermissionEntry>;\n\n" +
    "export function codeToMenu(code: string): MenuCode | null {\n" +
    "  return (PERMISSION_REGISTRY as Record<string, GeneratedPermissionEntry | undefined>)[code]?.belongToMenuCode ?? null;\n}\n";

  files["menu-registry.generated.ts"] =
    HEADER +
    '\nimport type { MenuCode } from "./registry-types.generated.ts";\n\n' +
    "export interface GeneratedMenuEntry { menuCode: MenuCode; title: string; parentMenuCode: MenuCode | null; path: string | null; icon: string | null; order: number; }\n\n" +
    "export const MENU_REGISTRY: Record<MenuCode, GeneratedMenuEntry> = " +
    JSON.stringify(result.menuRegistry, null, 2) +
    " as Record<MenuCode, GeneratedMenuEntry>;\n";

  files["contract-scope.generated.ts"] =
    HEADER +
    '\nimport type { PermissionCode } from "./registry-types.generated.ts";\n' +
    'import type { ContractType } from "../../catalog/contract-types.ts";\n\n' +
    "export const CONTRACT_SCOPE: Record<ContractType, PermissionCode[]> = " +
    JSON.stringify(contractScope, null, 2) +
    " as Record<ContractType, PermissionCode[]>;\n";

  files["i18n/en.json"] = JSON.stringify(i18n, null, 2) + "\n";

  return files;
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @cloud/platform-config test emit`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add packages/platform-config/src/coc/emit.ts packages/platform-config/src/coc/emit.test.ts
git commit -m "feat(platform-config): emitRegistry 生成文件字符串(纯,不写盘)"
```

---

## Task A6: `createCocConfig`(运行时消费)

**Files:**
- Create: `packages/platform-config/src/coc/create-coc-config.ts`
- Test: `packages/platform-config/src/coc/create-coc-config.test.ts`

**Interfaces:**
- Consumes: 生成数据形状 `GeneratedMenuEntry` / `GeneratedPermissionEntry`、`CONTRACT_SCOPE`、`GLOBAL_ROLES`。
- Produces:
  ```ts
  createCocConfig(input: {
    menuRegistry: Record<string, GeneratedMenuEntry>;
    contractScope: Record<string, readonly string[]>;
    globalRoles: readonly { roleId: number; permissionCodes: readonly string[] }[];
    codeToMenu: (code: string) => string | null;
  }): {
    resolveRolePermissions(roleId: number): string[] | undefined;
    resolvePartyScope(contracts: string | readonly string[]): Set<string>;
    buildMenuTree(grantedCodes: readonly string[]): MenuTreeNode[];
  }
  ```
  `MenuTreeNode` 复用现 `apps/web/manifest/select.ts` 的形状 `{ menuCode, menuTitle, path, icon, order, children }`,**但本包内重定义为 `{ menuCode, title, path, icon, order, children }`**(包内用 `title` i18n key,app 投影时再映射;2D 决定字段名对齐)。投影规则同现 `selectVisibleMenuTree`:叶子有命中码即可见,祖先目录连带,空目录裁掉,按 order 排序。

- [ ] **Step 1: 写 `create-coc-config.test.ts`(失败)**

```ts
import { describe, expect, it } from "vitest";
import { createCocConfig } from "./create-coc-config.ts";
import type { GeneratedMenuEntry } from "./registry-types.ts";

const menuRegistry: Record<string, GeneratedMenuEntry> = {
  system: { menuCode: "system", title: "menu.system", parentMenuCode: null, path: null, icon: "settings", order: 100 },
  "system.roles": { menuCode: "system.roles", title: "menu.roles", parentMenuCode: "system", path: "/roles", icon: "shield", order: 101 },
  "system.users": { menuCode: "system.users", title: "menu.users", parentMenuCode: "system", path: "/users", icon: "users", order: 102 },
};
const cfg = createCocConfig({
  menuRegistry,
  contractScope: { ADMIN: ["system.roles.role.view", "system.users.user.view"], "US-ISO": ["system.users.user.view"] },
  globalRoles: [{ roleId: 1, permissionCodes: ["system.roles.role.view", "system.users.user.view"] }],
  codeToMenu: (c) => c.split(".").slice(0, 2).join("."),
});

describe("createCocConfig", () => {
  it("resolveRolePermissions returns a global role's codes", () => {
    expect(cfg.resolveRolePermissions(1)).toEqual(["system.roles.role.view", "system.users.user.view"]);
    expect(cfg.resolveRolePermissions(999)).toBeUndefined();
  });
  it("resolvePartyScope unions the contracts' codes", () => {
    expect([...cfg.resolvePartyScope(["ADMIN"])].sort()).toEqual(["system.roles.role.view", "system.users.user.view"]);
    expect([...cfg.resolvePartyScope("US-ISO")]).toEqual(["system.users.user.view"]);
  });
  it("buildMenuTree projects only visible leaves + their ancestors, pruning empty dirs", () => {
    const tree = cfg.buildMenuTree(["system.users.user.view"]); // 只命中 users
    expect(tree).toHaveLength(1);
    expect(tree[0]!.menuCode).toBe("system");
    expect(tree[0]!.children.map((c) => c.menuCode)).toEqual(["system.users"]); // roles 被裁
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @cloud/platform-config test create-coc-config`
Expected: FAIL

- [ ] **Step 3: 写 `create-coc-config.ts`**

```ts
import type { GeneratedMenuEntry } from "./registry-types.ts";

export interface MenuTreeNode {
  menuCode: string; title: string; path: string | null; icon: string | null; order: number; children: MenuTreeNode[];
}

export function createCocConfig(input: {
  menuRegistry: Record<string, GeneratedMenuEntry>;
  contractScope: Record<string, readonly string[]>;
  globalRoles: readonly { roleId: number; permissionCodes: readonly string[] }[];
  codeToMenu: (code: string) => string | null;
}) {
  const { menuRegistry, contractScope, globalRoles, codeToMenu } = input;
  const roleById = new Map(globalRoles.map((r) => [r.roleId, r]));

  const resolveRolePermissions = (roleId: number): string[] | undefined => {
    const r = roleById.get(roleId);
    return r ? [...r.permissionCodes] : undefined;
  };

  const resolvePartyScope = (contracts: string | readonly string[]): Set<string> => {
    const list = typeof contracts === "string" ? [contracts] : contracts;
    const set = new Set<string>();
    for (const c of list) for (const code of contractScope[c] ?? []) set.add(code);
    return set;
  };

  const buildMenuTree = (grantedCodes: readonly string[]): MenuTreeNode[] => {
    const granted = new Set(grantedCodes);
    const visible = new Set<string>();
    // 命中的码 → 其叶子菜单可见 → 连带祖先目录
    for (const code of granted) {
      let cur = codeToMenu(code);
      while (cur && !visible.has(cur)) {
        visible.add(cur);
        cur = menuRegistry[cur]?.parentMenuCode ?? null;
      }
    }
    const toNode = (m: GeneratedMenuEntry): MenuTreeNode => ({ menuCode: m.menuCode, title: m.title, path: m.path, icon: m.icon, order: m.order, children: [] });
    const nodes = new Map<string, MenuTreeNode>();
    for (const code of visible) { const m = menuRegistry[code]; if (m) nodes.set(code, toNode(m)); }
    const roots: MenuTreeNode[] = [];
    for (const code of visible) {
      const m = menuRegistry[code]; const node = nodes.get(code); if (!m || !node) continue;
      const parent = m.parentMenuCode ? nodes.get(m.parentMenuCode) : undefined;
      if (parent) parent.children.push(node); else roots.push(node);
    }
    const sortRec = (arr: MenuTreeNode[]) => { arr.sort((a, b) => a.order - b.order); for (const n of arr) sortRec(n.children); };
    sortRec(roots);
    return roots;
  };

  return { resolveRolePermissions, resolvePartyScope, buildMenuTree };
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @cloud/platform-config test create-coc-config`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add packages/platform-config/src/coc/create-coc-config.ts packages/platform-config/src/coc/create-coc-config.test.ts
git commit -m "feat(platform-config): createCocConfig 运行时消费(scope/role/menuTree)"
```

---

## Task A7: 汇总导出 + 全包绿

**Files:**
- Create: `packages/platform-config/src/coc/index.ts`
- Modify: `packages/platform-config/src/index.ts`(只追加 re-export)

**Interfaces:**
- Produces: 从 `@cloud/platform-config` 顶层导出全部 A1–A6 的函数与类型,供 2B/2D 使用。

- [ ] **Step 1: 写 `coc/index.ts`**

```ts
export * from "./registry-types.ts";
export { defineModule, defineMenuTree } from "./define-module.ts";
export { buildRegistry } from "./build-registry.ts";
export { validateCatalog } from "./validate-catalog.ts";
export { deriveContractScope } from "./contract-scope.ts";
export { emitRegistry } from "./emit.ts";
export { createCocConfig, type MenuTreeNode } from "./create-coc-config.ts";
```

- [ ] **Step 2: 在 `src/index.ts` 末尾追加一行(不动现有行)**

```ts
export * from "./coc/index.ts";
```

- [ ] **Step 3: 跑全包测试 + typecheck**

Run: `pnpm --filter @cloud/platform-config test && pnpm --filter @cloud/platform-config typecheck`
Expected: PASS（现有 manifest/create 等旧测试 + 新 coc 测试全绿;类型无错）

- [ ] **Step 4: 跑 lint 确认包不 import app**

Run: `pnpm --filter @cloud/platform-config lint`
Expected: PASS（`coc/*` 无任何 `apps/` 或 `@/` import;若仓库已配 packages→apps 禁止 region,此处自然满足）

- [ ] **Step 5: 全仓 typecheck 确认无回归**

Run: `pnpm typecheck`
Expected: PASS（2A 纯新增,未触现有消费,应无回归)

- [ ] **Step 6: 提交**

```bash
git add packages/platform-config/src/coc/index.ts packages/platform-config/src/index.ts
git commit -m "feat(platform-config): 顶层导出 CoC 原语(2A 完成)"
```

---

## E2E Coverage

2A 不触碰任何 route / middleware / auth-boundary(纯包内逻辑,无 app 接线)。**本相位跳过 E2E**;路由/守卫相关的 e2e 在 2D(运行时切换)规划——届时重点锁"登录 → 选公司 → 侧边栏按合同/角色投影"的既有冒烟不回归,以及 `system.roles` / `system.users` 页面守卫。

## Self-Review

- **Spec 覆盖**:2A 对应 spec §5(采集生成流程:buildRegistry/validateCatalog/deriveContractScope/emit)、§6(reconcile + 结构/catalog guard 子集)、§7(运行时 resolvePartyScope/resolveRolePermissions/buildMenuTree)。spec §3/§4 的声明与生成**产物形状**在 A1/A5 的类型与 emit 字符串里钉死。§3.1 spec 最小示例省略的 `title/parentMenuCode/icon/order`,本计划在 `ModuleManifest`(A1)补全并说明——叶子菜单展示字段须由模块携带。eslint region(spec §5/§6 guard 8)在 A7 step4 以"现有 lint 自然满足"覆盖;若仓库尚无该 region,2B 补一条 flat-config(留待 2B)。
- **Placeholder 扫描**:无 TODO/TBD;每个 code step 含完整可运行代码与测试。
- **类型一致性**:`buildRegistry`/`validateCatalog`/`deriveContractScope`/`emitRegistry`/`createCocConfig` 全部围绕 A1 的 `RegistryResult`/`GeneratedPermissionEntry`/`GeneratedMenuEntry`;`belongToMenuCode` 字段名贯穿一致;`codeToMenu` 在 A5(生成函数)与 A6(注入参数)语义一致。
- **缺口**:`createCocConfig` 的 `MenuTreeNode` 用 `title`(i18n key)而非现 app `select.ts` 的 `menuTitle`;字段名对齐留 2D 处理(2D 改 `session-menus`/`select` 时统一)。已在 A6 Interfaces 标注。

## Shared packages 说明(执行前须知)

- **唯一改动包**:`@cloud/platform-config`,**纯新增**(`src/coc/**` + `src/index.ts` 追加一行)。已获用户批准(Step 2 核心决定:codegen 并进 platform-config)。CLAUDE.md"不改 packages/*"在此被用户显式授权覆盖。
- **未触**:`@cloud/permissions` / `@cloud/i18n` / `@cloud/ui` / `@cloud/db` 一概不动。
- **新增依赖**:无(zod 已是本包依赖)。

## Execution Handoff

(见计划末尾 writing-plans 标准两选项。)
