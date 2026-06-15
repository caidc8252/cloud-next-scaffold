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
  isPresetAdminRole,
  resolvePortalGroup,
  roleIdInGroupRange,
} from "./contract-group.ts";
export { INVITE_TTL_MS, INVITE_TOKEN_BYTES } from "./invite.ts";
