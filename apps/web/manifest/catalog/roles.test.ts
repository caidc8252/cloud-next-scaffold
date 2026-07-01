import { describe, expect, it } from "vitest";
import { GLOBAL_ROLES } from "./roles.ts";

describe("catalog/roles", () => {
  it("declares preset admin (1) and operator (2)", () => {
    expect(GLOBAL_ROLES.map((r) => r.roleId)).toEqual([1, 2]);
  });
  it("preset admin lists every migrated 4-segment code (create, not add)", () => {
    const admin = GLOBAL_ROLES.find((r) => r.roleId === 1)!;
    expect(admin.permissionCodes).toContain("system.roles.role.create");
    expect(admin.permissionCodes).toContain("system.users.user.changeRole");
    expect(admin.permissionCodes).not.toContain("system.roles.role.add");
    expect(admin.permissionCodes).toHaveLength(12);
  });
  it("operator is view-only", () => {
    const op = GLOBAL_ROLES.find((r) => r.roleId === 2)!;
    expect(op.permissionCodes).toEqual(["system.roles.role.view", "system.users.user.view"]);
  });
});
