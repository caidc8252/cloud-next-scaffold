import { describe, expect, it } from "vitest";
import {
  contractTypeGroup,
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
