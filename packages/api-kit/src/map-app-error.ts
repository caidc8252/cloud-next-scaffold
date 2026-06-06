import "server-only";

import { AppError } from "@cloud/request";
import { errorResponse } from "@cloud/request/server";
import type { ApiErrorMapper } from "./create-api-handler.ts";

// AppError(BusinessError / MiddlewareError)→ 响应:
// - 展示文案由 code 经注册表本地化(BusinessError 的 params 做 {name} 插值);
// - 原始异常作为 cause 传入,日志里连堆栈一起打(满足「所有异常可从日志定位」);
// - status 由异常自带(业务 40x / 中间件 503)。
export const mapAppError: ApiErrorMapper = (error) => {
  if (!(error instanceof AppError)) return null;

  return errorResponse(error.code, undefined, error.status, {
    params: error.params,
    cause: error,
  });
};
