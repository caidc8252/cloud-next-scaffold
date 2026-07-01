import type { RegistryDiagnostic, RegistryResult } from "./registry-types.ts";

export function validateCatalog(args: {
  result: RegistryResult;
  roleCodes: readonly string[];
  contractMenus: readonly string[];
}): RegistryDiagnostic[] {
  const { result, roleCodes, contractMenus } = args;
  const out: RegistryDiagnostic[] = [];

  const missingRole = roleCodes.filter((c) => !result.permissionRegistry[c]);
  if (missingRole.length) out.push({ level: "error", rule: "catalog-ref-missing", message: `catalog/roles.ts references absent permission_code(s): ${missingRole.join(", ")}.`, codes: missingRole });

  const missingMenu = contractMenus.filter((m) => !result.menuRegistry[m]);
  if (missingMenu.length) out.push({ level: "error", rule: "contract-menu-missing", message: `catalog/contract-types.ts references absent menu_code(s): ${missingMenu.join(", ")}.`, codes: missingMenu });

  const nonLeaf = contractMenus.filter((m) => result.menuRegistry[m] && result.menuRegistry[m]!.path === null);
  if (nonLeaf.length) out.push({ level: "error", rule: "contract-menu-not-leaf", message: `catalog/contract-types.ts references directory (non-leaf) menu_code(s): ${nonLeaf.join(", ")}. Only leaf menus may be contract-gated.`, codes: nonLeaf });

  const referenced = new Set(contractMenus);
  const deadMenus = Object.values(result.menuRegistry).filter((m) => m.path !== null && !referenced.has(m.menuCode)).map((m) => m.menuCode);
  if (deadMenus.length) out.push({ level: "warning", rule: "dead-menu", message: `leaf menu(s) declared but referenced by no contract (dead menu): ${deadMenus.join(", ")}.`, codes: deadMenus });

  return out;
}
