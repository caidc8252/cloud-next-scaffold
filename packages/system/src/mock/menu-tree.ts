import type { MenuNode } from "../types";

export const MENU_TREE: MenuNode[] = [
  {
    id: "m-admin-users",
    parentId: null,
    title: "Platform Users",
    icon: "users",
    contractDefineCode: "ADMIN",
  },
  {
    id: "m-admin-roles",
    parentId: null,
    title: "Platform Roles",
    icon: "shield",
    contractDefineCode: "ADMIN",
  },
];
