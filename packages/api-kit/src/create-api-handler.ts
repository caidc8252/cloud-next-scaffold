import "server-only";

import { internalErrorResponse, runWithLocale } from "@cloud/request/server";
import { createLogger, runWithTrace } from "@cloud/log";

// 通用 API 兜底骨架。只依赖 @cloud/request，不认识任何具体应用或业务码。
// 应用通过 createApiHandler(config) 注入「locale 怎么来」和「错误怎么映射」两块策略。

const log = createLogger("http");

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
      // 每请求起一个 trace 上下文：读入站 x-request-id 复用、否则新生成；带上 method/path。
      // 之后该请求内任何 @cloud/log 调用自动携带 traceId/seq，错误响应也复用同一 traceId。
      const req = args[0] instanceof Request ? args[0] : undefined;
      const method = req?.method;
      const path = req ? new URL(req.url).pathname : undefined;
      const incomingTraceId = req?.headers.get("x-request-id") ?? undefined;

      const locale = await config.resolveLocale();
      return runWithTrace({ traceId: incomingTraceId, method, path }, () =>
        runWithLocale(locale, async () => {
          const startedAt = Date.now();
          try {
            const response = await handler(...args);
            log.info("request completed", { status: response.status, durationMs: Date.now() - startedAt });
            return response;
          } catch (error) {
            // Next 控制流异常（redirect/notFound）由 handleApiError 重新抛出，不记访问日志。
            const response = handleApiError(error, options);
            log.info("request completed", { status: response.status, durationMs: Date.now() - startedAt });
            return response;
          }
        }),
      );
    };
  }

  return { handleApiError, withApiHandler };
}
