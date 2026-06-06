import "server-only";

import { randomBytes } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import type { CursorPager, ErrorBody, ErrorParams, Pager, SuccessBody } from "./index.ts";
import {
  ERR_BAD_REQUEST,
  ERR_UNAUTHORIZED,
  ERR_FORBIDDEN,
  ERR_NOT_FOUND,
  ERR_INTERNAL,
} from "./error-codes.ts";
import { getErrorMessages } from "./error-messages/index.ts";

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

// 请求级 locale。helpers 保持同步，所以不在这里读 cookie（Next 16 的 cookies() 是异步的），
// 而是由调用方（如 withApiHandler）在进入 handler 前 await 解析好 locale，包一层 runWithLocale。
// 没设置时 getStore() 返回 undefined，错误文案回退英文。
const localeStore = new AsyncLocalStorage<string>();

// 在指定 locale 的上下文里执行 fn；其内部同步构造的 errorResponse 会据此本地化文案。
export function runWithLocale<T>(locale: string, fn: () => T): T {
  return localeStore.run(locale, fn);
}

// app 级扩展注册表：注册表外的业务域 code（如应用自己的 auth 码）由应用在启动时注册三语
// 文案，server 端本地化时一并查。@cloud/request 自身不收录这些业务域 code，保持通用。
// 结构：locale -> (code -> 文案)。
const extraErrorMessages: Record<string, Record<string, string>> = {};

export function registerErrorMessages(messages: Record<string, Record<string, string>>): void {
  for (const [locale, map] of Object.entries(messages)) {
    extraErrorMessages[locale] = { ...(extraErrorMessages[locale] ?? {}), ...map };
  }
}

// 单 locale 查文案：先内置注册表，再 app 扩展注册表。
function lookupMessage(code: string, locale: string): string | undefined {
  const builtin = (getErrorMessages(locale) as Record<string, string>)[code];
  if (builtin) return builtin;
  return extraErrorMessages[locale]?.[code];
}

// 取某 locale 的「内置 + app 注册」全量文案表。供 next-intl 的 errors 命名空间注入，
// 让客户端 / RSC 按 code 重译的覆盖面与服务端响应体一致（含 auth / account 等业务域 code）。
export function getAllErrorMessages(locale: string): Record<string, string> {
  return { ...getErrorMessages(locale), ...(extraErrorMessages[locale] ?? {}) };
}

// 命名占位插值：只替换 {name}，未提供的占位原样保留；不支持 ICU 复数/选择，
// 与客户端 next-intl 处理纯 {name} 占位的结果一致，故服务端只需轻量替换、无需依赖 next-intl。
function interpolate(template: string, params?: ErrorParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match,
  );
}

// code 为准：内置或 app 注册的 code 就按当前 locale 出文案（缺当前 locale 退英文）；
// 都没有（如 storage / database 等未注册的包外 code）才退回调用方显式传入的 message。
// 最后用 params 做 {name} 占位插值。
function resolveErrorMessage(code: string, fallback?: string, params?: ErrorParams): string {
  const locale = localeStore.getStore() ?? "en";
  const template =
    lookupMessage(code, locale) ?? lookupMessage(code, "en") ?? fallback ?? "An error occurred.";
  return interpolate(template, params);
}

// 日志固定走英文 / code，避免服务端日志随用户 locale 漂移，影响排查。
function resolveLogMessage(code: string, fallback?: string): string {
  return lookupMessage(code, "en") ?? fallback ?? code;
}

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

// errorResponse 选项：
// - params：{name} 占位插值参数，渲染进展示文案，不进响应体；
// - cause：原始异常，仅用于在日志里打堆栈（满足「所有异常都能从日志定位」），不回前端。
export type ErrorResponseOptions = {
  params?: ErrorParams;
  cause?: unknown;
};

// message 可选：注册表里有该 code 时按当前 locale 出文案，传入的 message 仅作为
// 包外 code 的兜底。响应文案本地化，日志保持英文 / code 稳定；有 cause 时连堆栈一起打。
export function errorResponse(
  code: string,
  message?: string,
  status = 400,
  options?: ErrorResponseOptions,
): Response {
  const traceId = generateTraceId(status);
  logError(traceId, code, resolveLogMessage(code, message), options?.cause);
  return Response.json(
    {
      message: resolveErrorMessage(code, message, options?.params),
      code,
      traceId,
    } satisfies ErrorBody,
    { status },
  );
}

// 统一日志出口：英文/code 稳定，带 cause 时附完整堆栈。
function logError(traceId: string, code: string, logMessage: string, cause?: unknown): void {
  if (cause !== undefined) {
    console.error(`[${traceId}] [${code}] ${logMessage}`, cause);
  } else {
    console.error(`[${traceId}] [${code}] ${logMessage}`);
  }
}

export function badRequestResponse(code = ERR_BAD_REQUEST, message?: string): Response {
  return errorResponse(code, message, 400);
}

export function unauthorizedResponse(code = ERR_UNAUTHORIZED, message?: string): Response {
  return errorResponse(code, message, 401);
}

export function forbiddenResponse(code = ERR_FORBIDDEN, message?: string): Response {
  return errorResponse(code, message, 403);
}

export function notFoundResponse(code = ERR_NOT_FOUND, message?: string): Response {
  return errorResponse(code, message, 404);
}

export function internalErrorResponse(error: unknown): Response {
  const traceId = generateTraceId(500);
  console.error(`[${traceId}] [${ERR_INTERNAL}]`, error);
  return Response.json(
    { message: resolveErrorMessage(ERR_INTERNAL), code: ERR_INTERNAL, traceId } satisfies ErrorBody,
    { status: 500 },
  );
}
