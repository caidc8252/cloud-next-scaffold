import "server-only";

import { errorResponse } from "@cloud/request/server";
import { ERR_MW_CACHE } from "@cloud/request/error-codes";
import type { ApiErrorMapper } from "./create-api-handler.ts";

// 只认 ioredis 特有的、无歧义的错误类名 → 映射成 ERR_MW_CACHE/503(对客户不透明)。
// 刻意不认 ECONNREFUSED / ETIMEDOUT 这类通用网络码:它们也可能来自 S3 / fetch 等,
// 误判会把别的中间件错误算到缓存头上。需要确定归类时,业务侧显式 throw MiddlewareError。
const REDIS_ERROR_NAMES = new Set(["MaxRetriesPerRequestError", "ReplyError"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export const mapMiddlewareError: ApiErrorMapper = (error) => {
  if (!isRecord(error)) return null;
  if (typeof error.name !== "string" || !REDIS_ERROR_NAMES.has(error.name)) return null;

  return errorResponse(ERR_MW_CACHE, undefined, 503, { cause: error });
};
