// apps/portal/service/auth/types.ts
// auth 域客户端响应/请求形状。真实流（challenge/password）+ 占位 SSO/MFA/选公司流（mock 形状，接入真实 IdP 后替换）。
import type { Company, IdpAccount, LoginResult, ProviderId, SsoTenant } from "@/lib/mock/types";

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
