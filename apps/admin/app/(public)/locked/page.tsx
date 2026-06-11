import { redirect } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@cloud/ui";
import { getPartialSession, getSession } from "@cloud/permissions/server";
import { getPortalLoginUrl } from "@/lib/portal-routing";

export default async function LockedPage() {
  const session = await getSession();
  if (session) redirect("/");

  const partial = await getPartialSession();
  if (!partial) redirect(getPortalLoginUrl());

  const { prisma } = await import("@cloud/db");
  const partyUsers = await prisma.sysPartyUser.findMany({
    where: { userId: partial.userId },
    include: { partner: { select: { partyId: true, partyName: true, status: true } } },
  });

  const hasActive = partyUsers.some(
    (eu) => eu.status === "ACTIVE" && eu.partner.status === "ACTIVE",
  );
  if (hasActive) redirect("/select-partner");

  const lockedPartyNames = partyUsers.map((eu) => eu.partner.partyName);

  return (
    <main className="login-screen">
      <Card className="login-card">
        <CardHeader className="login-card__body">
          <div className="login-grid">
            <CardTitle>Access disabled</CardTitle>
            <p className="login-note">
              Hello, <strong>{partial.displayName ?? partial.email}</strong>.
              Your access to the following organizations has been disabled. Please contact your administrator.
            </p>
          </div>
        </CardHeader>
        <CardContent className="login-card__body">
          {lockedPartyNames.length > 0 && (
            <ul className="mb-4 pl-4 text-sm text-content-secondary list-disc space-y-1">
              {lockedPartyNames.map((name) => (
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
