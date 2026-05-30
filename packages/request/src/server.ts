import "server-only";

import { randomBytes } from "node:crypto";
import type { CursorPager, ErrorBody, Pager, SuccessBody } from "./index.ts";
import {
  ERR_BAD_REQUEST,
  ERR_UNAUTHORIZED,
  ERR_FORBIDDEN,
  ERR_NOT_FOUND,
  ERR_INTERNAL,
} from "./error-codes.ts";

export type { CursorPager, ErrorBody, Pager, SuccessBody } from "./index.ts";
export {
  encodeCursor,
  decodeCursor,
  readCursorQuery,
  buildCursorPage,
} from "./cursor.ts";
export type { CursorDirection, CursorPayload, CursorQuery } from "./cursor.ts";
export {
  ERR_BAD_REQUEST,
  ERR_UNAUTHORIZED,
  ERR_FORBIDDEN,
  ERR_NOT_FOUND,
  ERR_INTERNAL,
} from "./error-codes.ts";

function generateTraceId(status: number): string {
  const prefix = status >= 500 ? "SYS" : "BIZ";
  const hex = randomBytes(3).toString("hex");
  return `${prefix}-${hex}`;
}

export function successResponse<T>(data: T, pager?: Pager | CursorPager): Response {
  const body: SuccessBody<T> = {
    code: "OK",
    message: "success",
    data,
    ...(pager ? pager : {}),
    traceId: generateTraceId(200),
  };
  return Response.json(body);
}

export function createdResponse<T>(data: T): Response {
  return Response.json(
    {
      code: "OK",
      message: "success",
      data,
      traceId: generateTraceId(201),
    } satisfies SuccessBody<T>,
    { status: 201 },
  );
}

export function noContentResponse(): Response {
  return new Response(null, { status: 204 });
}

export function errorResponse(code: string, message: string, status = 400): Response {
  const traceId = generateTraceId(status);
  console.error(`[${traceId}] [${code}] ${message}`);
  return Response.json({ message, code, traceId } satisfies ErrorBody, { status });
}

export function badRequestResponse(code = ERR_BAD_REQUEST, message = "Bad request."): Response {
  return errorResponse(code, message, 400);
}

export function unauthorizedResponse(code = ERR_UNAUTHORIZED, message = "Unauthorized."): Response {
  return errorResponse(code, message, 401);
}

export function forbiddenResponse(code = ERR_FORBIDDEN, message = "Forbidden."): Response {
  return errorResponse(code, message, 403);
}

export function notFoundResponse(code = ERR_NOT_FOUND, message = "Not found."): Response {
  return errorResponse(code, message, 404);
}

export function internalErrorResponse(error: unknown): Response {
  const traceId = generateTraceId(500);
  console.error(`[${traceId}] [${ERR_INTERNAL}]`, error);
  return Response.json(
    { message: "Internal server error.", code: ERR_INTERNAL, traceId } satisfies ErrorBody,
    { status: 500 },
  );
}
