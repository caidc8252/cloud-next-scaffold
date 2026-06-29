# Step 2C · 运行时切换到 CoC + 删旧 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `apps/web` 运行时从「旧 `_generated/apps.ts` + `createPlatformConfig`」切到「2B 产出的 `_generated/*.generated.ts` + `createCocConfig`」,15 处守卫改 4 段码,dashboard 转 B 类直链,新 codegen 接管 i18n,最后删光旧管线与死掉的 platform-config 导出。对外行为不变,靠现有单测 + e2e 冒烟锁回归。

**Architecture:** `manifest/index.ts` 内部换 `createCocConfig`,**对外保留** `getRoles`/`resolvePartyScope`/`resolveRolePermissions` 同名导出(故 `session-snapshot.ts`/`roles.service.ts` 逻辑零改动,仅 `roles.mapper` 的入参类型 `RoleDef`→`GlobalRole`),新增 `buildMenuTree`,退役 `getMenus`/`getContractKeys`/`PLATFORM_CONTRACTS`。菜单可见性 = `buildMenuTree(session.permissions)`(快照已算好 `有效码 ∩ scope`)。

**Tech Stack:** TypeScript strict、`@cloud/platform-config`(`createCocConfig` 等 2A 原语)、`@cloud/i18n`(next-intl,`coc` 命名空间)、vitest、playwright(e2e 冒烟)。

## Global Constraints

- **行为不变**:这是搬运 + 改数据源,不改鉴权语义。ADMIN 仍靠预置管理员角色(roleId 1,列全部码)拿全量,**不引入** design §7 的 ADMIN-scope 旁路(那是行为变更)。
- **权限码 4 段**(`add`→`create`);守卫只改字符串,不改逻辑。
- **i18n**:`coc` 命名空间路径 `_generated/i18n/{locale}.json` 不变(`i18n/request.ts:18` 不动);只是产出方从 `gen:manifest` 换成 `gen:coc`。`menu.home`/`menu.dashboard`(B 类)移到 app `messages` 的 `nav` 命名空间。
- **生成物 gitignored、不提交**;`gen:coc` 已在 pre 钩子(2B)。
- **contract-group 必须保留**:`contractTypeGroup`/`roleIdInGroupRange`/`PRESET_ROLE_ID_MAX`/`DB_ROLE_ID_MIN`/`resolvePortalGroup`/`isPresetAdminRole` 被 `session-snapshot`/`roles.service`/`auth.service`/`select-partner` 依赖。**只删** `createPlatformConfig`/`defineAppManifest`/`defineAppRoles`/`validateMenus`/`validateRoles` 及随之失依赖的类型。
- **`require` 字段消失**:新模型权限无 `require`(链式联动),角色编辑器权限目录 item 变 `{code,label,desc}`。这是**已知的 UI 行为退化**(设计 §3 删 require),非 bug。
- **每个任务结束可编译可跑测试**;顺序:C1 切 API → C2 改码 → C3 dashboard → C4 i18n 接管 → C5 删旧。
- 命名 kebab/camel/Pascal/UPPER_SNAKE 一致。

## 现状消费面(2B 扫描确认)

- `@/manifest` 运行时 API:`session-snapshot.ts`(getRoles/resolvePartyScope/resolveRolePermissions)、`session-menus.ts`(getMenus)、`roles.service.ts`(getRoles/resolvePartyScope)、`roles-page.tsx`(getMenus)、`manifest.test.ts`(getMenus/getContractKeys/PLATFORM_CONTRACTS,旧测试→删)。
- `@/manifest/select`:`session-menus.ts`(selectVisibleMenuTree)、`roles-page.tsx`(selectPermissionGroups)、`select.test.ts`(旧测试→删)。
- 守卫 15 处(见 C2)。
- 侧边栏渲染:`app/(dashboard)/layout.tsx`(`tc=getTranslations("coc")`,`tc(m.menuTitle)`;`buildSidebarSections`)。
- i18n 加载:`i18n/request.ts:18`(coc 命名空间)。

---

## Task C1: 切 `@/manifest` 运行时到 createCocConfig

