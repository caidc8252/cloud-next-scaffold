import { describe, expect, it } from "vitest";
import { isPartySelectable, type PartyChoice } from "./partner-choice";

const base: PartyChoice = {
  partyId: 1,
  partyName: "Acme",
  partnerStatus: "ACTIVE",
  userStatus: "ACTIVE",
  authorizingType: "NORMAL",
  validContract: true,
};

describe("isPartySelectable", () => {
  it("is selectable when partner + user active and contract valid", () => {
    expect(isPartySelectable(base)).toBe(true);
  });
  it("is not selectable when partner disabled", () => {
    expect(isPartySelectable({ ...base, partnerStatus: "SUSPENDED" })).toBe(false);
  });
  it("is not selectable when user disabled", () => {
    expect(isPartySelectable({ ...base, userStatus: "LOCKED" })).toBe(false);
  });
  it("is not selectable without a valid contract", () => {
    expect(isPartySelectable({ ...base, validContract: false })).toBe(false);
  });
});
