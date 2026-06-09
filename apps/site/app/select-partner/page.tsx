import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@cloud/ui";
import { prisma } from "@cloud/db";
import { getTranslations } from "@cloud/i18n/server";
import { getPartialSession, getSession } from "@cloud/permissions/server";
import { getWebAppUrl } from "@/lib/platform-routing";
import { PartnerList } from "./_components/partner-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("site.partner.metadata");

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function SelectPartnerPage() {
  const t = await getTranslations("site.partner");
  const session = await getSession();
  if (session) redirect(getWebAppUrl());

  const partial = await getPartialSession();
  if (!partial) redirect("/login");

  const partnerUsers = await prisma.sysPartnerUser.findMany({
    where: { userId: partial.userId },
    include: {
      partner: {
        select: {
          partnerId: true,
          partnerName: true,
          status: true,
        },
      },
    },
    orderBy: { partnerId: "asc" },
  });

  const partners = partnerUsers.map((partnerUser) => ({
    partnerId: partnerUser.partnerId,
    partnerName: partnerUser.partner.partnerName,
    active: partnerUser.status === "ACTIVE" && partnerUser.partner.status === "ACTIVE",
  }));

  if (!partners.some((partner) => partner.active)) redirect("/locked");

  return (
    <main className="site-login-screen">
      <div className="site-login-shell site-partner-shell">
        <Card className="site-login-card">
          <CardHeader className="site-login-card-header">
          <p className="site-login-eyebrow">{t("eyebrow")}</p>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>
              {t("description", { name: partial.displayName ?? partial.username })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PartnerList partners={partners} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