**Files:**
- Rewrite: `apps/web/manifest/index.ts`
- Modify: `apps/web/lib/session-menus.ts`
- Rewrite: `apps/web/manifest/select.ts`
- Modify: `apps/web/modules/system/roles/server/roles.mapper.ts`
- Modify: `apps/web/modules/system/roles/ui/roles-page.tsx`
- Modify: `apps/web/lib/permission-catalog.ts`(`PermissionGroup` item 去掉 `require`)
- Delete: `apps/web/manifest/manifest.test.ts`、`apps/web/manifest/select.test.ts`(测旧 API,随旧管线退场;聚合校验已由 `coc-collect.test.ts` 覆盖)
- Test: `apps/web/manifest/runtime.test.ts`(新)

**Interfaces:**
- `index.ts` Produces:`resolvePartyScope(contracts): Set<string>`、`resolveRolePermissions(roleId): string[] | undefined`、`getRoles(): GlobalRole[]`、`buildMenuTree(grantedCodes): MenuTreeNode[]`。**退役** `getMenus`/`getContractKeys`/`PLATFORM_CONTRACTS`。
- Consumes:`_generated/{menu-registry,permission-registry,contract-scope}.generated.ts`、`catalog/roles.ts`、`createCocConfig`(2A)。

- [ ] **Step 1: 重写 `manifest/index.ts`**

```ts
import { createCocConfig } from "@cloud/platform-config";
import { MENU_REGISTRY } from "./_generated/menu-registry.generated.ts";
import { codeToMenu } from "./_generated/permission-registry.generated.ts";
import { CONTRACT_SCOPE } from "./_generated/contract-scope.generated.ts";
import { GLOBAL_ROLES } from "./catalog/roles.ts";

// 运行时消费 CoC 生成产物(纯快照投影)。会话有效权限由 session-snapshot 按
// 角色码 ∩ resolvePartyScope(合同) 算好;菜单由 buildMenuTree(有效码) 投影。
const config = createCocConfig({
  menuRegistry: MENU_REGISTRY,
  contractScope: CONTRACT_SCOPE,
  globalRoles: GLOBAL_ROLES,
  codeToMenu,
});

export const resolvePartyScope = config.resolvePartyScope;
export const resolveRolePermissions = config.resolveRolePermissions;
export const buildMenuTree = config.buildMenuTree;
// 死写 GLOBAL 角色目录(roleId 过滤 + 角色列表展示同口径共用)。
export const getRoles = (): typeof GLOBAL_ROLES => GLOBAL_ROLES;
```

- [ ] **Step 2: 重写 `manifest/select.ts`**(`selectVisibleMenuTree` 退役 → `buildMenuTree`;`selectPermissionGroups` 改读注册表 + party scope)

```ts
// 权限目录(角色编辑器用):按菜单分组、按 party scope 过滤。读 CoC 生成注册表。
// 注:新模型无 require 字段(链式联动取消,见设计 §3)。
import { PERMISSION_REGISTRY } from "./_generated/permission-registry.generated.ts";
import { MENU_REGISTRY } from "./_generated/menu-registry.generated.ts";
import { resolvePartyScope } from "./index.ts";

export type PermissionGroupItem = { code: string; label: string; desc: string };
export type PermissionGroup = { menuCode: string; menuTitle: string; items: PermissionGroupItem[] };

export function selectPermissionGroups(contractTypes: string[]): PermissionGroup[] {
  const scope = resolvePartyScope(contractTypes);
  const byMenu = new Map<string, PermissionGroup>();
  for (const e of Object.values(PERMISSION_REGISTRY)) {
    if (!scope.has(e.code)) continue;
    let g = byMenu.get(e.belongToMenuCode);
    if (!g) {
      g = { menuCode: e.belongToMenuCode, menuTitle: MENU_REGISTRY[e.belongToMenuCode]?.title ?? e.belongToMenuCode, items: [] };
      byMenu.set(e.belongToMenuCode, g);
    }
    g.items.push({ code: e.code, label: e.label, desc: e.desc });
  }
  return [...byMenu.values()]
    .sort((a, b) => (MENU_REGISTRY[a.menuCode]?.order ?? 0) - (MENU_REGISTRY[b.menuCode]?.order ?? 0))
    .map((g) => ({ ...g, items: g.items.sort((x, y) => x.code.localeCompare(y.code)) }));
}
```

