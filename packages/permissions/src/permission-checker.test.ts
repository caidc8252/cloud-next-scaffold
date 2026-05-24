import { describe, expect, it } from "vitest";
import { PermissionChecker } from "./index";

describe("PermissionChecker", () => {
  const checker = new PermissionChecker({
    permissions: ["dashboard:view", "user:read", "user:create", "role:read"],
  });

  it("has() returns true for existing permission", () => {
    expect(checker.has("dashboard:view")).toBe(true);
  });

  it("has() returns false for missing permission", () => {
    expect(checker.has("user:delete")).toBe(false);
  });

  it("has() accepts array and returns true if any match", () => {
    expect(checker.has(["user:delete", "user:read"])).toBe(true);
  });

  it("has() returns false if no array items match", () => {
    expect(checker.has(["user:delete", "role:delete"])).toBe(false);
  });

  it("hasAll() returns true when all permissions present", () => {
    expect(checker.hasAll(["user:read", "user:create"])).toBe(true);
  });

  it("hasAll() returns false when any permission missing", () => {
    expect(checker.hasAll(["user:read", "user:delete"])).toBe(false);
  });

  it("list() returns all permissions", () => {
    expect(checker.list()).toEqual(
      expect.arrayContaining(["dashboard:view", "user:read", "user:create", "role:read"])
    );
    expect(checker.list()).toHaveLength(4);
  });
});
