import { createCocConfig } from "@cloud/platform-config";
import { MENU_REGISTRY } from "./_generated/menu-registry.generated.ts";
import { codeToMenu } from "./_generated/permission-registry.generated.ts";
import { CONTRACT_SCOPE } from "./_generated/contract-scope.generated.ts";
import { GLOBAL_ROLES } from "./catalog/roles.ts";

// 运行时消费 CoC 生成产物(纯快照投影)。会话有效权限由 session-snapshot 按
// 角色码 ∩ resolvePartyScope(合同) 算好(ADMIN 直取 scope,见 C6);菜单由 buildMenuTree(有效码) 投影。
const config = createCocConfig({
  menuRegistry: MENU_REGISTRY,
  contractScope: CONTRACT_SCOPE,
  globalRoles: GLOBAL_ROLES,
  codeToMenu,
});

// party scope(会话与角色列表共用单一来源):当前契约可达菜单声明的全部权限码集合。
export const resolvePartyScope = config.resolvePartyScope;
// 死写 GLOBAL 角色(roleId ≤ 1000):resolveRolePermissions 解析单个角色权限码。
export const resolveRolePermissions = config.resolveRolePermissions;
// 按已授权码投影可见菜单树(叶子命中即可见,祖先连带,空目录裁掉)。
export const buildMenuTree = config.buildMenuTree;
// 死写 GLOBAL 角色目录(roleId 过滤 + 角色列表展示同口径共用)。
export const getRoles = (): typeof GLOBAL_ROLES => GLOBAL_ROLES;

export type { MenuTreeNode } from "@cloud/platform-config";
