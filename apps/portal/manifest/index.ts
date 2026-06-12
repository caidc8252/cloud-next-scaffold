import { createPlatformConfig } from "@cloud/platform-config";
import { CONTRACT_KEYS, MENUS, ROLES } from "./_generated/apps";

export const PLATFORM_CONTRACTS = CONTRACT_KEYS;

const config = createPlatformConfig(MENUS, { contractTypes: CONTRACT_KEYS, roles: ROLES });

export const getMenus = config.getMenus;
export const getContractKeys = config.getContractKeys;
// 死写角色（GLOBAL，roleId ≤ 300）：会话角色解析（≤300）用 resolveRolePermissions 取权限码。
export const getRoles = config.getRoles;
export const resolveRolePermissions = config.resolveRolePermissions;
// party scope（会话与角色列表共用的单一来源）：当前契约可达菜单声明的全部权限码集合。
export const resolvePartyScope = config.resolvePartyScope;
