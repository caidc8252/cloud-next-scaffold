import { request } from "@cloud/request/client";
import type { ResetInput, SendLinkInput } from "../schema/forgot.schema";

export const sendResetLink = (input: SendLinkInput) =>
  request.post("/api/forgot-password/send-link", input);

export const validateResetToken = (token: string) =>
  request.get<{ valid: boolean }>("/api/reset-password/validate", { query: { token } });

export const resetPassword = (input: ResetInput) =>
  request.post("/api/reset-password", input);
