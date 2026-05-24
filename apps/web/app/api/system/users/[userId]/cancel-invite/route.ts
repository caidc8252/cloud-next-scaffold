import { prisma } from "@cloud/db";
import {
  badRequestResponse,
  unauthorizedResponse,
  notFoundResponse,
  noContentResponse,
} from "@cloud/request/server";
import { getSession } from "../../../../../../lib/auth";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorizedResponse();

  const { userId: rawId } = await params;
  const userId = Number(rawId);
  if (!Number.isFinite(userId)) return badRequestResponse("Invalid user ID.");

  const user = await prisma.sysUser.findUnique({ where: { userId } });
  if (!user) return notFoundResponse("User not found.");
  if (user.status !== "PENDING") {
    return badRequestResponse("Can only cancel invites for pending users.");
  }

  // Delete the PENDING user — cascades to invite, entity-user, user-role
  await prisma.sysUser.delete({ where: { userId } });

  return noContentResponse();
}
