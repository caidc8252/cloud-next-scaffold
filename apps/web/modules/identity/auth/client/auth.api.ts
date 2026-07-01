// apps/web/modules/identity/auth/client/auth.api.ts
// auth 域客户端调用出口：具名函数、全量路径；请求类型同源于 ../schema，响应/占位入参同源于下方内联类型。
import { request } from "@cloud/request/client";
import type { Company, IdpAccount, LoginResult, ProviderId, SsoTenant } from "@/lib/auth-ui-types";
import type { LoginInput, MfaVerifyInput, SelectPartnerInput } from "../schema/auth.schema";

// auth 域客户端响应/请求形状。真实流（challenge/password）+ 占位 SSO/MFA/选公司流（mock 形状，接入真实 IdP 后替换）。

// login-challenge 下发的时间戳 + nonce（password / reset / register 加密共用）。
export type LoginChallenge = { serverTimestamp: number; nonce: string };

// POST /api/auth/password 真实返回。
export type PasswordLoginResponse = {
  redirectTo?: string;
  mfaRequired?: boolean;
  mfaToken?: string;
};

// ↓ 占位流（mock）。
export type LoginResponse = LoginResult & { redirectTo?: string };

export type MfaResponse = { redirectTo?: string } & Partial<{
  status: "ok" | "company" | "wrong" | "blocked";
  companies: Company[];
  triesLeft: number;
}>;

export type OidcLoginInput = {
  provider: ProviderId;
  email: string;
  name: string;
  sub: string;
  mode: "enterprise" | "sso";
};

export type SelectPartnerResponse = { redirectTo: string };
export type SsoDomainsResponse = { tenants: SsoTenant[] };
export type IdpAccountsResponse = { accounts: IdpAccount[] };

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
