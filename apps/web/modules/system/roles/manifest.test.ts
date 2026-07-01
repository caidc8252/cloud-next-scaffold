import { describe, expect, it } from "vitest";
import rolesManifest from "./manifest.ts";

describe("system/roles manifest", () => {
  it("declares menuCode system.roles with the real route", () => {
    expect(rolesManifest.menuCode).toBe("system.roles");
    expect(rolesManifest.parentMenuCode).toBe("system");
    expect(rolesManifest.entry.url).toBe("/system/roles");
  });
  it("declares 5 four-segment permissions (create, not add), all under system.roles", () => {
    expect(rolesManifest.permissions.map((p) => p.code)).toEqual([
      "system.roles.role.view", "system.roles.role.create", "system.roles.role.update",
      "system.roles.role.delete", "system.roles.role.duplicate",
    ]);
    for (const p of rolesManifest.permissions) expect(p.belongToMenuCode).toBe("system.roles");
  });
});
