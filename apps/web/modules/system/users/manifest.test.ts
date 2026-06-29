import { describe, expect, it } from "vitest";
import usersManifest from "./manifest.ts";

describe("system/users manifest", () => {
  it("declares menuCode system.users with the real route", () => {
    expect(usersManifest.menuCode).toBe("system.users");
    expect(usersManifest.parentMenuCode).toBe("system");
    expect(usersManifest.entry.url).toBe("/system/users");
  });
  it("declares 7 four-segment permissions (create, not add), all under system.users", () => {
    expect(usersManifest.permissions.map((p) => p.code)).toEqual([
      "system.users.user.view", "system.users.user.create", "system.users.user.invite",
      "system.users.user.update", "system.users.user.lock", "system.users.user.resetPassword",
      "system.users.user.changeRole",
    ]);
    for (const p of usersManifest.permissions) expect(p.belongToMenuCode).toBe("system.users");
  });
});
