import type {
  GeneratedMenuEntry, GeneratedPermissionEntry, MenuTreeNodeDecl,
  ModuleManifest, RegistryDiagnostic, RegistryResult,
} from "./registry-types.ts";

const menuPrefixOf = (code: string): string => code.split(".").slice(0, 2).join(".");

export function buildRegistry(input: {
  modules: readonly ModuleManifest[];
  menuTree: readonly MenuTreeNodeDecl[];
  previous?: RegistryResult;
}): RegistryResult {
  const { modules, menuTree, previous } = input;
  const diagnostics: RegistryDiagnostic[] = [];

  // ---- 菜单注册表:目录(来自骨架)+ 叶子(来自模块) ----
  const menuRegistry: Record<string, GeneratedMenuEntry> = {};
  for (const n of menuTree) {
    menuRegistry[n.menuCode] = {
      menuCode: n.menuCode, title: n.title, parentMenuCode: n.parentMenuCode,
      path: null, icon: n.icon ?? null, order: n.order ?? 0,
    };
  }
  for (const m of modules) {
    menuRegistry[m.menuCode] = {
      menuCode: m.menuCode, title: m.title, parentMenuCode: m.parentMenuCode,
      path: m.entry.url, icon: m.icon ?? null, order: m.order ?? 0,
    };
  }
  const menuCodes = new Set(Object.keys(menuRegistry));

  // ---- 结构 guard:parent 存在 ----
  for (const code of menuCodes) {
    const parent = menuRegistry[code]!.parentMenuCode;
    if (parent !== null && !menuCodes.has(parent)) {
      diagnostics.push({ level: "error", rule: "parent-missing", message: `menu "${code}" references missing parent "${parent}".`, codes: [code] });
    }
  }

  // ---- 收集 real 码 + 结构 guard:belongToMenuCode 规则 + 重名 ----
  const seen = new Map<string, number>();
  const current = new Map<string, GeneratedPermissionEntry>();
  for (const m of modules) {
    for (const p of m.permissions) {
      seen.set(p.code, (seen.get(p.code) ?? 0) + 1);
      if (p.belongToMenuCode !== m.menuCode || p.belongToMenuCode !== menuPrefixOf(p.code)) {
        diagnostics.push({ level: "error", rule: "belongs-to-menu-rule", message: `permission "${p.code}": belongToMenuCode "${p.belongToMenuCode}" must equal module menuCode "${m.menuCode}" and code prefix "${menuPrefixOf(p.code)}".`, codes: [p.code] });
      }
      current.set(p.code, { code: p.code, belongToMenuCode: p.belongToMenuCode, label: p.label, desc: p.desc, deprecated: p.deprecated === true });
    }
  }
  for (const [code, n] of seen) {
    if (n > 1) diagnostics.push({ level: "error", rule: "duplicate-code", message: `duplicate permission_code "${code}" declared by ${n} modules.`, codes: [code] });
  }

  // ---- reconcile:从 previous 起底,叠加 current;消失的旧 real 码留存标 deprecated ----
  const permissionRegistry: Record<string, GeneratedPermissionEntry> = {};
  if (previous) for (const [code, e] of Object.entries(previous.permissionRegistry)) permissionRegistry[code] = { ...e };
  for (const [code, e] of current) permissionRegistry[code] = e;

  if (previous) {
    for (const [code, prev] of Object.entries(previous.permissionRegistry)) {
      if (prev.deprecated) continue;
      if (!current.has(code)) {
        permissionRegistry[code] = { ...prev, deprecated: true };
        diagnostics.push({ level: "error", rule: "deleted-without-deprecated", message: `permission_code "${code}" vanished without an explicit deprecated marker; retained as deprecated. Mark it deprecated in source or restore it.`, codes: [code] });
      }
    }
  }

  const permissionCodeUnion = Object.keys(permissionRegistry).sort();
  const menuCodeUnion = Object.keys(menuRegistry).sort();
  return { permissionRegistry, menuRegistry, permissionCodeUnion, menuCodeUnion, diagnostics };
}
