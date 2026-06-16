import { describe, expect, it } from "vitest";
import { toClientRole, extractPermissionCodes } from "./roles.mapper";

describe("extractPermissionCodes", () => {
  it("keeps only string entries from the permission_codes JSONB", () => {
    expect(extractPermissionCodes(["users.view", 1, null, "roles.add"])).toEqual([
      "users.view",
      "roles.add",
    ]);
  });

  it("returns [] for a non-array", () => {
    expect(extractPermissionCodes(null)).toEqual([]);
  });
});

function baseRow(overrides: Record<string, unknown> = {}) {
  return {
    roleId: 1003, // ≥1001 → 动态 PRIVATE，非内置
    roleName: "Ops",
    roleType: "PRIVATE",
    contractType: "ADMIN",
    remark: "ops team",
    updTime: new Date("2026-01-02T00:00:00.000Z"),
    updUserId: 1,
    permissionCodes: ["users.view"],
    ...overrides,
  } as Parameters<typeof toClientRole>[0];
}

describe("toClientRole", () => {
  it("maps a role row to the client VO with operator count and updater name", () => {
    const role = toClientRole(baseRow(), "admin", 4);
    expect(role).toMatchObject({
      id: "1003",
      name: "Ops",
      description: "ops team",
      builtin: false,
      operatorCount: 4,
      permissions: ["users.view"],
      updatedBy: "admin",
    });
  });

  it("flags builtin roles (roleId ≤ 1000) and empty description", () => {
    const role = toClientRole(baseRow({ roleId: 1, remark: null }), "system", 0);
    expect(role.builtin).toBe(true);
    expect(role.description).toBe("");
  });
});
