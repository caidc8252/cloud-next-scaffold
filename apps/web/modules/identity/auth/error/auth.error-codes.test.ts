import { describe, expect, it } from "vitest";
import * as codes from "./auth.error-codes";

const exportedCodes = Object.fromEntries(Object.entries(codes));

describe("auth error codes", () => {
  it("uses 5-hex-digit codes in the identity.auth module id range", () => {
    expect(exportedCodes).toEqual({
      ERR_AUTH_MISSING_FIELDS: "12001",
      ERR_AUTH_INVALID_CREDENTIALS: "12002",
      ERR_AUTH_ACCOUNT_LOCKED: "12003",
      ERR_AUTH_NO_ACTIVE_PARTNER: "12004",
      ERR_AUTH_NOT_AUTHENTICATED: "12005",
      ERR_AUTH_INVALID_PARTNER: "12006",
      ERR_AUTH_CREDENTIALS_REQUIRED: "12007",
      ERR_AUTH_PARTNER_REQUIRED: "12008",
      ERR_AUTH_ACCOUNT_DISABLED: "12009",
      ERR_AUTH_ENCRYPTION_INVALID: "1200A",
      ERR_AUTH_REQUEST_EXPIRED: "1200B",
      ERR_AUTH_MFA_TOKEN_INVALID: "1200C",
      ERR_AUTH_MFA_CODE_INVALID: "1200D",
      ERR_AUTH_MFA_LOCKED: "1200E",
      ERR_AUTH_MFA_NOT_CONFIGURED: "1200F",
    });

    for (const code of Object.values(exportedCodes)) {
      expect(code).toMatch(/^[0-9A-F]{5}$/);
      expect(code.startsWith("12")).toBe(true);
    }
  });
});