- [ ] **Step 3: 改 `lib/session-menus.ts`**(getMenus+selectVisibleMenuTree → buildMenuTree;`menuTitle`→`title`)

将 import 行
```ts
import { getMenus } from "@/manifest";
import { selectVisibleMenuTree, type MenuTreeNode } from "@/manifest/select";
```
改为
```ts
import { buildMenuTree, type MenuTreeNode } from "@/manifest";
```
> `createCocConfig` 顺带 re-export `MenuTreeNode` 类型(2A 已从 `@cloud/platform-config` 导出);此处从 `@/manifest` 取——在 index.ts 末尾追加 `export type { MenuTreeNode } from "@cloud/platform-config";`。

把 `flatten` 里 `menuTitle: node.menuTitle` 改为 `menuTitle: node.title`(SidebarMenu 对外形状不变),并把 `getSessionMenus` 体改为:
```ts
export const getSessionMenus = cache(async (): Promise<SidebarMenu[]> => {
  const session = await getSession();
  if (!session) return [];
  const tree = buildMenuTree(session.permissions);
  return flatten(tree, null, []);
});
```

- [ ] **Step 4: 改 `roles.mapper.ts`** —— `toClientCodeRole` 入参类型 `RoleDef` → `GlobalRole`

import 行 `import type { RoleDef } from "@cloud/platform-config";` 改为 `import type { GlobalRole } from "@/manifest/catalog/roles";`;函数签名 `toClientCodeRole(def: RoleDef, ...)` 改为 `toClientCodeRole(def: GlobalRole, ...)`。函数体不变(读 roleId/roleName/remark/permissionCodes,字段一致)。

- [ ] **Step 5: 改 `roles-page.tsx`**(getMenus + selectPermissionGroups 旧路径 → 新 selectPermissionGroups)

import 行
```ts
import { getMenus } from "@/manifest";
import { selectPermissionGroups } from "@/manifest/select";
```
改为
```ts
import { selectPermissionGroups } from "@/manifest/select";
```
`loadPermissionGroups` 改为:
```ts
function loadPermissionGroups(contractTypes: string[]): PermissionGroup[] {
  return selectPermissionGroups(contractTypes).map((group) => ({
    menuId: group.menuCode,
    menuTitle: group.menuTitle,
    items: group.items,
  }));
}
```

- [ ] **Step 6: 改 `lib/permission-catalog.ts`** —— `PermissionGroup` item 去掉 `require`

把该类型里 item 的 `require: string | null`(若有)删除,使其为 `{ code: string; label: string; desc: string }`。若 `RolesBoard`/权限选择器组件读 `item.require`,一并删去对应链式联动逻辑(grep `\.require` 于 `roles/ui/**` 定位;新模型无此字段)。

- [ ] **Step 7: 删旧测试 + 写 `manifest/runtime.test.ts`**

删 `apps/web/manifest/manifest.test.ts`、`apps/web/manifest/select.test.ts`。新建:
```ts
import { describe, expect, it } from "vitest";
import { resolvePartyScope, resolveRolePermissions, getRoles, buildMenuTree } from "./index.ts";

describe("manifest runtime (CoC)", () => {
  it("resolvePartyScope unions contract scopes (Set)", () => {
    const scope = resolvePartyScope(["ADMIN"]);
    expect(scope.has("system.roles.role.view")).toBe(true);
    expect(scope.has("system.users.user.view")).toBe(true);
    const iso = resolvePartyScope(["US-ISO"]);
    expect(iso.has("system.roles.role.view")).toBe(false);
    expect(iso.has("system.users.user.view")).toBe(true);
  });
  it("getRoles + resolveRolePermissions expose preset admin's codes", () => {
    expect(getRoles().map((r) => r.roleId)).toEqual([1, 2]);
    expect(resolveRolePermissions(1)).toContain("system.roles.role.create");
    expect(resolveRolePermissions(999)).toBeUndefined();
  });
  it("buildMenuTree projects visible leaves + ancestors from granted codes", () => {
    const tree = buildMenuTree(["system.users.user.view"]);
    expect(tree).toHaveLength(1);
    expect(tree[0]!.menuCode).toBe("system");
    expect(tree[0]!.children.map((c) => c.menuCode)).toEqual(["system.users"]);
  });
});
```

