import { requireSession } from "@cloud/permissions/server";
import { ContentHeader, PageBody } from "@cloud/ui/components/layout";
import { BackendErrorDemoPanel } from "./_components/backend-error-demo-panel";

export default async function BackendErrorFallbackDemoPage() {
  await requireSession();

  return (
    <PageBody>
      <div className="flex flex-col gap-6">
        <ContentHeader
          title="Backend Error Demo"
          description="Manual scenarios for API success, expected error, fallback error, and paginated database reads."
        />
        <BackendErrorDemoPanel />
      </div>
    </PageBody>
  );
}
