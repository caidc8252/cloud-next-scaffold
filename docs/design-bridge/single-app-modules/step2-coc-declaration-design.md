# Step 2 · CoC 声明系统 —— 设计定稿

> 状态:设计定稿,待写实现计划(writing-plans)。分支:`feat/new-arch`。
> 上游契约:`docs/design-bridge/single-app-modules/design.md`(Step 0/1 已定稿,本文是其 Step 2 的落地规格)。
> 参考来源:`nextjs-framework-new-generation`(同团队另一仓库)的 `@cloud/registry` + per-module manifest 设计——**借其骨架,按本仓决定裁剪**。

## 0. 目标与一句话

把"菜单/权限/角色/合同"的**声明从单体 app 级文件下沉到每个模块**,由**确定性 codegen** 汇总、校验、生成全局注册表与类型;**运行时菜单不是写死的,而是由用户有效权限投影**而成。`menu / permission / role / user` 的字段语义基本不变,**变的是声明位置、格式与采集/过滤方式**。

**核心铁律(贯穿全文,任何方案不得破):**
> 凡是能进入 `session.permissions` 的权限码,**无一例外**都挂在某个被合同闸门 gate 的菜单上。没有通配、没有豁免、权限层没有超管旁路。"菜单和权限永不出现在边界 scope 之外"在**声明期**即成立。

## 1. 与现状/参考的关系(决定记录)

| 维度 | 现仓(Step 1 后) | 参考库 | **本设计(定稿)** |
|---|---|---|---|
| 声明位置 | 单体 `manifest/_menu.map.ts` | per-module `manifest.ts` | **per-module `manifest.ts`** |
| codegen 归属 | `scripts/generate-manifest-registry.mjs` + `@cloud/platform-config` | 独立 `@cloud/registry` | **并进 `@cloud/platform-config`,不另起包** |
| `platform` 维度 | 无(运行时已无) | 有(role band) | **彻底删除** |
| 合同→菜单 | 菜单自带 `contractTypes`(含 `[]` 通配) | 双源:模块元数据 + `catalog/contract-types.ts` 权威 | **单一权威源 `catalog/contract-types.ts`;模块不自报 contractTypes** |
| `common.*` 豁免 | 无此概念 | 有(免合同、可授予、ADMIN 自动全拿) | **删除:common 不声明任何权限,仅 `requireSession`** |
| 通配菜单 `contractTypes:[]` | 有 | 有(`ALL`) | **删除:所有合同显式枚举** |
| URL 含 category | `/system/roles` | `/cust/order`(含) | **不含:`/roles`(menuCode 仍含 category)** |
| `desc` 文案 | i18n key | 字面文本 | **i18n key(硬不变量)** |
| DB 落库 | 无 sys_menu/sys_permission | 有 seed | **零 DB,无 seed,启动期读内存** |
| 文案下沉 | app 级 | 未下沉 | **下沉进各模块 `i18n/`** |
| provisional 前向占位 | 无 | 有(全套 8 guard) | **推迟到 Step 3** |
| 跨模块 checkpoint / AI 编排 | 无 | 有(`.claude/scaffold`) | **推迟到 Step 3** |

## 2. 模块二分律(没有中间地带)

> **一个模块要么声明权限(→ 必然全部走合同闸门、被投影成菜单),要么不声明权限(→ 只 `requireSession`、永不投影、永不进 catalog)。**

- **A 类·权限化 UI 模块**:声明 `menuCode` + `permissions`。受合同硬闸门,投影成左侧菜单。
- **B 类·会话级模块**:不声明权限。
  - `common.*` 纯逻辑/公共能力(无 UI):**无 manifest、无权限码**,被业务模块内部调用,自身不判权限(触发它的业务动作早被 `assertPermissions` 把关)。
  - 登录即看的 UI(如 `dashboard`、个人资料):有页面,但**无 menuCode、无权限码**;页面与其 API 只 `requireSession`;侧边栏里是 layout 写死的**固定直链**,不走 CoC 投影。

`common` 不能藏后门是**结构性**保证的——它压根没有声明权限的能力。

## 3. 声明规范(手写,author-owned)

### 3.1 A 类模块 manifest:`modules/<cat>/<mod>/manifest.ts`

