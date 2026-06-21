// apps/portal/service/forgot-password/api.ts
// 找回/重置域客户端调用出口：具名函数、全量路径；类型同源于 ./schemas。重置消费端 /api/reset-password 也归本域。
import { request } from "@cloud/request/client";
import type { ResetInput, SendLinkInput } from "./schemas/forgot.schema";

export const sendResetLink = (input: SendLinkInput) =>
  request.post("/api/forgot-password/send-link", input);

export const validateResetToken = (token: string) =>
  request.get<{ valid: boolean }>("/api/reset-password/validate", { query: { token } });

export const resetPassword = (input: ResetInput) =>
  request.post("/api/reset-password", input);
