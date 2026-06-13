import { ContentHeader, PageBody } from "@cloud/ui/components/layout";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@cloud/ui/components/ui";
import { requireSession } from "@cloud/permissions/server";
import { getTranslations } from "@cloud/i18n/server";


export default async function DashboardPage() {
  // dashboard 为登录可见页（菜单无 permissions），守卫用 requireSession（不挂具体权限码）。
  const session = await requireSession();
  const t = await getTranslations("dashboard");

  return (
    <PageBody>
      <div className="flex flex-col gap-6">
        <ContentHeader title={t("title")} description={t("description")}>
          <Badge tone="success">{t("sessionActive")}</Badge>
        </ContentHeader>

        <div className="grid grid-cols-3 gap-4">
          <div className="min-w-0">
            <Card>
              <CardHeader>
                <CardDescription>{t("currentAccount")}</CardDescription>
                <CardTitle>{session.displayName ?? session.email}</CardTitle>
              </CardHeader>
            </Card>
          </div>
          <div className="min-w-0">
            <Card>
              <CardHeader>
                <CardDescription>{t("partner")}</CardDescription>
                <CardTitle>{session.partyName}</CardTitle>
                <Badge tone="info">{session.contractTypes.join(", ")}</Badge>
              </CardHeader>
            </Card>
          </div>
          <div className="min-w-0">
            <Card>
              <CardHeader>
                <CardDescription>{t("roles")}</CardDescription>
                <CardTitle>{session.roles.map((r) => r.roleName).join(", ")}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>

        <Card size="lg">
          <CardHeader>
            <CardTitle>{t("panel.title")}</CardTitle>
            <CardDescription>{t("panel.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <p className="dashboard-copy">{t("panel.welcome")}</p>
              <p className="dashboard-copy">{t("panel.extend")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageBody>
  );
}
