import "server-only";
import "@/lib/register-error-messages";

import {
  composeMappers,
  createApiHandler,
  mapAppError,
  mapAuthzError,
  mapMiddlewareError,
  mapPrismaError,
  resolveLocaleFromCookie,
} from "@cloud/api-kit";

// 通用骨架与本栈默认件都在 @cloud/api-kit；这里只做本应用的「组装 + 注入」。
// 映射顺序（顺序即优先级）：
//   AuthzError（401/403）
//   → AppError（业务 BusinessError 40x / 显式 MiddlewareError 503）
//   → 调用方 onError（如 s3ErrorResponse）
//   → Prisma（约束冲突 4xx / 连接超时 ERR_MW_DB 503）
//   → 中间件鸭子类型（ioredis → ERR_MW_CACHE 503）
//   → 骨架兜未知异常 500（ERR_INTERNAL，掩码不泄露）
// 将来若有 app 专属业务码映射，往这条链里追加 mapper 即可。
export type { ApiHandlerOptions } from "@cloud/api-kit";

export const { handleApiError, withApiHandler } = createApiHandler({
  resolveLocale: resolveLocaleFromCookie,
  mapError: composeMappers([
    mapAuthzError,
    mapAppError,
    (error, options) => options?.onError?.(error) ?? null,
    mapPrismaError,
    mapMiddlewareError,
  ]),
});
