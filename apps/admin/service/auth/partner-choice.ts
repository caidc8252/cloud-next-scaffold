// 选择 partner 的展示用事实 + 可选性谓词。client（partner-list）与 server（登录路由）共用，
// 故放 server/ 外、不加 server-only。可选性结论由各端按这三事实自行派生。

export type PartyChoice = {
  partyId: number;
  partyName: string;
  partnerStatus: string;
  userStatus: string;
  authorizingType: "ADMIN" | "NORMAL";
  validContract: boolean;
};

/** 可选作登录 partner：partner 与用户均 ACTIVE 且存在有效合同。 */
export function isPartySelectable(choice: PartyChoice): boolean {
  return (
    choice.partnerStatus === "ACTIVE" &&
    choice.userStatus === "ACTIVE" &&
    choice.validContract
  );
}
