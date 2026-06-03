import "server-only";

import { AuthzError } from "@cloud/permissions/server";
import { forbiddenResponse, unauthorizedResponse } from "@cloud/request/server";
import { ERR_UNAUTHORIZED } from "@cloud/request/error-codes";
import type { ApiErrorMapper } from "./create-api-handler.ts";

// AuthzError → 响应：
// - 401 统一映射到注册表内的 ERR_UNAUTHORIZED，文案随 locale 本地化（包内置三语，始终在场）。
// - 403 用 AuthzError 的 "forbidden" code + 英文兜底（注册表外）。
export const mapAuthzError: ApiErrorMapper = (error) => {
  if (!(error instanceof AuthzError)) return null;

  return error.status === 401
    ? unauthorizedResponse(ERR_UNAUTHORIZED)
    : forbiddenResponse(error.code, "Forbidden.");
};
