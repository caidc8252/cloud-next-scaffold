import { z } from "zod";
import { prisma } from "@cloud/db";
import { assertPermissions, updateSession } from "@cloud/permissions/server";
import { successResponse, badRequestResponse, errorResponse } from "@cloud/request/server";
import { ERR_INVALID_JSON } from "@cloud/request/error-codes";
import {
  ERR_ACCOUNT_EMAIL_INVALID,
  ERR_ACCOUNT_EMAIL_TAKEN,
  ERR_ACCOUNT_EMAIL_SAME,
  ERR_ACCOUNT_VERIFY_CODE_INVALID,
} from "@/lib/account-error-codes";
import "@/lib/account-error-messages";
import { withApiHandler } from "@/lib/api-handler";
import { buildSessionSnapshot } from "@/lib/session-snapshot";
import { readVerifyCode, consumeVerifyCode } from "@/lib/account-verify-code";
import { toAccountProfile } from "@/app/(portal)/account/_server/account-mapper";

/**
 * Apply a verified email change.
 *
 * Requires codes for both the current email (EMAIL_CURRENT) and the new email
 * (EMAIL_NEW) — proving control of both. Checks uniqueness (citext), consumes
 * the codes, and rebuilds the session snapshot.
 */
const schema = z.object({
  newEmail: z.email(),
  currentCode: z.string().trim().length(6),
  newCode: z.string().trim().length(6),
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
  if (!parsed.success) return badRequestResponse(ERR_ACCOUNT_EMAIL_INVALID);
  const { newEmail, currentCode, newCode } = parsed.data;

  const user = await prisma.sysUser.findUniqueOrThrow({ where: { userId: session.userId } });

  const current = await readVerifyCode(session.userId, "EMAIL_CURRENT");
  if (!current || current.code !== currentCode) return badRequestResponse(ERR_ACCOUNT_VERIFY_CODE_INVALID);

  const next = await readVerifyCode(session.userId, "EMAIL_NEW");
  if (
    !next ||
    next.code !== newCode ||
    (next.newEmail ?? "").toLowerCase() !== newEmail.toLowerCase()
  ) {
    return badRequestResponse(ERR_ACCOUNT_VERIFY_CODE_INVALID);
  }

  if (newEmail.toLowerCase() === user.email.toLowerCase()) {
    return badRequestResponse(ERR_ACCOUNT_EMAIL_SAME);
  }

  const taken = await prisma.sysUser.findFirst({
    where: { email: newEmail, NOT: { userId: session.userId } },
    select: { userId: true },
  });
  if (taken) return errorResponse(ERR_ACCOUNT_EMAIL_TAKEN, undefined, 409);

  const updated = await prisma.sysUser.update({
    where: { userId: session.userId },
    data: { email: newEmail },
  });
  await consumeVerifyCode(session.userId, "EMAIL_CURRENT");
  await consumeVerifyCode(session.userId, "EMAIL_NEW");

  const snapshot = await buildSessionSnapshot(session.userId, session.currentPartnerId);
  if (snapshot) await updateSession(snapshot);

  return successResponse(toAccountProfile(updated));
});
