// apps/portal/service/auth/api.ts
// auth 域客户端调用出口：具名函数、全量路径；请求类型同源于 ./schemas，响应/占位入参同源于 ./types。
import { request } from "@cloud/request/client";
import type { ProviderId } from "@/lib/mock/types";
import type { LoginInput, MfaVerifyInput, SelectPartnerInput } from "./schemas/auth.schema";
import type {
  IdpAccountsResponse,
  LoginChallenge,
  LoginResponse,
  MfaResponse,
  OidcLoginInput,
  PasswordLoginResponse,
  SelectPartnerResponse,
  SsoDomainsResponse,
} from "./types";

export const getLoginChallenge = () =>
  request.get<LoginChallenge>("/api/auth/login-challenge");

export const getSsoDomains = () =>
  request.get<SsoDomainsResponse>("/api/auth/sso-domains");

export const getIdpAccounts = (provider: ProviderId) =>
  request.get<IdpAccountsResponse>("/api/auth/idp-accounts", { query: { provider } });

export const loginWithPassword = (input: LoginInput) =>
  request.post<PasswordLoginResponse>("/api/auth/password", input);

export const loginWithOidc = (input: OidcLoginInput) =>
  request.post<LoginResponse>("/api/auth/oidc", input);

export const verifyMfa = (input: MfaVerifyInput) =>
  request.post<MfaResponse>("/api/auth/mfa", input);

export const selectLoginCompany = (input: { loginToken: string | null; companyId: string }) =>
  request.post<LoginResponse>("/api/auth/company", input);

export const selectPartner = (input: SelectPartnerInput) =>
  request.post<SelectPartnerResponse>("/api/auth/select-partner", input);

export const logout = () => request.post("/api/auth/logout");
