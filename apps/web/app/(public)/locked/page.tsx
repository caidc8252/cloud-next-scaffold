import { redirect } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@cloud/ui";
import { getPartialSession, getSession } from "@cloud/permissions/server";

export default async function LockedPage() {
  const session = await getSession();
  if (session) redirect("/");

  const partial = await getPartialSession();
  if (!partial) redirect("/login");

  const { prisma } = await import("@cloud/db");
  const entityUsers = await prisma.sysEntityUser.findMany({
    where: { userId: partial.id },
    include: { entity: { select: { entityId: true, entityName: true, status: true } } },
  });

  const hasActive = entityUsers.some(
    (eu) => eu.status === "ACTIVE" && eu.entity.status === "ACTIVE",
  );
  if (hasActive) redirect("/select-entity");

  const lockedEntityNames = entityUsers.map((eu) => eu.entity.entityName);

  return (
    <main className="login-screen">
      <Card className="login-card" style={{ maxWidth: 480 }}>
        <CardHeader className="login-card__body">
          <div className="login-grid">
            <CardTitle>Access disabled</CardTitle>
            <p className="login-note">
              Hello, <strong>{partial.displayName ?? partial.username}</strong>.
              Your access to the following organizations has been disabled. Please contact your administrator.
            </p>
          </div>
        </CardHeader>
        <CardContent className="login-card__body">
          {lockedEntityNames.length > 0 && (
            <ul className="mb-4 pl-4 text-sm text-content-secondary list-disc space-y-1">
              {lockedEntityNames.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          )}
          <form action="/api/auth/logout" method="GET">
            <Button type="submit" className="w-full">Sign out</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
