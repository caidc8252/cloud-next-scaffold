import "server-only";

import type { PartyChoice } from "./partner-choice";
import { partnerToday, isContractEffective } from "./contract-validity";
import * as authRepository from "./auth.repository";

function normalizeAuthorizingType(value: string): "ADMIN" | "NORMAL" {
  return value === "ADMIN" ? "ADMIN" : "NORMAL";
}

/** 用户全部关联 partner 的展示用事实（含不可选）。可选性结论由调用方/前端按字段派生。 */
export async function listPartyChoices(userId: number, now: Date = new Date()): Promise<PartyChoice[]> {
  const memberships = await authRepository.listPartyMembershipsWithContracts(userId);
  return memberships.map((m) => {
    const today = partnerToday(m.partner.timezone, now);
    const validContract = m.partner.contracts.some((c) =>
      isContractEffective(c.effectiveFromDate, c.effectiveToDate, today),
    );
    return {
      partyId: m.partyId,
      partyName: m.partner.partyName,
      partnerStatus: m.partner.status,
      userStatus: m.status,
      authorizingType: normalizeAuthorizingType(m.authorizingType),
      validContract,
    };
  });
}
