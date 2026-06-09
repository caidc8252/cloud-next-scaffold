import "client-only";

import type { RequestError } from "@cloud/request/client";
import { ERR_UNAUTHORIZED } from "@cloud/request/error-codes";
import { ERR_AUTH_NOT_AUTHENTICATED } from "./auth-error-codes";

// 仅这些 401 code 视为「会话失效」，需要自动登出。
// - ERR_UNAUTHORIZED：assertPermissions 抛 AuthzError(401) 经 handleApiError 统一映射的 code，也是 @cloud/request 通用 401
// - ERR_AUTH_NOT_AUTHENTICATED：select-entity 等 app 路由的未登录
// - "unauthenticated"：AuthzError 的内部 code，防御性保留（当前 401 已被 handleApiError 收敛成 ERR_UNAUTHORIZED）
// site 登录页的凭证错误（ERR_AUTH_INVALID_CREDENTIALS）刻意不在内，避免误把登录失败当作会话失效。
const SESSION_EXPIRED_CODES = new Set<string>([
  ERR_UNAUTHORIZED,
  ERR_AUTH_NOT_AUTHENTICATED,
  "unauthenticated",
]);

// 防止多个并发 401 触发多次整页跳转。
let redirecting = false;

export function handleUnauthorized(error: RequestError): void {
  const code = error.body?.code;
  if (!code || !SESSION_EXPIRED_CODES.has(code) || redirecting) return;

  redirecting = true;
  // 与服务端 requirePermissions 的 401 出口一致：先清残留 cookie，再由 logout 跳回 site /login。
  window.location.replace("/api/auth/logout");
}
