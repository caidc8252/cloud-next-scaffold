import { describe, expect, it } from "vitest";
import { roleBelongsToPartner, isBuiltinRole } from "./roles.policy";

describe("roleBelongsToPartner", () => {
  it("accepts global roles (partyId null) for any partner", () => {
    expect(roleBelongsToPartner(null, 100)).toBe(true);
  });

  it("accepts a role owned by the current partner", () => {
    expect(roleBelongsToPartner(100, 100)).toBe(true);
  });

  it("rejects a role owned by another partner", () => {
    expect(roleBelongsToPartner(200, 100)).toBe(false);
  });
});

describe("isBuiltinRole", () => {
  it("is true for hardcoded roleIds (≤ 300) and false for dynamic ones (≥ 1001)", () => {
    expect(isBuiltinRole(1)).toBe(true);
    expect(isBuiltinRole(300)).toBe(true);
    expect(isBuiltinRole(1001)).toBe(false);
  });
});
