import { prisma } from "@cloud/db";
import {
  badRequestResponse,
  unauthorizedResponse,
  notFoundResponse,
  noContentResponse,
  internalErrorResponse,
} from "@cloud/request/server";
import { ERR_INVALID_ID, ERR_USER_NOT_FOUND, ERR_USER_CANCEL_NOT_PENDING } from "@cloud/request/error-codes";
import { getSession } from "../../../../../../lib/auth";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorizedResponse();

  try {
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
    return internalErrorResponse(error);
  }
}
