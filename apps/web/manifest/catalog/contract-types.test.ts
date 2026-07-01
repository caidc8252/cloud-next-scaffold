import { describe, expect, it } from "vitest";
import { CONTRACT_TYPES, CONTRACT_MENUS, CONTRACT_LABELS } from "./contract-types.ts";

describe("contract-types", () => {
  it("enumerates the four platform contracts", () => {
    expect([...CONTRACT_TYPES]).toEqual(["ADMIN", "US-ISO", "US-ISV", "MERCHANT"]);
  });
  it("gates roles behind ADMIN only; users under every contract", () => {
    expect(CONTRACT_MENUS.ADMIN).toEqual(["system.roles", "system.users"]);
    expect(CONTRACT_MENUS["US-ISO"]).toEqual(["system.users"]);
    expect(CONTRACT_MENUS["US-ISV"]).toEqual(["system.users"]);
    expect(CONTRACT_MENUS.MERCHANT).toEqual(["system.users"]);
  });
  it("has an i18n-key label per contract", () => {
    expect(CONTRACT_LABELS.ADMIN).toBe("contract.admin");
    expect(Object.keys(CONTRACT_LABELS)).toEqual([...CONTRACT_TYPES]);
  });
});
