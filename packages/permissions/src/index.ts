export type PermissionInput = string | string[];
export type PermissionCheck = {
  all?: string[];
  any?: string[];
};

export type PermissionSession = {
  permissions: string[];
};

export function hasPermissions(
  permissions: readonly string[],
  permissionKey: PermissionInput,
) {
  const keys = Array.isArray(permissionKey) ? permissionKey : [permissionKey];
  return keys.some((key) => permissions.includes(key));
}

export function hasAllPermissions(
  permissions: readonly string[],
  permissionKeys: readonly string[],
) {
  return permissionKeys.every((key) => permissions.includes(key));
}

export function matchesPermissionCheck(
  permissions: readonly string[],
  check: PermissionCheck,
) {
  const all = check.all ?? [];
  const any = check.any ?? [];
  const okAll = hasAllPermissions(permissions, all);
  const okAny = any.length === 0 || hasPermissions(permissions, any);
  return okAll && okAny;
}

export class PermissionChecker {
  private readonly permissionSet: Set<string>;
  private readonly permissions: string[];

  constructor(session: PermissionSession) {
    this.permissions = [...session.permissions];
    this.permissionSet = new Set(session.permissions);
  }

  has(permissionKey: PermissionInput) {
    return hasPermissions(this.permissions, permissionKey);
  }

  hasAll(permissionKeys: string[]) {
    return hasAllPermissions(this.permissions, permissionKeys);
  }

  matches(check: PermissionCheck) {
    return matchesPermissionCheck(this.permissions, check);
  }

  list() {
    return Array.from(this.permissionSet);
  }
}
