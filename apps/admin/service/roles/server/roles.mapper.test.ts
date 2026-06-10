import { describe, expect, it } from "vitest";
import { toClientRole, extractPermissionCodes } from "./roles.mapper";

describe("extractPermissionCodes", () => {
  it("keeps only string entries from the permission_codes JSONB", () => {
    expect(extractPermissionCodes(["users.VIEW", 1, null, "roles.ADD"])).toEqual([
      "users.VIEW",
      "roles.ADD",
    ]);
  });

  it("returns [] for a non-array", () => {
    expect(extractPermissionCodes(null)).toEqual([]);
  });
});

function baseRow(overrides: Record<string, unknown> = {}) {
  return {
    roleId: 3,
    roleName: "Ops",
    roleType: "GLOBAL",
    contractType: "ADMIN",
    remark: "ops team",
    updTime: new Date("2026-01-02T00:00:00.000Z"),
    updUserId: 1,
    permissionCodes: ["users.VIEW"],
    ...overrides,
  } as Parameters<typeof toClientRole>[0];
}

describe("toClientRole", () => {
  it("maps a role row to the client VO with operator count and updater name", () => {
    const role = toClientRole(baseRow(), "admin", 4);
    expect(role).toMatchObject({
      id: "3",
      name: "Ops",
      description: "ops team",
      builtin: false,
      operatorCount: 4,
      permissions: ["users.VIEW"],
      updatedBy: "admin",
    });
  });

  it("flags BUILTIN roles and empty description", () => {
    const role = toClientRole(baseRow({ roleType: "BUILTIN", remark: null }), "system", 0);
    expect(role.builtin).toBe(true);
    expect(role.description).toBe("");
  });
});
