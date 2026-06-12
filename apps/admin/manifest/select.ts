// 平台菜单池的「解释逻辑」：菜单树 / 权限目录 / 有效权限。
// 纯函数，入参为「已按契约过滤好的」菜单（由 @/manifest 的 getMenus(contracts) 提供），
// 契约过滤不再在这里做。这层属于应用业务，不放进 @cloud/platform-config（包只采集 + 暴露数据）。
import type { MenuEntry } from "@cloud/platform-config";

export type MenuTreeNode = {
  menuCode: string;
  menuTitle: string;
  path: string | null;
  icon: string | null;
  order: number;
  children: MenuTreeNode[];
};

export type PermissionGroup = {
  menuCode: string;
  menuTitle: string;
  items: { code: string; label: string; desc: string }[];
};

/** "users.VIEW" -> "Users View"。仅在 permission 未给 label 时兜底。 */
function labelFromCode(code: string): string {
  return code
    .split(/[.:]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

/** 按菜单分组的权限目录（角色编辑器 / ADMIN 展开用）。只含带权限的菜单。 */
export function selectPermissionGroups(menus: MenuEntry[]): PermissionGroup[] {
  return menus
    .filter((m) => (m.permissions?.length ?? 0) > 0)
    .map((m) => ({
      menuCode: m.menuCode,
      menuTitle: m.menuTitle,
      items: (m.permissions ?? []).map((p) => ({
        code: p.code,
        label: p.label ?? labelFromCode(p.code),
        desc: p.desc ?? "",
      })),
    }));
}

/**
 * 算可见菜单树（侧边栏），入参 menus 已按契约过滤。
 * - 叶子（有 path）可见 = 无权限要求 或 命中任一已授权码；
 * - 可见叶子的祖先目录一并纳入（保证连通），无可见叶子的目录自然被裁掉；
 * - 按 order 升序组树。
 */
export function selectVisibleMenuTree(
  menus: MenuEntry[],
  grantedCodes: string[],
): MenuTreeNode[] {
  const byCode = new Map(menus.map((m) => [m.menuCode, m]));
  const granted = new Set(grantedCodes);

  const visible = new Set<string>();
  for (const m of menus) {
    if (m.path == null) continue; // 目录由可见叶子带出
    const perms = m.permissions ?? [];
    if (perms.length > 0 && !perms.some((p) => granted.has(p.code))) continue;

    let cur: MenuEntry | undefined = m;
    while (cur && !visible.has(cur.menuCode)) {
      visible.add(cur.menuCode);
      cur = cur.parentMenuCode ? byCode.get(cur.parentMenuCode) : undefined;
    }
  }

  const toNode = (m: MenuEntry): MenuTreeNode => ({
    menuCode: m.menuCode,
    menuTitle: m.menuTitle,
    path: m.path ?? null,
    icon: m.icon ?? null,
    order: m.order ?? 0,
    children: [],
  });

  const nodes = new Map<string, MenuTreeNode>();
  for (const code of visible) nodes.set(code, toNode(byCode.get(code)!));

  const roots: MenuTreeNode[] = [];
  for (const code of visible) {
    const entry = byCode.get(code)!;
    const node = nodes.get(code)!;
    const parentNode = entry.parentMenuCode ? nodes.get(entry.parentMenuCode) : undefined;
    if (parentNode) parentNode.children.push(node);
    else roots.push(node);
  }

  const sortRec = (arr: MenuTreeNode[]) => {
    arr.sort((a, b) => a.order - b.order);
    for (const node of arr) sortRec(node.children);
  };
  sortRec(roots);
  return roots;
}
