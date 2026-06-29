# Step 2B · 作者源下沉 + 新 CoC codegen(纯增量) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把单体 `manifest/_menu.map.ts` / `_roles.map.ts` 拆成 per-module 作者源(`modules/<cat>/<mod>/manifest.ts` + `i18n/`)、目录骨架 `manifest/menu-tree.ts`、收进 `manifest/` 的权威 catalog(`manifest/catalog/{contract-types,roles}.ts` + `catalog/i18n/`)与采集入口 `manifest/collect.ts`,并新增独立脚本 `scripts/generate-coc-registry.mjs` 调 2A 原语 emit **仅 4 个 `.generated.ts`** 进 `manifest/_generated/`;**纯增量、无人消费**(仅 catalog 的可擦除 `import type` 用到),旧 `apps.ts` 管线 / 旧 i18n / 旧守卫**全程不动**,现有测试照常全绿。

**Architecture:** 纯作者声明(数据)+ 一个确定性 codegen。codegen 动态 import `collect.ts`(Node 24 原生类型擦除,`import type` 抹除 → 首跑缺生成文件也能读),跑 `buildRegistry → validateCatalog → deriveContractScope → emitRegistry`,有 error 诊断则拒写、退出码 1。**本相位不产 i18n**(`_generated/i18n/` 仍由旧 codegen 独占,旧运行时零影响,无 throwaway 兜底);i18n 接管 + 运行时切换 + 删旧全部留给决定性相位 2C。

**Tech Stack:** TypeScript strict、`@cloud/platform-config`(2A 原语)、Node 24 ESM 脚本、vitest。

## Global Constraints

- **packages 改动仅限 emit 参数化(B0)**:2A 已授权为 CoC 改 packages;本相位只新增一个可选入参,不动其它导出/行为。其余改动都在 `apps/web` + `scripts/` + 根 `package.json`。
- **权限码格式**:`<cat>.<mod>.<fn>.<action>`(4 段全小写 camel)。`menuCode = <cat>.<mod>`;`belongToMenuCode == 本模块 menuCode == code 前两段`。
- **旧→新映射(本相位定型)**:
  - 菜单码 `roles`→`system.roles`,`users`→`system.users`;目录 `system` 保留;`home`/`dashboard` 是 B 类,**不进 CoC**(留 2C layout 直链)。
  - `entry.url` **保留真实路由** `/system/roles`、`/system/users`(物理页面在 `app/(dashboard)/system/**`)。
  - 权限码补 `<fn>` 段(资源单数);动词 `add`**改为 `create`**,其余保留:`roles.*`→`system.roles.role.{view,create,update,delete,duplicate}`;`users.*`→`system.users.user.{view,create,invite,update,lock,resetPassword,changeRole}`。i18n key `rolesAdd`/`usersAdd` 随之改名 `rolesCreate`/`usersCreate`(值不变)。
  - 旧 `require` 字段、`contractTypes:[]` 通配**删除**:合同归属移 catalog,`users`(旧通配)在 catalog 显式枚举到全部 4 合同。
- **合同枚举**:`["ADMIN","US-ISO","US-ISV","MERCHANT"]`。
- **i18n**:`title/label/desc/roleName/remark` 一律 i18n key;`en`/`zh-CN`/`ja` 同步,值搬自旧 `manifest/i18n/*.json`;新增 `contract.*`。本相位**只创建 i18n 源文件、不 emit**(留 2C)。
- **目录归属(本相位定)**:CoC 作者源全部收在 `apps/web/manifest/` 下(`manifest/catalog/`、`manifest/menu-tree.ts`、`manifest/collect.ts`);模块 manifest/i18n 就近 `apps/web/modules/<cat>/<mod>/`。
- **生成物 gitignored**(`.gitignore:57`):`*.generated.ts` 不提交,由 `gen:coc` 重建;`gen:coc` 接进 `predev/prebuild/pretest`,保证 catalog 的可擦除 `import type { MenuCode/PermissionCode }` 在 tsc 时有生成文件可解析。
- **零运行时切换**:不动 `manifest/index.ts`、`select.ts`、`session-menus`、`session-snapshot`、`i18n/request.ts`、任何 route/page 守卫;旧 `apps.ts` 仍是唯一被消费产物。
- **app 内跨目录用相对路径**(codegen 走 Node 动态 import,不认 `@/`);`@cloud/*` 走 workspace 包。
- **命名**:文件 kebab-case;函数 camelCase;类型 PascalCase;常量 UPPER_SNAKE_CASE。

## 文件结构(本相位新增/修改)

| 文件 | 职责 | 动作 |
|---|---|---|
| `packages/platform-config/src/coc/emit.ts` | `emitRegistry` 增可选入参 `contractTypesImport`(contract-scope 里 ContractType 的 import 路径) | Modify |
| `packages/platform-config/src/coc/emit.test.ts` | 补「自定义 import 路径」用例 | Modify |
| `apps/web/manifest/catalog/contract-types.ts` | `CONTRACT_TYPES`/`ContractType`/`CONTRACT_LABELS`/`CONTRACT_MENUS` | Create |
| `apps/web/manifest/catalog/roles.ts` | `GlobalRole` + `GLOBAL_ROLES` | Create |
| `apps/web/manifest/catalog/i18n/{en,zh-CN,ja}.ts` | 目录/角色/合同文案(`menu.system`/`role.*`/`contract.*`) | Create |
| `apps/web/manifest/menu-tree.ts` | 目录骨架(`system`) | Create |
| `apps/web/modules/system/roles/manifest.ts` + `i18n/{en,zh-CN,ja}.ts` | roles 模块 manifest + 文案 | Create |
| `apps/web/modules/system/users/manifest.ts` + `i18n/{en,zh-CN,ja}.ts` | users 模块 manifest + 文案 | Create |
| `apps/web/manifest/collect.ts` | 采集入口 | Create |
| `apps/web/manifest/coc-collect.test.ts` | 聚合校验(buildRegistry/validateCatalog/deriveContractScope 全绿) | Create |
| `scripts/generate-coc-registry.mjs` | 新 codegen:读 collect → 2A 原语 → emit 4 个 `.generated.ts`(**不产 i18n**) | Create |
| `package.json` | 加 `gen:coc`;`predev*/prebuild*/pretest` 串入 `&& pnpm gen:coc` | Modify |
| `apps/web/manifest/_generated/{registry-types,permission-registry,menu-registry,contract-scope}.generated.ts` | codegen 产物(gitignored,不提交) | Generated |

