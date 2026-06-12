// 平台菜单 / 权限 manifest 的类型定义。
// 一个 app = 一个平台（platform）；每个平台维护一棵独立的菜单树。

/** 单条权限定义。label 缺省时由 code 推导，desc 可选。 */
export type MenuPermission = {
  code: string;
  label?: string;
  desc?: string;
};

/**
 * 扁平菜单条目。
 * - 目录（有子菜单）：`path` 为 null。
 * - 叶子（路由页）：`path` 为具体路由。
 * - `contractTypes`：该菜单适用的契约类型；`"*"` 表示所有契约。
 */
export type MenuEntry = {
  menuCode: string;
  menuTitle: string;
  parentMenuCode: string | null;
  icon?: string;
  path?: string | null;
  contractTypes: string[];
  order?: number;
  permissions?: MenuPermission[];
};

/**
 * 一个平台（app）的 manifest。
 * `contractKeys`：本平台声明的契约类型清单；多 app 聚合后的并集即全局契约枚举
 * （由 gen:manifest 写进各 app 的 `_generated/apps.ts`，替代旧的手维护 `_contracts.ts`）。
 */
export type AppManifest = {
  contractKeys: string[];
  menus: MenuEntry[];
};

/** 角色类型：GLOBAL（通用，死写代码、不入库）/ PRIVATE（指定，DB 动态创建）。代码注册表里的角色恒为 GLOBAL。 */
export type RoleType = "GLOBAL" | "PRIVATE";

/**
 * 死写在代码的角色定义（GLOBAL）。与菜单同管线由 gen:manifest 收集。
 * roleId 区间约定：1–100 admin / 101–200 customer / 201–300 merchant 预留；≥1001 属 DB 动态 PRIVATE，不得写死。
 * `permissionCodes` 必须是菜单池里出现过的 permissionCode；全权限角色（各平台 Administrator）留空，
 * 由 AuthorizingType=ADMIN 运行时取当前契约作用域全量。
 */
export type RoleDef = {
  roleId: number;
  roleName: string;
  permissionCodes: string[];
};
