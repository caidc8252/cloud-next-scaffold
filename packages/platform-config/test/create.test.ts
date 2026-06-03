import { describe, expect, it } from "vitest";
import { createPlatformConfig, type AppManifest } from "../src/index.ts";

const CONTRACTS = ["ADMIN", "ISO", "ISV", "MERCHANT"] as const;

function manifest(appId: string): AppManifest {
  return {
    appId,
    contractKeys: ["ADMIN", "ISO"],
    menus: [
      { menuCode: "home", menuTitle: "Home", parentMenuCode: null, path: null, contractTypes: ["*"], order: 1 },
      {
        menuCode: "dash",
        menuTitle: "Dash",
        parentMenuCode: "home",
        path: "/dash",
        contractTypes: ["*"],
        order: 2,
        permissions: [{ code: "dash.VIEW" }],
      },
    ],
  };
}

describe("createPlatformConfig", () => {
  it("getPlatformManifest() returns every app manifest", () => {
    const cfg = createPlatformConfig([manifest("web"), manifest("ops")], { contractTypes: CONTRACTS });
    expect(cfg.getPlatformManifest().map((m) => m.appId)).toEqual(["web", "ops"]);
  });

  it("getPlatformManifest(appId) returns the matching manifest", () => {
    const cfg = createPlatformConfig([manifest("web"), manifest("ops")], { contractTypes: CONTRACTS });
    expect(cfg.getPlatformManifest("ops")?.appId).toBe("ops");
  });

  it("getPlatformManifest(appId) returns null for an unknown app", () => {
    const cfg = createPlatformConfig([manifest("web")], { contractTypes: CONTRACTS });
    expect(cfg.getPlatformManifest("ghost")).toBeNull();
  });

  it("getAppIds() lists every app id", () => {
    const cfg = createPlatformConfig([manifest("web"), manifest("ops")], { contractTypes: CONTRACTS });
    expect(cfg.getAppIds()).toEqual(["web", "ops"]);
  });

  it("getContractKeys() returns the configured contract keys", () => {
    const cfg = createPlatformConfig([manifest("web")], { contractTypes: CONTRACTS });
    expect(cfg.getContractKeys()).toEqual(["ADMIN", "ISO", "ISV", "MERCHANT"]);
  });

  it("validates each manifest at construction (throws on a bad one)", () => {
    expect(() =>
      createPlatformConfig(
        [
          {
            appId: "bad",
            contractKeys: ["ADMIN"],
            menus: [
              { menuCode: "x", menuTitle: "X", parentMenuCode: "missing", path: "/x", contractTypes: ["*"] },
            ],
          },
        ],
        { contractTypes: CONTRACTS },
      ),
    ).toThrow(/missing parent/);
  });

  it("rejects duplicate appId across apps", () => {
    expect(() =>
      createPlatformConfig([manifest("web"), manifest("web")], { contractTypes: CONTRACTS }),
    ).toThrow(/duplicate appId/);
  });

  it("getAppIds() returns a copy that cannot mutate internal state", () => {
    const cfg = createPlatformConfig([manifest("web"), manifest("ops")], { contractTypes: CONTRACTS });
    cfg.getAppIds().push("x");
    expect(cfg.getAppIds()).toEqual(["web", "ops"]);
  });
});
