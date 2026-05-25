import { redirect } from "next/navigation";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@cloud/ui";
import { getPartialSession, getSession } from "@cloud/permissions/server";
import { selectEntityAction } from "./actions";

export default async function SelectEntityPage() {
  const session = await getSession();
  if (session) redirect("/");

  const partial = await getPartialSession();
  if (!partial) redirect("/login");

  const { prisma } = await import("@cloud/db");
  const entityUsers = await prisma.sysEntityUser.findMany({
    where: { userId: partial.id },
    include: { entity: { select: { entityId: true, entityName: true, status: true } } },
  });

  const allInactive = entityUsers.every(
    (eu) => eu.status !== "ACTIVE" || eu.entity.status !== "ACTIVE",
  );
  if (allInactive) redirect("/locked");

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
          <div className="flex flex-col gap-2">
            {entityUsers.map((eu) => {
              const active = eu.status === "ACTIVE" && eu.entity.status === "ACTIVE";
              return (
                <form key={eu.entityId} action={selectEntityAction}>
                  <input type="hidden" name="entityId" value={eu.entityId} />
                  <button
                    type="submit"
                    disabled={!active}
                    className="w-full text-left px-4 py-3 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-hover border-line-default"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-content-primary">
                        {eu.entity.entityName}
                      </span>
                      <Badge variant={active ? "default" : "outline"}>
                        {active ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                  </button>
                </form>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
