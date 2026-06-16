# Manifest COC（菜单 / 权限 / 角色 / 文案 单一真源）

> 归属：`apps/*/manifest/` 下的 `_menu.map.ts` + `_roles.map.ts` + `i18n/`，由 `@cloud/platform-config` 采集校验。**新增 / 改菜单、权限码、死写角色、文案 key 前必读。** 删除或修改权限时必须先提醒，获得同意后才能继续。

菜单、权限、死写角色、以及它们的展示文案，全部**约定优于配置（COC）**地声明在各 app 的 manifest 里，作为**单一真源**，替代旧的 `sys_menu` / `sys_permission` / `sys_role_permission` 等库表/手维护文件。不要再手写 `_generated/*`、也不要在业务里另起菜单/权限注册表。

每个子应用通过 `manifest` 声明自身提供的公共能力：**契约类型 / 菜单 / 权限 / 预置角色 / 文案**。宿主应用通过 COC 采集各子应用的 manifest，统一生成平台菜单、权限、角色、i18n。

---

## 一、采集 → 统一使用

- **声明**：每个 app 在 `manifest/_menu.map.ts` 导出 `appManifest`（必填），可选在 `_roles.map.ts` 导出 `appRoles`，文案放 `manifest/i18n/{en,zh-CN,ja}.json`。
- **采集**：`pnpm gen:manifest`（已挂到 `predev` / `prebuild` / `pretest`）扫描 `apps/*/manifest`，把**所有 app** 的菜单拍平成一个全局池、`contractKeys` 取并集、角色拍平成一个角色池、**coc 文案取并集**，序列化写进**每个**含 `manifest/` 的 app 的 `_generated/apps.ts`（菜单/角色/契约）与 `_generated/i18n/{locale}.json`（文案）。这些是产物，**不手改、不作真源**；序列化内联是为了多 Next app monorepo 下不产生跨 app 源码导入。
- **构造**：各 app 的 `manifest/index.ts` 调一次 `createPlatformConfig(MENUS, { contractTypes, roles })`，**构造即完整性校验**，非法直接抛错（启动期阻断，无运行时注册表、无运行时可变状态）。
- **使用**：通过 `index.ts` 暴露的访问器（`getMenus` / `getRoles` / `resolvePartyScope` …）+ `select.ts` 的纯函数（菜单树 / 权限目录）消费；文案经各 app `i18n/request.ts` 合进 `coc` 命名空间后，用 `getTranslations("coc")` 翻译。

**校验在四处发生**：

| 时机 | 由谁 | 校验内容 |
| --- | --- | --- |
| 写入期 | `defineAppManifest` / `defineAppRoles`（zod） | 字段形状（必填、类型、非空串），并 `Object.freeze` 防误改 |
| 采集期 | `gen:manifest` 脚本 | provider 必须导出 `appManifest`；有 `_roles.map.ts` 则必须导出 `appRoles`，否则抛异常 |
| 构造期 | `createPlatformConfig`（启动期，非法拒启） | **菜单**：`menuCode` / `permissionCode` 全局唯一、`contractTypes` ∈ 契约枚举、`parentMenuCode` 必须存在且无环、目录（`path:null`）必须有子级、`icon`（若配 `resolveIcon`）合法、**`require` 目标存在且同菜单内、require 图无环**。**角色**：`roleId` 唯一、`roleId` ∈ 1–300、`permissionCodes` 必须都在菜单池出现过 |
| 校验脚本（非阻断） | `pnpm check:roles` | 预置超管（`isPresetAdminRole`）的显式 `permissionCodes` 是否覆盖其所在组可达菜单的全部权限码；**只警告缺失，不阻断**（也在 `gen:manifest` 末尾附带跑一次打警告） |

---

## 二、菜单 `_menu.map.ts`

最多三级约定：**L1 目录（`path: null`，无权限）→ L2/L3 叶子（有 `path`）**。`menuCode` / `permissionCode` **全平台唯一**。

### 2.1 菜单组合矩阵（针对**叶子**，即有 `path` 的项）

菜单的可见性与能力由两维决定：`contractTypes`（空 `[]` = 通用对所有契约命中；非空 = 仅列出的契约命中）× `permissions`（无 = 登录即可见；有 = 需持码）。四种组合：

