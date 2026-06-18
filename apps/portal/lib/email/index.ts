import "server-only";

import { getConfig } from "@cloud/config";
import { PORTAL_ROUTE } from "@cloud/constants";
import { getTranslations } from "@cloud/i18n/server";
import {
  renderAndEnqueue,
  type EmailTranslate,
  EMAIL_RENDER_LOCALE,
  VERIFY_CODE_EXPIRES_MINUTES,
} from "@cloud/mail";
import { verifyCodeTemplate, type VerifyCodeEmailVars, type VerifyCodeIntent } from "./verify-code.ts";
import { passwordResetTemplate, type PasswordResetEmailVars } from "./password-reset.ts";

async function emailTranslate(): Promise<EmailTranslate> {
  const t = await getTranslations({ locale: EMAIL_RENDER_LOCALE });
  return (key, values) => t(key, values);
}

// 验证码邮件。用户可触发 → 默认收件人节流（60s + 5 封每小时）。
export async function sendVerifyCodeEmail(input: {
  to: string;
  code: string;
  intent: VerifyCodeIntent;
}): Promise<void> {
  await renderAndEnqueue<VerifyCodeEmailVars>({
    template: verifyCodeTemplate,
    vars: { code: input.code, expiresMinutes: VERIFY_CODE_EXPIRES_MINUTES, intent: input.intent },
    t: await emailTranslate(),
    receivers: [input.to],
    purpose: "verify-code",
  });
}

// 重置密码链接邮件（自助找回）。用户可触发 → 默认收件人节流。
export async function sendResetLinkEmail(input: {
  to: string;
  token: string;
  expiresText: string;
}): Promise<void> {
  // 重置链接落 portal（唯一重置页）；base 收口在 getConfig().NEXT_PORTAL_URL。
  const resetUrl = new URL(PORTAL_ROUTE.resetPassword, getConfig().NEXT_PORTAL_URL);
  resetUrl.searchParams.set("token", input.token);
  await renderAndEnqueue<PasswordResetEmailVars>({
    template: passwordResetTemplate,
    vars: { resetUrl: resetUrl.toString(), expiresText: input.expiresText },
    t: await emailTranslate(),
    receivers: [input.to],
    purpose: "password-reset",
  });
}
