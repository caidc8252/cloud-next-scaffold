import "server-only";

import { errorResponse } from "@cloud/request/server";
import { ERR_MW_DB } from "@cloud/request/error-codes";
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

// Prisma 二分:
// - 连接 / 初始化级(P1xxx)是基础设施故障 → 掩码成 ERR_MW_DB/503 通用文案,与其他中间件一致;
// - 约束级(P2002 唯一 / P2025 不存在 等)带业务语义 → 保留 4xx + 可读 database.* 文案。
// 两类都把原始异常作为 cause 传入,日志连堆栈一起打。
export const mapPrismaError: ApiErrorMapper = (error) => {
  const prismaError = toPrismaLikeError(error);
  if (!prismaError) return null;

  // P1000–P1017:连不上 / 认证失败 / 超时等,统一归到中间件 503,不泄露数据库细节。
  if (/^P10\d{2}$/.test(prismaError.code)) {
    return errorResponse(ERR_MW_DB, undefined, 503, { cause: error });
  }

  const mapped = PRISMA_ERROR_RESPONSES[prismaError.code];
  if (!mapped) return null;

  return errorResponse(mapped.code, mapped.message, mapped.status, { cause: error });
};
