import { describe, expect, it } from "vitest";
import { getContractKeys, getMenus, PLATFORM_CONTRACTS } from "@/manifest";

describe("web platform manifest", () => {
  it("getMenus() returns the aggregated flat menu pool", () => {
    const codes = getMenus().map((m) => m.menuCode);
    expect(codes).toContain("dashboard");
    expect(codes).toContain("system");
  });

  it("getMenus(contract) keeps wildcard menus and that contract's menus", () => {
    const codes = getMenus("ADMIN").map((m) => m.menuCode);
    expect(codes).toContain("roles"); // contractTypes: ["ADMIN"]
    expect(codes).toContain("dashboard"); // contractTypes: ["*"]
  });

  it("hides ADMIN-only menus from a non-ADMIN contract", () => {
    const codes = getMenus("ISO").map((m) => m.menuCode);
    expect(codes).not.toContain("roles");
    expect(codes).toContain("dashboard");
  });

  it("exposes the platform's bound contracts", () => {
    expect(PLATFORM_CONTRACTS).toEqual(["ADMIN", "ISO", "ISV", "MERCHANT"]);
    expect(getContractKeys()).toEqual(["ADMIN", "ISO", "ISV", "MERCHANT"]);
  });
});
