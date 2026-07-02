// CoC 声明系统的数据形状(纯类型,无运行时 import)。
// 注:title 由 menuCode 派生;icon/order 由 manifest/menu-tree 携带。

/** 模块声明的一条权限。label/desc 不再声明,由 code 派生(见 derive-i18n-keys)。 */
export interface ModulePermissionDecl {
  code: string;             // <cat>.<mod>.<fn>.<action>
  belongToMenuCode: string; // 显式;guard 强制 == 本模块 menuCode == code 前两段
}

/** UI 模块唯一真源。title 由 menuCode 派生;无 contractTypes / platform / require。 */
export interface ModuleManifest {
  moduleCategory: string;
  moduleName: string;
  menuCode: string;            // <cat>.<mod>
  parentMenuCode: string;     // 挂到 menu-tree 骨架的目录 menuCode
  icon?: string;
  order?: number;
  entry: { url: string };     // 叶子页面 URL(无 category 段)
  permissions: ModulePermissionDecl[];
}

/** 目录(非叶子)骨架节点。title 由 menuCode 派生;无 contractTypes / permissions / path。 */
export interface MenuTreeNodeDecl {
  menuCode: string;
  parentMenuCode: string | null;
  icon?: string;
  order?: number;
}

/** 生成的权限注册表条目。 */
export interface GeneratedPermissionEntry {
  code: string;
  belongToMenuCode: string;
  label: string;
  desc: string;
}

/** 生成的菜单注册表条目(叶子 + 目录拍平;无 contractTypes)。 */
export interface GeneratedMenuEntry {
  menuCode: string;
  title: string;
  parentMenuCode: string | null;
  path: string | null;        // 叶子有 path,目录为 null
  icon: string | null;
  order: number;
}

export type GuardRule =
  | "duplicate-code"
  | "duplicate-menu-code"
  | "code-underscore"
  | "menu-depth"
  | "belongs-to-menu-rule"
  | "menu-code-required"
  | "parent-missing"
  | "catalog-ref-missing"
  | "contract-menu-missing"
  | "contract-menu-not-leaf"
  | "dead-menu"
  | "role-id-out-of-range"
  | "duplicate-role-id";

export interface RegistryDiagnostic {
  level: "error" | "warning";
  rule: GuardRule;
  message: string;
  codes?: string[];
}

export interface RegistryResult {
  permissionRegistry: Record<string, GeneratedPermissionEntry>;
  menuRegistry: Record<string, GeneratedMenuEntry>;
  permissionCodeUnion: string[]; // 排序
  menuCodeUnion: string[];       // 排序
  diagnostics: RegistryDiagnostic[];
}
