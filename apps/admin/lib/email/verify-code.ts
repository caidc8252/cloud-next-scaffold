import "server-only";

import { escapeHtml, type EmailTemplate } from "@cloud/mail";
import { renderEmail } from "./layout.ts";

// 验证码邮件（admin 现仅 emailChange）。intent 决定开头一句文案；code 大字展示。
export type VerifyCodeIntent = "emailChange" | "passwordRecovery" | "onboardingEmail";

export type VerifyCodeEmailVars = {
  code: string;
  expiresMinutes: number;
  intent: VerifyCodeIntent;
};

export const verifyCodeTemplate: EmailTemplate<VerifyCodeEmailVars> = (v, t) => ({
  title: t("email.verifyCode.subject"),
  content: renderEmail({
    bodyHtml:
      `<p>${t(`email.verifyCode.intro.${v.intent}`)}</p>` +
      `<p style="font-size:28px;font-weight:700;letter-spacing:4px;margin:16px 0">${escapeHtml(v.code)}</p>` +
      `<p style="color:#57606a;font-size:13px">${t("email.verifyCode.expiry", { minutes: v.expiresMinutes })}</p>`,
    footer: t("email.common.footerIgnore"),
  }),
});
