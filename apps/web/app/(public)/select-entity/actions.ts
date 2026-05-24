"use server";

import { redirect } from "next/navigation";
import { getPartialSession, upgradeSession } from "../../../lib/auth";

export async function selectEntityAction(formData: FormData) {
  const partial = await getPartialSession();
  if (!partial) {
    redirect("/login");
  }

  const entityId = Number(formData.get("entityId"));
  if (!Number.isFinite(entityId)) {
    redirect("/select-entity");
  }

  const { prisma } = await import("@cloud/db");

  const entityUser = await prisma.sysEntityUser.findUnique({
    where: { entityId_userId: { entityId, userId: partial.id } },
    include: { entity: true },
  });

  if (!entityUser || entityUser.status !== "ACTIVE" || entityUser.entity.status !== "ACTIVE") {
    redirect("/select-entity");
  }

  const contract = await prisma.sysEntityContract.findFirst({
    where: { authorizedEntityId: entityId, status: "ACTIVE" },
  });

  if (!contract) {
    redirect("/select-entity");
  }

  await upgradeSession(entityId);
  redirect("/");
}