- [ ] **Step 8: 跑测试 + typecheck**

Run: `node_modules/.bin/vitest run apps/web/manifest apps/web/lib apps/web/modules/system/roles` 然后 `node_modules/.bin/tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`
Expected: vitest 全绿(含新 runtime.test);tsc 仍 **32**(0 新增)。`session-snapshot.test`/`roles.service.test` 若断言旧 2 段码 → 在 C5 统一改;若此处已红,记下留 C5。

- [ ] **Step 9: 提交**

```bash
git add apps/web/manifest/index.ts apps/web/manifest/select.ts apps/web/lib/session-menus.ts apps/web/modules/system/roles/server/roles.mapper.ts apps/web/modules/system/roles/ui/roles-page.tsx apps/web/lib/permission-catalog.ts apps/web/manifest/runtime.test.ts
git rm apps/web/manifest/manifest.test.ts apps/web/manifest/select.test.ts
git commit -m "feat(web): 运行时 @/manifest 切到 createCocConfig(保留导出名,退役 getMenus)"
```

---

## Task C2: 15 处守卫改 4 段权限码

**Files:**
- Modify: `apps/web/modules/system/roles/server/roles.controller.ts`
- Modify: `apps/web/modules/system/users/server/users.controller.ts`
- Modify: `apps/web/modules/system/roles/ui/roles-page.tsx`
- Modify: `apps/web/modules/system/users/ui/users-page.tsx`

**Interfaces:** 纯字符串替换,逻辑不变。映射:`roles.view→system.roles.role.view`、`roles.add→system.roles.role.create`、`roles.update→system.roles.role.update`、`roles.delete→system.roles.role.delete`;`users.view→system.users.user.view`、`users.invite→system.users.user.invite`、`users.update→system.users.user.update`、`users.lock→system.users.user.lock`、`users.resetPassword→system.users.user.resetPassword`、`users.changeRole→system.users.user.changeRole`。

- [ ] **Step 1: roles.controller.ts(4 处)**

- 行16 `{ all: ["roles.view"] }` → `{ all: ["system.roles.role.view"] }`
- 行22 `{ all: ["roles.add"] }` → `{ all: ["system.roles.role.create"] }`
- 行37 `{ all: ["roles.update"] }` → `{ all: ["system.roles.role.update"] }`
- 行56 `{ all: ["roles.delete"] }` → `{ all: ["system.roles.role.delete"] }`

- [ ] **Step 2: users.controller.ts(9 处)**

- 行18 `["users.view"]`→`["system.users.user.view"]`
- 行24/80/92/103 `["users.invite"]`→`["system.users.user.invite"]`
- 行39 `["users.update"]`→`["system.users.user.update"]`
- 行58 `["users.lock"]`→`["system.users.user.lock"]`
- 行69 `["users.resetPassword"]`→`["system.users.user.resetPassword"]`
- 行114 `["users.changeRole"]`→`["system.users.user.changeRole"]`

- [ ] **Step 3: 页面守卫(2 处)**

- `roles-page.tsx:21` `{ all: ["roles.view"] }`→`{ all: ["system.roles.role.view"] }`
- `users-page.tsx:10` `{ all: ["users.view"] }`→`{ all: ["system.users.user.view"] }`

- [ ] **Step 4: 自检无旧码残留**

Run: `grep -rnE "\"(roles|users)\.(view|add|update|delete|invite|lock|resetPassword|changeRole)\"" apps/web/modules`
Expected: 空(全部已迁 4 段)。

- [ ] **Step 5: 跑相关测试 + 提交**

Run: `node_modules/.bin/vitest run apps/web/modules/system/roles apps/web/modules/system/users`
```bash
git add apps/web/modules/system/roles apps/web/modules/system/users
git commit -m "feat(web): 守卫权限码迁到 4 段(roles/users,add→create)"
```

---

## Task C3: dashboard 转 B 类(layout 固定直链 + app nav 文案)

**Files:**
- Modify: `apps/web/app/(dashboard)/layout.tsx`
- Modify: `apps/web/i18n/messages/{en,zh-CN,ja}.json`(加 `nav` 命名空间)

