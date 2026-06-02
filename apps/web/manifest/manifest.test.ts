import { beforeEach, describe, expect, it } from "vitest";
import {
  getMenus,
  getPermissionCatalog,
  getVisibleMenuTree,
  registerAppManifest,
  resetRegistry,
  validateAppManifest,
} from "@cloud/platform-config";
import { appManifest, CONTRACT_TYPES, PLATFORM_ID } from "@/manifest";

describe("web platform manifest", () => {
  it("appId matches PLATFORM_ID", () => {
    expect(appManifest.appId).toBe(PLATFORM_ID);
  });

  it("passes platform-config integrity validation", () => {
    expect(() =>
      validateAppManifest(appManifest, { contractTypes: CONTRACT_TYPES }),
    ).not.toThrow();
  });

  describe("registered queries", () => {
    beforeEach(() => {
      resetRegistry();
      registerAppManifest(appManifest, { contractTypes: CONTRACT_TYPES });
    });

    it("exposes the expected permission catalog under ADMIN", () => {
      const codes = getPermissionCatalog(PLATFORM_ID, "ADMIN").flatMap((g) =>
        g.items.map((i) => i.code),
      );
      expect(codes).toContain("dashboard:view");
      expect(codes).toContain("roles.VIEW");
      expect(codes).toContain("users.CHANGE_ROLE");
      expect(codes).toContain("storage.UPLOAD");
    });

    it("scopes Roles to the ADMIN contract only", () => {
      expect(getMenus(PLATFORM_ID, "ADMIN").map((m) => m.menuCode)).toContain("roles");
      expect(getMenus(PLATFORM_ID, "ISO").map((m) => m.menuCode)).not.toContain("roles");
    });

    it("an ADMIN-contract user with all codes sees the full tree", () => {
      const allCodes = appManifest.menus.flatMap((m) => (m.permissions ?? []).map((p) => p.code));
      const tree = getVisibleMenuTree(PLATFORM_ID, "ADMIN", allCodes);
      const sections = tree.map((n) => n.menuCode);
      expect(sections).toEqual(["home", "system", "storage"]);
    });
  });
});