> 路径关系(catalog 在 `manifest/catalog/`、生成物在 `manifest/_generated/`):catalog→生成类型 `../_generated/registry-types.generated.ts`;emit 的 `contract-scope.generated.ts`→catalog `../catalog/contract-types.ts`(故 B0 传 `contractTypesImport: "../catalog/contract-types.ts"`)。

---

## Task B0: emit 的 contract-types import 路径参数化

**Files:**
- Modify: `packages/platform-config/src/coc/emit.ts`
- Modify: `packages/platform-config/src/coc/emit.test.ts`

**Interfaces:**
- Produces: `emitRegistry(args: { result; contractScope; i18n; contractTypes; contractTypesImport?: string })`;`contractTypesImport` 默认 `"../../catalog/contract-types.ts"`(向后兼容),写进 `contract-scope.generated.ts` 的 `import type { ContractType } from "<here>"`。

- [ ] **Step 1: 改 emit.test.ts,补自定义路径用例(失败)**

在现有 `emit.test.ts` 末尾(`describe("emitRegistry", ...)` 内)追加:

```ts
  it("uses a custom contractTypes import path when provided", () => {
    const files = emitRegistry({ result, contractScope, i18n: {}, contractTypes: ["ADMIN"], contractTypesImport: "../catalog/contract-types.ts" });
    expect(files["contract-scope.generated.ts"]).toContain('from "../catalog/contract-types.ts"');
    expect(files["contract-scope.generated.ts"]).not.toContain('"../../catalog/contract-types.ts"');
  });
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node_modules/.bin/vitest run packages/platform-config/src/coc/emit.test.ts`
Expected: FAIL（当前硬编码 `../../catalog/...`,自定义路径用例不通过)

- [ ] **Step 3: 改 emit.ts**

把 `emitRegistry` 入参类型加一行 `contractTypesImport?: string;`,解构时给默认值,并用它替换硬编码字符串:

```ts
export function emitRegistry(args: {
  result: RegistryResult;
  contractScope: Record<string, string[]>;
  i18n: Record<string, unknown>;
  contractTypes: readonly string[];
  contractTypesImport?: string;
}): Record<string, string> {
  const { result, contractScope, i18n } = args;
  const contractTypesImport = args.contractTypesImport ?? "../../catalog/contract-types.ts";
  const files: Record<string, string> = {};
```

并把 contract-scope 那段的 import 行改为模板拼接:

```ts
  files["contract-scope.generated.ts"] =
    HEADER +
    '\nimport type { PermissionCode } from "./registry-types.generated.ts";\n' +
    `import type { ContractType } from "${contractTypesImport}";\n\n` +
    "export const CONTRACT_SCOPE: Record<ContractType, PermissionCode[]> = " +
    JSON.stringify(contractScope, null, 2) +
    " as Record<ContractType, PermissionCode[]>;\n";
```

- [ ] **Step 4: 跑测试确认通过(新用例 + 原有用例都绿)**

Run: `node_modules/.bin/vitest run packages/platform-config/src/coc/emit.test.ts`
Expected: PASS（默认行为不变,新增自定义路径用例通过)

- [ ] **Step 5: 提交**

```bash
git add packages/platform-config/src/coc/emit.ts packages/platform-config/src/coc/emit.test.ts
git commit -m "feat(platform-config): emitRegistry 支持自定义 contractTypes import 路径"
```

---

## Task B1: manifest/catalog/contract-types.ts(权威合同闸门)

**Files:**
- Create: `apps/web/manifest/catalog/contract-types.ts`
- Test: `apps/web/manifest/catalog/contract-types.test.ts`

**Interfaces:**
- Produces: `CONTRACT_TYPES`、`type ContractType`、`CONTRACT_LABELS`、`CONTRACT_MENUS: Record<ContractType, MenuCode[]>`。
- Consumes: `MenuCode`(可擦除 `import type`,来自 B8 生成文件;运行/测试时擦除,tsc 在 gen:coc 后解析)。

- [ ] **Step 1: 写测试 `contract-types.test.ts`(失败)**

```ts
import { describe, expect, it } from "vitest";
import { CONTRACT_TYPES, CONTRACT_MENUS, CONTRACT_LABELS } from "./contract-types.ts";

describe("contract-types", () => {
  it("enumerates the four platform contracts", () => {
    expect([...CONTRACT_TYPES]).toEqual(["ADMIN", "US-ISO", "US-ISV", "MERCHANT"]);
  });
  it("gates roles behind ADMIN only; users under every contract", () => {
    expect(CONTRACT_MENUS.ADMIN).toEqual(["system.roles", "system.users"]);
    expect(CONTRACT_MENUS["US-ISO"]).toEqual(["system.users"]);
    expect(CONTRACT_MENUS["US-ISV"]).toEqual(["system.users"]);
    expect(CONTRACT_MENUS.MERCHANT).toEqual(["system.users"]);
  });
  it("has an i18n-key label per contract", () => {
    expect(CONTRACT_LABELS.ADMIN).toBe("contract.admin");
    expect(Object.keys(CONTRACT_LABELS)).toEqual([...CONTRACT_TYPES]);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node_modules/.bin/vitest run apps/web/manifest/catalog/contract-types.test.ts`
