import type { MenuEntry } from "./types.ts";
import { validateMenus, type ValidateOptions } from "./validate.ts";

const WILDCARD = "*";

export type CreatePlatformConfigOptions = {
  /** 全局契约枚举（多 app 聚合并集）。用于校验每个菜单的 contractTypes，并由 getContractKeys 暴露。 */
  contractTypes: readonly string[];
  /** 图标名校验器，透传给 validateMenus。 */
  resolveIcon?: ValidateOptions["resolveIcon"];
};

export type PlatformConfig = {
  getMenus: {
    (): MenuEntry[];
    (contract: string | string[]): MenuEntry[];
  };
  getContractKeys: () => string[];
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
  };
}
