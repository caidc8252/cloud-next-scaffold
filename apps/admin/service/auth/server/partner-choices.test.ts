import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./auth.repository", () => ({ listPartyMembershipsWithContracts: vi.fn() }));

import * as repo from "./auth.repository";
import { listPartyChoices } from "./partner-choices";

const NOW = new Date("2026-06-08T12:00:00.000Z");

beforeEach(() => vi.resetAllMocks());

describe("listPartyChoices", () => {
  it("maps raw facts and computes validContract per partner timezone", async () => {
    vi.mocked(repo.listPartyMembershipsWithContracts).mockResolvedValue([
      {
        partyId: 1,
        status: "ACTIVE",
        authorizingType: "ADMIN",
        partner: {
          partyId: 1,
          partyName: "Acme",
          status: "ACTIVE",
          timezone: "UTC",
          contracts: [
            { authorizedContractType: "ISO", effectiveFromDate: new Date("2026-06-01T00:00:00Z"), effectiveToDate: new Date("2026-06-30T00:00:00Z") },
          ],
        },
      },
      {
        partyId: 2,
        status: "LOCKED",
        authorizingType: "NORMAL",
        partner: {
          partyId: 2,
          partyName: "Globex",
          status: "ACTIVE",
          timezone: "UTC",
          contracts: [
            { authorizedContractType: "ISO", effectiveFromDate: null, effectiveToDate: new Date("2026-06-07T00:00:00Z") }, // expired
          ],
        },
      },
    ] as never);

    const out = await listPartyChoices(1, NOW);

    expect(out).toEqual([
      { partyId: 1, partyName: "Acme", partnerStatus: "ACTIVE", userStatus: "ACTIVE", authorizingType: "ADMIN", validContract: true },
      { partyId: 2, partyName: "Globex", partnerStatus: "ACTIVE", userStatus: "LOCKED", authorizingType: "NORMAL", validContract: false },
    ]);
  });

  it("normalizes any non-ADMIN authorizingType to NORMAL", async () => {
    vi.mocked(repo.listPartyMembershipsWithContracts).mockResolvedValue([
      {
        partyId: 3,
        status: "ACTIVE",
        authorizingType: "WHATEVER",
        partner: { partyId: 3, partyName: "P", status: "ACTIVE", timezone: "UTC", contracts: [] },
      },
    ] as never);

    const out = await listPartyChoices(1, NOW);
    expect(out[0].authorizingType).toBe("NORMAL");
    expect(out[0].validContract).toBe(false);
  });
});
