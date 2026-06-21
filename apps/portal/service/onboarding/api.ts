// apps/portal/service/onboarding/api.ts
// onboarding 域客户端调用出口：具名函数、全量路径；类型同源于 ./schemas。
import { request } from "@cloud/request/client";
import type { AcceptInput, AcceptResult, InvitePublic } from "./schemas/onboarding.schema";

export const getOnboardingInvite = (token: string) =>
  request.get<{ invitation: InvitePublic }>("/api/onboarding/invite", { query: { token } });

export const acceptOnboarding = (input: AcceptInput) =>
  request.post<AcceptResult>("/api/onboarding/accept", input);