```ts
import { defineModule } from "@cloud/platform-config";

export default defineModule({
  moduleCategory: "system",
  moduleName: "roles",
  menuCode: "system.roles",            // = <cat>.<mod>
  entry: { url: "/roles" },            // URL 无 category 段
  permissions: [
    { code: "system.roles.role.view",   belongToMenuCode: "system.roles", label: "permission.rolesView",   desc: "permission.rolesViewDesc" },
    { code: "system.roles.role.create", belongToMenuCode: "system.roles", label: "permission.rolesCreate", desc: "permission.rolesCreateDesc" },
    { code: "system.roles.role.update", belongToMenuCode: "system.roles", label: "permission.rolesUpdate", desc: "permission.rolesUpdateDesc" },
    { code: "system.roles.role.delete", belongToMenuCode: "system.roles", label: "permission.rolesDelete", desc: "permission.rolesDeleteDesc" },
  ],
});
```

字段规则:
- `menuCode = <cat>.<mod>`,全局唯一。
- `code = <cat>.<mod>.<fn>.<action>`(4 段),全局唯一,**是系统契约不是文案**,不可随意改名。
- `belongToMenuCode`:**显式声明**(不派生),指向所属菜单;guard 强制 `belongToMenuCode == menuCode == code 前两段`,三者一致。
- `label / desc`:i18n key(相对 coc 命名空间),文案在模块 `i18n/` 里。
- `deprecated?: true`:废弃旧码用(见 §6 reconcile);**不要直接删码**。
- **不写** `contractTypes`(合同归属去 catalog)/ `platform`(已删)/ `require`(已删)。
- 一个菜单可挂多个权限;**菜单由权限反推**。

### 3.2 模块文案:`modules/<cat>/<mod>/i18n/{en,zh-CN,ja}.ts`(en 基底)

```ts
// modules/system/roles/i18n/en.ts
export default {
  menu: { roles: "Roles" },
  permission: {
    rolesView: "View Roles", rolesViewDesc: "View role list and details",
    rolesCreate: "Create Role", rolesCreateDesc: "Create a new role",
    rolesUpdate: "Edit Role", rolesUpdateDesc: "Edit role name, description, permissions",
    rolesDelete: "Delete Role", rolesDeleteDesc: "Delete a non-builtin role",
  },
};
```

### 3.3 目录骨架(非叶子节点唯一落点):`web/manifest/menu-tree.ts`

```ts
import { defineMenuTree } from "@cloud/platform-config";

// 整张侧边栏骨架一处看全。目录节点:无 contractTypes / 无 permissions / 无 path。
// 目录可见性派生:底下有可见叶子才显示。
export default defineMenuTree([
  { menuCode: "system", title: "menu.system", parentMenuCode: null, icon: "settings", order: 100 },
  // 需要 L2 分组就加 { menuCode: "system.access", parentMenuCode: "system", ... }
]);
```

### 3.4 合同闸门(★ 单一权威真源):`web/catalog/contract-types.ts`

```ts
import type { MenuCode } from "../manifest/_generated/registry-types.generated";

export const CONTRACT_TYPES = ["ADMIN", "US-ISO", "US-ISV", "MERCHANT"] as const;
export type ContractType = (typeof CONTRACT_TYPES)[number];

export const CONTRACT_LABELS: Record<ContractType, string> = {
  ADMIN: "contract.admin", "US-ISO": "contract.usIso",
  "US-ISV": "contract.usIsv", MERCHANT: "contract.merchant",
};

// 业务集中掌控的边界:每个合同解锁哪些叶子菜单。元素类型 = 生成的 MenuCode
// → 写错/删过的 menuCode 在这里就是编译错误。模块不自报 contractTypes,这是唯一真源。
export const CONTRACT_MENUS: Record<ContractType, MenuCode[]> = {
  ADMIN:    ["system.roles", "system.users"],
  "US-ISO": ["system.users"],
  "US-ISV": ["system.users"],
  MERCHANT: ["system.users"],
};
```

### 3.5 死写角色:`web/catalog/roles.ts`