Expected: FAIL

- [ ] **Step 3: 写 `contract-types.ts`**

```ts
// 单一权威合同闸门:每个合同解锁哪些叶子菜单(menuCode)。元素类型 = 生成的 MenuCode
// → 写错/删过的菜单码在此即编译错误。MenuCode 为可擦除类型导入(bootstrap,见设计 §5):
// codegen 运行时按数据读 CONTRACT_MENUS(类型被擦除),生成文件就位后 tsc 收紧校验。
import type { MenuCode } from "../_generated/registry-types.generated.ts";

export const CONTRACT_TYPES = ["ADMIN", "US-ISO", "US-ISV", "MERCHANT"] as const;
export type ContractType = (typeof CONTRACT_TYPES)[number];

export const CONTRACT_LABELS: Record<ContractType, string> = {
  ADMIN: "contract.admin",
  "US-ISO": "contract.usIso",
  "US-ISV": "contract.usIsv",
  MERCHANT: "contract.merchant",
};

// 旧 _menu.map:roles=ADMIN、users=通配([])。通配删除 → users 在此显式枚举到全部合同。
export const CONTRACT_MENUS: Record<ContractType, MenuCode[]> = {
  ADMIN: ["system.roles", "system.users"],
  "US-ISO": ["system.users"],
  "US-ISV": ["system.users"],
  MERCHANT: ["system.users"],
};
```

- [ ] **Step 4: 跑测试确认通过**

Run: `node_modules/.bin/vitest run apps/web/manifest/catalog/contract-types.test.ts`
Expected: PASS（vitest 擦除 `import type`,无需生成文件)

- [ ] **Step 5: 提交**

```bash
git add apps/web/manifest/catalog/contract-types.ts apps/web/manifest/catalog/contract-types.test.ts
git commit -m "feat(web): CoC 权威合同闸门 manifest/catalog/contract-types"
```

---

## Task B2: manifest/catalog/roles.ts(死写全局角色)

**Files:**
- Create: `apps/web/manifest/catalog/roles.ts`
- Test: `apps/web/manifest/catalog/roles.test.ts`

**Interfaces:**
- Produces: `type GlobalRole`、`GLOBAL_ROLES: GlobalRole[]`。
- Consumes: `PermissionCode`(可擦除 `import type`)。

- [ ] **Step 1: 写测试 `roles.test.ts`(失败)**

```ts
import { describe, expect, it } from "vitest";
import { GLOBAL_ROLES } from "./roles.ts";

describe("catalog/roles", () => {
  it("declares preset admin (1) and operator (2)", () => {
    expect(GLOBAL_ROLES.map((r) => r.roleId)).toEqual([1, 2]);
  });
  it("preset admin lists every migrated 4-segment code (create, not add)", () => {
    const admin = GLOBAL_ROLES.find((r) => r.roleId === 1)!;
    expect(admin.permissionCodes).toContain("system.roles.role.create");
    expect(admin.permissionCodes).toContain("system.users.user.changeRole");
    expect(admin.permissionCodes).not.toContain("system.roles.role.add");
    expect(admin.permissionCodes).toHaveLength(12);
  });
  it("operator is view-only", () => {
    const op = GLOBAL_ROLES.find((r) => r.roleId === 2)!;
    expect(op.permissionCodes).toEqual(["system.roles.role.view", "system.users.user.view"]);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node_modules/.bin/vitest run apps/web/manifest/catalog/roles.test.ts`
Expected: FAIL

- [ ] **Step 3: 写 `roles.ts`**

```ts
// 死写 GLOBAL 角色(roleId ≤ 1000,不入库)。roleName/remark 为 i18n key。
// 角色列全量码;运行时按当前 party 合同 ∩ 出有效权限。PermissionCode 为可擦除类型导入(bootstrap)。
import type { PermissionCode } from "../_generated/registry-types.generated.ts";

export type GlobalRole = {
  roleId: number;
  roleName: string;
  remark: string;
  permissionCodes: PermissionCode[];
};

export const GLOBAL_ROLES: GlobalRole[] = [
  {
    roleId: 1,
    roleName: "role.adminPresetAdmin",
    remark: "role.adminPresetAdminDesc",
    permissionCodes: [
      "system.roles.role.view", "system.roles.role.create", "system.roles.role.update",
      "system.roles.role.delete", "system.roles.role.duplicate",
      "system.users.user.view", "system.users.user.create", "system.users.user.invite",
      "system.users.user.update", "system.users.user.lock", "system.users.user.resetPassword",
      "system.users.user.changeRole",
    ],
  },
  {
    roleId: 2,
    roleName: "role.adminOperator",
    remark: "role.adminOperatorDesc",
    permissionCodes: ["system.roles.role.view", "system.users.user.view"],
  },
];
```

- [ ] **Step 4: 跑测试确认通过**

Run: `node_modules/.bin/vitest run apps/web/manifest/catalog/roles.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add apps/web/manifest/catalog/roles.ts apps/web/manifest/catalog/roles.test.ts
git commit -m "feat(web): CoC 死写全局角色 manifest/catalog/roles"
```

---

## Task B3: manifest/menu-tree.ts(目录骨架)

**Files:**
- Create: `apps/web/manifest/menu-tree.ts`
- Test: `apps/web/manifest/menu-tree.test.ts`

**Interfaces:**
- Produces: default export `MenuTreeNodeDecl[]`(`defineMenuTree` 冻结)。
- Consumes: `defineMenuTree`(2A)。

