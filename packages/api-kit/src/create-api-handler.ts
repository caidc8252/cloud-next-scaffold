import "server-only";

import { internalErrorResponse, runWithLocale } from "@cloud/request/server";

// 通用 API 兜底骨架。只依赖 @cloud/request，不认识任何具体应用或业务码。
// 应用通过 createApiHandler(config) 注入「locale 怎么来」和「错误怎么映射」两块策略。

export type ApiHandlerOptions = {
  onError?: (error: unknown) => Response | null;
};

export type RouteHandler<TArgs extends unknown[]> = (...args: TArgs) => Response | Promise<Response>;

// 错误映射：命中返回 Response，未命中返回 null（落到内部错误 500 兜底）。
export type ApiErrorMapper = (error: unknown, options?: ApiHandlerOptions) => Response | null;

export type ApiHandlerConfig = {
  // 进 handler 前解析请求级 locale（cookie → locale 是应用关心的事，骨架不读 cookie）。
  resolveLocale: () => Promise<string>;
  // 应用级错误映射；AuthzError / Prisma / onError 的先后顺序由应用在 mapError 内决定。
  mapError: ApiErrorMapper;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

// Next 控制流异常（redirect / notFound）必须继续抛出，不能被兜底吞掉。
export function isNextControlFlowError(error: unknown): boolean {
  if (!isRecord(error)) return false;
  const digest = error.digest;
  return (
    typeof digest === "string" &&
    (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND"))
  );
}

export function createApiHandler(config: ApiHandlerConfig) {
  // 兜底顺序：Next 控制流重新抛 → 应用 mapError → 未知异常掩码成 500。
  function handleApiError(error: unknown, options?: ApiHandlerOptions): Response {
    if (isNextControlFlowError(error)) {
      throw error;
    }

    const mapped = config.mapError(error, options);
    if (mapped) return mapped;

    return internalErrorResponse(error);
  }

  // 进 handler 前解析 locale，整个 handler（含其内部同步构造的 errorResponse）跑在
  // runWithLocale 上下文里，错误文案据此本地化。
  function withApiHandler<TArgs extends unknown[]>(
    handler: RouteHandler<TArgs>,
    options?: ApiHandlerOptions,
  ): RouteHandler<TArgs> {
    return async (...args) => {
      const locale = await config.resolveLocale();
      return runWithLocale(locale, async () => {
        try {
          return await handler(...args);
        } catch (error) {
          return handleApiError(error, options);
        }
      });
    };
  }

  return { handleApiError, withApiHandler };
}
