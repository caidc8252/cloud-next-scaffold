import "server-only";

import { prisma } from "@cloud/db";
import type { PartnerChoice } from "./partner-choice";
import { isContractEffective, partnerToday } from "./contract-validity";

function normalizeAuthorizingType(value: string): "ADMIN" | "NORMAL" {
  return value === "ADMIN" ? "ADMIN" : "NORMAL";
}

export async function listPartnerChoices(
  userId: number,
  now: Date = new Date(),
): Promise<PartnerChoice[]> {
  const memberships = await prisma.sysPartnerUser.findMany({
    where: { userId },
    include: {
      partner: {
        select: {
          partnerId: true,
          partnerName: true,
          status: true,
          timezone: true,
          contracts: {
            where: { status: "ACTIVE" },
            select: {
              authorizedContractType: true,
              effectiveFromDate: true,
              effectiveToDate: true,
            },
          },
        },
      },
    },
  });

  return memberships.map((membership) => {
    const today = partnerToday(membership.partner.timezone, now);
    const validContract = membership.partner.contracts.some((contract) =>
      isContractEffective(contract.effectiveFromDate, contract.effectiveToDate, today),
    );

    return {
      partnerId: membership.partnerId,
      partnerName: membership.partner.partnerName,
      partnerStatus: membership.partner.status,
      userStatus: membership.status,
      authorizingType: normalizeAuthorizingType(membership.authorizingType),
      validContract,
    };
  });
}
