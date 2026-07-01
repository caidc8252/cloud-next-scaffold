import { describe, expect, it } from "vitest";
import { resolvePartyScope, resolveRolePermissions, getRoles, buildMenuTree } from "./index.ts";

describe("manifest runtime (CoC)", () => {
  it("resolvePartyScope unions contract scopes (Set)", () => {
    const scope = resolvePartyScope(["ADMIN"]);
    expect(scope.has("system.roles.role.view")).toBe(true);
    expect(scope.has("system.users.user.view")).toBe(true);
    const iso = resolvePartyScope(["US-ISO"]);
    expect(iso.has("system.roles.role.view")).toBe(false);
    expect(iso.has("system.users.user.view")).toBe(true);
  });
  it("getRoles + resolveRolePermissions expose preset admin's codes", () => {
    expect(getRoles().map((r) => r.roleId)).toEqual([1, 2]);
    expect(resolveRolePermissions(1)).toContain("system.roles.role.create");
    expect(resolveRolePermissions(999)).toBeUndefined();
  });
  it("buildMenuTree projects visible leaves + ancestors from granted codes", () => {
    const tree = buildMenuTree(["system.users.user.view"]);
    expect(tree).toHaveLength(1);
    expect(tree[0]!.menuCode).toBe("system");
    expect(tree[0]!.children.map((c) => c.menuCode)).toEqual(["system.users"]);
  });
});
