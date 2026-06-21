// AccountProfile / AccountSecurity / MfaStatus VO 已迁至 service/account；这里 re-export 保持既有导入点不变（类型 re-export 零运行时成本）。
// AccountPartner / Country 仍是本页 UI 用值对象，留在此处。
export type { AccountProfile, AccountSecurity, MfaStatus } from "@/service/account/types";

export type AccountPartner = {
  partyUserId: number; // SysPartyUser.partyUserId
  partyId: number;
  partyName: string; // SysParty.partyName
  authorizingType: "ADMIN" | "NORMAL"; // SysPartyUser.authorizingType
  authorizingTimestamp: string | null; // ISO
  status: string; // SysPartyUser.status (ACTIVE | LOCKED | ...)
  locked: boolean; // derived: status !== "ACTIVE"
  contractTypes: string[]; // SysPartyContract.authorizedContractType[]
  isCurrent: boolean; // partyId === session.currentPartyId
};

export type Country = {
  code: string;
  name: string;
  dial: string;
};
