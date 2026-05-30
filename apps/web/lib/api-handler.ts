import "server-only";

import { AuthzError } from "@cloud/permissions/server";
import {
  errorResponse,
  forbiddenResponse,
  internalErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
} from "@cloud/request/server";

type RouteHandler<TArgs extends unknown[]> = (...args: TArgs) => Response | Promise<Response>;

type ApiHandlerOptions = {
  onError?: (error: unknown) => Response | null;
};

type PrismaLikeError = {
  name?: string;
  code: string;
  clientVersion?: string;
  meta?: unknown;
};

const PRISMA_ERROR_RESPONSES: Record<string, { code: string; message: string; status: number }> = {
  P2000: {
    code: "database.value_too_long",
    message: "Submitted value is too long.",
    status: 400,
  },
  P2002: {
    code: "database.unique_conflict",
    message: "A record with the same unique value already exists.",
    status: 409,
  },
  P2003: {
    code: "database.foreign_key_conflict",
    message: "Related data is missing or still in use.",
    status: 409,
  },
  P2025: {
    code: "database.record_not_found",
    message: "Record not found.",
    status: 404,
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNextControlFlowError(error: unknown): boolean {
  if (!isRecord(error)) return false;
  const digest = error.digest;
  return (
    typeof digest === "string" &&
    (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND"))
  );
}

function toPrismaLikeError(error: unknown): PrismaLikeError | null {
  if (!isRecord(error)) return null;

  const name = typeof error.name === "string" ? error.name : undefined;
  const code = typeof error.code === "string" ? error.code : undefined;
  const clientVersion = typeof error.clientVersion === "string" ? error.clientVersion : undefined;

  if (!code || (!name?.startsWith("PrismaClient") && !clientVersion)) {
    return null;
  }

  return {
    name,
    code,
    clientVersion,
    meta: error.meta,
  };
}

function prismaErrorResponse(error: unknown): Response | null {
  const prismaError = toPrismaLikeError(error);
  if (!prismaError) return null;

  const mapped = PRISMA_ERROR_RESPONSES[prismaError.code];
  if (!mapped) return null;

  if (mapped.status === 404) {
    return notFoundResponse(mapped.code, mapped.message);
  }

  return errorResponse(mapped.code, mapped.message, mapped.status);
}

export function handleApiError(error: unknown, options?: ApiHandlerOptions): Response {
  if (isNextControlFlowError(error)) {
    throw error;
  }

  if (error instanceof AuthzError) {
    return error.status === 401
      ? unauthorizedResponse(error.code, "Unauthorized.")
      : forbiddenResponse(error.code, "Forbidden.");
  }

  const customResponse = options?.onError?.(error);
  if (customResponse) return customResponse;

  const databaseResponse = prismaErrorResponse(error);
  if (databaseResponse) return databaseResponse;

  return internalErrorResponse(error);
}

export function withApiHandler<TArgs extends unknown[]>(
  handler: RouteHandler<TArgs>,
  options?: ApiHandlerOptions,
): RouteHandler<TArgs> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error, options);
    }
  };
}
