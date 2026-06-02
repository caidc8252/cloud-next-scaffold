import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@cloud/ui";
import { getPartialSession, getSession } from "@cloud/permissions/server";
import { prisma } from "@cloud/db";
import { PartnerList } from "./_components/partner-list";

export default async function SelectPartnerPage() {
  const session = await getSession();
  if (session) redirect("/");

  const partial = await getPartialSession();
  if (!partial) redirect("/login");

  const partnerUsers = await prisma.sysPartnerUser.findMany({
    where: { userId: partial.userId },
    include: { partner: { select: { partnerId: true, partnerName: true, status: true } } },
  });

  const allInactive = partnerUsers.every(
    (eu) => eu.status !== "ACTIVE" || eu.partner.status !== "ACTIVE",
  );
  if (allInactive) redirect("/locked");

  const partners = partnerUsers.map((eu) => ({
    partnerId: eu.partnerId,
    partnerName: eu.partner.partnerName,
    active: eu.status === "ACTIVE" && eu.partner.status === "ACTIVE",
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
          <PartnerList partners={partners} />
        </CardContent>
      </Card>
    </main>
  );
}
