import "server-only";

import {
  composeMappers,
  createApiHandler,
  mapAppError,
  mapAuthzError,
  mapMiddlewareError,
  mapPrismaError,
  resolveLocaleFromCookie,
} from "@cloud/api-kit";

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
