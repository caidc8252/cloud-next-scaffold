import "server-only";

import {
  composeMappers,
  createApiHandler,
  mapAuthzError,
  mapPrismaError,
  resolveLocaleFromCookie,
} from "@cloud/api-kit";

// 通用骨架与本栈默认件都在 @cloud/api-kit；这里只做本应用的「组装 + 注入」。
// 映射顺序：AuthzError → 调用方 onError（如 s3ErrorResponse）→ Prisma 常见错误 → 骨架兜 500。
// 将来若有 app 专属业务码映射，往这条链里追加 mapper 即可。
export type { ApiHandlerOptions } from "@cloud/api-kit";

export const { handleApiError, withApiHandler } = createApiHandler({
  resolveLocale: resolveLocaleFromCookie,
  mapError: composeMappers([
    mapAuthzError,
    (error, options) => options?.onError?.(error) ?? null,
    mapPrismaError,
  ]),
});
