import type { GeneratedMenuEntry } from "./registry-types.ts";

export interface MenuTreeNode {
  menuCode: string; title: string; path: string | null; icon: string | null; order: number; children: MenuTreeNode[];
}

export function createCocConfig(input: {
  menuRegistry: Record<string, GeneratedMenuEntry>;
  contractScope: Record<string, readonly string[]>;
  globalRoles: readonly { roleId: number; permissionCodes: readonly string[] }[];
  codeToMenu: (code: string) => string | null;
}) {
  const { menuRegistry, contractScope, globalRoles, codeToMenu } = input;
  const roleById = new Map(globalRoles.map((r) => [r.roleId, r]));

  const resolveRolePermissions = (roleId: number): string[] | undefined => {
    const r = roleById.get(roleId);
    return r ? [...r.permissionCodes] : undefined;
  };

  const resolvePartyScope = (contracts: string | readonly string[]): Set<string> => {
    const list = typeof contracts === "string" ? [contracts] : contracts;
    const set = new Set<string>();
    for (const c of list) for (const code of contractScope[c] ?? []) set.add(code);
    return set;
  };

  const buildMenuTree = (grantedCodes: readonly string[]): MenuTreeNode[] => {
    const granted = new Set(grantedCodes);
    const visible = new Set<string>();
    // 命中的码 → 其叶子菜单可见 → 连带祖先目录
    for (const code of granted) {
      let cur = codeToMenu(code);
      while (cur && !visible.has(cur)) {
        visible.add(cur);
        cur = menuRegistry[cur]?.parentMenuCode ?? null;
      }
    }
    const toNode = (m: GeneratedMenuEntry): MenuTreeNode => ({ menuCode: m.menuCode, title: m.title, path: m.path, icon: m.icon, order: m.order, children: [] });
    const nodes = new Map<string, MenuTreeNode>();
    for (const code of visible) { const m = menuRegistry[code]; if (m) nodes.set(code, toNode(m)); }
    const roots: MenuTreeNode[] = [];
    for (const code of visible) {
      const m = menuRegistry[code]; const node = nodes.get(code); if (!m || !node) continue;
      const parent = m.parentMenuCode ? nodes.get(m.parentMenuCode) : undefined;
      if (parent) parent.children.push(node); else roots.push(node);
    }
    const sortRec = (arr: MenuTreeNode[]) => { arr.sort((a, b) => a.order - b.order); for (const n of arr) sortRec(n.children); };
    sortRec(roots);
    return roots;
  };

  return { resolveRolePermissions, resolvePartyScope, buildMenuTree };
}
