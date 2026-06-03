import { requireSession } from "@cloud/permissions/server";
import { ContentHeader, Stack } from "@cloud/ui/components/layout";
import { BackendErrorDemoPanel } from "./_components/backend-error-demo-panel";
import { PageBody } from "@/app/(portal)/_components/page-body";

export default async function BackendErrorFallbackDemoPage() {
  await requireSession();

  return (
    <PageBody>
    <Stack gap="var(--space-6)">
      <ContentHeader
        title="Backend Error Demo"
        description="Manual scenarios for API success, expected error, fallback error, and paginated database reads."
      />
      <BackendErrorDemoPanel />
    </Stack>
    </PageBody>
  );
}
