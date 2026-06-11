import "server-only";

import type { PartnerChoice } from "@/service/auth/partner-choice";
import { partnerToday, isContractEffective } from "./contract-validity";
import * as authRepository from "./auth.repository";

function normalizeAuthorizingType(value: string): "ADMIN" | "NORMAL" {
  return value === "ADMIN" ? "ADMIN" : "NORMAL";
}

/** 用户全部关联 partner 的展示用事实（含不可选）。可选性结论由调用方/前端按字段派生。 */
export async function listPartnerChoices(userId: number, now: Date = new Date()): Promise<PartnerChoice[]> {
  const memberships = await authRepository.listPartnerMembershipsWithContracts(userId);
  return memberships.map((m) => {
    const today = partnerToday(m.partner.timezone, now);
    const validContract = m.partner.contracts.some((c) =>
      isContractEffective(c.effectiveFromDate, c.effectiveToDate, today),
    );
    return {
      partnerId: m.partnerId,
      partnerName: m.partner.partnerName,
      partnerStatus: m.partner.status,
      userStatus: m.status,
      authorizingType: normalizeAuthorizingType(m.authorizingType),
      validContract,
    };
  });
}
