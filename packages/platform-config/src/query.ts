import { getPlatformManifest } from "./registry.ts";
import type {
  AuthorizingType,
  ContractFilter,
  MenuEntry,
  MenuTreeNode,
  PermissionGroup,
} from "./types.ts";

const WILDCARD = "*";

/** undefined -> 不过滤（返回 null）；string -> 单元素数组；数组原样。 */
function normalizeContracts(contracts: ContractFilter): string[] | null {
  if (contracts === undefined) return null;
  return Array.isArray(contracts) ? contracts : [contracts];
}

function contractMatch(menuContracts: string[], filter: string[] | null): boolean {
  if (filter === null) return true;
  if (menuContracts.includes(WILDCARD)) return true;
  return menuContracts.some((c) => filter.includes(c));
}

function menusFor(platform: string, contracts: ContractFilter): MenuEntry[] {
  const filter = normalizeContracts(contracts);
  return getPlatformManifest(platform).menus.filter((m) => contractMatch(m.contractTypes, filter));
}

/** "users.VIEW" -> "Users View"。仅在 permission 未给 label 时兜底。 */
function labelFromCode(code: string): string {
  return code
    .split(/[.:]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

/** 该平台按契约过滤后的菜单（含目录与叶子）。不传契约 -> 全集。 */
export function getMenus(platform: string, contracts?: ContractFilter): MenuEntry[] {
  return menusFor(platform, contracts);
}

/** 按菜单分组的权限目录（角色编辑器 / ADMIN 展开用）。只含带权限的菜单。 */
export function getPermissionCatalog(
  platform: string,
  contracts?: ContractFilter,
): PermissionGroup[] {
  return menusFor(platform, contracts)
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

function contractScopedCodes(platform: string, contracts: ContractFilter): Set<string> {
  const codes = new Set<string>();
  for (const m of menusFor(platform, contracts)) {
    for (const p of m.permissions ?? []) codes.add(p.code);
  }
  return codes;
}

/**
 * 算最终生效权限码。
 * - 先取该平台 + 契约范围内的权限码集合（contracts 为空 -> 该平台全集）；
 * - ADMIN：返回全集；
 * - NORMAL：返回角色权限码 ∩ 范围集合（跨平台/越权的杂码自然剔除）。
 */
export function resolveEffectivePermissions(input: {
  platform: string;
  contracts?: ContractFilter;
  authorizingType: AuthorizingType;
  grantedRoleCodes?: string[];
}): string[] {
  const scoped = contractScopedCodes(input.platform, input.contracts);
  if (input.authorizingType === "ADMIN") return [...scoped];
  return (input.grantedRoleCodes ?? []).filter((code) => scoped.has(code));
}

/**
 * 算可见菜单树（侧边栏）。
 * - 叶子（有 path）可见 = 契约命中 且（无权限要求 或 命中任一已授权码）；
 * - 可见叶子的祖先目录一并纳入（保证树连通），目录不再单独按自身契约过滤；
 * - 按 order 升序组树。
 */
export function getVisibleMenuTree(
  platform: string,
  contracts: ContractFilter,
  grantedCodes: string[],
): MenuTreeNode[] {
  const manifest = getPlatformManifest(platform);
  const byCode = new Map(manifest.menus.map((m) => [m.menuCode, m]));
  const filter = normalizeContracts(contracts);
  const granted = new Set(grantedCodes);

  const visible = new Set<string>();
  for (const m of manifest.menus) {
    if (m.path == null) continue; // 目录由可见叶子带出
    if (!contractMatch(m.contractTypes, filter)) continue;
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

/** 校验某平台内是否存在该权限码（roles 写接口用，替代旧外键约束）。 */
export function isKnownPermissionCode(platform: string, code: string): boolean {
  return getPlatformManifest(platform).menus.some((m) =>
    (m.permissions ?? []).some((p) => p.code === code),
  );
}
