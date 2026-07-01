// apps/admin/service/account/api.ts
// account 域客户端调用出口：具名函数、全量路径；请求类型同源于 ./schemas，响应 VO 同源于 ./types。
// MFA 端点在 /api/account/mfa/* 下、入参也在本域 schema，故归 account（不归 service/mfa 那个 server 能力）。
import { request } from "@cloud/request/client";
import type { AccountProfile, AccountSecurity, EnrollData } from "../schema/account.types";
import type {
  ActivateMfaInput,
  ChangeEmailInput,
  ChangePasswordInput,
  DisableMfaInput,
  RequestCodeInput,
  UpdateProfileInput,
} from "../schema/account.schema";

export const updateAccountProfile = (input: UpdateProfileInput) =>
  request.patch<AccountProfile>("/api/account/profile", input);

export const changeAccountEmail = (input: ChangeEmailInput) =>
  request.patch<AccountProfile>("/api/account/email", input);

export const requestIdentityCode = (input: RequestCodeInput) =>
  request.post("/api/account/identity/request-code", input);

export const changeAccountPassword = (input: ChangePasswordInput) =>
  request.post("/api/account/password", input);

export const getAccountSecurity = () =>
  request.get<AccountSecurity>("/api/account/mfa");

export const enrollAccountMfa = () =>
  request.post<EnrollData>("/api/account/mfa/enroll");

export const activateAccountMfa = (input: ActivateMfaInput) =>
  request.post<AccountSecurity>("/api/account/mfa/activate", input);

export const disableAccountMfa = (input: DisableMfaInput) =>
  request.post<AccountSecurity>("/api/account/mfa/disable", input);
