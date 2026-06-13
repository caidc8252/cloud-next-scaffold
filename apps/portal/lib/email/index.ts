import "server-only";

import { getTranslations } from "@cloud/i18n/server";
import { renderAndEnqueue, type EmailTranslate } from "@cloud/mail";
import { verifyCodeTemplate, type VerifyCodeEmailVars, type VerifyCodeIntent } from "./verify-code.ts";
import { passwordResetTemplate, type PasswordResetEmailVars } from "./password-reset.ts";

// 邮件渲染语言现统一 en（与 @cloud/log / email-capability 决策一致）。
const EMAIL_LOCALE = "en";
// 重置链接落 portal（唯一重置页）；PORTAL_APP_URL 为部署 env，dev 默认 3100。
const PORTAL_APP_URL = process.env.PORTAL_APP_URL ?? "http://localhost:3100";
// 验证码邮件有效期（分钟）。verify-code 模板/发送器预留给 onboarding 换邮箱等验证码场景。
const VERIFY_CODE_EXPIRES_MINUTES = 10;

async function emailTranslate(): Promise<EmailTranslate> {
  const t = await getTranslations({ locale: EMAIL_LOCALE });
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
  const resetUrl = `${PORTAL_APP_URL}/reset-password?token=${encodeURIComponent(input.token)}`;
  await renderAndEnqueue<PasswordResetEmailVars>({
    template: passwordResetTemplate,
    vars: { resetUrl, expiresText: input.expiresText },
    t: await emailTranslate(),
    receivers: [input.to],
    purpose: "password-reset",
  });
}
