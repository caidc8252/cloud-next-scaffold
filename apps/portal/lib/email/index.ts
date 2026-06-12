import "server-only";

import { getTranslations } from "@cloud/i18n/server";
import { renderAndEnqueue, type EmailTranslate } from "@cloud/mail";
import { verifyCodeTemplate, type VerifyCodeEmailVars, type VerifyCodeIntent } from "./verify-code.ts";

// 邮件渲染语言现统一 en（与 @cloud/log / email-capability 决策一致）。
const EMAIL_LOCALE = "en";
// 验证码有效期（分钟），与 recovery-code 的 TTL 600s 对齐。
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
