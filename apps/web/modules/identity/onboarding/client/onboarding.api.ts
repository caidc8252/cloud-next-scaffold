import { request } from "@cloud/request/client";
import type { AcceptInput, AcceptResult, InvitePublic } from "../schema/onboarding.schema";

export const getOnboardingInvite = (token: string) =>
  request.get<{ invitation: InvitePublic }>("/api/onboarding/invite", { query: { token } });

export const acceptOnboarding = (input: AcceptInput) =>
  request.post<AcceptResult>("/api/onboarding/accept", input);
