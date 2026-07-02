import { describe, expect, it } from "vitest";
import * as codes from "./forgot.error-codes";

const exportedCodes = Object.fromEntries(Object.entries(codes));

describe("forgot password error codes", () => {
  it("uses 5-hex-digit codes in the identity.forgot-password module id range", () => {
    expect(exportedCodes).toEqual({
      ERR_FP_TOKEN_INVALID: "15001",
      ERR_FP_PASSWORD_WEAK: "15002",
      ERR_FP_PASSWORD_REUSED: "15003",
    });

    for (const code of Object.values(exportedCodes)) {
      expect(code).toMatch(/^[0-9A-F]{5}$/);
      expect(code.startsWith("15")).toBe(true);
    }
  });
});