| # | `contractTypes` | `permissions` | 含义 | 可见性 | 守卫 | scope 行为 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `[]` | 无 | **跨应用公共通用** | 任何控制台/契约，登录即可见 | `requireSession()`，无权限码 | 不产生权限码 |
| 2 | `[]` | 有 | **跨应用公共能力** | 对所有契约命中，但需持码才显示叶子 | `requirePermissions([...])` / `assertPermissions([...])` | ⚠️ 权限码**进入每个 party 的 scope**，各平台角色都可授予 |
| 3 | 非空 | 有 | **指定应用范围 / 私有能力** | 仅列出的契约可见 + 需持码 | 同上 | 权限码**只进入命中该契约的 party scope**，不外泄 |
| 4 | 非空 | 无 | **指定契约可见 + 登录即可见** | 仅列出的契约可见、契约内任何人无需特定权限 | `requireSession()`（建议同时门控契约） | 不产生权限码 |

**关键区别（代码事实）**：

- 命中判定 `contractMatch`：`contractTypes:[]` → 对**所有契约命中**（通用）；非空 → 与会话契约有交集才命中。
- `resolvePartyScope(contract)` = 命中该契约的菜单声明的全部权限码。所以 **#2 的码因为「对所有契约命中」会落进每个 party 的 scope**（即 `validate.ts` 注释说的「跨控制台共享页，由业务自负」），而 **#3 的码只落进对应契约的 scope**。这就是「公共能力」vs「私有能力」的本质差别。
- **第 4 格少用且有坑**：`contractTypes` 只门控**菜单可见性**，不门控**页面访问**。#3 因为权限码只进对应契约 scope，off-contract 用户拿不到码 → `requirePermissions` 天然挡住；但 #4 无权限码、`requireSession()` 只校验登录态，**off-contract 用户直接深链该页就能进**（菜单虽隐藏）。所以 #4 若涉及敏感数据，页面/路由必须**自行显式校验契约**。通常叶子要么走 #1（纯通用页），要么走 #3（契约私有 + 权限）。
- 可见叶子带出祖先目录（`selectVisibleMenuTree`）；**目录（`path:null`）按约定用 `contractTypes:[]`**，靠可见叶子带出，自身不门控（目录配非空契约会因 `getMenus` 先过滤而误裁子级）。
- **通用能力声明一次即被全平台继承**：菜单池跨 app 全量并集，#1/#2（`contractTypes:[]`）菜单在每个 app 都命中。例：admin 声明的 `dashboard`（#1）/ `users`（#2）是跨平台公共能力，customer/merchant **直接继承、不需重复声明**（customer manifest 因此可不声明自有 overview）。注意继承的是**菜单与权限码**；对应**路由页面**仍需各 app 自行提供（否则点击 404）。

### 2.2 标准示例

```ts
import { defineAppManifest } from "@cloud/platform-config";

export const appManifest = defineAppManifest({
  // 本平台声明的契约类型；gen:manifest 跨 app 取并集 = 全局契约枚举。
  // 值对齐 DB 的 ContractType：全大写 + 连字符。
  contractKeys: ["ADMIN", "US-ISO", "US-ISV", "MERCHANT"],

  menus: [
    // ── #1 跨应用公共通用：dashboard ─────────────────────
    // L1 目录：path:null、contractTypes:[]、无 permissions。本身不可点，靠可见叶子带出。
    { menuCode: "home", menuTitle: "menu.home", parentMenuCode: null, path: null, contractTypes: [], order: 1 },
    {
      menuCode: "dashboard",
      menuTitle: "menu.dashboard",
      parentMenuCode: "home",
      path: "/dashboard",
      icon: "layout-dashboard",
      // contractTypes:[] 通用 + 无 permissions = 登录即可见。页面守卫用 requireSession()。
      contractTypes: [],
      order: 2,
    },

    // ── #3 指定契约 + 权限：System（L1 目录） / Roles（L2 叶子） ──
    { menuCode: "system", menuTitle: "menu.system", parentMenuCode: null, path: null, icon: "settings", contractTypes: [], order: 100 },
    {
      menuCode: "device-models",
      menuTitle: "menu.deviceModels",
      parentMenuCode: "system",         // 指回 L1 的 menuCode
      path: "/device-models",
      icon: "pos",
      contractTypes: ["ADMIN"],         // 仅 ADMIN 契约可见（私有能力）
      order: 41,
      // permissions：本菜单「可被授予」的权限码清单。
      // - code 是协议（鉴权用），label/desc 是展示（i18n key）。
      // - 页面 requirePermissions([...]) / 路由 assertPermissions([...]) 从这里 require 其一。
      // - require 表示「需先有另一个码」，必须指向**本菜单内**的 code（见第三节）。
      permissions: [
        { code: "deviceModels.view", label: "permission.deviceModelsView", desc: "permission.deviceModelsViewDesc", require: null },
        { code: "deviceModels.add", label: "permission.deviceModelsAdd", desc: "permission.deviceModelsAddDesc", require: "deviceModels.view" },
        { code: "firmware.view", label: "permission.firmwareView", desc: "permission.firmwareViewDesc", require: "deviceModels.view" },
        { code: "firmware.upload", label: "permission.firmwareUpload", desc: "permission.firmwareUploadDesc", require: "firmware.view" },
      ],
    }
  ],
});
```

