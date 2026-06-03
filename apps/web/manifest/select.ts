// 平台 manifest 的「解释逻辑」：菜单树 / 权限目录 / 有效权限。
// 纯函数，入参为 manifest（由 @/manifest 的 getPlatformManifest 提供）。
// 这层属于应用业务，不放进 @cloud/platform-config（包只采集 + 暴露数据）。
import type { AppManifest, MenuEntry } from "@cloud/platform-config";

const WILDCARD = "*";

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

export type AuthorizingType = "ADMIN" | "NORMAL";

function contractMatch(menuContracts: string[], contracts: string[]): boolean {
  if (menuContracts.includes(WILDCARD)) return true;
  return menuContracts.some((c) => contracts.includes(c));
}

function menusFor(manifest: AppManifest, contracts: string[]): MenuEntry[] {
  return manifest.menus.filter((m) => contractMatch(m.contractTypes, contracts));
}

/** "users.VIEW" -> "Users View"。仅在 permission 未给 label 时兜底。 */
function labelFromCode(code: string): string {
  return code
    .split(/[.:]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

/** 按菜单分组的权限目录（角色编辑器 / ADMIN 展开用）。只含带权限的菜单。 */
export function selectPermissionGroups(manifest: AppManifest, contracts: string[]): PermissionGroup[] {
  return menusFor(manifest, contracts)
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
 * 算最终生效权限码。
 * - scoped = 契约范围内的全部权限码集合；
 * - ADMIN：返回全集；NORMAL：返回角色权限码 ∩ scoped。
 */
export function resolveEffectivePermissions(input: {
  manifest: AppManifest;
  contracts: string[];
  authorizingType: AuthorizingType;
  grantedRoleCodes?: string[];
}): string[] {
  const scoped = new Set<string>();
  for (const m of menusFor(input.manifest, input.contracts)) {
    for (const p of m.permissions ?? []) scoped.add(p.code);
  }
  if (input.authorizingType === "ADMIN") return [...scoped];
  return (input.grantedRoleCodes ?? []).filter((code) => scoped.has(code));
}

/**
 * 算可见菜单树（侧边栏）。
 * - 叶子（有 path）可见 = 契约命中 且（无权限要求 或 命中任一已授权码）；
 * - 可见叶子的祖先目录一并纳入（保证连通），目录不再单独按自身契约过滤；
 * - 按 order 升序组树。
 */
export function selectVisibleMenuTree(
  manifest: AppManifest,
  contracts: string[],
  grantedCodes: string[],
): MenuTreeNode[] {
  const byCode = new Map(manifest.menus.map((m) => [m.menuCode, m]));
  const granted = new Set(grantedCodes);

  const visible = new Set<string>();
  for (const m of manifest.menus) {
    if (m.path == null) continue; // 目录由可见叶子带出
    if (!contractMatch(m.contractTypes, contracts)) continue;
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