```ts
import type { PermissionCode } from "../manifest/_generated/registry-types.generated";

export type GlobalRole = { roleId: number; roleName: string; remark: string; permissionCodes: PermissionCode[] };

// GLOBAL 角色(roleId < 1001,不入库)。元素类型 = 生成 union → 打错码=编译错误。
// 角色列全量码;运行时按当前 party 合同 ∩ 出有效权限(角色不预过滤合同)。无 platform 字段。
export const GLOBAL_ROLES: GlobalRole[] = [
  {
    roleId: 1, roleName: "role.superAdmin", remark: "role.superAdminDesc",
    permissionCodes: [
      "system.roles.role.view", "system.roles.role.create", "system.roles.role.update", "system.roles.role.delete",
      "system.users.user.view", "system.users.user.create", "system.users.user.invite", "system.users.user.update",
    ],
  },
];
```

> PRIVATE 动态角色(roleId ≥ 1001)运行时入库创建,选项与校验走 `resolvePartyScope`(§7),不在此声明。

### 3.6 采集入口:`web/manifest/index.ts`

```ts
import menuTree from "./menu-tree";
import { CONTRACT_TYPES, CONTRACT_MENUS } from "../catalog/contract-types";
import { GLOBAL_ROLES } from "../catalog/roles";

import systemRoles from "../modules/system/roles/manifest";
import systemUsers from "../modules/system/users/manifest";
// codegen 步骤扫 modules/** 自动维护 import 串(provisional 推迟到 Step 3,无 stub 列表)

export const collected = {
  modules: [systemRoles, systemUsers],
  menuTree,
  contractTypes: CONTRACT_TYPES,
  contractMenus: CONTRACT_MENUS,   // 喂 guard:引用的 menuCode 必须存在
  globalRoles: GLOBAL_ROLES,       // 喂 guard:引用的 code 必须存在且未 deprecated
};
```

## 4. 生成物(`web/manifest/_generated/`,提交进仓库,**永不手改**)

### 4.1 `registry-types.generated.ts`
```ts
// AUTO-GENERATED — DO NOT EDIT. 排序确定;deprecated 码保留在 union 内。
export type PermissionCode =
  | "system.roles.role.create" | "system.roles.role.delete"
  | "system.roles.role.update" | "system.roles.role.view"
  | "system.users.user.create" | "system.users.user.invite"
  | "system.users.user.update" | "system.users.user.view";
export type MenuCode = "system" | "system.roles" | "system.users";
```

### 4.2 `permission-registry.generated.ts`
```ts
import type { PermissionCode, MenuCode } from "./registry-types.generated";
export interface GeneratedPermissionEntry {
  code: PermissionCode; belongToMenuCode: MenuCode; label: string; desc: string; deprecated: boolean;
}
export const PERMISSION_REGISTRY: Record<PermissionCode, GeneratedPermissionEntry> = {
  "system.roles.role.view": { code: "system.roles.role.view", belongToMenuCode: "system.roles", label: "permission.rolesView", desc: "permission.rolesViewDesc", deprecated: false },
  // …消失的旧码保留并标 deprecated:true
};
// code → 所属菜单(读声明字段,非派生)。
export function codeToMenu(code: string): MenuCode | null {
  return PERMISSION_REGISTRY[code as PermissionCode]?.belongToMenuCode ?? null;
}
```

### 4.3 `menu-registry.generated.ts`(叶子 + 目录拍平;**无 contractTypes**)
```ts
import type { MenuCode } from "./registry-types.generated";
export interface GeneratedMenuEntry {
  menuCode: MenuCode; title: string; parentMenuCode: MenuCode | null;
  path: string | null; icon?: string; order: number;
}
export const MENU_REGISTRY: Record<MenuCode, GeneratedMenuEntry> = {
  "system":       { menuCode: "system",       title: "menu.system", parentMenuCode: null,     path: null,     icon: "settings", order: 100 },
  "system.roles": { menuCode: "system.roles", title: "menu.roles",  parentMenuCode: "system", path: "/roles", icon: "shield",   order: 101 },
  "system.users": { menuCode: "system.users", title: "menu.users",  parentMenuCode: "system", path: "/users", icon: "users",    order: 102 },
};
```

