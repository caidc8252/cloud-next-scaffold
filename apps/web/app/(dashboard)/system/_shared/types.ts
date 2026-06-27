// User / Role VO 已迁至各自 service 域；这里 re-export 保持既有导入点不变（类型 re-export 零运行时成本）。
export type { User } from "@/service/users/types";
export type { Role } from "@/modules/system/roles/server/roles.public";

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
