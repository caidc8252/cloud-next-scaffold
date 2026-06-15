import { describe, expect, it } from "vitest";
import { getContractKeys, getMenus, PLATFORM_CONTRACTS } from "@/manifest";

describe("admin platform manifest", () => {
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
    const codes = getMenus("US-ISO").map((m) => m.menuCode);
    expect(codes).not.toContain("roles");
    expect(codes).toContain("dashboard");
  });

  it("keeps the S3 upload demo login-only", () => {
    const menus = getMenus("ADMIN");
    const codes = menus.map((m) => m.menuCode);
    const demo = menus.find((m) => m.menuCode === "s3-upload-demo");

    expect(codes).toContain("s3-upload-demo");
    expect(demo?.permissions ?? []).toEqual([]);
  });

  it("exposes the global contract union (across all apps)", () => {
    // CONTRACT_KEYS 是各 app 声明 contractKeys 的全局并集（admin + customer）。
    const expected = [
      "ADMIN",
      "MERCHANT",
      "PLATFORM-CUSTOM",
      "US-ISO",
      "US-ISO-PILOT",
      "US-ISV",
      "US-ISV-PILOT",
    ];
    expect(PLATFORM_CONTRACTS).toEqual(expected);
    expect(getContractKeys()).toEqual(expected);
  });
});
