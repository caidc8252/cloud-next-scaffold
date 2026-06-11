import { createPlatformConfig } from "@cloud/platform-config";
import { CONTRACT_KEYS, MENUS, ROLES } from "./_generated/apps";

export const PLATFORM_CONTRACTS = CONTRACT_KEYS;

const config = createPlatformConfig(MENUS, { contractTypes: CONTRACT_KEYS, roles: ROLES });

export const getMenus = config.getMenus;
export const getContractKeys = config.getContractKeys;
export const getRoles = config.getRoles;
export const resolveRolePermissions = config.resolveRolePermissions;
