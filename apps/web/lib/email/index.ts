import "server-only";

import { getTranslations } from "@cloud/i18n/server";
import {
  renderAndEnqueue,
  type EmailTranslate,
  EMAIL_RENDER_LOCALE,
  VERIFY_CODE_EXPIRES_MINUTES,
  LENIENT_RECIPIENT_THROTTLE,
} from "@cloud/mail";
import { getPortalOnboardingUrl, getPortalResetPasswordUrl } from "@/lib/portal-routing";
import { inviteTemplate, type InviteEmailVars } from "./invite.ts";
import { verifyCodeTemplate, type VerifyCodeEmailVars, type VerifyCodeIntent } from "./verify-code.ts";
import { passwordResetTemplate, type PasswordResetEmailVars } from "./password-reset.ts";

// 业务侧薄发送器：拼 URL、定 locale、选 purpose/节流，再交 @cloud/mail 渲染入队。
// onboarding 落在门户（唯一入口）；NEXT_PORTAL_URL 解析收口在 portal-routing。

async function emailTranslate(): Promise<EmailTranslate> {
  // 显式 locale 取译者（按收件人语言，不依赖请求 cookie）。email.* 文案在 app i18n 注册。
  const t = await getTranslations({ locale: EMAIL_RENDER_LOCALE });
  return (key, values) => t(key, values);
}

export async function sendInviteEmail(input: {
  to: string;
  partyName: string;
  inviterName: string;
  token: string;
  expiresAt: Date;
}): Promise<void> {
  await renderAndEnqueue<InviteEmailVars>({
    template: inviteTemplate,
    vars: {
      partyName: input.partyName,
      inviterName: input.inviterName,
      acceptUrl: getPortalOnboardingUrl(input.token),
      expiresAtText: input.expiresAt.toISOString().slice(0, 10),
    },
    t: await emailTranslate(),
    receivers: [input.to],
    purpose: "invite",
    throttle: LENIENT_RECIPIENT_THROTTLE,
  });
}

// 身份变更（改邮箱等）验证码邮件。用户可触发 → 默认收件人节流（60s + 5 封每小时）。
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

// 管理员重置他人密码 → 发重置链接（落 portal /reset-password?token=）。purpose=password-reset，默认节流。
export async function sendResetLinkEmail(input: {
  to: string;
  token: string;
  expiresText: string;
}): Promise<void> {
  const resetUrl = getPortalResetPasswordUrl(input.token);
  await renderAndEnqueue<PasswordResetEmailVars>({
    template: passwordResetTemplate,
    vars: { resetUrl, expiresText: input.expiresText },
    t: await emailTranslate(),
    receivers: [input.to],
    purpose: "password-reset",
  });
}
