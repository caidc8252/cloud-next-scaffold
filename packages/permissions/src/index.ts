export type PermissionInput = string | string[];

export type PermissionSession = {
  permissions: string[];
};

export class PermissionChecker {
  private readonly permissionSet: Set<string>;

  constructor(session: PermissionSession) {
    this.permissionSet = new Set(session.permissions);
  }

  has(permissionKey: PermissionInput) {
    const keys = Array.isArray(permissionKey) ? permissionKey : [permissionKey];
    return keys.some((key) => this.permissionSet.has(key));
  }

  hasAll(permissionKeys: string[]) {
    return permissionKeys.every((key) => this.permissionSet.has(key));
  }

  list() {
    return Array.from(this.permissionSet);
  }
}