### 2.3 要点

- **目录格式**：L1 用 `path: null` 表示目录，**必须**至少有一个子级（否则构造期报 `group menu ... has no children`）；目录本身不参与权限，由「有可见叶子」带出。
- **值的枚举与限制**：`contractTypes` 的每个值必须 ∈ `contractKeys`（全局契约枚举），否则 `unknown contractType`；`[]` = 通用；`order` 控制同级排序（升序）；`icon` 为 lucide 图标名。
- **`menuTitle` 是 i18n key**（相对 `coc` 命名空间，如 `menu.deviceModels`），不是直出文本；消费端用 `getTranslations("coc")` 翻译（见第五节）。
- **无菜单的下级页面复用归属页的 `*.view`，不另立 menu/permission**。前端按钮显隐只是体验层（`useCan` / `Can`），不是安全边界。

---

## 三、权限规范

### 3.1 权限码格式

- 权限码统一 `<业务域>.<动作>`，**全小写 camelCase**：业务域 camel，动作 camel，分隔符 `.`。
- 查看权限统一用 `<域>.view`。
- 例：`deviceModels.view` `deviceModels.add` `users.changeRole` `users.resetPassword` `firmware.upload`。
- **禁止**历史写法：`users.VIEW`（UPPER_SNAKE）、`overview:view`（冒号分隔）。
- `permissionCode` **全平台唯一**（跨 app 拍平进一个池）。非 admin 平台用域名前缀区分，避免撞名（构造期报 `duplicate permissionCode`）。

### 3.2 `require` 前置权限

权限若依赖另一权限，用 `require` 声明（如 `add` 依赖同域 `view`）。`require: null` 或省略表示无前置。

```ts
{ code: "deviceModels.add", label: "permission.deviceModelsAdd", desc: "permission.deviceModelsAddDesc", require: "deviceModels.view" }
```

**语义（三条铁律）**：

1. **构造期校验**：`require` 目标必须存在、**且在同一菜单的 `permissions[]` 内（不可跨菜单）**、require 图**禁止成环**（保证链有限）。链可多跳，全在同一菜单内：
   `firmware.upload → firmware.view → deviceModels.view`，`deviceModels.add → deviceModels.view`。
2. **角色编辑器 UI 沿 require 链向上传递自动勾选并锁定祖先**：勾 `firmware.upload` → 自动连带勾 `firmware.view` + `deviceModels.view` 并锁定（不可单独取消）；取消父项时其依赖项一并取消。目的：避免「能增不能查」的残缺角色。
3. **后端不做闭包校验**：保存角色时服务端原样存客户端提交的码，不强制闭包，信任前端轻量处理。

> 「二级 view 关联一级 view」指的就是这条同菜单内的 require 链层级，**不是跨菜单**。

### 3.3 文案

- 权限 `label` / `desc` 一律 i18n key（相对 `coc` 命名空间），**禁止直接写中文/英文**。
- `label` 必填（已去掉旧的 `labelFromCode` 兜底）；`desc` 可选。
- key 命名见第五节：`permission.${domain}${Action}` / `permission.${domain}${Action}Desc`。

---

## 四、角色 `_roles.map.ts`

死写 **GLOBAL** 角色（不入库，随菜单同管线采集）。`permissionCodes` 必须是菜单声明过的 code。

### 4.1 roleId 编码范围约束（三平台）

| 组 (PortalGroup) | 平台 (app) | 绑定契约 | roleId 区间 | 平台超管（首位） | 其余编码角色 |
| --- | --- | --- | --- | --- | --- |
| ADMIN | `admin` | `ADMIN` | **1–100** | **1** | 2–100 |
| CUSTOMER | `customer` / `portal` | `US-ISO`/`US-ISV`/`US-ISO-PILOT`/`US-ISV-PILOT`/`PLATFORM-CUSTOM` | **101–200** | **101** | 102–200 |
| MERCHANT | `merchant`（预留/缓做） | `MERCHANT` | **201–300** | **201**（待启用） | 202–300 |

