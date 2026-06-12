import "server-only";

import { type EmailTemplate } from "@cloud/mail";
import { renderEmail } from "./layout.ts";

// 重置密码链接邮件（自助找回 + 管理员重置共用同形）。resetUrl 为可信、app 侧拼。
export type PasswordResetEmailVars = {
  resetUrl: string;
  expiresText: string; // 已本地化的有效期文案，如 "60 minutes"
};

export const passwordResetTemplate: EmailTemplate<PasswordResetEmailVars> = (v, t) => ({
  title: t("email.passwordReset.subject"),
  content: renderEmail({
    bodyHtml:
      `<p>${t("email.passwordReset.intro")}</p>` +
      `<p style="color:#57606a;font-size:13px">${t("email.passwordReset.expiry", { duration: v.expiresText })}</p>`,
    button: { label: t("email.passwordReset.button"), url: v.resetUrl },
    footer: t("email.common.footerIgnore"),
  }),
});