### 4.4 `contract-scope.generated.ts`(★ 审计 + 建角色选项池;catalog × registry 反推)
```ts
// 每个合同最终能授予哪些权限码(= 合同菜单 → 其全部权限,展开)。
// "某合同能授予什么 / 有没有权限逃出 scope" 看这一个文件;PR diff 即可逐行 review。
import type { PermissionCode } from "./registry-types.generated";
import type { ContractType } from "../../catalog/contract-types";
export const CONTRACT_SCOPE: Record<ContractType, PermissionCode[]> = {
  ADMIN: ["system.roles.role.view","system.roles.role.create","system.roles.role.update","system.roles.role.delete","system.users.user.view","system.users.user.create","system.users.user.invite","system.users.user.update"],
  "US-ISO": ["system.users.user.view","system.users.user.create","system.users.user.invite","system.users.user.update"],
  "US-ISV": ["system.users.user.view","system.users.user.create","system.users.user.invite","system.users.user.update"],
  MERCHANT: ["system.users.user.view","system.users.user.create","system.users.user.invite","system.users.user.update"],
};
```

### 4.5 `_generated/i18n/{en,zh-CN,ja}.json`(各模块 i18n + catalog label 并集)
```json
{
  "menu": { "system": "System", "roles": "Roles", "users": "Users", "dashboard": "Dashboard" },
  "permission": { "rolesView": "View Roles", "rolesViewDesc": "View role list and details" },
  "role": { "superAdmin": "Super Admin", "superAdminDesc": "Full access" },
  "contract": { "admin": "Admin", "usIso": "US ISO", "usIsv": "US ISV", "merchant": "Merchant" }
}
```

> **无 `seed.generated.ts`** —— 零 DB。

## 5. 采集 / 生成流程(并进 `@cloud/platform-config`)

```text
web/manifest/index.ts(collected)
  → buildRegistry(modules, menuTree, previous?)      // 纯逻辑,reconcile(§6)
  → validateCatalog({ registry, contractMenus, globalRoles })  // guards(§6)
  → deriveContractScope(CONTRACT_MENUS, registry)    // 反推 contract-scope
  → emit(_generated/*.generated.ts + i18n/*.json)    // 有 error 不落盘
```

- **纯逻辑在包内**(`@cloud/platform-config`):`buildRegistry / validateCatalog / deriveContractScope / emit / createPlatformConfig`,**只吃传入数据,绝不 import `apps/`**(guard 6 / eslint region 守门)。
- **app 侧负责采集**:`web/manifest/index.ts` 收集 + 一个脚本(`pnpm gen:manifest`,接入 predev/prebuild/pretest)调包逻辑、把产物写进 `web/manifest/_generated/`。
- **bootstrap**:catalog/index 里 `import type { MenuCode/PermissionCode }` 是**可擦除类型导入**(Node 类型擦除),codegen 运行时不依赖生成文件即可读取 `CONTRACT_MENUS` / 角色码作为数据;tsc 时生成文件已就位。
- **两阶段**:先由 modules+menuTree 出 registry/types/menu-registry → 再读 catalog 校验 + 反推 contract-scope。
- **有 error 不落盘**:任一 error 级诊断 → 不写 `*.generated.ts`,避免半截产物掩盖失败,脚本退出码 1。

## 6. 守门规则(纯快照,Step 2 子集)

**只投影当前快照:** `buildRegistry` 只吃当前声明,**无 `previous`、无 reconcile、无 `deprecated` 墓碑、无 `provisional`**。源里删掉一个码 → registry 里它就没了。「删码会不会孤立 DB 里动态 PRIVATE 角色已引用的 `permissionCode`」属于 **Step 3 工作流(编排/checkpoint)** 的职责,不在声明原语里兜底(避免为兜底而兜底;且生成物不入库、无持久 `previous` 可读,reconcile 本就跑不通)。

**Guards(error 级,除非注明):**
1. 重复 real `permission_code` → 失败。
2. `belongToMenuCode` 必须非空、存在于 menu-registry、且 `== 本模块 menuCode`(== code 前两段)。
3. A 类模块(有 permissions)必须声明 `menuCode`;B 类不得声明权限码。
4. `catalog/roles.ts` 引用的码必须**存在**(`catalog-ref-missing`)。
5. `catalog/contract-types.ts` 引用的 menuCode 必须存在,且**只能是叶子菜单**(不得引用目录节点)。
6. `menu-tree` 里每个 `parentMenuCode` 必须存在;无环。
7. `packages/*` 不得 import `apps/*`(eslint flat-config region)。
8. **warn**:模块声明了 menuCode 却无任何合同引用它 → 死菜单警告(fail-closed,非阻断)。

