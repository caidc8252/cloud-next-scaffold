import { prisma } from "@cloud/db";
import {
  badRequestResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  noContentResponse,
  internalErrorResponse,
} from "@cloud/request/server";
import { ERR_INVALID_ID, ERR_USER_NOT_FOUND, ERR_USER_CANCEL_NOT_PENDING } from "@cloud/request/error-codes";
import { AuthzError, assertPermissions } from "@cloud/permissions/server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    await assertPermissions({ all: ["users.INVITE"] });
    const { userId: rawId } = await params;
    const userId = Number(rawId);
    if (!Number.isFinite(userId)) return badRequestResponse(ERR_INVALID_ID, "Invalid user ID.");

    const user = await prisma.sysUser.findUnique({ where: { userId } });
    if (!user) return notFoundResponse(ERR_USER_NOT_FOUND, "User not found.");
    if (user.status !== "PENDING") {
      return badRequestResponse(ERR_USER_CANCEL_NOT_PENDING, "Can only cancel invites for pending users.");
    }

    await prisma.sysUser.delete({ where: { userId } });

    return noContentResponse();
  } catch (error) {
    if (error instanceof AuthzError) {
      return error.status === 401
        ? unauthorizedResponse(error.code, "Unauthorized.")
        : forbiddenResponse(error.code, "Forbidden.");
    }

    return internalErrorResponse(error);
  }
}
