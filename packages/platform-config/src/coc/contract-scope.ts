import type { RegistryResult } from "./registry-types.ts";

/** 合同 → 该合同菜单解锁的全部(未 deprecated)权限码,排序去重。 */
export function deriveContractScope(
  contractMenus: Record<string, readonly string[]>,
  result: RegistryResult,
): Record<string, string[]> {
  const codesByMenu = new Map<string, string[]>();
  for (const e of Object.values(result.permissionRegistry)) {
    if (e.deprecated) continue;
    const arr = codesByMenu.get(e.belongToMenuCode) ?? [];
    arr.push(e.code);
    codesByMenu.set(e.belongToMenuCode, arr);
  }
  const out: Record<string, string[]> = {};
  for (const [contract, menus] of Object.entries(contractMenus)) {
    const set = new Set<string>();
    for (const menu of menus) for (const code of codesByMenu.get(menu) ?? []) set.add(code);
    out[contract] = [...set].sort();
  }
  return out;
}
