import { describe, expect, it } from "vitest";
import { getAppIds, getContractKeys, getPlatformManifest, PLATFORM_ID } from "@/manifest";

describe("web platform manifest", () => {
  it("collects the web platform", () => {
    expect(getAppIds()).toContain(PLATFORM_ID);
  });

  it("exposes the web manifest via getPlatformManifest(appId)", () => {
    expect(getPlatformManifest(PLATFORM_ID)?.appId).toBe(PLATFORM_ID);
  });

  it("returns null for an unknown platform", () => {
    expect(getPlatformManifest("ghost")).toBeNull();
  });

  it("aggregates the declared contract keys", () => {
    expect(getContractKeys()).toEqual(expect.arrayContaining(["ADMIN", "ISO", "ISV", "MERCHANT"]));
  });

  it("getPlatformManifest() returns the full collection including web", () => {
    expect(getPlatformManifest().map((m) => m.appId)).toContain(PLATFORM_ID);
  });
});
