import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@cloud/ui";
import { getTranslations } from "@cloud/i18n/server";
import {
  createSessionHandoffToken,
  getPartialSession,
  getSession,
} from "@cloud/permissions/server";
import { AuthShell } from "@/app/_components/auth-shell";
import { AuthLead, IconBadge } from "@/app/(auth)/_components/card-bits";
import { getAdminSessionHandoffUrl } from "@/lib/platform-routing";
import { listPartyChoices } from "@/service/auth/server/partner-choices";
import { PartnerList } from "./_components/partner-list";
import { Building2 } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("portal.partner.metadata");

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function SelectPartnerPage() {
  const t = await getTranslations("portal.partner");
  const session = await getSession();
  if (session) {
    const handoffToken = await createSessionHandoffToken();
    redirect(handoffToken ? getAdminSessionHandoffUrl(handoffToken) : "/login");
  }

  const partial = await getPartialSession();
  if (!partial) redirect("/login");

  const choices = await listPartyChoices(partial.userId);

  return (
    <AuthShell showBrand>
      <Card className="pep-auth-card">
        <CardContent className="p-7">
          <AuthLead
            crest={
              <IconBadge>
                <Building2 size={20} />
              </IconBadge>
            }
            eyebrow={t("eyebrow")}
            title={t("title")}
            sub={t("description", { name: partial.displayName ?? partial.email ?? "" })}
          />
          {choices.length ? (
            <PartnerList choices={choices} />
          ) : (
            <p className="text-sm text-content-secondary">{t("empty")}</p>
          )}
        </CardContent>
      </Card>
    </AuthShell>
  );
}
