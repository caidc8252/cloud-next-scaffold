import { describe, expect, it } from "vitest";
import * as codes from "./roles.error-codes";

const exportedCodes = Object.fromEntries(Object.entries(codes));

describe("roles error codes", () => {
  it("uses 5-hex-digit codes in the system.roles module id range", () => {
    expect(exportedCodes).toEqual({
      ERR_ROLE_NOT_FOUND: "11001",
      ERR_ROLE_NAME_SHORT: "11002",
      ERR_ROLE_DELETE_BUILTIN: "11003",
      ERR_ROLE_DELETE_ASSIGNED: "11004",
      ERR_ROLE_UPDATE_BUILTIN: "11005",
    });

    for (const code of Object.values(exportedCodes)) {
      expect(code).toMatch(/^[0-9A-F]{5}$/);
      expect(code.startsWith("11")).toBe(true);
    }
  });
});
