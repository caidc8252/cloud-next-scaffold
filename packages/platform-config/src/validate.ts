import type { MenuEntry } from "./types.ts";

const WILDCARD = "*";

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

/**
 * 聚合菜单池的完整性校验（全局，跨 app 已拍平成一份）。任一项不满足即抛错。
 * - menuCode / permissionCode 全局唯一
 * - parentMenuCode 必须存在、parent 链不成环
 * - 目录（path 为 null）必须有子级
 * - contractTypes 非空且都在合法清单内（若提供）
 * - icon 合法（若提供校验器）
 */
export function validateMenus(menus: MenuEntry[], opts: ValidateOptions = {}): void {
  const allowedContracts = opts.contractTypes
    ? new Set<string>([...opts.contractTypes, WILDCARD])
    : null;

  const menuCodes = new Set<string>();
  const permissionCodes = new Set<string>();
  const childCount = new Map<string, number>();

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
      if (permissionCodes.has(p.code)) fail(`duplicate permissionCode "${p.code}"`);
      permissionCodes.add(p.code);
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

  detectCycle(menus);
}