**约束条款**：

1. 死写 GLOBAL 角色 roleId **强制 ∈ [1, 300]**（构造期 `validateRoles`，越界报 `out of hardcoded range`）。
2. 每组区间**首位 = 该平台超级管理员**：`1` / `101` / `201`。`isPresetAdminRole` 现为显式集合 `{1, 101}`；**merchant 启用时把 `201` 加进去**。
3. roleId **≥ 1001** = DB 动态 PRIVATE 角色（`sys_role` 自增从 1001 起），**不得写进代码注册表**。
4. **301–1000** = 预留缓冲带，代码与 DB **都不用**（代码 ≤300，DB ≥1001）。
5. roleId **全局唯一**（三平台角色拍平进一个池，构造期 `duplicate roleId`）。
6. 契约↔组映射是单一真源（`contractTypeGroup`）：一个 party 的契约**不得跨组**（契约创建时应用层强制）；超管自动注入「所在组」scope。
7. *（约定，未强制）* 各 app 的 `_roles.map.ts` 应只声明本组区间内的 roleId；当前构造期只校验全局 [1,300] + 唯一性，不校验「区间↔平台」对齐。

### 4.2 预置超级管理员（显式枚举）

- 超管（1/101/201）的 `permissionCodes` **必须显式列出本平台全部权限码 + 公共（#2）权限码**——**不再留空自动填充**。
- 已**移除** `createPlatformConfig` 里基于 `isPresetAdminRole` 的通配自动填充逻辑（`filledRoles`）；`getRoles` / `resolveRolePermissions` 原样返回声明值。
- `isPresetAdminRole` **保留作标记**：`pnpm check:roles` 靠它识别要做完整性检查的角色。
- **新增权限后必须同步检查超管是否需补充**；`pnpm check:roles`（非阻断）会按超管所在组的契约算出「应有全集」，diff 其显式列表，**警告缺失的码**（不阻断构造/构建）。
- 下游（会话 / 角色列表）仍一律 `∩ party scope`，所以超管在某契约下的有效权限 = 显式全集 ∩ 该契约可达码（与旧自动填充行为一致，前提是显式列表完整）。

### 4.3 角色文案

- `roleName` / `remark` 均为 i18n key（相对 `coc`），**必填**。key 命名见第五节：`role.${roleKey}` / `role.${roleKey}Desc`。
- **死写 GLOBAL 角色（roleId ≤ 1000）的名称/描述是 i18n key**；**DB 动态角色（roleId ≥ 1001）的 `roleName`/`remark` 是租户在角色编辑器里输入的字面量，不翻译、原样展示**。消费端以 **DB 边界 roleId ≤ 1000** 为判据区分 key/字面量（见 5.4）。

### 4.4 示例

```ts
import { defineAppRoles } from "@cloud/platform-config";

// admin 平台死写角色，roleId 区间 1–100。
export const appRoles = defineAppRoles([
  // 预置超管：显式列出本平台全部权限码（含 #2 公共能力码）。
  {
    roleId: 1,
    roleName: "role.adminPresetAdmin",
    remark: "role.adminPresetAdminDesc",
    permissionCodes: [
      "deviceModels.view", "deviceModels.add",
      "firmware.view", "firmware.upload",
      "users.view", "users.add", // …本平台全部码
    ],
  },
  // 普通编码角色：显式列出所需码（每个都必须在菜单池出现过，否则构造期报错）。
  {
    roleId: 2,
    roleName: "role.adminOperator",
    remark: "role.adminOperatorDesc",
    permissionCodes: ["deviceModels.view", "users.view"],
  },
]);
```

---

## 五、i18n 规范

COC 文案统一挂载在 `coc` 命名空间下，结构 `coc.{menu,permission,role}`。文案随 COC 数据走**同一条采集管线**：跨平台**全量并集**，每个 key 只在归属 app 写一次（单一真源），admin 自动拿到 customer/merchant 的文案，未来 merchant app 自动覆盖。**无手工同步、无漂移**——这保证 admin（可查看/管理另外两平台的菜单/权限/角色）看到的标题与各平台一致。

### 5.1 源文案位置（co-located）

各 app 把自己声明的菜单/权限/角色文案写在 `apps/<app>/manifest/i18n/{en,zh-CN,ja}.json`，`en` 为基底、三语同步补齐。结构：

