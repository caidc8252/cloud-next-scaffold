export type PermissionInput = string | string[];

export type PermissionSession = {
  roles: string[];
  permissions: string[];
};

export class PermissionChecker {
  private readonly roles: string[];
  private readonly permissionSet: Set<string>;

  constructor(session: PermissionSession) {
    this.roles = session.roles;
    this.permissionSet = new Set(session.permissions);
  }

  has(permissionKey: PermissionInput) {
    const permissions = Array.isArray(permissionKey) ? permissionKey : [permissionKey];
    return permissions.some((permission) => this.permissionSet.has(permission));
  }

  can(obj: string, method: PermissionInput) {
    const methods = Array.isArray(method) ? method : [method];
    const permissionKeys = this.roles.flatMap((role) =>
      methods.map((item) => `${role}.${obj}.${item}`),
    );

    return this.has(permissionKeys);
  }

  list() {
    return Array.from(this.permissionSet);
  }
}
