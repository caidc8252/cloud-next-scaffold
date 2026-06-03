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
 * 一个平台（app）的 manifest。`appId` 即 platformId，跨平台唯一。
 * `contractKeys`：本平台声明的契约类型清单；多 app 聚合后的并集即全局契约枚举
 * （由 gen:manifest 写进各 app 的 `_generated/apps.ts`，替代旧的手维护 `_contracts.ts`）。
 */
export type AppManifest = {
  appId: string;
  contractKeys: string[];
  menus: MenuEntry[];
};
