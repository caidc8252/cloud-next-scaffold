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
  contractTypeGroup,
  resolvePortalGroup,
  roleIdInGroupRange,
} from "./contract-group.ts";
