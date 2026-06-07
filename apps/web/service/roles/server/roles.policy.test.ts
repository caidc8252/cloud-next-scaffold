import { describe, expect, it } from "vitest";
import { roleBelongsToPartner, isBuiltinRole } from "./roles.policy";

describe("roleBelongsToPartner", () => {
  it("accepts global roles (partnerId null) for any partner", () => {
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
  it("is true only for the BUILTIN role type", () => {
    expect(isBuiltinRole("BUILTIN")).toBe(true);
    expect(isBuiltinRole("GLOBAL")).toBe(false);
  });
});
