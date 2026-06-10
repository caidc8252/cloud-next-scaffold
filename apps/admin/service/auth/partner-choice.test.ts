import { describe, expect, it } from "vitest";
import { isPartnerSelectable, type PartnerChoice } from "./partner-choice";

const base: PartnerChoice = {
  partnerId: 1,
  partnerName: "Acme",
  partnerStatus: "ACTIVE",
  userStatus: "ACTIVE",
  authorizingType: "NORMAL",
  validContract: true,
};

describe("isPartnerSelectable", () => {
  it("is selectable when partner + user active and contract valid", () => {
    expect(isPartnerSelectable(base)).toBe(true);
  });
  it("is not selectable when partner disabled", () => {
    expect(isPartnerSelectable({ ...base, partnerStatus: "SUSPENDED" })).toBe(false);
  });
  it("is not selectable when user disabled", () => {
    expect(isPartnerSelectable({ ...base, userStatus: "LOCKED" })).toBe(false);
  });
  it("is not selectable without a valid contract", () => {
    expect(isPartnerSelectable({ ...base, validContract: false })).toBe(false);
  });
});
