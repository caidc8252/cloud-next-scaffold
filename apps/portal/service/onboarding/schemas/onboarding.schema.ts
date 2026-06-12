import { z } from "zod";

// 接受邀请入参（两模式）。email 不在入参：register 恒取 invite.inviteEmail。
export const acceptInputSchema = z.discriminatedUnion("mode", [
  // 既有用户：用当前 portal 会话用户绑定。
  z.object({
    mode: z.literal("existing"),
    token: z.string().min(1),
  }),
  // 新建账号：用被邀邮箱建号 + 绑定（密码 RSA 密文，复用登录加密姿态）。
  z.object({
    mode: z.literal("register"),
    token: z.string().min(1),
    encryptedPassword: z.string().min(1),
    displayName: z.string().trim().min(1),
    country: z.string().trim().min(2),
  }),
]);

export type AcceptInput = z.infer<typeof acceptInputSchema>;

// 验票公开返回（inviteEmail 仅作新建账号预填提示）。
export type InvitePublic = {
  partyName: string;
  inviteEmail: string;
  intendedRole: { roleId: number }[];
  expiresAt: string;
};

export type AcceptResult = {
  redirectTo: string;
  alreadyMember: boolean;
};
