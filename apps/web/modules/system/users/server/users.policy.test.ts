import { describe, expect, it } from "vitest";
import { isProtectedUser, isSelf, rolesChanged, canChangeRoles } from "./users.policy";

describe("isSelf", () => {
  it("is true only for the session's own user id", () => {
    expect(isSelf(7, 7)).toBe(true);
    expect(isSelf(7, 8)).toBe(false);
  });
});

describe("isProtectedUser", () => {
  it("protects the session's own account", () => {
    expect(isProtectedUser(7, 7, "NORMAL")).toBe(true);
  });

  it("protects ADMIN-authorized accounts", () => {
    expect(isProtectedUser(8, 7, "ADMIN")).toBe(true);
  });

  it("does not protect other NORMAL accounts", () => {
    expect(isProtectedUser(8, 7, "NORMAL")).toBe(false);
  });
});

describe("rolesChanged", () => {
  it("is false when the same set is given in a different order", () => {
    expect(rolesChanged([1, 2, 3], [3, 1, 2])).toBe(false);
  });

  it("is false for duplicates that normalize to the same set", () => {
    expect(rolesChanged([1, 2], [2, 2, 1])).toBe(false);
  });

  it("is true when an id is added or removed", () => {
    expect(rolesChanged([1, 2], [1, 2, 3])).toBe(true);
    expect(rolesChanged([1, 2, 3], [1, 2])).toBe(true);
  });
});

describe("canChangeRoles", () => {
  it("requires the users.changeRole permission", () => {
    expect(canChangeRoles(["system.users.user.update", "system.users.user.changeRole"])).toBe(true);
    expect(canChangeRoles(["system.users.user.update"])).toBe(false);
  });
});
