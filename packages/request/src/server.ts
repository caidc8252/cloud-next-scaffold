import "server-only";

import type { ErrorBody, Pager, SuccessBody } from "./index.ts";

export type { ErrorBody, Pager, SuccessBody } from "./index.ts";

export function successResponse<T>(data: T, pager?: Pager): Response {
  const body: SuccessBody<T> = pager ? { data, pager } : { data };
  return Response.json(body);
}

export function createdResponse<T>(data: T): Response {
  return Response.json({ data } satisfies SuccessBody<T>, { status: 201 });
}

export function noContentResponse(): Response {
  return new Response(null, { status: 204 });
}

export function errorResponse(message: string, status = 400): Response {
  return Response.json({ message } satisfies ErrorBody, { status });
}

export function badRequestResponse(message = "Bad request."): Response {
  return errorResponse(message, 400);
}

export function unauthorizedResponse(message = "Unauthorized."): Response {
  return errorResponse(message, 401);
}

export function forbiddenResponse(message = "Forbidden."): Response {
  return errorResponse(message, 403);
}

export function notFoundResponse(message = "Not found."): Response {
  return errorResponse(message, 404);
}
