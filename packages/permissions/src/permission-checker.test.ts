import { describe, expect, it } from "vitest";
import { PermissionChecker } from "./index";

describe("PermissionChecker", () => {
  const checker = new PermissionChecker({
    roles: ["admin", "viewer"],
    permissions: ["admin.user.read", "admin.user.create", "viewer.report.read"],
  });

  it("checks a single permission", () => {
    expect(checker.has("admin.user.read")).toBe(true);
    expect(checker.has("admin.user.delete")).toBe(false);
  });

  it("checks any permission from a list", () => {
    expect(checker.has(["admin.user.delete", "viewer.report.read"])).toBe(true);
    expect(checker.has(["admin.user.delete", "viewer.report.delete"])).toBe(false);
  });

  it("checks object methods through roles", () => {
    expect(checker.can("user", "read")).toBe(true);
    expect(checker.can("user", ["delete", "create"])).toBe(true);
    expect(checker.can("order", ["read", "create"])).toBe(false);
  });
});
