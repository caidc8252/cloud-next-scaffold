import { describe, expect, it } from "vitest";
import {
  contractTypeGroup,
  isPresetAdminRole,
  resolvePortalGroup,
  roleIdInGroupRange,
} from "../src/contract-group.ts";

describe("contractTypeGroup", () => {
  it("maps each contract type to its portal group", () => {
    expect(contractTypeGroup("ADMIN")).toBe("ADMIN");
    expect(contractTypeGroup("US-ISO")).toBe("CUSTOMER");
    expect(contractTypeGroup("US-ISV-PILOT")).toBe("CUSTOMER");
    expect(contractTypeGroup("PLATFORM-CUSTOM")).toBe("CUSTOMER");
    expect(contractTypeGroup("MERCHANT")).toBe("MERCHANT");
    expect(contractTypeGroup("UNKNOWN")).toBeNull();
  });
});

describe("resolvePortalGroup", () => {
  it("resolves a single-group party", () => {
    expect(resolvePortalGroup(["US-ISO", "US-ISV"])).toBe("CUSTOMER");
    expect(resolvePortalGroup(["ADMIN"])).toBe("ADMIN");
    expect(resolvePortalGroup(["MERCHANT"])).toBe("MERCHANT");
  });

  it("falls back ADMIN>CUSTOMER>MERCHANT for cross-group dirty data", () => {
    expect(resolvePortalGroup(["MERCHANT", "US-ISO"])).toBe("CUSTOMER");
    expect(resolvePortalGroup(["MERCHANT", "US-ISO", "ADMIN"])).toBe("ADMIN");
  });

  it("returns null when nothing recognized / empty", () => {
    expect(resolvePortalGroup([])).toBeNull();
    expect(resolvePortalGroup(["UNKNOWN"])).toBeNull();
  });
});

describe("roleIdInGroupRange", () => {
  it("checks the hardcoded roleId range per group", () => {
    expect(roleIdInGroupRange(1, "ADMIN")).toBe(true);
    expect(roleIdInGroupRange(100, "ADMIN")).toBe(true);
    expect(roleIdInGroupRange(101, "ADMIN")).toBe(false);
    expect(roleIdInGroupRange(150, "CUSTOMER")).toBe(true);
    expect(roleIdInGroupRange(250, "MERCHANT")).toBe(true);
    expect(roleIdInGroupRange(1001, "CUSTOMER")).toBe(false);
  });
});

describe("isPresetAdminRole", () => {
  it("flags the preset (wildcard) admin role of each live group", () => {
    expect(isPresetAdminRole(1)).toBe(true); // ADMIN 组预置管理员
    expect(isPresetAdminRole(101)).toBe(true); // CUSTOMER 组预置管理员
  });

  it("does not flag merchant (201, deferred) or non-preset roles", () => {
    expect(isPresetAdminRole(201)).toBe(false); // merchant 缓做
    expect(isPresetAdminRole(2)).toBe(false); // Operator（普通编码角色）
    expect(isPresetAdminRole(102)).toBe(false); // 组内非基准 id
    expect(isPresetAdminRole(1001)).toBe(false); // DB 动态 PRIVATE 角色
  });
});