**Interfaces:** dashboard 不再由 CoC 菜单树投影(menu-tree 只有 `system`),改由 layout 固定直链;文案走 app `messages` 的 `nav.*`,不再走 `coc.menu.dashboard`。

- [ ] **Step 1: app messages 加 `nav` 命名空间(三语)**

在 `apps/web/i18n/messages/en.json` 顶层加:
```json
"nav": { "home": "Home", "dashboard": "Dashboard" }
```
`zh-CN.json`:`"nav": { "home": "首页", "dashboard": "仪表盘" }`;`ja.json`:`"nav": { "home": "ホーム", "dashboard": "ダッシュボード" }`。

- [ ] **Step 2: layout.tsx 加固定 Dashboard 直链**

在 `PortalLayout` 内、`buildSidebarSections(menus)` 之外,用 app 命名空间取文案并置顶:
```ts
import { getTranslations } from "@cloud/i18n/server";
// ...
const tn = await getTranslations("nav");
const sections = buildSidebarSections(menus);
sections.unshift({
  label: tn("home"),
  items: [{ href: "/dashboard", icon: getMenuIcon("layout-dashboard"), label: tn("dashboard") }],
});
```
并把 `<Sidebar sections={buildSidebarSections(menus)} .../>` 改为 `sections={sections}`。`tc=getTranslations("coc")` 仍用于 CoC 菜单(system/roles/users)的 `tc(m.menuTitle)`。

- [ ] **Step 3: 跑 typecheck + 提交**

Run: `node_modules/.bin/tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`(期望 32)
```bash
git add "apps/web/app/(dashboard)/layout.tsx" apps/web/i18n/messages
git commit -m "feat(web): dashboard 转 B 类 layout 固定直链 + app nav 文案"
```

---

## Task C4: 新 codegen 接管 i18n,旧 codegen 停产 i18n

**Files:**
- Modify: `scripts/generate-coc-registry.mjs`(恢复 i18n emit,落 `_generated/i18n/{locale}.json`)
- Modify: `scripts/generate-manifest-registry.mjs`(停止写 i18n;仅暂留 apps.ts 直到 C5 删)

**Interfaces:** `i18n/request.ts:18` 路径不变(`@/manifest/_generated/i18n/${locale}.json`,`coc` 命名空间)。新 i18n = 各模块 i18n + catalog i18n 并集(menu/permission/role/contract);不再含 `menu.home`/`menu.dashboard`(已移 app `nav`)。

- [ ] **Step 1: `generate-coc-registry.mjs` 加回 i18n emit**

在脚本末尾(emit `.generated.ts` 之后)加多 locale i18n 合并写出(深合并各模块 `modules/<cat>/<mod>/i18n/<locale>.ts` + `manifest/catalog/i18n/<locale>.ts`),落 `apps/web/manifest/_generated/i18n/<locale>.json`:

```js
import { existsSync } from "node:fs";
const LOCALES = ["en", "zh-CN", "ja"];
function mergeInto(t, s) {
  for (const k of Object.keys(s)) {
    if (s[k] && typeof s[k] === "object" && !Array.isArray(s[k])) t[k] = mergeInto(t[k] ?? {}, s[k]);
    else t[k] = s[k];
  }
  return t;
}
async function loadDefault(f) { return existsSync(f) ? (await import(pathToFileURL(f).href)).default ?? null : null; }

const i18nDir = join(outDir, "i18n");
mkdirSync(i18nDir, { recursive: true });
for (const locale of LOCALES) {
  const merged = {};
  for (const m of modules) {
    const data = await loadDefault(join(webDir, "modules", m.moduleCategory, m.moduleName, "i18n", `${locale}.ts`));
    if (data) mergeInto(merged, data);
  }
  const cat = await loadDefault(join(webDir, "manifest", "catalog", "i18n", `${locale}.ts`));
  if (cat) mergeInto(merged, cat);
  writeFileSync(join(i18nDir, `${locale}.json`), JSON.stringify(merged, null, 2) + "\n", "utf8");
}
```
(同时把日志行的 `wrote N .generated.ts` 补上 `+ ${LOCALES.length} i18n locale(s)`。)

