import "server-only";

import { prisma } from "@cloud/db";
import type { AccountPartner } from "@/app/(portal)/account/_shared/types";

// 加载用户归属的全部 partner（含 LOCKED）+ 各自非终止契约类型 → AccountPartner[]。
// route 与 page RSC 共用，避免重复查询。排序：当前优先、其次 ACTIVE、LOCKED 最后。
export async function loadAccountPartners(
  userId: number,
  currentPartnerId: number | null,
): Promise<AccountPartner[]> {
  const rows = await prisma.sysPartnerUser.findMany({
    where: { userId },
    include: { partner: { select: { partnerId: true, partnerName: true } } },
    orderBy: { authorizingTimestamp: "desc" },
  });

  const partnerIds = rows.map((r) => r.partnerId);
  const contracts = partnerIds.length
    ? await prisma.sysPartnerContract.findMany({
        where: { authorizedPartnerId: { in: partnerIds }, status: { not: "TERMINATED" } },
        select: { authorizedPartnerId: true, authorizedContractType: true },
      })
    : [];

  const typesByPartner = new Map<number, string[]>();
  for (const c of contracts) {
    const list = typesByPartner.get(c.authorizedPartnerId) ?? [];
    if (!list.includes(c.authorizedContractType)) list.push(c.authorizedContractType);
    typesByPartner.set(c.authorizedPartnerId, list);
  }

  const data: AccountPartner[] = rows.map((r) => ({
    partnerUserId: r.partnerUserId,
    partnerId: r.partnerId,
    partnerName: r.partner.partnerName,
    authorizingType: r.authorizingType === "ADMIN" ? "ADMIN" : "NORMAL",
    authorizingTimestamp: r.authorizingTimestamp?.toISOString() ?? null,
    status: r.status,
    locked: r.status !== "ACTIVE",
    contractTypes: typesByPartner.get(r.partnerId) ?? [],
    isCurrent: r.partnerId === currentPartnerId,
  }));

  data.sort((a, b) => {
    if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
    if (a.locked !== b.locked) return a.locked ? 1 : -1;
    return 0;
  });

  return data;
}
