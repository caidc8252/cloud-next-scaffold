import "server-only";

const DEFAULT_PORTAL_APP_URL = "http://localhost:3100";

function getPortalAppUrl(): URL {
  const url = new URL(process.env.PORTAL_APP_URL?.trim() || DEFAULT_PORTAL_APP_URL);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("PORTAL_APP_URL must use http or https.");
  }
  return url;
}

// admin 保留 /login、/select-partner 等兼容入口，真正的登录流程由 portal 承担。
export function getPortalSelectPartnerUrl(): string {
  const url = getPortalAppUrl();
  url.pathname = "/select-partner";
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function getPortalLoginUrl(): string {
  const url = getPortalAppUrl();
  url.pathname = "/login";
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function getPortalOnboardingUrl(token: string): string {
  const url = getPortalAppUrl();
  url.pathname = "/onboarding";
  url.search = "";
  url.hash = "";
  url.searchParams.set("token", token);
  return url.toString();
}

// 管理员重置他人密码 → 链接落门户 /reset-password（复用其消费端），与 onboarding 同源解析。
export function getPortalResetPasswordUrl(token: string): string {
  const url = getPortalAppUrl();
  url.pathname = "/reset-password";
  url.search = "";
  url.hash = "";
  url.searchParams.set("token", token);
  return url.toString();
}

// 门户站点 origin：客户端拼邀请链接用（与 getPortalOnboardingUrl 同源，保证"复制"= "邮件"）。
export function getPortalBaseUrl(): string {
  return getPortalAppUrl().origin;
}
