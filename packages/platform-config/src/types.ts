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

/** 一个平台（app）的 manifest。`appId` 即 platformId，跨平台唯一。 */
export type AppManifest = {
  appId: string;
  menus: MenuEntry[];
};

/** 契约过滤参数：单值 / 数组按其过滤；undefined 表示不过滤、返回全部。 */
export type ContractFilter = string | string[] | undefined;

/** 授权类型：ADMIN 拿契约下全量权限；NORMAL 按角色权限码收敛。 */
export type AuthorizingType = "ADMIN" | "NORMAL";

/** 角色编辑器用的权限目录项（label 已补全）。 */
export type PermissionCatalogItem = {
  code: string;
  label: string;
  desc: string;
};

/** 按菜单分组的权限目录。 */
export type PermissionGroup = {
  menuCode: string;
  menuTitle: string;
  items: PermissionCatalogItem[];
};

/** 可见菜单树节点（侧边栏渲染用）。 */
export type MenuTreeNode = {
  menuCode: string;
  menuTitle: string;
  path: string | null;
  icon: string | null;
  order: number;
  children: MenuTreeNode[];
};
