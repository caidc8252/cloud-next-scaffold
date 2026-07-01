import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const BUSINESS_MODULE_MIN = 0x10;
const BUSINESS_MODULE_MAX = 0xef;

describe("module error id registry", () => {
  it("claims business module ids for system users and roles", async () => {
    const registryPath = fileURLToPath(new URL("./module-error-id.ts", import.meta.url));
    if (!existsSync(registryPath)) {
      expect(existsSync(registryPath)).toBe(true);
      return;
    }

    const { MODULE_ERROR_IDS } = await import("./module-error-id");

    expect(MODULE_ERROR_IDS).toMatchObject({
      "system.users": "10",
      "system.roles": "11",
      "identity.auth": "12",
      "identity.account": "13",
      "identity.onboarding": "14",
      "identity.forgot-password": "15",
    });

    const ids = Object.values(MODULE_ERROR_IDS);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[0-9A-F]{2}$/);
      const value = Number.parseInt(id, 16);
      expect(value).toBeGreaterThanOrEqual(BUSINESS_MODULE_MIN);
      expect(value).toBeLessThanOrEqual(BUSINESS_MODULE_MAX);
    }
  });
});
