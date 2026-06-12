import "server-only";

import { escapeHtml, type EmailTemplate } from "@cloud/mail";
import { renderEmail } from "./layout.ts";

// 邀请入驻邮件。title=subject（纯文本，变量不转义）；content=极简 HTML（变量 escapeHtml）。
export type InviteEmailVars = {
  partyName: string;
  inviterName: string;
  acceptUrl: string; // 可信，app 侧拼（token 已 encodeURIComponent）
  expiresAtText: string;
};

export const inviteTemplate: EmailTemplate<InviteEmailVars> = (v, t) => ({
  title: t("email.invite.subject", { partyName: v.partyName }),
  content: renderEmail({
    bodyHtml:
      `<p>${t("email.invite.intro", { inviterName: escapeHtml(v.inviterName), partyName: escapeHtml(v.partyName) })}</p>` +
      `<p style="color:#57606a;font-size:13px">${t("email.invite.expiry", { date: escapeHtml(v.expiresAtText) })}</p>`,
    button: { label: t("email.invite.button"), url: v.acceptUrl },
    footer: t("email.common.footerIgnore"),
  }),
});
