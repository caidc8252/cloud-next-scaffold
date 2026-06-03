import type { ApiErrorMapper, ApiHandlerOptions } from "./create-api-handler.ts";

// 把多个 mapper 串成一个：依次尝试，命中（非 null）即返回，全未命中返回 null。
// 顺序即优先级——应用据此决定 AuthzError / onError / Prisma 等谁先谁后。
export function composeMappers(mappers: ApiErrorMapper[]): ApiErrorMapper {
  return (error: unknown, options?: ApiHandlerOptions): Response | null => {
    for (const mapper of mappers) {
      const response = mapper(error, options);
      if (response) return response;
    }
    return null;
  };
}
