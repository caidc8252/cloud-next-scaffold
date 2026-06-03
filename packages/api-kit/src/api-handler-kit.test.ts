import { describe, expect, it, vi } from "vitest";
import { AuthzError } from "@cloud/permissions/server";
import { ERR_INTERNAL, ERR_UNAUTHORIZED } from "@cloud/request/error-codes";
import {
  composeMappers,
  createApiHandler,
  mapAuthzError,
  mapPrismaError,
  type ApiErrorMapper,
} from "./index.ts";

async function readBody(response: Response) {
  return (await response.json()) as { code: string; message: string };
}

const noopConfig = { resolveLocale: async () => "en" };

describe("createApiHandler", () => {
  it("rethrows Next control-flow errors (redirect / notFound) instead of mapping them", () => {
    const { handleApiError } = createApiHandler({ ...noopConfig, mapError: () => null });
    const redirect = Object.assign(new Error("redirect"), { digest: "NEXT_REDIRECT;replace;/login;" });

    expect(() => handleApiError(redirect)).toThrow(redirect);
  });

  it("returns the response produced by the injected mapError", async () => {
    const mapped = new Response("x", { status: 418 });
    const { handleApiError } = createApiHandler({ ...noopConfig, mapError: () => mapped });

    expect(handleApiError(new Error("boom"))).toBe(mapped);
  });

  it("falls back to a masked 500 when no mapper matches", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { handleApiError } = createApiHandler({ ...noopConfig, mapError: () => null });

    const response = handleApiError(new Error("raw secret"));
    const body = await readBody(response);

    expect(response.status).toBe(500);
    expect(body.code).toBe(ERR_INTERNAL);
    expect(body.message).not.toContain("raw secret");
    spy.mockRestore();
  });

  it("wraps route handlers and maps thrown errors", async () => {
    const { withApiHandler } = createApiHandler({
      ...noopConfig,
      mapError: mapAuthzError,
    });
    const handler = withApiHandler(async () => {
      throw new AuthzError(403, "forbidden");
    });

    const response = await handler();
    expect(response.status).toBe(403);
  });
});

describe("composeMappers", () => {
  const hit = (status: number): ApiErrorMapper => () => new Response(null, { status });

  it("returns the first non-null mapper result and skips the rest", () => {
    const second = vi.fn(hit(409));
    const third = vi.fn(hit(418));
    const compose = composeMappers([() => null, second, third]);

    const response = compose(new Error("x"));
    expect(response?.status).toBe(409);
    expect(third).not.toHaveBeenCalled();
  });

  it("returns null when every mapper misses", () => {
    const compose = composeMappers([() => null, () => null]);
    expect(compose(new Error("x"))).toBeNull();
  });

  it("threads options through to each mapper (e.g. onError)", () => {
    const onError = vi.fn(() => new Response(null, { status: 422 }));
    const compose = composeMappers([(error, options) => options?.onError?.(error) ?? null]);

    const response = compose(new Error("x"), { onError });
    expect(response?.status).toBe(422);
    expect(onError).toHaveBeenCalledTimes(1);
  });
});

describe("mapAuthzError", () => {
  it("maps 401 to the localizable ERR_UNAUTHORIZED code", async () => {
    const response = mapAuthzError(new AuthzError(401, "unauthenticated"));
    expect(response?.status).toBe(401);
    expect((await readBody(response!)).code).toBe(ERR_UNAUTHORIZED);
  });

  it("maps 403 to the forbidden code", async () => {
    const response = mapAuthzError(new AuthzError(403, "forbidden"));
    expect(response?.status).toBe(403);
    expect((await readBody(response!)).code).toBe("forbidden");
  });

  it("returns null for non-AuthzError errors", () => {
    expect(mapAuthzError(new Error("plain"))).toBeNull();
  });
});

describe("mapPrismaError", () => {
  function prisma(code: string) {
    return { name: "PrismaClientKnownRequestError", code, clientVersion: "7.0.0", meta: {} };
  }

  it("maps P2002 unique-constraint to 409 without leaking raw details", async () => {
    const response = mapPrismaError(prisma("P2002"));
    expect(response?.status).toBe(409);
    expect((await readBody(response!)).code).toBe("database.unique_conflict");
  });

  it("maps P2025 not-found to 404", () => {
    expect(mapPrismaError(prisma("P2025"))?.status).toBe(404);
  });

  it("returns null for unmapped Prisma codes", () => {
    expect(mapPrismaError(prisma("P9999"))).toBeNull();
  });

  it("returns null for non-Prisma errors", () => {
    expect(mapPrismaError(new Error("plain"))).toBeNull();
  });
});