- [ ] **Step 2: `generate-manifest-registry.mjs` 停写 i18n**

删掉该脚本里写 `_generated/i18n/*.json` 的段(`cocByLocale`/i18n 目录写出),仅保留 `apps.ts` 写出(C5 整体删)。避免与 gen:coc 抢同一路径。

- [ ] **Step 3: 重跑两个 codegen,验证 coc i18n 来自 gen:coc**

Run: `pnpm gen:manifest && pnpm gen:coc`
Expected: `_generated/i18n/{en,zh-CN,ja}.json` 含 `menu.system/roles/users`、`permission.*`、`role.*`、`contract.*`,**不含** `menu.home/dashboard`。

- [ ] **Step 4: 全量测试(pretest 跑两 codegen)+ 启动级冒烟**

Run: `pnpm test`
Expected: 全绿。i18n 缺 key 回退英文不报错;sidebar/roles 页面文案仍可译(system/roles/users 在 coc,dashboard 在 nav)。

- [ ] **Step 5: 提交**

```bash
git add scripts/generate-coc-registry.mjs scripts/generate-manifest-registry.mjs
git commit -m "feat(web): gen:coc 接管 coc i18n,旧 codegen 停产 i18n"
```

---

## Task C5: 删旧管线 + 死掉的 platform-config 导出 + 全绿门

**Files:**
- Delete: `apps/web/manifest/_menu.map.ts`、`apps/web/manifest/_roles.map.ts`、`apps/web/manifest/i18n/{en,zh-CN,ja}.json`、`scripts/generate-manifest-registry.mjs`
- Modify: `package.json`(删 `gen:manifest` 脚本;`predev*/prebuild*/pretest` 去掉 `&& ...` 只留 `pnpm gen:coc`;`lint` 脚本若列了已删路径同步改)
- Modify: `packages/platform-config/src/index.ts`(删死导出)
- Delete: `packages/platform-config/src/create.ts`、`define.ts`、`validate.ts` 及其 `*.test.ts`(确认仅旧管线用后)
- Modify: `packages/platform-config/src/types.ts`(删 `AppManifest`/`MenuPermission`/`RoleType`;**保留** `MenuEntry`/`RoleDef` 若仍被引用——见下校验)
- Modify: 老旧测试 `apps/web/lib/session-snapshot.test.ts`、`apps/web/modules/system/roles/server/roles.service.test.ts`(把断言里的 2 段码改 4 段)

**Interfaces:** 删除后 `@cloud/platform-config` 顶层只剩:CoC 原语(`coc/*`)+ `contract-group.*`(保留)+ 仍被引用的类型。`gen:coc` 成为唯一 codegen。

- [ ] **Step 1: 改 `manifest/_generated/apps.ts` 的消费——确认已无引用**

Run: `grep -rn "_generated/apps\|_menu.map\|_roles.map\|getMenus\|getContractKeys\|PLATFORM_CONTRACTS" apps/web`
Expected: 空(C1 已切走)。若有残留先清。

- [ ] **Step 2: 删旧源 + 旧脚本**

```bash
git rm apps/web/manifest/_menu.map.ts apps/web/manifest/_roles.map.ts scripts/generate-manifest-registry.mjs
git rm apps/web/manifest/i18n/en.json apps/web/manifest/i18n/zh-CN.json apps/web/manifest/i18n/ja.json
```

- [ ] **Step 3: 改 `package.json`**

删 `"gen:manifest": ...`;把 `predev`/`predev:web`/`prebuild`/`prebuild:web`/`pretest` 的值从 `"pnpm gen:manifest && pnpm gen:coc"` 改为 `"pnpm gen:coc"`;`build` 里若有 `gen:manifest` 引用同改;`lint` 脚本路径不含已删文件(本就按目录,无需改)。

- [ ] **Step 4: 删 platform-config 死导出**

校验仅旧管线使用后,从 `packages/platform-config/src/index.ts` 删:`createPlatformConfig`/`defineAppManifest`/`defineAppRoles`/`validateMenus`/`validateRoles` 的 re-export;删文件 `create.ts`/`define.ts`/`validate.ts` + 其 test。`types.ts` 删 `AppManifest`/`MenuPermission`/`RoleType`。

