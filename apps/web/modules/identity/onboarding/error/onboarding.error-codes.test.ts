import { describe, expect, it } from "vitest";
import * as codes from "./onboarding.error-codes";

const exportedCodes = Object.fromEntries(Object.entries(codes));

describe("onboarding error codes", () => {
  it("uses 5-hex-digit codes in the identity.onboarding module id range", () => {
    expect(exportedCodes).toEqual({
      ERR_OB_INVITE_NOT_FOUND: "14001",
      ERR_OB_INVITE_EXPIRED: "14002",
      ERR_OB_INVITE_CONSUMED: "14003",
      ERR_OB_EMAIL_TAKEN: "14004",
      ERR_OB_PASSWORD_WEAK: "14005",
      ERR_OB_NOT_AUTHENTICATED: "14006",
      ERR_OB_ALREADY_MEMBER: "14007",
    });

    for (const code of Object.values(exportedCodes)) {
      expect(code).toMatch(/^[0-9A-F]{5}$/);
      expect(code.startsWith("14")).toBe(true);
    }
  });
});
