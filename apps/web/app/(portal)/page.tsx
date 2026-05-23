import { ContentHeader, Grid, GridItem, Stack } from "@cloud/ui/components/layout";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@cloud/ui/components/ui";
import { requireSession } from "../../lib/auth";

export default async function DashboardPage() {
  const session = await requireSession();
  const primaryMenu = session.role.menus[0];

  return (
    <Stack gap="var(--space-6)">
      <ContentHeader
        title={primaryMenu?.label ?? "Workspace"}
        description="This baseline keeps the classic admin rhythm and layout while staying intentionally minimal."
      >
        <Badge tone="success">Session Active</Badge>
      </ContentHeader>

      <Grid columns={3} gap="var(--space-4)">
        <GridItem>
          <Card>
            <CardHeader>
              <CardDescription>Current Account</CardDescription>
              <CardTitle>{session.account}</CardTitle>
            </CardHeader>
          </Card>
        </GridItem>
        <GridItem>
          <Card>
            <CardHeader>
              <CardDescription>Current Role</CardDescription>
              <CardTitle>{session.role.name}</CardTitle>
            </CardHeader>
          </Card>
        </GridItem>
        <GridItem>
          <Card>
            <CardHeader>
              <CardDescription>Menu Count</CardDescription>
              <CardTitle>{String(session.role.menus.length)}</CardTitle>
            </CardHeader>
          </Card>
        </GridItem>
      </Grid>

      <Card size="lg">
        <CardHeader>
          <CardTitle>{primaryMenu?.label ?? "Workspace"}</CardTitle>
          <CardDescription>The scaffold ships with a compact but complete default workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <Stack gap="var(--space-3)">
            <p className="dashboard-copy">
              The main area starts with a simple welcome block so the default menu has a useful landing page.
            </p>
            <p className="dashboard-copy">
              You can keep building on top of this shell by adding customer, order, settings, or any other business modules.
            </p>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
