import { beforeEach, describe, expect, it } from "vitest";
import {
  getPlatformManifest,
  getRegisteredPlatforms,
  registerAppManifest,
  resetRegistry,
  type AppManifest,
} from "../src/index.ts";

function manifest(appId: string): AppManifest {
  return {
    appId,
    menus: [{ menuCode: "home", menuTitle: "Home", parentMenuCode: null, path: "/", contractTypes: ["*"] }],
  };
}

describe("registry", () => {
  beforeEach(() => resetRegistry());

  it("registers and lists platforms", () => {
    registerAppManifest(manifest("web"));
    registerAppManifest(manifest("ops"));
    expect(getRegisteredPlatforms().sort()).toEqual(["ops", "web"]);
  });

  it("rejects registering the same platform twice", () => {
    registerAppManifest(manifest("web"));
    expect(() => registerAppManifest(manifest("web"))).toThrow(/already registered/);
  });

  it("isolates platforms — same code in two platforms is fine", () => {
    registerAppManifest(manifest("web"));
    expect(() => registerAppManifest(manifest("ops"))).not.toThrow();
    expect(getPlatformManifest("web").appId).toBe("web");
    expect(getPlatformManifest("ops").appId).toBe("ops");
  });

  it("throws when querying an unregistered platform", () => {
    expect(() => getPlatformManifest("ghost")).toThrow(/not registered/);
  });

  it("validates on register (rejects bad manifest)", () => {
    expect(() =>
      registerAppManifest({
        appId: "bad",
        menus: [{ menuCode: "x", menuTitle: "X", parentMenuCode: "missing", path: "/x", contractTypes: ["*"] }],
      }),
    ).toThrow(/missing parent/);
  });
});
