import { redirect } from "next/navigation";
import { getTranslations } from "@cloud/i18n/server";
import { Card, CardContent, CardHeader, CardTitle } from "@cloud/ui";
import { getPartialSession, getSession } from "@cloud/permissions/server";
import { listPartnerChoices } from "@/service/auth/server/partner-choices";
import { PartnerList } from "./_components/partner-list";

export default async function SelectPartnerPage() {
  const session = await getSession();
  if (session) redirect("/");

  const partial = await getPartialSession();
  if (!partial) redirect("/login");

  const t = await getTranslations("auth.selectPartner");
  const choices = await listPartnerChoices(partial.userId);

  return (
    <main className="login-screen">
      <Card className="login-card" style={{ maxWidth: 480 }}>
        <CardHeader className="login-card__body">
          <div className="login-grid">
            <CardTitle>{t("title")}</CardTitle>
            <p className="login-note">{t("welcome", { name: partial.displayName ?? partial.username })}</p>
          </div>
        </CardHeader>
        <CardContent className="login-card__body">
          <PartnerList choices={choices} />
        </CardContent>
      </Card>
    </main>
  );
}