```jsonc
// apps/admin/manifest/i18n/en.json
{
  "menu": {
    "home": "Home",
    "dashboard": "Dashboard",
    "system": "System",
    "deviceModels": "Device Models"
  },
  "permission": {
    "deviceModelsView": "View Device Models",
    "deviceModelsViewDesc": "View device model list and detail",
    "deviceModelsAdd": "Create Device Model",
    "deviceModelsAddDesc": "Create a new device model"
  },
  "role": {
    "adminPresetAdmin": "Administrator",
    "adminPresetAdminDesc": "Built-in administrator role"
  }
}
```

### 5.2 采集与挂载管线

- `gen:manifest` 读各 app 的 `manifest/i18n/{locale}.json`，**按 locale 取并集**（key 全平台唯一，不应撞），写进**每个**含 `manifest/` 的 app 的 `manifest/_generated/i18n/{locale}.json`（产物，不手改）。
- 各 app `i18n/request.ts` 把生成产物挂到 `coc` 命名空间（与 `@cloud/ui` 文案、app 主 `messages` 一起 `deepMerge`）：

```ts
// apps/<app>/i18n/request.ts（示意）
const coc = (await import(`@/manifest/_generated/i18n/${locale}.json`)).default;
return { ...deepMerge(uiMessages, messages), coc, errors: getAllErrorMessages(locale) };
```

- 字段里存的是 `coc` 命名空间下的**相对路径**（如 `menuTitle: "menu.deviceModels"`）；消费端 `const t = await getTranslations("coc"); t(menuTitle)` → 解析 `coc.menu.deviceModels`。

### 5.3 key 命名规则

| 对象 | key | 例 |
| --- | --- | --- |
| 菜单 | `menu.${camel(menuCode)}` | `menu.deviceModels` |
| 权限 label | `permission.${domain}${Action}` | `permission.deviceModelsView` |
| 权限 desc | `permission.${domain}${Action}Desc` | `permission.deviceModelsViewDesc` |
| 角色 name | `role.${roleKey}` | `role.adminPresetAdmin` |
| 角色 desc | `role.${roleKey}Desc` | `role.adminPresetAdminDesc` |

- `camel(menuCode)`：`device-models` → `deviceModels`。
- `${domain}${Action}`：权限码 `deviceModels.view` → `deviceModelsView`（域原样 + 动作首字母大写）。多词动作 `users.changeRole` → `usersChangeRole`。
- `${roleKey}`：作者自取的稳定 slug（如 `adminPresetAdmin`、`adminOperator`），与 roleId 一一对应。

### 5.4 角色名称：key vs 字面量

- 死写 GLOBAL 角色（roleId ≤ 300，含 301–1000 预留区间）：`roleName`/`remark` 是 key → 消费端 `t(roleName)` 翻译。
- DB 动态角色（roleId ≥ 1001）：`roleName`/`remark` 是用户输入的字面量 → 原样渲染，**不 `t()`**。
- 消费端以 **DB 边界 1000** 为判据分支（`roleId <= 1000 ? t(name) : name`），而非 builtin/300——这样 301–1000 预留段的死写角色也按 key 处理，只有真正入库的 ≥1001 才当字面量。

---

## 六、字段与大小写规范

| 字段 | 格式 / 大小写 | 例 |
| --- | --- | --- |
| `menuCode` / `parentMenuCode` | kebab-case 全小写，**全局唯一**；非 admin 平台加平台前缀 | `home` `system` `device-models` `c-overview` |
| `path` | 路由路径，全小写 kebab，前导 `/`；目录为 `null` | `/device-models` / `null` |
| `icon` | lucide 图标名，kebab-case | `layout-dashboard` `shield` |
| `menuTitle` | i18n key（相对 `coc`），`menu.${camel(menuCode)}` | `menu.deviceModels` |
| permission `code` | `<域>.<动作>` 全小写 camel，`.` 分隔 | `deviceModels.view` `users.changeRole` |
| permission `label` / `desc` | i18n key（相对 `coc`） | `permission.deviceModelsView` |
| permission `require` | 同菜单内的另一 `code` 或 `null` | `deviceModels.view` |
| `roleName` / `remark` | i18n key（相对 `coc`），死写角色必填 | `role.adminPresetAdmin` |
| `contractKeys` / `contractTypes` 值 | 对齐 DB `ContractType`：全大写 + 连字符 | `ADMIN` `US-ISO` `PLATFORM-CUSTOM` |
| `roleId` | 数字，按平台区间（见第四节） | `1` `2` `101` |

