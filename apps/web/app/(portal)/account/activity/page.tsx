import { requireSession } from "@cloud/permissions/server";
import { PageBody } from "@/app/(portal)/_components/page-body";
import { getActivity } from "@/app/(portal)/account/_server/account-store";
import { ActivityPageClient } from "@/app/(portal)/account/_components/activity-page";

// "My activity" — recent actions across the workspace, grouped by day.
// Login-only; reached from the user menu.
export default async function ActivityPage() {
  await requireSession();
  return (
    <PageBody>
      <ActivityPageClient initialGroups={getActivity()} />
    </PageBody>
  );
}
