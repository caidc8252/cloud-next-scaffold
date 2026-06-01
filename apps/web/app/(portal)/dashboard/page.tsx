import { ContentHeader, Grid, GridItem, Stack } from "@cloud/ui/components/layout";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@cloud/ui/components/ui";
import { requirePermissions } from "@cloud/permissions/server";
import { getTranslations } from "@cloud/i18n/server";

export default async function DashboardPage() {
  const session = await requirePermissions({ all: ["dashboard:view"] });
  const t = await getTranslations("dashboard");

  return (
    <Stack gap="var(--space-6)">
      <ContentHeader title={t("title")} description={t("description")}>
        <Badge tone="success">{t("sessionActive")}</Badge>
      </ContentHeader>

      <Grid columns={3} gap="var(--space-4)">
        <GridItem>
          <Card>
            <CardHeader>
              <CardDescription>{t("currentAccount")}</CardDescription>
              <CardTitle>{session.username}</CardTitle>
            </CardHeader>
          </Card>
        </GridItem>
        <GridItem>
          <Card>
            <CardHeader>
              <CardDescription>{t("entity")}</CardDescription>
              <CardTitle>{session.entity.entityName}</CardTitle>
              <Badge tone="info">{session.entity.contractDefineCode}</Badge>
            </CardHeader>
          </Card>
        </GridItem>
        <GridItem>
          <Card>
            <CardHeader>
              <CardDescription>{t("roles")}</CardDescription>
              <CardTitle>{session.roles.map((r) => r.roleName).join(", ")}</CardTitle>
            </CardHeader>
          </Card>
        </GridItem>
      </Grid>

      <Card size="lg">
        <CardHeader>
          <CardTitle>{t("panel.title")}</CardTitle>
          <CardDescription>{t("panel.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Stack gap="var(--space-3)">
            <p className="dashboard-copy">{t("panel.welcome")}</p>
            <p className="dashboard-copy">{t("panel.extend")}</p>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
