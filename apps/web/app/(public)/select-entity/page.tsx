import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@cloud/ui";
import { getPartialSession, getSession } from "@cloud/permissions/server";
import { prisma } from "@cloud/db";
import { EntityList } from "./_components/entity-list";

export default async function SelectEntityPage() {
  const session = await getSession();
  if (session) redirect("/");

  const partial = await getPartialSession();
  if (!partial) redirect("/login");

  const entityUsers = await prisma.sysEntityUser.findMany({
    where: { userId: partial.id },
    include: { entity: { select: { entityId: true, entityName: true, status: true } } },
  });

  const allInactive = entityUsers.every(
    (eu) => eu.status !== "ACTIVE" || eu.entity.status !== "ACTIVE",
  );
  if (allInactive) redirect("/locked");

  const entities = entityUsers.map((eu) => ({
    entityId: eu.entityId,
    entityName: eu.entity.entityName,
    active: eu.status === "ACTIVE" && eu.entity.status === "ACTIVE",
  }));

  return (
    <main className="login-screen">
      <Card className="login-card" style={{ maxWidth: 480 }}>
        <CardHeader className="login-card__body">
          <div className="login-grid">
            <CardTitle>Select organization</CardTitle>
            <p className="login-note">
              Welcome, <strong>{partial.displayName ?? partial.username}</strong>. Choose an organization to continue.
            </p>
          </div>
        </CardHeader>
        <CardContent className="login-card__body">
          <EntityList entities={entities} />
        </CardContent>
      </Card>
    </main>
  );
}
