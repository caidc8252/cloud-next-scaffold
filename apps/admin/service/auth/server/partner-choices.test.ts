import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./auth.repository", () => ({ listPartnerMembershipsWithContracts: vi.fn() }));

import * as repo from "./auth.repository";
import { listPartnerChoices } from "./partner-choices";

const NOW = new Date("2026-06-08T12:00:00.000Z");

beforeEach(() => vi.resetAllMocks());

describe("listPartnerChoices", () => {
  it("maps raw facts and computes validContract per partner timezone", async () => {
    vi.mocked(repo.listPartnerMembershipsWithContracts).mockResolvedValue([
      {
        partnerId: 1,
        status: "ACTIVE",
        authorizingType: "ADMIN",
        partner: {
          partnerId: 1,
          partnerName: "Acme",
          status: "ACTIVE",
          timezone: "UTC",
          contracts: [
            { authorizedContractType: "ISO", effectiveFromDate: new Date("2026-06-01T00:00:00Z"), effectiveToDate: new Date("2026-06-30T00:00:00Z") },
          ],
        },
      },
      {
        partnerId: 2,
        status: "LOCKED",
        authorizingType: "NORMAL",
        partner: {
          partnerId: 2,
          partnerName: "Globex",
          status: "ACTIVE",
          timezone: "UTC",
          contracts: [
            { authorizedContractType: "ISO", effectiveFromDate: null, effectiveToDate: new Date("2026-06-07T00:00:00Z") }, // expired
          ],
        },
      },
    ] as never);

    const out = await listPartnerChoices(1, NOW);

    expect(out).toEqual([
      { partnerId: 1, partnerName: "Acme", partnerStatus: "ACTIVE", userStatus: "ACTIVE", authorizingType: "ADMIN", validContract: true },
      { partnerId: 2, partnerName: "Globex", partnerStatus: "ACTIVE", userStatus: "LOCKED", authorizingType: "NORMAL", validContract: false },
    ]);
  });

  it("normalizes any non-ADMIN authorizingType to NORMAL", async () => {
    vi.mocked(repo.listPartnerMembershipsWithContracts).mockResolvedValue([
      {
        partnerId: 3,
        status: "ACTIVE",
        authorizingType: "WHATEVER",
        partner: { partnerId: 3, partnerName: "P", status: "ACTIVE", timezone: "UTC", contracts: [] },
      },
    ] as never);

    const out = await listPartnerChoices(1, NOW);
    expect(out[0].authorizingType).toBe("NORMAL");
    expect(out[0].validContract).toBe(false);
  });
});
