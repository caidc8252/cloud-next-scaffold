import { describe, expect, it } from "vitest";
import { validateAppManifest, type AppManifest } from "../src/index.ts";

function manifest(menus: AppManifest["menus"]): AppManifest {
  return { appId: "web", menus };
}

describe("validateAppManifest", () => {
  it("passes for a well-formed manifest", () => {
    expect(() =>
      validateAppManifest(
        manifest([
          { menuCode: "system", menuTitle: "System", parentMenuCode: null, path: null, contractTypes: ["*"] },
          { menuCode: "users", menuTitle: "Users", parentMenuCode: "system", path: "/system/users", contractTypes: ["ADMIN"], permissions: [{ code: "users.VIEW" }] },
        ]),
        { contractTypes: ["ADMIN", "ISO"] },
      ),
    ).not.toThrow();
  });

  it("rejects duplicate menuCode", () => {
    expect(() =>
      validateAppManifest(
        manifest([
          { menuCode: "a", menuTitle: "A", parentMenuCode: null, path: "/a", contractTypes: ["*"] },
          { menuCode: "a", menuTitle: "A2", parentMenuCode: null, path: "/a2", contractTypes: ["*"] },
        ]),
      ),
    ).toThrow(/duplicate menuCode "a"/);
  });

  it("rejects duplicate permissionCode", () => {
    expect(() =>
      validateAppManifest(
        manifest([
          { menuCode: "a", menuTitle: "A", parentMenuCode: null, path: "/a", contractTypes: ["*"], permissions: [{ code: "x.VIEW" }] },
          { menuCode: "b", menuTitle: "B", parentMenuCode: null, path: "/b", contractTypes: ["*"], permissions: [{ code: "x.VIEW" }] },
        ]),
      ),
    ).toThrow(/duplicate permissionCode "x.VIEW"/);
  });

  it("rejects a missing parent reference", () => {
    expect(() =>
      validateAppManifest(
        manifest([
          { menuCode: "child", menuTitle: "Child", parentMenuCode: "ghost", path: "/c", contractTypes: ["*"] },
        ]),
      ),
    ).toThrow(/missing parent "ghost"/);
  });

  it("rejects a parent cycle", () => {
    expect(() =>
      validateAppManifest(
        manifest([
          { menuCode: "a", menuTitle: "A", parentMenuCode: "b", path: null, contractTypes: ["*"] },
          { menuCode: "b", menuTitle: "B", parentMenuCode: "a", path: null, contractTypes: ["*"] },
        ]),
      ),
    ).toThrow(/parent cycle/);
  });

  it("rejects an unknown contract type when a list is provided", () => {
    expect(() =>
      validateAppManifest(
        manifest([
          { menuCode: "a", menuTitle: "A", parentMenuCode: null, path: "/a", contractTypes: ["NOPE"] },
        ]),
        { contractTypes: ["ADMIN"] },
      ),
    ).toThrow(/unknown contractType "NOPE"/);
  });

  it("rejects a group (no path) with no children", () => {
    expect(() =>
      validateAppManifest(
        manifest([
          { menuCode: "empty", menuTitle: "Empty", parentMenuCode: null, path: null, contractTypes: ["*"] },
        ]),
      ),
    ).toThrow(/group menu "empty" \(no path\) has no children/);
  });

  it("rejects an unknown icon when a resolver is provided", () => {
    expect(() =>
      validateAppManifest(
        manifest([
          { menuCode: "a", menuTitle: "A", parentMenuCode: null, path: "/a", icon: "made-up", contractTypes: ["*"] },
        ]),
        { resolveIcon: (name) => name === "users" },
      ),
    ).toThrow(/unknown icon "made-up"/);
  });
});
