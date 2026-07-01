import { describe, expect, it } from "vitest";
import { validateGlobalRoles } from "./validate-roles.ts";

describe("validateGlobalRoles", () => {
  it("passes for unique roleIds within range", () => {
    const d = validateGlobalRoles({ globalRoles: [{ roleId: 1, roleName: "a" }, { roleId: 2, roleName: "b" }], minId: 1, maxId: 300 });
    expect(d).toEqual([]);
  });
  it("errors when roleId exceeds the allocation max", () => {
    const d = validateGlobalRoles({ globalRoles: [{ roleId: 301, roleName: "x" }], minId: 1, maxId: 300 });
    expect(d.some((x) => x.rule === "role-id-out-of-range")).toBe(true);
  });
  it("errors when roleId is below min (0 / negative)", () => {
    const d = validateGlobalRoles({ globalRoles: [{ roleId: 0, roleName: "x" }], minId: 1, maxId: 300 });
    expect(d.some((x) => x.rule === "role-id-out-of-range")).toBe(true);
  });
  it("errors on duplicate roleId", () => {
    const d = validateGlobalRoles({ globalRoles: [{ roleId: 1, roleName: "a" }, { roleId: 1, roleName: "b" }], minId: 1, maxId: 300 });
    expect(d.some((x) => x.rule === "duplicate-role-id")).toBe(true);
  });
});
