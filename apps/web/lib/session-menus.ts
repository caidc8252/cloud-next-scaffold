import "server-only";

import { cache } from "react";
import { getSession } from "@cloud/permissions/server";
import { buildMenuTree, type MenuTreeNode } from "@/manifest";

// 菜单不再存进会话快照，由本平台 manifest + 当前权限现算。
// 扁平结构，沿用 CoC 术语 menuCode/title/parentMenuCode，保持侧边栏 / 面包屑消费形状。
export type SidebarMenu = {
  menuCode: string;
  title: string;
  path: string | null;
  icon: string | null;
  sort: number;
  parentMenuCode: string | null;
};

function flatten(nodes: MenuTreeNode[], parentMenuCode: string | null, out: SidebarMenu[]): SidebarMenu[] {
  for (const node of nodes) {
    out.push({
      menuCode: node.menuCode,
      title: node.title,
      path: node.path,
      icon: node.icon,
      sort: node.order,
      parentMenuCode,
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
