import "server-only";

import { errorResponse, notFoundResponse } from "@cloud/request/server";
import type { ApiErrorMapper } from "./create-api-handler.ts";

// 用鸭子类型识别 Prisma 错误，不直接依赖 @cloud/db / Prisma 运行时。
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

function toPrismaLikeError(error: unknown): PrismaLikeError | null {
  if (!isRecord(error)) return null;

  const name = typeof error.name === "string" ? error.name : undefined;
  const code = typeof error.code === "string" ? error.code : undefined;
  const clientVersion = typeof error.clientVersion === "string" ? error.clientVersion : undefined;

  if (!code || (!name?.startsWith("PrismaClient") && !clientVersion)) {
    return null;
  }

  return { name, code, clientVersion, meta: error.meta };
}

// 把常见 Prisma 错误码映射成稳定的 database.* 响应，不向用户泄露原始数据库细节。
export const mapPrismaError: ApiErrorMapper = (error) => {
  const prismaError = toPrismaLikeError(error);
  if (!prismaError) return null;

  const mapped = PRISMA_ERROR_RESPONSES[prismaError.code];
  if (!mapped) return null;

  return mapped.status === 404
    ? notFoundResponse(mapped.code, mapped.message)
    : errorResponse(mapped.code, mapped.message, mapped.status);
};