---

## 七、各平台如何添加

1. 在 `apps/<app>/manifest/_menu.map.ts` 用 `defineAppManifest` 导出 `appManifest`（按需在 `_roles.map.ts` 用 `defineAppRoles` 导出 `appRoles`）。
2. 在 `apps/<app>/manifest/i18n/{en,zh-CN,ja}.json` 补齐 `menu` / `permission` / `role` 文案（en 基底，三语同步）。
3. 跑 `pnpm gen:manifest`（开发时 `predev` 自动跑），刷新各 app 的 `_generated/apps.ts` 与 `_generated/i18n/*.json`。
4. 启动应用：`createPlatformConfig` 构造期校验，有问题直接报错改正。
5. 改了权限/超管后跑 `pnpm check:roles`，看超管完整性警告并按需补充。

**多平台复用相同目录/路径时（防冲突）**：所有 app 的菜单/权限/角色/文案 key 都**拍平进同一个全局池**，必须**全局唯一**。新增前先翻 `apps/<app>/manifest/_generated/apps.ts` 确认没撞名——否则构造期报 `duplicate menuCode` / `duplicate permissionCode`。约定：**非 admin 平台给 `menuCode` / 权限域 加平台前缀**（如 customer 用 `c-`）。

---

## 八、`platform-config` / `manifest` index / `select` 暴露（简略）

### `@cloud/platform-config`（包：只采集 + 校验 + 暴露数据，业务解释不进包）

| 导出 | 用途 |
| --- | --- |
| `defineAppManifest(manifest)` | 写 `_menu.map.ts` 的入口：zod 校验形状 + 冻结 |
| `defineAppRoles(roles)` | 写 `_roles.map.ts` 的入口：同上 |
| `createPlatformConfig(menus, { contractTypes, roles, resolveIcon? })` | 用聚合后的扁平池构造平台配置，**构造期一次性完整性校验**（含 `require` 校验）；返回只读访问器。各 app `index.ts` 只调一次。**已移除超管通配自动填充** |
| `GROUP_ROLE_ID_RANGE` / `PortalGroup` | roleId 区间常量 / 组类型 |
| `contractTypeGroup(ct)` / `resolvePortalGroup(cts)` | 契约 → 组（角色列表过滤、portal 路由共用的单一映射） |
| `roleIdInGroupRange(id, group)` / `isPresetAdminRole(id)` | roleId 区间判定 / 是否预置超管（标记用，校验脚本依赖） |
| 类型 `MenuEntry` `MenuPermission`（含 `require`）`AppManifest` `RoleDef`（含 `remark`）`RoleType` | manifest 形状类型 |
| `INVITE_TTL_MS` `INVITE_TOKEN_BYTES` | 邀请链路常量（同包） |

### `apps/<app>/manifest/index.ts`（平台运行时入口，薄封装 `createPlatformConfig` 产物）

| 导出 | 用途 |
| --- | --- |
| `PLATFORM_CONTRACTS` | 本平台绑定的全局契约枚举（= 各 app `contractKeys` 并集） |
| `getMenus(contract?)` | 不传 = 全部；传契约/契约数组 = 命中菜单（菜单 `contractTypes:[]` 对所有契约命中） |
| `getContractKeys()` | 契约枚举（拷贝） |
| `getRoles()` | 全部死写 GLOBAL 角色（超管权限码为声明的显式列表，不再构造期填充） |
| `resolveRolePermissions(roleId)` | 死写角色的权限码；非死写（如 ≥1001 DB 动态角色）返回 `undefined` |
| `resolvePartyScope(contract)` | 给定契约可达菜单声明的全部权限码 `Set` —— 会话与角色列表共用的 scope **单一来源** |

### `apps/<app>/manifest/select.ts`（应用层「解释逻辑」纯函数；入参为**已按契约过滤**的菜单）

| 导出 | 用途 |
| --- | --- |
| `selectPermissionGroups(menus)` | 按菜单分组的权限目录（角色编辑器 / 权限勾选 UI 用）；带 `code` / `label` / `desc`（i18n key）/ `require`，供 UI 沿 require 链联动勾选 |
| `selectVisibleMenuTree(menus, grantedCodes)` | 侧边栏可见菜单树：叶子按已授权码过滤 + 祖先目录连通 + 按 `order` 排序 |