- [ ] **Step 1: 写测试 `menu-tree.test.ts`(失败)**

```ts
import { describe, expect, it } from "vitest";
import menuTree from "./menu-tree.ts";

describe("menu-tree", () => {
  it("declares the system directory root (frozen, no parent)", () => {
    expect(Object.isFrozen(menuTree)).toBe(true);
    expect(menuTree).toHaveLength(1);
    expect(menuTree[0]!.menuCode).toBe("system");
    expect(menuTree[0]!.parentMenuCode).toBeNull();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node_modules/.bin/vitest run apps/web/manifest/menu-tree.test.ts`
Expected: FAIL

- [ ] **Step 3: 写 `menu-tree.ts`**

```ts
import { defineMenuTree } from "@cloud/platform-config";

// 侧边栏目录骨架。目录节点无 path / permissions / contractTypes。
// home/dashboard 是 B 类(登录即看,layout 直链),不进 CoC 骨架。
export default defineMenuTree([
  { menuCode: "system", title: "menu.system", parentMenuCode: null, icon: "settings", order: 100 },
]);
```

- [ ] **Step 4: 跑测试确认通过**

Run: `node_modules/.bin/vitest run apps/web/manifest/menu-tree.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add apps/web/manifest/menu-tree.ts apps/web/manifest/menu-tree.test.ts
git commit -m "feat(web): CoC 目录骨架 manifest/menu-tree"
```

---

## Task B4: modules/system/roles(模块 manifest + i18n)

**Files:**
- Create: `apps/web/modules/system/roles/manifest.ts`
- Create: `apps/web/modules/system/roles/i18n/{en,zh-CN,ja}.ts`
- Test: `apps/web/modules/system/roles/manifest.test.ts`

**Interfaces:**
- Produces: default export `ModuleManifest`(`menuCode: "system.roles"`,5 条 `system.roles.role.*`)。

- [ ] **Step 1: 写测试 `manifest.test.ts`(失败)**

```ts
import { describe, expect, it } from "vitest";
import rolesManifest from "./manifest.ts";

describe("system/roles manifest", () => {
  it("declares menuCode system.roles with the real route", () => {
    expect(rolesManifest.menuCode).toBe("system.roles");
    expect(rolesManifest.parentMenuCode).toBe("system");
    expect(rolesManifest.entry.url).toBe("/system/roles");
  });
  it("declares 5 four-segment permissions (create, not add), all under system.roles", () => {
    expect(rolesManifest.permissions.map((p) => p.code)).toEqual([
      "system.roles.role.view", "system.roles.role.create", "system.roles.role.update",
      "system.roles.role.delete", "system.roles.role.duplicate",
    ]);
    for (const p of rolesManifest.permissions) expect(p.belongToMenuCode).toBe("system.roles");
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node_modules/.bin/vitest run apps/web/modules/system/roles/manifest.test.ts`
Expected: FAIL

- [ ] **Step 3: 写 `manifest.ts`**

```ts
import { defineModule } from "@cloud/platform-config";

// roles 模块唯一真源。entry.url 保留真实路由;权限码 fn=role,动词 add→create。无 require/contractTypes。
export default defineModule({
  moduleCategory: "system",
  moduleName: "roles",
  menuCode: "system.roles",
  title: "menu.roles",
  parentMenuCode: "system",
  icon: "shield",
  order: 101,
  entry: { url: "/system/roles" },
  permissions: [
    { code: "system.roles.role.view",      belongToMenuCode: "system.roles", label: "permission.rolesView",      desc: "permission.rolesViewDesc" },
    { code: "system.roles.role.create",    belongToMenuCode: "system.roles", label: "permission.rolesCreate",    desc: "permission.rolesCreateDesc" },
    { code: "system.roles.role.update",    belongToMenuCode: "system.roles", label: "permission.rolesUpdate",    desc: "permission.rolesUpdateDesc" },
    { code: "system.roles.role.delete",    belongToMenuCode: "system.roles", label: "permission.rolesDelete",    desc: "permission.rolesDeleteDesc" },
    { code: "system.roles.role.duplicate", belongToMenuCode: "system.roles", label: "permission.rolesDuplicate", desc: "permission.rolesDuplicateDesc" },
  ],
});
```

- [ ] **Step 4: 写 i18n 三份(`rolesAdd`→`rolesCreate`,值搬自旧)**

```ts
// apps/web/modules/system/roles/i18n/en.ts
export default {
  menu: { roles: "Roles" },
  permission: {
    rolesView: "View Roles", rolesViewDesc: "View role list and details",
    rolesCreate: "Create Role", rolesCreateDesc: "Create new role",
    rolesUpdate: "Edit Role", rolesUpdateDesc: "Edit role name, description, permissions",
    rolesDelete: "Delete Role", rolesDeleteDesc: "Delete non-builtin role",
    rolesDuplicate: "Duplicate Role", rolesDuplicateDesc: "Copy an existing role",
  },
};
```

```ts
// apps/web/modules/system/roles/i18n/zh-CN.ts
export default {
  menu: { roles: "角色" },
  permission: {
    rolesView: "查看角色", rolesViewDesc: "查看角色列表与详情",
    rolesCreate: "新建角色", rolesCreateDesc: "创建新角色",
    rolesUpdate: "编辑角色", rolesUpdateDesc: "编辑角色名称、描述、权限",
    rolesDelete: "删除角色", rolesDeleteDesc: "删除非内置角色",
    rolesDuplicate: "复制角色", rolesDuplicateDesc: "复制已有角色",
  },
};
```

