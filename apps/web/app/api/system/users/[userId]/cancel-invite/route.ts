import { prisma } from "@cloud/db";
import { badRequestResponse, notFoundResponse, noContentResponse } from "@cloud/request/server";
import {
  ERR_INVALID_ID,
  ERR_USER_NOT_FOUND,
  ERR_USER_CANCEL_NOT_PENDING,
} from "@cloud/request/error-codes";
import { assertPermissions } from "@cloud/permissions/server";
import { withApiHandler } from "@/lib/api-handler";

export const POST = withApiHandler(
  async (_req: Request, { params }: { params: Promise<{ userId: string }> }) => {
    await assertPermissions({ all: ["users.INVITE"] });
    const { userId: rawId } = await params;
    const userId = Number(rawId);
    if (!Number.isFinite(userId)) return badRequestResponse(ERR_INVALID_ID);

    const user = await prisma.sysUser.findUnique({ where: { userId } });
    if (!user) return notFoundResponse(ERR_USER_NOT_FOUND, "User not found.");
    if (user.status !== "PENDING") {
      return badRequestResponse(ERR_USER_CANCEL_NOT_PENDING);
    }

    await prisma.sysUser.delete({ where: { userId } });

    return noContentResponse();
  },
);
