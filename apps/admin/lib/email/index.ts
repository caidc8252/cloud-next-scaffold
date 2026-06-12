import "server-only";

import { getTranslations } from "@cloud/i18n/server";
import { renderAndEnqueue, type EmailTranslate } from "@cloud/mail";
import { getPortalOnboardingUrl } from "@/lib/portal-routing";
import { inviteTemplate, type InviteEmailVars } from "./invite.ts";

// 业务侧薄发送器：拼 URL、定 locale、选 purpose/节流，再交 @cloud/mail 渲染入队。
// onboarding 落在门户（唯一入口）；PORTAL_APP_URL 解析收口在 portal-routing。

// 邮件渲染语言现统一 en（与 @cloud/log / email-capability 决策一致）；将来切换只改此处。
const EMAIL_LOCALE = "en";

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
    // 已有登录态 + 权限 + resendCount 兜底，仅挂冷却 60s 防连点；不挂每小时上限。
    throttle: { cooldownSeconds: 60, maxPerWindow: 1000, windowSeconds: 3600 },
  });
}