```ts
// apps/web/modules/system/roles/i18n/ja.ts
export default {
  menu: { roles: "ロール" },
  permission: {
    rolesView: "ロール閲覧", rolesViewDesc: "ロール一覧と詳細を閲覧",
    rolesCreate: "ロール作成", rolesCreateDesc: "新規ロールを作成",
    rolesUpdate: "ロール編集", rolesUpdateDesc: "ロール名・説明・権限を編集",
    rolesDelete: "ロール削除", rolesDeleteDesc: "非組み込みロールを削除",
    rolesDuplicate: "ロール複製", rolesDuplicateDesc: "既存ロールを複製",
  },
};
```

- [ ] **Step 5: 跑测试确认通过**

Run: `node_modules/.bin/vitest run apps/web/modules/system/roles/manifest.test.ts`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add apps/web/modules/system/roles/manifest.ts apps/web/modules/system/roles/manifest.test.ts apps/web/modules/system/roles/i18n
git commit -m "feat(web): roles 模块 manifest + i18n 下沉(create)"
```

---

## Task B5: modules/system/users(模块 manifest + i18n)

**Files:**
- Create: `apps/web/modules/system/users/manifest.ts`
- Create: `apps/web/modules/system/users/i18n/{en,zh-CN,ja}.ts`
- Test: `apps/web/modules/system/users/manifest.test.ts`

**Interfaces:**
- Produces: default export `ModuleManifest`(`menuCode: "system.users"`,7 条 `system.users.user.*`)。

- [ ] **Step 1: 写测试 `manifest.test.ts`(失败)**

```ts
import { describe, expect, it } from "vitest";
import usersManifest from "./manifest.ts";

