export { defineAppManifest, defineAppRoles } from "./define.ts";
export {
  validateMenus,
  validateRoles,
  type ValidateOptions,
  type ValidateRolesOptions,
} from "./validate.ts";
export {
  createPlatformConfig,
  type CreatePlatformConfigOptions,
  type PlatformConfig,
} from "./create.ts";
export type { AppManifest, MenuEntry, MenuPermission, RoleDef, RoleType } from "./types.ts";
export {
  type PortalGroup,
  GROUP_ROLE_ID_RANGE,
  PRESET_ROLE_ID_MAX,
  PRESET_ROLE_ID_ALLOCATION_MAX,
  DB_ROLE_ID_MIN,
  contractTypeGroup,
  isPresetAdminRole,
  resolvePortalGroup,
  roleIdInGroupRange,
} from "./contract-group.ts";