> reconcile / `deprecated` / `provisional` / stub-vs-real diff 等「跨代记忆」机制全部**推迟到 Step 3 工作流**,不进 Step 2 原语。

## 7. 运行时投影(`createCocConfig` 消费,链路语义不变)

> 已落地(2C):`manifest/index.ts` 用 `createCocConfig` 暴露 `resolvePartyScope/resolveRolePermissions/buildMenuTree`;ADMIN 结构旁路在 `lib/session-snapshot.ts` 的 `buildCurrentContext`(C6)实现,非仅靠预置全权角色等价。

```ts
// manifest/index.ts
const config = createCocConfig({ menuRegistry: MENU_REGISTRY, contractScope: CONTRACT_SCOPE, globalRoles: GLOBAL_ROLES, codeToMenu });
export const { resolveRolePermissions, resolvePartyScope, buildMenuTree } = config;
```

```text
permissionScope = ⋃_{c ∈ 当前party.合同} CONTRACT_SCOPE[c]

if authorizingType === "ADMIN":                          // ★ 特殊逻辑门(C6 已实现)
    effective = permissionScope                          // 直接全拿当前 party 合同内全部权限(仍受合同硬闸门框住)
else /* NORMAL */:
    roleGranted = ⋃ resolveRolePermissions(roleId)       // 角色并集
    effective   = roleGranted ∩ permissionScope          // 角色 ∩ 合同

visibleLeaves = { codeToMenu(p) | p ∈ effective }
menuTree      = visibleLeaves 挂回 MENU_REGISTRY 骨架、剪空目录
```

- **当前合同**:`sys_entity_contract` 按 `status=active ∧ now∈[effectiveFrom, expiresAt]` 算出当前 `contractTypes`(会话构建时)。
- **建角色**:`resolvePartyScope(party.contracts) = ⋃ CONTRACT_SCOPE[c]` —— 既是权限选择器**选项池**,又是后台**提交校验**(submitted ⊆ scope)。选项/校验/会话三处同源。
- **页面/接口真鉴权**仍靠 `assertPermissions<PermissionCode>()` / `requirePermissions()`;菜单只是 UX 投影。
- **关系链不变**:`SysEntity`(party)/`SysUser`/`SysEntityUser(authorizingType)`/`SysUserRole(entityId,userId,roleId)`/`SysEntityContract`。

## 8. 明确不在 Step 2(推迟,不记录细节)

- provisional / forward-declared stub / stub-vs-real diff → **Step 3**。
- 跨模块依赖 checkpoint(danglingRealRefs、自动物化 stub)→ **Step 3**。
- AI 编排脚手架(`/sync /start-work /coding /submit-work /unblock` + 状态机)→ **Step 3**。
- 平台超管**跨租户看数据** → 数据层/RLS,**不在 permission 层建模**,不在本设计范围。
- 每请求 re-hydrate → 保持现仓 Redis 快照模型,不改。

## 9. 迁移步序(全程保持可编译/可启动/可跑测试,逐模块搬一块验一块)

1. 扩 `@cloud/platform-config`:类型(删 `platform/contractTypes/require`,`belongToMenuCode` 显式)+ `buildRegistry/validateCatalog/deriveContractScope/emit` + `createPlatformConfig`(消费 `CONTRACT_SCOPE/codeToMenu/buildMenuTree/resolvePartyScope/resolveRolePermissions`)+ eslint region。
2. 拆现 `_menu.map.ts` → 各模块 `modules/**/manifest.ts`。
3. 建 `web/manifest/menu-tree.ts`(目录骨架)。
4. 建 `web/catalog/contract-types.ts`(权威 `CONTRACT_MENUS`)+ `web/catalog/roles.ts`(由 `_roles.map.ts` 迁来)。
5. 文案下沉各模块 `i18n/`。
6. 改 `gen:manifest` 脚本接新管线,产物落 `web/manifest/_generated/`。
7. 接 `web/manifest/runtime.ts`;`session-menus` 改用 `buildMenuTree`。
8. `dashboard`/个人资料等转 B 类(layout 直链 + `requireSession`)。
9. 全绿门:typecheck + lint + 单测 + e2e 冒烟。登录链路与菜单投影是重点验收项。
