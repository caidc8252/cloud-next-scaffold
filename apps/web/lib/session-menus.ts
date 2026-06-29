import "server-only";

import { cache } from "react";
import { getSession } from "@cloud/permissions/server";
import { buildMenuTree, type MenuTreeNode } from "@/manifest";

// 菜单不再存进会话快照，由本平台 manifest + 当前权限现算。
// 输出扁平结构（menuId 用字符串 menuCode），保持侧边栏 / 面包屑既有消费形状。
export type SidebarMenu = {
  menuId: string;
  menuTitle: string;
  path: string | null;
  icon: string | null;
  sort: number;
  parentMenuId: string | null;
};

function flatten(nodes: MenuTreeNode[], parentMenuId: string | null, out: SidebarMenu[]): SidebarMenu[] {
  for (const node of nodes) {
    out.push({
      menuId: node.menuCode,
      menuTitle: node.title,
      path: node.path,
      icon: node.icon,
      sort: node.order,
      parentMenuId,
    });
    if (node.children.length > 0) flatten(node.children, node.menuCode, out);
  }
  return out;
}

export const getSessionMenus = cache(async (): Promise<SidebarMenu[]> => {
  const session = await getSession();
  if (!session) return [];
  const tree = buildMenuTree(session.permissions);
  return flatten(tree, null, []);
});
