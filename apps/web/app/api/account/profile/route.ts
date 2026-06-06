import { z } from "zod";
import { prisma } from "@cloud/db";
import { assertPermissions, updateSession } from "@cloud/permissions/server";
import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import { ERR_INVALID_JSON } from "@cloud/request/error-codes";
import {
  ERR_ACCOUNT_NICKNAME_REQUIRED,
  ERR_ACCOUNT_COUNTRY_INVALID,
} from "@/lib/account-error-codes";
import "@/lib/account-error-messages";
import { withApiHandler } from "@/lib/api-handler";
import { buildSessionSnapshot } from "@/lib/session-snapshot";
import { toAccountProfile } from "@/app/(portal)/account/_server/account-mapper";

/**
 * The signed-in user's own profile (display name, country, sign-in identity).
 *
 * Login-only — every authenticated user manages their own profile, no extra
 * permission. Read by the "My profile" page.
 */
export const GET = withApiHandler(async () => {
  const session = await assertPermissions({ all: [] });
  const user = await prisma.sysUser.findUniqueOrThrow({ where: { userId: session.userId } });
  return successResponse(toAccountProfile(user));
});

const patchSchema = z
  .object({
    nickName: z.string().trim().min(1).max(100),
    country: z.string().trim().length(2).nullable(),
  })
  .partial();

/**
 * Update the signed-in user's editable profile fields (display name, country).
 *
 * Rebuilds the session snapshot afterwards so the top bar / user card reflect a
 * renamed nickName without a re-login.
 */
export const PATCH = withApiHandler(async (req: Request) => {
  const session = await assertPermissions({ all: [] });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new BusinessError(ERR_INVALID_JSON);
  }

  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    const hasCountryIssue = parsed.error.issues.some((i) => i.path[0] === "country");
    throw new BusinessError(hasCountryIssue ? ERR_ACCOUNT_COUNTRY_INVALID : ERR_ACCOUNT_NICKNAME_REQUIRED);
  }

  const data: { nickName?: string; country?: string | null } = {};
  if (parsed.data.nickName !== undefined) data.nickName = parsed.data.nickName;
  if (parsed.data.country !== undefined) data.country = parsed.data.country;

  const user = await prisma.sysUser.update({ where: { userId: session.userId }, data });

  const snapshot = await buildSessionSnapshot(session.userId, session.currentPartnerId);
  if (snapshot) await updateSession(snapshot);

  return successResponse(toAccountProfile(user));
});
