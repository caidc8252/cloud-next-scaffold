import "server-only";

const DEFAULT_SITE_APP_URL = "http://localhost:3001";

function getSiteAppUrl(): URL {
  const url = new URL(process.env.SITE_APP_URL?.trim() || DEFAULT_SITE_APP_URL);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("SITE_APP_URL must use http or https.");
  }
  return url;
}

// web 里保留 /login、/select-partner 等兼容入口，但真正的登录流程由 site 承担。
// 这里集中生成 site URL，避免各页面和 logout route 散落硬编码端口。
export function getSiteSelectPartnerUrl(): string {
  const url = getSiteAppUrl();
  url.pathname = "/select-partner";
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function getSiteLoginUrl(): string {
  const url = getSiteAppUrl();
  url.pathname = "/login";
  url.search = "";
  url.hash = "";
  return url.toString();
}
