import { describe, expect, it } from "vitest";
import { selectApplicableRoles, type RoleRow } from "./role-selection";

function role(over: Partial<RoleRow>): RoleRow {
  return {
    roleId: 1,
    roleName: "R",
    roleType: "GLOBAL",
    partyId: null,
    permissionCodes: [],
    ...over,
  };
}

describe("selectApplicableRoles", () => {
  it("keeps GLOBAL roles regardless of partner (role 与 contract 解耦)", () => {
    const out = selectApplicableRoles({
      roles: [role({ roleId: 1, roleType: "GLOBAL" })],
      partyId: 10,
    });
    expect(out.map((r) => r.roleId)).toEqual([1]);
  });

  it("keeps a PRIVATE role only when its partyId matches the current partner", () => {
    const own = role({ roleId: 5, roleType: "PRIVATE", partyId: 10 });
    const foreign = role({ roleId: 6, roleType: "PRIVATE", partyId: 99 });
    const out = selectApplicableRoles({ roles: [own, foreign], partyId: 10 });
    expect(out.map((r) => r.roleId)).toEqual([5]);
  });
});
