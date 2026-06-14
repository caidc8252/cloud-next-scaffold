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

export function getPortalResetPasswordUrl(token: string): string {
  const url = getPortalAppUrl();
  url.pathname = "/reset-password";
  url.search = "";
  url.hash = "";
  url.searchParams.set("token", token);
  return url.toString();
}
