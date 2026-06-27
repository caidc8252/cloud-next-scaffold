// 权限目录展示 VO：由 manifest 投影出的权限分组/条目，供角色页（权限勾选）渲染。
// 无单一域归属（跨 manifest/roles），故落 app 级共享 web/lib。
export type PermissionItem = {
  code: string;
  label: string;
  desc: string;
  require: string | null;
};

export type PermissionGroup = {
  menuId: string;
  menuTitle: string;
  items: PermissionItem[];
};
