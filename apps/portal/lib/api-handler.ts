import "server-only";
import type { ZodType } from "zod";
import {
  composeMappers,
  createApiHandler,
  mapAppError,
  mapAuthzError,
  mapMiddlewareError,
  mapPrismaError,
  resolveLocaleFromCookie,
} from "@cloud/api-kit";
import { errorResponse } from "@cloud/request/server";

/** Parse a JSON body against a zod schema; throws MockHttpError(400) on failure. */
export async function readJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new MockHttpError("BAD_REQUEST", "Malformed request body.", 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new MockHttpError("BAD_REQUEST", "Invalid request.", 400);
  return parsed.data;
}

// Thin mock api-handler. A real build swaps this for @cloud/api-kit's
// withApiHandler (AuthzError / Prisma / middleware mappers). Here it only needs
// to turn an expected MockHttpError into the standard error envelope and mask
// everything else as a 500 — keeping handler bodies free of try/catch.

/** Expected, client-facing error thrown from a handler/store. */
export class MockHttpError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "MockHttpError";
  }
}

export const { handleApiError, withApiHandler } = createApiHandler({
  resolveLocale: resolveLocaleFromCookie,
  mapError: composeMappers([
    mapAuthzError,
    mapAppError,
    (error) =>
      error instanceof MockHttpError
        ? errorResponse(error.code, error.message, error.status)
        : null,
    (error, options) => options?.onError?.(error) ?? null,
    mapPrismaError,
    mapMiddlewareError,
  ]),
});
