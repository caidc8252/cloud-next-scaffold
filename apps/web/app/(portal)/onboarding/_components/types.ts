// onboarding 前端使用的真实类型（对齐后端 getInvite 的 InvitePublic + portal 会话）。
export type InvitePublic = {
  partyName: string;
  inviteEmail: string;
  intendedRole: { roleId: number }[];
  expiresAt: string; // ISO
};

export type CurrentUser = {
  email: string;
  displayName: string | null;
};
