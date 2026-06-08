import { describe, expect, it } from "vitest";
import { selectApplicableRoles, type RoleRow } from "./role-selection";

function role(over: Partial<RoleRow>): RoleRow {
  return {
    roleId: 1,
    roleName: "R",
    roleType: "PUBLIC",
    contractType: "ISO",
    partnerId: null,
    permissionCodes: [],
    ...over,
  };
}

describe("selectApplicableRoles", () => {
  const ctx = { contractTypes: ["ISO"], blockedRoleIds: new Set<number>(), partnerId: 10 };

  it("keeps a role whose contractType is in the partner's valid contracts", () => {
    const out = selectApplicableRoles({ roles: [role({ roleId: 1, contractType: "ISO" })], ...ctx });
    expect(out.map((r) => r.roleId)).toEqual([1]);
  });

  it("drops a role whose contractType is not in the valid contracts", () => {
    const out = selectApplicableRoles({ roles: [role({ roleId: 2, contractType: "MERCHANT" })], ...ctx });
    expect(out).toEqual([]);
  });

  it("keeps a public role (contractType === '*') regardless of contracts", () => {
    const out = selectApplicableRoles({ roles: [role({ roleId: 3, contractType: "*" })], ...ctx });
    expect(out.map((r) => r.roleId)).toEqual([3]);
  });

  it("drops a blocklisted role", () => {
    const out = selectApplicableRoles({
      roles: [role({ roleId: 4, contractType: "ISO" })],
      ...ctx,
      blockedRoleIds: new Set([4]),
    });
    expect(out).toEqual([]);
  });

  it("keeps a PRIVATE role only when its partnerId matches the current partner", () => {
    const own = role({ roleId: 5, roleType: "PRIVATE", contractType: "ISO", partnerId: 10 });
    const foreign = role({ roleId: 6, roleType: "PRIVATE", contractType: "ISO", partnerId: 99 });
    const out = selectApplicableRoles({ roles: [own, foreign], ...ctx });
    expect(out.map((r) => r.roleId)).toEqual([5]);
  });
});
