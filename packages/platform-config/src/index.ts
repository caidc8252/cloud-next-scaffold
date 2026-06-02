export { defineAppManifest } from "./define.ts";
export { validateAppManifest, type ValidateOptions } from "./validate.ts";
export {
  registerAppManifest,
  resetRegistry,
  getRegisteredPlatforms,
  getPlatformManifest,
} from "./registry.ts";
export {
  getMenus,
  getPermissionCatalog,
  resolveEffectivePermissions,
  getVisibleMenuTree,
  isKnownPermissionCode,
} from "./query.ts";
export type {
  AppManifest,
  AuthorizingType,
  ContractFilter,
  MenuEntry,
  MenuPermission,
  MenuTreeNode,
  PermissionCatalogItem,
  PermissionGroup,
} from "./types.ts";
