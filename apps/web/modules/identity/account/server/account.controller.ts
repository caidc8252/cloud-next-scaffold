import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import { ERR_INVALID_JSON } from "@cloud/request/error-codes";
import { assertPermissions } from "@cloud/permissions/server";
import {
  ERR_ACCOUNT_NICKNAME_REQUIRED,
  ERR_ACCOUNT_COUNTRY_INVALID,
  ERR_ACCOUNT_EMAIL_INVALID,
  ERR_ACCOUNT_MFA_ENROLL_CODE_INVALID,
  ERR_ACCOUNT_MFA_STEPUP_INVALID,
} from "@/lib/account-error-codes";
import { withApiHandler } from "@/lib/api-handler";
import {
  updateProfileSchema,
  changeEmailSchema,
  changePasswordSchema,
  requestCodeSchema,
  activateMfaSchema,
  disableMfaSchema,
} from "../schema/account.schema";
import * as svc from "./account.service";

// /api/account/* 子路由共用本 controller。所有动作仅登录(assertPermissions({all:[]}))。

/** 登录用户自己的 profile(展示名/国家/登录身份)。 */
export const getProfile = withApiHandler(async () => {
  const session = await assertPermissions({ all: [] });
  return successResponse(await svc.getProfile(session.userId));
});

/** 更新可编辑 profile 字段(展示名/国家),并重建 session 快照。 */
export const updateProfile = withApiHandler(async (req: Request) => {
  const session = await assertPermissions({ all: [] });
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new BusinessError(ERR_INVALID_JSON);
  }
  const parsed = updateProfileSchema.safeParse(raw);
  if (!parsed.success) {
    const hasCountryIssue = parsed.error.issues.some((i) => i.path[0] === "country");
    throw new BusinessError(
      hasCountryIssue ? ERR_ACCOUNT_COUNTRY_INVALID : ERR_ACCOUNT_NICKNAME_REQUIRED,
    );
  }
  return successResponse(await svc.updateProfile(session, parsed.data));
});

/** 应用已验证的邮箱变更(双码校验 + 唯一性),重建 session 快照。 */
export const changeEmail = withApiHandler(async (req: Request) => {
  const session = await assertPermissions({ all: [] });
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new BusinessError(ERR_INVALID_JSON);
  }
  const parsed = changeEmailSchema.safeParse(raw);
  if (!parsed.success) throw new BusinessError(ERR_ACCOUNT_EMAIL_INVALID);
  return successResponse(await svc.changeEmail(session, parsed.data));
});

/** 修改密码(重认证 + MFA step-up + 策略/历史校验,RSA-OAEP 传输)。 */
export const changePassword = withApiHandler(async (req: Request) => {
  const session = await assertPermissions({ all: [] });
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new BusinessError(ERR_INVALID_JSON);
  }
  const parsed = changePasswordSchema.safeParse(raw);
  if (!parsed.success) throw new BusinessError(ERR_INVALID_JSON);
  return successResponse(await svc.changePassword(session, parsed.data));
});

/** 为身份变更(邮箱/用户名)签发验证码(存 Redis TTL 10min,带外送达,不回包)。 */
export const requestCode = withApiHandler(async (req: Request) => {
  const session = await assertPermissions({ all: [] });
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new BusinessError(ERR_INVALID_JSON);
  }
  const parsed = requestCodeSchema.safeParse(raw);
  if (!parsed.success) throw new BusinessError(ERR_ACCOUNT_EMAIL_INVALID);
  return successResponse(await svc.requestVerifyCode(session, parsed.data));
});

/** 登录用户所属 partner 列表(切换公司用)。 */
export const listPartners = withApiHandler(async () => {
  const session = await assertPermissions({ all: [] });
  return successResponse(await svc.listPartners(session.userId, session.currentPartyId));
});

/** 账户安全态(MFA 标志/状态 + 密码元信息)。 */
export const getSecurity = withApiHandler(async () => {
  const session = await assertPermissions({ all: [] });
  return successResponse(await svc.getAccountSecurity(session.userId));
});

/** 开始 MFA 注册(Enable/Reconfigure),返回一次性 secret + otpauth URI。 */
export const enrollMfa = withApiHandler(async () => {
  const session = await assertPermissions({ all: [] });
  return successResponse(await svc.enrollMfa(session));
});

/** 用新验证器的码激活 PENDING 注册。 */
export const activateMfa = withApiHandler(async (req: Request) => {
  const session = await assertPermissions({ all: [] });
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new BusinessError(ERR_INVALID_JSON);
  }
  const parsed = activateMfaSchema.safeParse(raw);
  if (!parsed.success) throw new BusinessError(ERR_ACCOUNT_MFA_ENROLL_CODE_INVALID);
  return successResponse(await svc.activateMfa(session, parsed.data));
});

/** 关闭 MFA(step-up:校验当前 TOTP,清除 mfaEnable 并删除因子)。 */
export const disableMfa = withApiHandler(async (req: Request) => {
  const session = await assertPermissions({ all: [] });
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new BusinessError(ERR_INVALID_JSON);
  }
  const parsed = disableMfaSchema.safeParse(raw);
  if (!parsed.success) throw new BusinessError(ERR_ACCOUNT_MFA_STEPUP_INVALID);
  return successResponse(await svc.disableAccountMfa(session, parsed.data));
});
