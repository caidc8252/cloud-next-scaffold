# CoC 声明系统(`@cloud/platform-config` + `apps/web/manifest`)

> 归属：菜单 / 权限 / 角色 / 合同闸门由**各模块就近声明**，经 `gen:coc` 确定性生成注册表与类型，运行时 `createCocConfig` 按用户有效权限**投影**出菜单。零 DB(无 `sys_menu` / `sys_permission`)。**新增 / 改权限码、菜单、角色、合同闸门前必读。**

## 决策口诀(A 类 vs B 类，没有中间地带)

> 这个模块有受合同/权限管控的 UI 吗？
> - **有** → **A 类**：写 `manifest.ts` 声明 `menuCode` + `permissions`，投影成左侧菜单。
> - **没有**(登录即看 / 纯逻辑) → **B 类**：不声明权限，页面只 `requireSession()`；UI 在 layout 写死直链(如 dashboard)，永不进 catalog、永不投影。

## 一、声明在哪(作者手写，单一真源)

| 文件 | 内容 |
|---|---|
| `apps/web/modules/<cat>/<mod>/manifest.ts` | `defineModule(...)`：`menuCode` / `entry.url` / `permissions[]` |
| `apps/web/modules/<cat>/<mod>/i18n/{en,zh-CN,ja}.ts` | 该模块菜单 / 权限文案(i18n key) |
| `apps/web/manifest/catalog/menu-tree.ts` | `defineMenuTree(...)`：目录(非叶子)骨架 |
| `apps/web/manifest/catalog/contract-types.ts` | ★ 合同闸门唯一真源 `CONTRACT_MENUS` |
| `apps/web/manifest/catalog/roles.ts` | 死写 GLOBAL 角色 `GLOBAL_ROLES`(`roleId ≤ 1000`) |
| `apps/web/manifest/catalog/i18n/{en,zh-CN,ja}.ts` | 目录 / 角色 / 合同文案 |
| `apps/web/manifest/collect.ts` | 采集入口(codegen 唯一消费；新增模块在此 `import`) |

## 二、权限码 + 菜单码格式(系统契约，不是文案)

- 权限码 **4 段** `<cat>.<mod>.<fn>.<action>`，全小写 camel，全局唯一。
- `menuCode = <cat>.<mod>`；`belongToMenuCode` **显式声明**，guard 强制 `== 本模块 menuCode == code 前两段`。
- `entry.url` 是**真实路由**(如 `/system/roles`，不去 category 段)。
- 一个菜单可挂多个权限；**菜单由权限反推**。改码 = 改契约，会波及守卫调用点(见 §五)。

```ts
// modules/system/roles/manifest.ts
export default defineModule({
  moduleCategory: "system", moduleName: "roles", menuCode: "system.roles",
  title: "menu.roles", parentMenuCode: "system", icon: "shield", order: 101,
  entry: { url: "/system/roles" },
  permissions: [
    { code: "system.roles.role.view", belongToMenuCode: "system.roles", label: "permission.rolesView", desc: "permission.rolesViewDesc" },
    // …
  ],
});
```

## 三、合同闸门 + 角色(catalog 单一权威)

- **模块不自报 contractTypes**；每个合同解锁哪些**叶子菜单**只由 `catalog/contract-types.ts` 的 `CONTRACT_MENUS` 决定(元素类型 = 生成的 `MenuCode`，写错 / 删过的码即编译错)。**无通配，所有合同显式枚举**。
- GLOBAL 角色死写在 `catalog/roles.ts`：`roleId ≤ 1000` = 预置(不入库、内置只读、coc i18n 名)；`≥ 1001` = DB 动态 PRIVATE(`sys_role`)。角色列全量码，运行时按 party 合同 ∩ 出有效权限。

## 四、i18n / 生成 / 校验

- 文案沿 `coc` 命名空间；`en` / `zh-CN` / `ja` 同步，值在模块 / catalog 的 `i18n/`。详见 `.claude/docs/i18n.md`。
- `pnpm gen:coc`(已接 predev / prebuild / pretest)：`buildRegistry → validateCatalog → deriveContractScope → emit`，**有 error 诊断拒写**、退出码 1。
- 产物落 `apps/web/manifest/_generated/*.generated.ts` + `_generated/i18n/`，**gitignored、永不提交、永不手改**。

## 五、运行时投影(链路语义)

```text
scope = ⋃ CONTRACT_SCOPE[当前 party 合同]
authorizingType === "ADMIN"  → effective = scope          # 结构旁路:无视角色,仍受合同框住
else                          → effective = 角色码 ∩ scope
菜单 = buildMenuTree(effective)                            # 叶子命中→可见,祖先连带,空目录裁掉
```

- 运行时入口 `@/manifest`：`resolvePartyScope` / `resolveRolePermissions` / `buildMenuTree` / `getRoles`(均由 `createCocConfig` 提供)。
- 真鉴权仍靠 `assertPermissions<PermissionCode>()` / `requirePermissions()`(见 `.claude/docs/auth-permissions.md`)，菜单只是 UX 投影。
- B 类(dashboard 等)不进投影：layout 写死直链 + app `nav` 命名空间文案。

## 六、只投影当前快照(铁律)

`buildRegistry` **只吃当前声明**：无 `previous`、无 reconcile、无 `deprecated` 墓碑、无 `provisional`。源里删码 → registry 即删。「删码会不会孤立 DB 已有引用」属 **Step 3 工作流**(编排 / checkpoint)职责，不在声明原语里兜底(也因生成物不入库，无持久 `previous` 可读)。

## 七、不在本系统(推迟 Step 3)

provisional 前向占位、跨模块依赖 checkpoint、删码 reconcile / 孤立角色清理、AI 编排脚手架。完整决策记录见 `docs/design-bridge/single-app-modules/step2-coc-declaration-design.md`。

## 加一个权限化模块(how-to)

1. `modules/<cat>/<mod>/manifest.ts`：`defineModule` 声明 `menuCode` + 4 段权限码 + `belongToMenuCode`。
2. 同目录 `i18n/{en,zh-CN,ja}.ts` 补三语文案。
3. 目录骨架不够，就在 `manifest/catalog/menu-tree.ts` 加目录节点。
4. `manifest/catalog/contract-types.ts` 的 `CONTRACT_MENUS` 把该 `menuCode` 挂到对应合同。
5. `manifest/collect.ts` 里 `import` 新模块 manifest。
6. 角色要带新码：改 `catalog/roles.ts`(GLOBAL)或 DB `sys_role.permission_codes`(PRIVATE)。
7. `pnpm gen:coc` 跑绿(error 即拒写)。
8. 页面 / 接口接 `requirePermissions()` / `assertPermissions()`，用 4 段码。
