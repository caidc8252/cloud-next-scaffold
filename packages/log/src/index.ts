import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { randomBytes } from "node:crypto";

// 全局轻量分级日志。薄封装 console（无第三方库），统一 JSON 行输出（dev/prod 一致，
// 便于 Render 等平台抓取 stdout/stderr 并按字段/级别检索）。请求级 traceId 经 AsyncLocalStorage
// 自动携带、无需手动透传；每行带 seq（请求内行序号），traceId 时间可排序——双层有序。

export type LogLevel = "debug" | "info" | "warn" | "error";

type TraceContext = {
  traceId: string;
  seq: number; // 请求内行计数器（每打一条 +1）
  method?: string;
  path?: string;
  userId?: number;
  partyId?: number;
};

const traceStore = new AsyncLocalStorage<TraceContext>();

const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function thresholdOrder(): number {
  const explicit = process.env.LOG_LEVEL?.toLowerCase();
  if (explicit && explicit in ORDER) return ORDER[explicit as LogLevel];
  // 单测默认静音（避免刷屏），但 error 仍打；显式 LOG_LEVEL 优先。
  if (process.env.VITEST) return ORDER.error;
  return ORDER.info;
}

/** 时间可排序的唯一 traceId：base36 毫秒时间戳 + 随机后缀，无前缀。按字符串排 ≈ 按时间排。 */
export function newTraceId(): string {
  return `${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
}

/** 在一个请求级 trace 上下文里执行 fn（withApiHandler 在入口调用）。传入 traceId 则复用（跨服务串联）。 */
export function runWithTrace<T>(
  init: { traceId?: string; method?: string; path?: string },
  fn: () => T,
): T {
  const ctx: TraceContext = {
    traceId: init.traceId || newTraceId(),
    seq: 0,
    method: init.method,
    path: init.path,
  };
  return traceStore.run(ctx, fn);
}

/** 合并字段进当前 trace 上下文（会话解析后补 userId/partyId 等）。无上下文时 no-op。 */
export function enrichTrace(fields: Partial<Omit<TraceContext, "traceId" | "seq">>): void {
  const ctx = traceStore.getStore();
  if (ctx) Object.assign(ctx, fields);
}

/** 当前请求 traceId（无上下文返回 undefined）。供错误响应复用同一 id。 */
export function getTraceId(): string | undefined {
  return traceStore.getStore()?.traceId;
}

function serializeValue(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  return value;
}

function emit(scope: string, level: LogLevel, message: string, context?: Record<string, unknown>): void {
  if (ORDER[level] < thresholdOrder()) return;
  const ctx = traceStore.getStore();
  const line: Record<string, unknown> = {
    time: new Date().toISOString(),
    level,
    ...(ctx ? { traceId: ctx.traceId, seq: (ctx.seq += 1) } : {}),
    scope,
    msg: message,
    ...(ctx?.method ? { method: ctx.method } : {}),
    ...(ctx?.path ? { path: ctx.path } : {}),
    ...(ctx?.userId !== undefined ? { userId: ctx.userId } : {}),
    ...(ctx?.partyId !== undefined ? { partyId: ctx.partyId } : {}),
  };
  if (context) {
    for (const [k, v] of Object.entries(context)) line[k] = serializeValue(v);
  }
  const json = JSON.stringify(line);
  if (level === "warn") console.warn(json);
  else if (level === "error") console.error(json);
  else if (level === "debug") console.debug(json);
  else console.info(json);
}

export type Logger = {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
};

/** 建一个带来源标签（scope）的 logger，例如 createLogger("mail")。 */
export function createLogger(scope: string): Logger {
  return {
    debug: (m, c) => emit(scope, "debug", m, c),
    info: (m, c) => emit(scope, "info", m, c),
    warn: (m, c) => emit(scope, "warn", m, c),
    error: (m, c) => emit(scope, "error", m, c),
  };
}

/** 日志里的邮箱脱敏（不打全量 PII）：保留首字符 + 域名。 */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  return `${email.slice(0, 1)}***${email.slice(at)}`;
}
