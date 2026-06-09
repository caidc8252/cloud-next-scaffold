import { redirect } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@cloud/ui";
import { getPartialSession, getSession } from "@cloud/permissions/server";
import { getSiteLoginUrl } from "@/lib/site-routing";

export default async function LockedPage() {
  const session = await getSession();
  if (session) redirect("/");

  const partial = await getPartialSession();
  if (!partial) redirect(getSiteLoginUrl());

  const { prisma } = await import("@cloud/db");
  const partnerUsers = await prisma.sysPartnerUser.findMany({
    where: { userId: partial.userId },
    include: { partner: { select: { partnerId: true, partnerName: true, status: true } } },
  });

  const hasActive = partnerUsers.some(
    (eu) => eu.status === "ACTIVE" && eu.partner.status === "ACTIVE",
  );
  if (hasActive) redirect("/select-partner");

  const lockedPartnerNames = partnerUsers.map((eu) => eu.partner.partnerName);

  return (
    <main className="login-screen">
      <Card className="login-card">
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
          {lockedPartnerNames.length > 0 && (
            <ul className="mb-4 pl-4 text-sm text-content-secondary list-disc space-y-1">
              {lockedPartnerNames.map((name) => (
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
