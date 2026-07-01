import { describe, expect, it } from "vitest";
import { deriveMenuTitleKey, derivePermLabelKey, derivePermDescKey } from "./derive-i18n-keys.ts";

describe("derive-i18n-keys", () => {
  it("derives a flat menu title key from a dotted menuCode", () => {
    expect(deriveMenuTitleKey("system.roles")).toBe("menu.system_roles");
    expect(deriveMenuTitleKey("platform")).toBe("menu.platform");
  });

  it("derives symmetric _label / _desc permission keys, preserving camelCase segments", () => {
    expect(derivePermLabelKey("system.users.user.resetPassword")).toBe("permission.system_users_user_resetPassword_label");
    expect(derivePermDescKey("system.users.user.resetPassword")).toBe("permission.system_users_user_resetPassword_desc");
  });
});
