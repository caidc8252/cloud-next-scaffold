import type { MenuEntry, RoleDef } from "./types.ts";
import { PRESET_ROLE_ID_ALLOCATION_MAX } from "./contract-group.ts";

// 死写角色的 roleId 区间：1–300（1–100 admin / 101–200 customer / 201–300 merchant）。
// ≥1001 属 DB 动态 PRIVATE，不得出现在代码注册表。
const CODE_ROLE_MIN = 1;
const CODE_ROLE_MAX = PRESET_ROLE_ID_ALLOCATION_MAX;

// 权限码规范：<域>.<动作> 全小写 camel，单个点分隔。挡住 UPPER_SNAKE / 冒号等历史写法。
const PERMISSION_CODE_RE = /^[a-z][a-zA-Z0-9]*\.[a-z][a-zA-Z0-9]*$/;

export type ValidateOptions = {
  /** 合法契约码清单（不含 `*`）。提供时校验每个 menu 的 contractTypes 都在清单内。 */
  contractTypes?: readonly string[];
  /** 图标名校验器（返回 false 即非法）。不传则不校验图标。 */
  resolveIcon?: (name: string) => boolean;
};

function fail(message: string): never {
  throw new Error(`[platform-config] ${message}`);
}

function detectCycle(menus: MenuEntry[]): void {
  const parentOf = new Map(menus.map((m) => [m.menuCode, m.parentMenuCode]));
  for (const start of menus) {
    const seen = new Set<string>();
    let cur: string | null = start.menuCode;
    while (cur !== null) {
      if (seen.has(cur)) {
        fail(`menu "${start.menuCode}" is part of a parent cycle`);
      }
      seen.add(cur);
      cur = parentOf.get(cur) ?? null;
    }
  }
}

// require 链禁止成环（保证授权 UI 链式展开有限）。
function detectRequireCycle(menus: MenuEntry[]): void {
  const reqOf = new Map<string, string | null>();
  for (const m of menus) for (const p of m.permissions ?? []) reqOf.set(p.code, p.require ?? null);
  for (const [start] of reqOf) {
    const seen = new Set<string>();
    let cur: string | null = start;
    while (cur != null) {
      if (seen.has(cur)) fail(`permission require chain has a cycle at "${start}"`);
      seen.add(cur);
      cur = reqOf.get(cur) ?? null;
    }
  }
}

/**
 * 聚合菜单池的完整性校验（全局，跨 app 已拍平成一份）。任一项不满足即抛错。
 * - menuCode / permissionCode 全局唯一
 * - parentMenuCode 必须存在、parent 链不成环
 * - 目录（path 为 null）必须有子级
 * - contractTypes 都在合法清单内（若提供）；空数组 `[]` = 通用（对所有契约可见，取代旧 `*`）；
 *   通用菜单可声明 permissions，其权限码会进入每个 party 的 scope（跨控制台共享页，由业务自负）
 * - icon 合法（若提供校验器）
 */
export function validateMenus(menus: MenuEntry[], opts: ValidateOptions = {}): void {
  const allowedContracts = opts.contractTypes ? new Set<string>(opts.contractTypes) : null;

  const menuCodes = new Set<string>();
  const permissionCodes = new Set<string>();
  const childCount = new Map<string, number>();
  // require 边（from 依赖 to）+ code→所属菜单：等权限码池建完后统一校验存在性 / 同菜单。
  const requireEdges: { from: string; to: string; menu: string }[] = [];
  const codeToMenu = new Map<string, string>();

  for (const m of menus) {
    if (menuCodes.has(m.menuCode)) fail(`duplicate menuCode "${m.menuCode}"`);
    menuCodes.add(m.menuCode);

    for (const ct of m.contractTypes) {
      if (allowedContracts && !allowedContracts.has(ct)) {
        fail(`unknown contractType "${ct}" on menu "${m.menuCode}"`);
      }
    }

    if (m.icon && opts.resolveIcon && !opts.resolveIcon(m.icon)) {
      fail(`unknown icon "${m.icon}" on menu "${m.menuCode}"`);
    }

    for (const p of m.permissions ?? []) {
      if (!PERMISSION_CODE_RE.test(p.code)) {
        fail(`permission code "${p.code}" bad format (expected lowercase camel <domain>.<action>)`);
      }
      if (permissionCodes.has(p.code)) fail(`duplicate permissionCode "${p.code}"`);
      permissionCodes.add(p.code);
      codeToMenu.set(p.code, m.menuCode);
      if (p.require != null) requireEdges.push({ from: p.code, to: p.require, menu: m.menuCode });
    }

    if (m.parentMenuCode) {
      childCount.set(m.parentMenuCode, (childCount.get(m.parentMenuCode) ?? 0) + 1);
    }
  }

  for (const m of menus) {
    if (m.parentMenuCode !== null && !menuCodes.has(m.parentMenuCode)) {
      fail(`menu "${m.menuCode}" references missing parent "${m.parentMenuCode}"`);
    }
    const isGroup = m.path == null;
    if (isGroup && (childCount.get(m.menuCode) ?? 0) === 0) {
      fail(`group menu "${m.menuCode}" (no path) has no children`);
    }
  }

  // require 目标：必须存在、且与依赖方同菜单（不可跨菜单）。
  for (const e of requireEdges) {
    if (!permissionCodes.has(e.to)) {
      fail(`permission "${e.from}" require target "${e.to}" not found`);
    }
    if (codeToMenu.get(e.to) !== e.menu) {
      fail(`permission "${e.from}" require "${e.to}" is cross-menu (must be in menu "${e.menu}")`);
    }
  }

  detectCycle(menus);
  detectRequireCycle(menus);
}

export type ValidateRolesOptions = {
  /** 菜单池里出现过的全部 permissionCode；校验角色权限码都真实存在。 */
  menuPermissionCodes: Iterable<string>;
};

/**
 * 死写角色注册表的完整性校验（全局，跨 app 已拍平）。任一项不满足即抛错。
 * - roleId 全局唯一
 * - roleId 落在死写区间 [1, 300]（≥1001 属 DB 动态 PRIVATE）
 * - permissionCodes 都存在于菜单权限池（防止写了不存在的权限）
 */
export function validateRoles(roles: RoleDef[], opts: ValidateRolesOptions): void {
  const perms = new Set(opts.menuPermissionCodes);
  const ids = new Set<number>();
  for (const r of roles) {
    if (ids.has(r.roleId)) fail(`duplicate roleId ${r.roleId} ("${r.roleName}")`);
    ids.add(r.roleId);
    if (r.roleId < CODE_ROLE_MIN || r.roleId > CODE_ROLE_MAX) {
      fail(
        `roleId ${r.roleId} ("${r.roleName}") out of hardcoded range ${CODE_ROLE_MIN}–${CODE_ROLE_MAX} (≥1001 is DB-only)`,
      );
    }
    for (const code of r.permissionCodes) {
      if (!perms.has(code)) fail(`role "${r.roleName}" references unknown permissionCode "${code}"`);
    }
  }
}
