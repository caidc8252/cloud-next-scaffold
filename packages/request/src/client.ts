"use client";
import "client-only";

import type { ErrorBody, SuccessBody } from "./index.ts";

export type { ErrorBody, Pager, SuccessBody } from "./index.ts";

export type RequestQueryValue = string | number | boolean | null | undefined;

export type RequestOptions = {
  signal?: AbortSignal;
  headers?: HeadersInit;
  query?: Record<string, RequestQueryValue>;
};

export class RequestError extends Error {
  readonly status: number;
  readonly body?: ErrorBody;

  constructor(message: string, status: number, body?: ErrorBody, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "RequestError";
    this.status = status;
    this.body = body;
  }
}

function buildUrl(url: string, query: RequestOptions["query"]): string {
  if (!query) return url;
  const fallbackOrigin = "http://_internal_";
  const origin = typeof window !== "undefined" ? window.location.origin : fallbackOrigin;
  const resolved = new URL(url, origin);

  for (const [key, value] of Object.entries(query)) {
    if (value == null) continue;
    resolved.searchParams.append(key, String(value));
  }

  if (typeof window !== "undefined" && resolved.origin === window.location.origin) {
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  }

  if (resolved.origin === fallbackOrigin) {
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  }

  return resolved.toString();
}

async function parseJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch (cause) {
    throw new RequestError(
      `HTTP ${response.status} (parse failed)`,
      response.status,
      undefined,
      cause,
    );
  }
}

async function execute(method: string, url: string, body?: unknown, options?: RequestOptions) {
  const headers = new Headers(options?.headers);
  const finalUrl = buildUrl(url, options?.query);
  const init: RequestInit = { method, headers, signal: options?.signal };

  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
    init.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(finalUrl, init);
  } catch (cause) {
    throw new RequestError("network failure", 0, undefined, cause);
  }

  if (!response.ok) {
    let errorBody: ErrorBody | undefined;
    try {
      errorBody = (await response.json()) as ErrorBody;
    } catch {}
    throw new RequestError(
      errorBody?.message ?? `HTTP ${response.status}`,
      response.status,
      errorBody,
    );
  }

  if (response.status === 204) return undefined;
  return await parseJson<SuccessBody<unknown>>(response);
}

export const request = {
  get: <T>(url: string, options?: RequestOptions) =>
    execute("GET", url, undefined, options) as Promise<SuccessBody<T>>,
  post: <T>(url: string, body?: unknown, options?: RequestOptions) =>
    execute("POST", url, body, options) as Promise<SuccessBody<T>>,
  put: <T>(url: string, body?: unknown, options?: RequestOptions) =>
    execute("PUT", url, body, options) as Promise<SuccessBody<T>>,
  patch: <T>(url: string, body?: unknown, options?: RequestOptions) =>
    execute("PATCH", url, body, options) as Promise<SuccessBody<T>>,
  delete: <T>(url: string, options?: RequestOptions) =>
    execute("DELETE", url, undefined, options) as Promise<SuccessBody<T>>,
};
