import "server-only";

import { getConfig } from "@cloud/config";
import { PORTAL_ROUTE } from "@cloud/constants";

// admin 拼向 portal 的链接：base 收口在 getConfig().NEXT_PORTAL_URL
//（显式 env / 本地兜底 / 生产硬抛 / http(s) 校验都在那一处）。
function portalUrl(pathname: string, token?: string): string {
  const url = new URL(pathname, getConfig().NEXT_PORTAL_URL);
  if (token !== undefined) url.searchParams.set("token", token);
  return url.toString();
}

// admin 保留 /login、/select-partner 等兼容入口，真正的登录流程由 portal 承担。
export function getPortalSelectPartnerUrl(): string {
  return portalUrl(PORTAL_ROUTE.selectPartner);
}

export function getPortalLoginUrl(): string {
  return portalUrl(PORTAL_ROUTE.login);
}

export function getPortalOnboardingUrl(token: string): string {
  return portalUrl(PORTAL_ROUTE.onboarding, token);
}

// 管理员重置他人密码 → 链接落门户 /reset-password（复用其消费端），与 onboarding 同源解析。
export function getPortalResetPasswordUrl(token: string): string {
  return portalUrl(PORTAL_ROUTE.resetPassword, token);
}

// 门户站点 origin：客户端拼邀请链接用（与 getPortalOnboardingUrl 同源，保证"复制"= "邮件"）。
export function getPortalBaseUrl(): string {
  return new URL(getConfig().NEXT_PORTAL_URL).origin;
}