describe("system/users manifest", () => {
  it("declares menuCode system.users with the real route", () => {
    expect(usersManifest.menuCode).toBe("system.users");
    expect(usersManifest.parentMenuCode).toBe("system");
    expect(usersManifest.entry.url).toBe("/system/users");
  });
  it("declares 7 four-segment permissions (create, not add), all under system.users", () => {
    expect(usersManifest.permissions.map((p) => p.code)).toEqual([
      "system.users.user.view", "system.users.user.create", "system.users.user.invite",
      "system.users.user.update", "system.users.user.lock", "system.users.user.resetPassword",
      "system.users.user.changeRole",
    ]);
    for (const p of usersManifest.permissions) expect(p.belongToMenuCode).toBe("system.users");
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node_modules/.bin/vitest run apps/web/modules/system/users/manifest.test.ts`
Expected: FAIL

- [ ] **Step 3: 写 `manifest.ts`**

```ts
import { defineModule } from "@cloud/platform-config";

// users 模块唯一真源。旧 users 通配([]) → 合同归属移 catalog 显式枚举全部合同。动词 add→create。
export default defineModule({
  moduleCategory: "system",
  moduleName: "users",
  menuCode: "system.users",
  title: "menu.users",
  parentMenuCode: "system",
  icon: "users",
  order: 102,
  entry: { url: "/system/users" },
  permissions: [
    { code: "system.users.user.view",          belongToMenuCode: "system.users", label: "permission.usersView",          desc: "permission.usersViewDesc" },
    { code: "system.users.user.create",        belongToMenuCode: "system.users", label: "permission.usersCreate",        desc: "permission.usersCreateDesc" },
    { code: "system.users.user.invite",        belongToMenuCode: "system.users", label: "permission.usersInvite",        desc: "permission.usersInviteDesc" },
    { code: "system.users.user.update",        belongToMenuCode: "system.users", label: "permission.usersUpdate",        desc: "permission.usersUpdateDesc" },
    { code: "system.users.user.lock",          belongToMenuCode: "system.users", label: "permission.usersLock",          desc: "permission.usersLockDesc" },
    { code: "system.users.user.resetPassword", belongToMenuCode: "system.users", label: "permission.usersResetPassword", desc: "permission.usersResetPasswordDesc" },
    { code: "system.users.user.changeRole",    belongToMenuCode: "system.users", label: "permission.usersChangeRole",    desc: "permission.usersChangeRoleDesc" },
  ],
});
```

- [ ] **Step 4: 写 i18n 三份(`usersAdd`→`usersCreate`,值搬自旧)**

```ts
// apps/web/modules/system/users/i18n/en.ts
export default {
  menu: { users: "Users" },
  permission: {
    usersView: "View Users", usersViewDesc: "View user list and details",
    usersCreate: "Create User", usersCreateDesc: "Create user (direct mode)",
    usersInvite: "Invite User", usersInviteDesc: "Invite user (email mode)",
    usersUpdate: "Edit User", usersUpdateDesc: "Edit user display name, email, remark",
    usersLock: "Lock User", usersLockDesc: "Lock / unlock user account",
    usersResetPassword: "Reset Password", usersResetPasswordDesc: "Force-reset user password",
    usersChangeRole: "Change Role", usersChangeRoleDesc: "Change user's assigned role",
  },
};
```

```ts
// apps/web/modules/system/users/i18n/zh-CN.ts
export default {
  menu: { users: "用户" },
  permission: {
    usersView: "查看用户", usersViewDesc: "查看用户列表与详情",
    usersCreate: "新建用户", usersCreateDesc: "直接创建用户",
    usersInvite: "邀请用户", usersInviteDesc: "通过邮件邀请用户",
    usersUpdate: "编辑用户", usersUpdateDesc: "编辑用户显示名、邮箱、备注",
    usersLock: "锁定用户", usersLockDesc: "锁定 / 解锁用户账号",
    usersResetPassword: "重置密码", usersResetPasswordDesc: "强制重置用户密码",
    usersChangeRole: "变更角色", usersChangeRoleDesc: "变更用户绑定的角色",
  },
};
```

```ts
// apps/web/modules/system/users/i18n/ja.ts
export default {
  menu: { users: "ユーザー" },
  permission: {
    usersView: "ユーザー閲覧", usersViewDesc: "ユーザー一覧と詳細を閲覧",
    usersCreate: "ユーザー作成", usersCreateDesc: "ユーザーを直接作成",
    usersInvite: "ユーザー招待", usersInviteDesc: "メールでユーザーを招待",
    usersUpdate: "ユーザー編集", usersUpdateDesc: "表示名・メール・備考を編集",
    usersLock: "ユーザーロック", usersLockDesc: "ユーザーアカウントをロック / 解除",
    usersResetPassword: "パスワードリセット", usersResetPasswordDesc: "ユーザーのパスワードを強制リセット",
    usersChangeRole: "ロール変更", usersChangeRoleDesc: "ユーザーのロールを変更",
  },
};
```

- [ ] **Step 5: 跑测试确认通过**

Run: `node_modules/.bin/vitest run apps/web/modules/system/users/manifest.test.ts`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add apps/web/modules/system/users/manifest.ts apps/web/modules/system/users/manifest.test.ts apps/web/modules/system/users/i18n
git commit -m "feat(web): users 模块 manifest + i18n 下沉(create)"
```

---

## Task B6: manifest/catalog/i18n(目录/角色/合同文案)

**Files:**
- Create: `apps/web/manifest/catalog/i18n/{en,zh-CN,ja}.ts`
- Test: `apps/web/manifest/catalog/i18n/i18n.test.ts`

**Interfaces:**
- Produces: 每份 default export 含 `menu.system`、`role.*`、`contract.*`。

- [ ] **Step 1: 写测试 `i18n/i18n.test.ts`(失败)**

```ts
import { describe, expect, it } from "vitest";
import en from "./en.ts";
import zhCN from "./zh-CN.ts";
import ja from "./ja.ts";

describe("catalog i18n", () => {
  it("each locale carries directory + role + contract keys", () => {
    for (const m of [en, zhCN, ja]) {
      expect(m.menu.system).toBeTruthy();
      expect(m.role.adminPresetAdmin).toBeTruthy();
      expect(m.contract.admin).toBeTruthy();
      expect(m.contract.merchant).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node_modules/.bin/vitest run apps/web/manifest/catalog/i18n/i18n.test.ts`
Expected: FAIL

- [ ] **Step 3: 写三份 i18n(`menu.system`/`role.*` 搬自旧;`contract.*` 新增)**

```ts
// apps/web/manifest/catalog/i18n/en.ts
export default {
  menu: { system: "System" },
  role: {
    adminPresetAdmin: "Administrator", adminPresetAdminDesc: "Built-in administrator role",
    adminOperator: "Operator", adminOperatorDesc: "Read-only operator role",
  },
  contract: { admin: "Admin", usIso: "US ISO", usIsv: "US ISV", merchant: "Merchant" },
};
```

```ts
// apps/web/manifest/catalog/i18n/zh-CN.ts
export default {
  menu: { system: "系统" },
  role: {
    adminPresetAdmin: "管理员", adminPresetAdminDesc: "内置管理员角色",
    adminOperator: "操作员", adminOperatorDesc: "只读操作员角色",
  },
  contract: { admin: "管理", usIso: "US ISO", usIsv: "US ISV", merchant: "商户" },
};
```

```ts
// apps/web/manifest/catalog/i18n/ja.ts
export default {
  menu: { system: "システム" },
  role: {
    adminPresetAdmin: "管理者", adminPresetAdminDesc: "組み込み管理者ロール",
    adminOperator: "オペレーター", adminOperatorDesc: "読み取り専用オペレーターロール",
  },
  contract: { admin: "管理", usIso: "US ISO", usIsv: "US ISV", merchant: "マーチャント" },
};
```

- [ ] **Step 4: 跑测试确认通过**

Run: `node_modules/.bin/vitest run apps/web/manifest/catalog/i18n/i18n.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add apps/web/manifest/catalog/i18n
git commit -m "feat(web): CoC 目录/角色/合同文案 manifest/catalog/i18n"
```

---

## Task B7: manifest/collect.ts + 聚合校验

**Files:**
- Create: `apps/web/manifest/collect.ts`
- Test: `apps/web/manifest/coc-collect.test.ts`

**Interfaces:**
- Consumes: B1–B5 的 modules / menuTree / catalog;`buildRegistry`/`validateCatalog`/`deriveContractScope`(2A)。
- Produces: `export const collected = { modules, menuTree, contractTypes, contractMenus, globalRoles }`。codegen(B8)消费。

- [ ] **Step 1: 写 `collect.ts`(相对 import)**

```ts
import menuTree from "./menu-tree.ts";
import { CONTRACT_TYPES, CONTRACT_MENUS } from "./catalog/contract-types.ts";
import { GLOBAL_ROLES } from "./catalog/roles.ts";

import systemRoles from "../modules/system/roles/manifest.ts";
import systemUsers from "../modules/system/users/manifest.ts";

// 采集入口(作者维护 import 串;provisional 自动扫描推迟到 Step 3)。codegen 读这一份。
export const collected = {
  modules: [systemRoles, systemUsers],
  menuTree,
  contractTypes: CONTRACT_TYPES,
  contractMenus: CONTRACT_MENUS, // 喂 guard:引用 menuCode 必须存在且是叶子
  globalRoles: GLOBAL_ROLES,     // 喂 guard:引用 code 必须存在且未 deprecated
};
```

- [ ] **Step 2: 写聚合校验 `coc-collect.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { buildRegistry, deriveContractScope, validateCatalog } from "@cloud/platform-config";
import { collected } from "./collect.ts";

const result = buildRegistry({ modules: collected.modules, menuTree: collected.menuTree });

describe("CoC author sources (collect)", () => {
  it("buildRegistry produces no error diagnostics", () => {
    expect(result.diagnostics.filter((d) => d.level === "error")).toEqual([]);
  });
  it("exposes the migrated permission + menu unions", () => {
    expect(result.permissionCodeUnion).toContain("system.roles.role.create");
    expect(result.permissionCodeUnion).toContain("system.users.user.changeRole");
    expect(result.menuCodeUnion).toEqual(["system", "system.roles", "system.users"]);
  });
  it("validateCatalog passes for declared roles + contracts (no errors)", () => {
    const roleCodes = [...new Set(collected.globalRoles.flatMap((r) => r.permissionCodes))];
    const contractMenus = [...new Set(Object.values(collected.contractMenus).flat())];
    const diags = validateCatalog({ result, roleCodes, contractMenus });
    expect(diags.filter((d) => d.level === "error")).toEqual([]);
  });
  it("deriveContractScope gates roles behind ADMIN only", () => {
    const scope = deriveContractScope(collected.contractMenus, result);
    expect(scope.ADMIN).toContain("system.roles.role.view");
    expect(scope.ADMIN).toContain("system.users.user.view");
    expect(scope["US-ISO"]).not.toContain("system.roles.role.view");
    expect(scope["US-ISO"]).toContain("system.users.user.view");
  });
});
```

- [ ] **Step 3: 跑测试确认通过**

Run: `node_modules/.bin/vitest run apps/web/manifest/coc-collect.test.ts`
Expected: PASS（无 error 诊断;两叶子均被合同引用 → 无 dead-menu warning 阻断)

> 此处无「先红」:`collect.ts` 是纯汇总,B1–B5 已绿,聚合自然通过。

- [ ] **Step 4: 提交**

```bash
git add apps/web/manifest/collect.ts apps/web/manifest/coc-collect.test.ts
git commit -m "feat(web): CoC 采集入口 collect + 聚合校验全绿"
```

---

## Task B8: 新 codegen 脚本(只产 .generated.ts)+ 钩子接线 + 全绿门

**Files:**
- Create: `scripts/generate-coc-registry.mjs`
- Modify: `package.json`(加 `gen:coc`;`predev`/`predev:web`/`prebuild`/`prebuild:web`/`pretest` 串入 `&& pnpm gen:coc`)
- Generated（gitignored,不提交）: `apps/web/manifest/_generated/{registry-types,permission-registry,menu-registry,contract-scope}.generated.ts`

**Interfaces:**
- Consumes: `apps/web/manifest/collect.ts`;2A 原语。
- Produces: 4 个 `.generated.ts`。本相位无人 import(catalog 的可擦除 `import type` 除外);**不产 i18n**(旧 `_generated/i18n/` 仍由 `gen:manifest` 独占)。

- [ ] **Step 1: 写 `scripts/generate-coc-registry.mjs`**

```js
// 新 CoC 生成脚本(与旧 generate-manifest-registry.mjs 并存)。读 apps/web/manifest/collect.ts →
// 调 @cloud/platform-config 2A 原语 buildRegistry/validateCatalog/deriveContractScope/emitRegistry,
// 仅产 4 个 .generated.ts 到 apps/web/manifest/_generated/(本相位不产 i18n,留 2C)。
// 有 error 诊断 → 拒写、退出码 1。产物 gitignored、由 pre 钩子重建、运行时无人消费(旧 apps.ts 仍驱动)。
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  buildRegistry, deriveContractScope, emitRegistry, validateCatalog,
} from "@cloud/platform-config";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const webDir = join(root, "apps", "web");

// collect.ts 含可擦除 import type(指向尚未生成的 registry-types.generated.ts);
// Node 24 类型擦除后动态 import 不解析该类型,故首跑也能读。
const { collected } = await import(pathToFileURL(join(webDir, "manifest", "collect.ts")).href);
const { modules, menuTree, contractTypes, contractMenus, globalRoles } = collected;

// 1. 汇总 + 结构 guard
const result = buildRegistry({ modules, menuTree });

// 2. catalog 引用 guard
const roleCodes = [...new Set(globalRoles.flatMap((r) => r.permissionCodes))];
const contractMenuRefs = [...new Set(Object.values(contractMenus).flat())];
const catalogDiags = validateCatalog({ result, roleCodes, contractMenus: contractMenuRefs });

const diagnostics = [...result.diagnostics, ...catalogDiags];
for (const d of diagnostics) {
  const line = `[gen:coc] ${d.level} ${d.rule}: ${d.message}`;
  if (d.level === "error") console.error(line);
  else console.warn(line);
}
const errors = diagnostics.filter((d) => d.level === "error");
if (errors.length) {
  console.error(`[gen:coc] ${errors.length} error diagnostic(s); refusing to write generated files.`);
  process.exit(1);
}

// 3. 反推 contract scope
const contractScope = deriveContractScope(contractMenus, result);

// 4. emit:catalog 在 manifest/catalog/、产物在 manifest/_generated/ → 传 ../catalog/contract-types.ts。
//    本相位不产 i18n,跳过 i18n/* key。
const emitted = emitRegistry({
  result, contractScope, i18n: {}, contractTypes,
  contractTypesImport: "../catalog/contract-types.ts",
});
const outDir = join(webDir, "manifest", "_generated");
mkdirSync(outDir, { recursive: true });
let tsCount = 0;
for (const [name, content] of Object.entries(emitted)) {
  if (name.startsWith("i18n/")) continue; // i18n 留 2C 接管
  const dest = join(outDir, name);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, content, "utf8");
  tsCount += 1;
}

console.log(
  `[gen:coc] wrote ${tsCount} .generated.ts; ` +
    `${result.permissionCodeUnion.length} permission code(s), ${result.menuCodeUnion.length} menu code(s); ` +
    `${diagnostics.length - errors.length} warning(s).`,
);
```

- [ ] **Step 2: 跑脚本确认生成 + 无 error**

Run: `node scripts/generate-coc-registry.mjs`
Expected: 打印 `[gen:coc] wrote 4 .generated.ts; 12 permission code(s), 3 menu code(s); 0 warning(s).`,退出码 0;`apps/web/manifest/_generated/` 出现 `registry-types.generated.ts` / `permission-registry.generated.ts` / `menu-registry.generated.ts` / `contract-scope.generated.ts`(无新增 i18n)。

- [ ] **Step 3: 加 `gen:coc` 并接进 pre 钩子(`package.json`)**

在 `gen:manifest` 同级新增 `"gen:coc": "node scripts/generate-coc-registry.mjs"`;把 `predev`、`predev:web`、`prebuild`、`prebuild:web`、`pretest` 五个值从 `"pnpm gen:manifest"` 改为 `"pnpm gen:manifest && pnpm gen:coc"`。

- [ ] **Step 4: 全仓 typecheck 绿(生成文件就位 → catalog 类型导入收紧通过)**

Run: `node_modules/.bin/tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`
Expected: **32**(2A 后确认的历史 baseline,本相位 0 新增)。

补查无新错:`node_modules/.bin/tsc --noEmit -p tsconfig.json 2>&1 | grep -E "manifest/(catalog|menu-tree|collect|_generated)|modules/system/(roles|users)/(manifest|i18n)" | grep "error TS"` 应为空。

- [ ] **Step 5: 全量测试绿(pretest 钩子先跑两个 codegen)**

Run: `pnpm test`
Expected: 全绿。新增 7 个测试文件(B1/B2/B3/B4/B5/B6/B7)全 pass;旧 `manifest.test.ts`、`select.test.ts`、`session-*.test.ts` 仍绿(旧管线/旧 API 未触)。

- [ ] **Step 6: lint 绿**

Run: `node_modules/.bin/eslint apps/web/manifest scripts/generate-coc-registry.mjs apps/web/modules/system/roles/manifest.ts apps/web/modules/system/users/manifest.ts`
Expected: EXIT 0。

- [ ] **Step 7: 提交(只提交源码与脚本,生成物 gitignored)**

```bash
git add scripts/generate-coc-registry.mjs package.json
git commit -m "feat(web): 新 CoC codegen(只产 .generated.ts)+ gen:coc 接 pre 钩子"
```

---

## E2E Coverage

本相位**纯增量、无人消费**,不触 route / middleware / auth-boundary / 运行时投影 / i18n 加载。**跳过 E2E**;登录→选公司→侧边栏投影、`system.roles`/`system.users` 页面守卫的 e2e,在决定性切换相位 **2C** 锁回归。

## 2C 预告(本相位不做,登记冲突点)

2C = 决定性切换 + 删旧,逐条对应已决策清单:新 codegen 接管 `_generated/i18n/`(rewire `i18n/request.ts:18`,`coc` 命名空间)→ `manifest/index.ts` 内部改 `createCocConfig` 并**保留同名导出**(`getRoles`/`resolvePartyScope`/`resolveRolePermissions` 消费者几乎不动)→ `lib/session-menus.ts` / `select.ts` 改用 `buildMenuTree`(字段 `menuTitle`→`title`)+ 补新版 `selectPermissionGroups` → 15 处守卫改 4 段码(`roles.controller`/`users.controller`/`roles-page`/`users-page`)→ `home`/`dashboard` 转 B 类 layout 直链 → **删** `_menu.map.ts`/`_roles.map.ts`/`_generated/apps.ts`/`manifest/i18n/`/`generate-manifest-registry.mjs`/`gen:manifest` 及死掉的 platform-config 导出 → 全绿门 + e2e 冒烟。三个待定小叉:`index.ts` 保留导出名集合、`menu.dashboard/home` 文案归属、`selectPermissionGroups` 落点。

## Self-Review

- **Spec 覆盖**:设计稿 §9 步骤 2–6(拆模块源、menu-tree、catalog、文案下沉、新 codegen 落 `_generated/`)+ §3 声明规范 + §4 生成物形状(types/permission/menu/contract-scope;i18n 推迟到 2C)+ §5 流程(buildRegistry→validateCatalog→deriveContractScope→emit、有 error 不落盘)。§7 运行时投影、§2 dashboard 转 B、删旧 monolith → 2C。
- **Placeholder 扫描**:无 TODO/TBD;每个 code step 含完整代码与测试;三语 i18n 实义文案。
- **类型一致性**:`collected` 五字段在 collect.ts 产出、coc-collect.test 与 codegen 同形消费;权限码逐字一致(`system.{roles.role,users.user}.<action>`,`add` 已统一为 `create`);i18n key 与 manifest `label` 对齐(`rolesCreate`/`usersCreate`);`CONTRACT_MENUS` menuCode 与 manifest `menuCode` 对齐;codegen 调用签名匹配 2A,`contractTypesImport` 与 B0 新参数一致。
- **路径自洽**:catalog 在 `manifest/catalog/` → 生成类型 `../_generated/registry-types.generated.ts`;emit 产 `contract-scope.generated.ts` 经 B0 参数写成 `../catalog/contract-types.ts`,从 `_generated/` 上溯一级进 `catalog/` 成立。i18n 不产 → 与旧 `_generated/i18n/` 零冲突、无 throwaway。
- **缺口/留待**:全部「改消费点 / 删旧 / i18n 接管」集中在 2C,本相位严格增量、可独立全绿。
