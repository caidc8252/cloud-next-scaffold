import { z } from "zod";
import { prisma } from "@cloud/db";
import { assertPermissions } from "@cloud/permissions/server";
import { successResponse, badRequestResponse } from "@cloud/request/server";
import { ERR_INVALID_JSON } from "@cloud/request/error-codes";
import { ERR_ACCOUNT_EMAIL_INVALID } from "@/lib/account-error-codes";
import "@/lib/account-error-messages";
import { withApiHandler } from "@/lib/api-handler";
import { issueVerifyCode, deliverVerifyCode } from "@/lib/account-verify-code";

/**
 * Issue a verification code for an identity change (email / username).
 *
 * The code is stored in Redis (TTL 10 min) and delivered via a TODO stub that
 * logs it — a real mail transport is wired later. The code is never returned in
 * the response. Login-only.
 */
const schema = z.object({
  purpose: z.enum(["EMAIL_CURRENT", "EMAIL_NEW", "USERNAME_CURRENT"]),
  newEmail: z.email().optional(),
});

export const POST = withApiHandler(async (req: Request) => {
  const session = await assertPermissions({ all: [] });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return badRequestResponse(ERR_INVALID_JSON);
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) return badRequestResponse(ERR_ACCOUNT_EMAIL_INVALID);

  const { purpose, newEmail } = parsed.data;
  if (purpose === "EMAIL_NEW" && !newEmail) return badRequestResponse(ERR_ACCOUNT_EMAIL_INVALID);

  const user = await prisma.sysUser.findUniqueOrThrow({ where: { userId: session.userId } });
  const address = purpose === "EMAIL_NEW" ? newEmail! : user.email;
  const code = await issueVerifyCode(
    session.userId,
    purpose,
    purpose === "EMAIL_NEW" ? { newEmail } : undefined,
  );
  deliverVerifyCode(address, purpose, code);

  return successResponse({ sent: true });
});
