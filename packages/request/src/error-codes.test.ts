import { describe, expect, it } from "vitest";
import * as codes from "./error-codes.ts";

describe("@cloud/request error code ownership", () => {
  const expectedCodes = {
    ERR_BAD_REQUEST: "00001",
    ERR_UNAUTHORIZED: "00002",
    ERR_FORBIDDEN: "00003",
    ERR_NOT_FOUND: "00004",
    ERR_INTERNAL: "00005",
    ERR_INVALID_JSON: "00006",
    ERR_INVALID_ID: "00007",
    ERR_TOO_MANY_REQUESTS: "00008",
    ERR_MW_DB: "F0001",
    ERR_MW_CACHE: "F0002",
    ERR_MW_MAIL: "F0003",
    ERR_MW_UNKNOWN: "F0009",
  } as const;

  it("does not export app business module codes", () => {
    const appBusinessCodes = Object.keys(codes).filter((name) => /^ERR_(USER|ROLE)_/.test(name));

    expect(appBusinessCodes).toEqual([]);
  });

  it("uses shared/common module 00 and infra module F0 5-hex-digit codes", () => {
    expect(codes).toMatchObject(expectedCodes);

    for (const code of Object.values(expectedCodes)) {
      expect(code).toMatch(/^[0-9A-F]{5}$/);
    }
  });
});
