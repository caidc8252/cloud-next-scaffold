export type PartnerChoice = {
  partnerId: number;
  partnerName: string;
  partnerStatus: string;
  userStatus: string;
  authorizingType: "ADMIN" | "NORMAL";
  validContract: boolean;
};

export function isPartnerSelectable(choice: PartnerChoice): boolean {
  return (
    choice.partnerStatus === "ACTIVE" &&
    choice.userStatus === "ACTIVE" &&
    choice.validContract
  );
}
