import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@cloud/ui";
import { getTranslations } from "@cloud/i18n/server";
import { getPartialSession, getSession } from "@cloud/permissions/server";
import { getWebAppUrl } from "@/lib/platform-routing";
import { listPartnerChoices } from "@/lib/partner-choices";
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

  const choices = await listPartnerChoices(partial.userId);
  if (choices.length === 0) redirect("/locked");

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
            <PartnerList choices={choices} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
