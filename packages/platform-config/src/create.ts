import type { MenuEntry, RoleDef } from "./types.ts";
import { validateMenus, validateRoles, type ValidateOptions } from "./validate.ts";

const WILDCARD = "*";

export type CreatePlatformConfigOptions = {
  /** 全局契约枚举（多 app 聚合并集）。用于校验每个菜单的 contractTypes，并由 getContractKeys 暴露。 */
  contractTypes: readonly string[];
  /** 图标名校验器，透传给 validateMenus。 */
  resolveIcon?: ValidateOptions["resolveIcon"];
  /** 死写角色注册表（多 app 聚合并集）。构造期校验区间 / 唯一性 / 权限码存在性。 */
  roles?: readonly RoleDef[];
};

export type PlatformConfig = {
  getMenus: {
    (): MenuEntry[];
    (contract: string | string[]): MenuEntry[];
  };
  getContractKeys: () => string[];
  /** 全部死写角色（GLOBAL）。 */
  getRoles: () => RoleDef[];
  /** 解析死写角色的权限码；非死写 roleId（如 ≥1001 的 DB 动态角色）返回 undefined。 */
  resolveRolePermissions: (roleId: number) => string[] | undefined;
};

/** 菜单是否命中给定契约：菜单声明 `*` 即对所有契约可见，否则与请求契约有交集才命中。 */
function contractMatch(menuContracts: string[], wanted: string[]): boolean {
  if (menuContracts.includes(WILDCARD)) return true;
  return menuContracts.some((c) => wanted.includes(c));
}

/**
 * 用聚合后的扁平菜单池构造平台配置。
 * 构造期一次性做完整性校验（menuCode/permissionCode 全局唯一、parent 引用与环、
 * 目录必须有子级、契约与图标合法），非法即抛（启动期阻断）。
 * 无运行时可变状态：getMenus / getContractKeys 都返回拷贝。
 */
export function createPlatformConfig(
  menus: readonly MenuEntry[],
  opts: CreatePlatformConfigOptions,
): PlatformConfig {
  const all = [...menus];
  validateMenus(all, { contractTypes: opts.contractTypes, resolveIcon: opts.resolveIcon });
  const contractKeys = [...opts.contractTypes];

  // 死写角色：校验后建 roleId → 权限码 索引。权限码池 = 全部菜单声明过的 permissionCode。
  const roles = [...(opts.roles ?? [])];
  const menuPermissionCodes = all.flatMap((m) => (m.permissions ?? []).map((p) => p.code));
  validateRoles(roles, { menuPermissionCodes });
  const roleById = new Map(roles.map((r) => [r.roleId, r]));

  // 不传 → 全部；传单个契约或契约数组 → 命中该契约的菜单。
  function getMenus(): MenuEntry[];
  function getMenus(contract: string | string[]): MenuEntry[];
  function getMenus(contract?: string | string[]): MenuEntry[] {
    if (contract === undefined) return [...all];
    const wanted = typeof contract === "string" ? [contract] : contract;
    return all.filter((m) => contractMatch(m.contractTypes, wanted));
  }

  return {
    getMenus,
    getContractKeys: () => [...contractKeys],
    getRoles: () => roles.map((r) => ({ ...r, permissionCodes: [...r.permissionCodes] })),
    resolveRolePermissions: (roleId: number) => {
      const role = roleById.get(roleId);
      return role ? [...role.permissionCodes] : undefined;
    },
  };
}