Run 校验(逐个,确认 app 侧无引用):
`grep -rn "MenuEntry\|RoleDef" apps/web packages` —— 若 `MenuEntry` 已无人用(select.ts 已重写不再 import)则删;`RoleDef` 已被 `roles.mapper` 换成 `GlobalRole`(C1),若全仓无引用则删,否则保留。**contract-group.ts 整体保留。**

- [ ] **Step 5: 改旧测试断言到 4 段码**

`apps/web/lib/session-snapshot.test.ts` 与 `apps/web/modules/system/roles/server/roles.service.test.ts`:把 fixture / 断言里出现的 `roles.*`/`users.*`(2 段)改成对应 4 段码(同 C2 映射)。逻辑不改。

- [ ] **Step 6: 全绿门**

Run:
```
node_modules/.bin/tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"   # 期望 ≤ 32(删死码后可能更少;不应增加)
pnpm test                                                                    # 全绿
node_modules/.bin/eslint apps/web packages/platform-config/src scripts/generate-coc-registry.mjs   # 新增/改动文件 0 error
```

- [ ] **Step 7: e2e 冒烟(重点验收)**

Run: `pnpm test:e2e`(或登录链路相关 spec)
Expected: 登录 → 选公司 → 侧边栏按合同/角色投影(Dashboard 直链 + System/Roles/Users 按权限可见)→ `system.roles`/`system.users` 页面与接口守卫(4 段码)放行/拦截一致。冒烟不回归。

- [ ] **Step 8: 提交**

```bash
git add -A
git commit -m "chore(web): 删旧 manifest 管线 + platform-config 死导出,gen:coc 单一 codegen"
```

---

## E2E Coverage

C5 Step 7 是本相位**唯一也是关键**的 e2e 验收:登录→选公司→侧边栏投影、roles/users 页面与接口守卫(4 段码)、dashboard 直链可达。其余任务以单测 + tsc + lint 锁。若仓库 e2e 需 docker(见 `test:e2e:spec`),在能起依赖的环境跑;否则至少跑登录与 roles/users 守卫相关 spec。

## Self-Review

- **Spec 覆盖**:设计 §7 运行时投影(createCocConfig 消费 CONTRACT_SCOPE/codeToMenu/buildMenuTree/resolvePartyScope/resolveRolePermissions)、§2 dashboard 转 B 类、§9 步骤 7/8/9(接 runtime、转 B 类、全绿门 + 删旧 monolith)。i18n 接管对应 §4.5 产物归位。
- **行为不变论证**:session-snapshot/roles.service 逻辑零改(同名导出 + GlobalRole 字段兼容);ADMIN 仍由预置管理员角色(含全部码)拿全量,未引入 §7 旁路;守卫只改码字符串。唯一**有意**行为退化 = 权限目录去 `require` 链式联动(设计删 require)。
- **顺序自洽/可编译**:C1 切 API(同任务内更新 session-menus/roles-page/mapper/select,删旧测试)→ C2 改码(纯字符串)→ C3 dashboard(C1 后 sidebar 缺 dashboard,补直链)→ C4 i18n 接管(C3 后 coc 不再需要 home/dashboard 文案)→ C5 删旧(确认无引用后)。每步末 tsc/test 绿。
- **删除安全**:contract-group(含 PRESET_ROLE_ID_MAX/DB_ROLE_ID_MIN/contractTypeGroup/roleIdInGroupRange/resolvePortalGroup/isPresetAdminRole)经扫描确认被业务依赖,**保留**;仅删 createPlatformConfig/defineAppManifest/defineAppRoles/validateMenus/validateRoles 及随之失依赖的类型,删前 grep 校验(C5 Step 1/4)。
- **Placeholder 扫描**:无 TODO;改动均给出精确 old→new 或完整代码。`MenuEntry`/`RoleDef` 的删与留由 C5 Step4 的 grep 结果决定(条件明确)。
- **类型一致**:`buildMenuTree` 字段 `title`(session-menus flatten 已对齐);`GlobalRole` 贯穿 index/getRoles/mapper;`PermissionGroup` item 去 require 在 select.ts/permission-catalog/RolesBoard 一致。

## Execution Handoff

(见下方 writing-plans 标准两选项。)
