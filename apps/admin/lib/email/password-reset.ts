import "server-only";

import { type EmailTemplate } from "@cloud/mail";
import { renderEmail } from "./layout.ts";

// 管理员重置他人密码 → 给该用户发重置链接（链接落 portal /reset-password?token=，复用其消费端）。
export type PasswordResetEmailVars = {
  resetUrl: string;
  expiresText: string; // 已本地化的有效期文案，如 "72 hours"
};

export const passwordResetTemplate: EmailTemplate<PasswordResetEmailVars> = (v, t) => ({
  title: t("email.passwordReset.subject"),
  content: renderEmail({
    bodyHtml:
      `<p>${t("email.passwordReset.intro")}</p>` +
      `<p style="color:#57606a;font-size:13px">${t("email.passwordReset.expiry", { duration: v.expiresText })}</p>`,
    button: { label: t("email.passwordReset.button"), url: v.resetUrl },
    footer: t("email.common.footerContactAdmin"),
  }),
});
