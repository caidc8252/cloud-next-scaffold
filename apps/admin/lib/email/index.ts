import "server-only";

import { getTranslations } from "@cloud/i18n/server";
import { renderAndEnqueue, type EmailTranslate } from "@cloud/mail";
import { inviteTemplate, type InviteEmailVars } from "./invite.ts";
import { verifyCodeTemplate, type VerifyCodeEmailVars, type VerifyCodeIntent } from "./verify-code.ts";
import { passwordResetTemplate, type PasswordResetEmailVars } from "./password-reset.ts";

// 业务侧薄发送器：拼 URL、定 locale、选 purpose/节流，再交 @cloud/mail 渲染入队。
// onboarding 落在门户（唯一入口）；PORTAL_APP_URL 为部署 env，dev 默认 3100。
const PORTAL_APP_URL = process.env.PORTAL_APP_URL ?? "http://localhost:3100";

// 邮件渲染语言现统一 en（与 @cloud/log / email-capability 决策一致）；将来切换只改此处。
const EMAIL_LOCALE = "en";

// 验证码有效期（分钟），与 account-verify-code 的 TTL 600s 对齐。
const VERIFY_CODE_EXPIRES_MINUTES = 10;

async function emailTranslate(): Promise<EmailTranslate> {
  // 显式 locale 取译者（按收件人语言，不依赖请求 cookie）。email.* 文案在 app i18n 注册。
  const t = await getTranslations({ locale: EMAIL_LOCALE });
  return (key, values) => t(key, values);
}

export async function sendInviteEmail(input: {
  to: string;
  partyName: string;
  inviterName: string;
  token: string;
  expiresAt: Date;
}): Promise<void> {
  const acceptUrl = `${PORTAL_APP_URL}/onboarding?token=${encodeURIComponent(input.token)}`;
  await renderAndEnqueue<InviteEmailVars>({
    template: inviteTemplate,
    vars: {
      partyName: input.partyName,
      inviterName: input.inviterName,
      acceptUrl,
      expiresAtText: input.expiresAt.toISOString().slice(0, 10),
    },
    t: await emailTranslate(),
    receivers: [input.to],
    purpose: "invite",
    // 已有登录态 + 权限 + resendCount 兜底，仅挂冷却 60s 防连点；不挂每小时上限。
    throttle: { cooldownSeconds: 60, maxPerWindow: 1000, windowSeconds: 3600 },
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
  const resetUrl = `${PORTAL_APP_URL}/reset-password?token=${encodeURIComponent(input.token)}`;
  await renderAndEnqueue<PasswordResetEmailVars>({
    template: passwordResetTemplate,
    vars: { resetUrl, expiresText: input.expiresText },
    t: await emailTranslate(),
    receivers: [input.to],
    purpose: "password-reset",
  });
}
