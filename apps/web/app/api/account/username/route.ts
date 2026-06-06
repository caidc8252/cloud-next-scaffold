import { z } from "zod";
import { prisma } from "@cloud/db";
import { assertPermissions, updateSession } from "@cloud/permissions/server";
import { successResponse, badRequestResponse, errorResponse } from "@cloud/request/server";
import { ERR_INVALID_JSON } from "@cloud/request/error-codes";
import {
  ERR_ACCOUNT_USERNAME_INVALID,
  ERR_ACCOUNT_USERNAME_TAKEN,
  ERR_ACCOUNT_USERNAME_SAME,
  ERR_ACCOUNT_VERIFY_CODE_INVALID,
} from "@/lib/account-error-codes";
import "@/lib/account-error-messages";
import { withApiHandler } from "@/lib/api-handler";
import { buildSessionSnapshot } from "@/lib/session-snapshot";
import { readVerifyCode, consumeVerifyCode } from "@/lib/account-verify-code";
import { toAccountProfile } from "@/app/(portal)/account/_server/account-mapper";

/**
 * Apply a verified username change.
 *
 * Requires a code sent to the current email (USERNAME_CURRENT). Checks the
 * username regex + uniqueness (citext), consumes the code, rebuilds the session.
 */
const USERNAME_RX = /^[A-Za-z0-9._-]{3,32}$/;
const schema = z.object({
  newUsername: z.string().trim().regex(USERNAME_RX),
  currentCode: z.string().trim().length(6),
});

export const PATCH = withApiHandler(async (req: Request) => {
  const session = await assertPermissions({ all: [] });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return badRequestResponse(ERR_INVALID_JSON);
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) return badRequestResponse(ERR_ACCOUNT_USERNAME_INVALID);
  const { newUsername, currentCode } = parsed.data;

  const user = await prisma.sysUser.findUniqueOrThrow({ where: { userId: session.userId } });

  const current = await readVerifyCode(session.userId, "USERNAME_CURRENT");
  if (!current || current.code !== currentCode) return badRequestResponse(ERR_ACCOUNT_VERIFY_CODE_INVALID);

  if (newUsername.toLowerCase() === user.username.toLowerCase()) {
    return badRequestResponse(ERR_ACCOUNT_USERNAME_SAME);
  }

  const taken = await prisma.sysUser.findFirst({
    where: { username: newUsername, NOT: { userId: session.userId } },
    select: { userId: true },
  });
  if (taken) return errorResponse(ERR_ACCOUNT_USERNAME_TAKEN, undefined, 409);

  const updated = await prisma.sysUser.update({
    where: { userId: session.userId },
    data: { username: newUsername },
  });
  await consumeVerifyCode(session.userId, "USERNAME_CURRENT");

  const snapshot = await buildSessionSnapshot(session.userId, session.currentPartnerId);
  if (snapshot) await updateSession(snapshot);

  return successResponse(toAccountProfile(updated));
});
