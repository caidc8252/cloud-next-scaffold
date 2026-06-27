import { requireSession } from "@cloud/permissions/server";
import { getTranslations } from "@cloud/i18n/server";
import { Breadcrumbs } from "@cloud/ui/components/layout";

/**
 * Breadcrumb slot for the notifications list. Gives Next a real @breadcrumbs
 * target so soft-navigating back from /notifications/[id] resets the crumb
 * instead of keeping the stale detail title.
 */
export default async function NotificationsBreadcrumb() {
  await requireSession();
  const t = await getTranslations("notifications");
  return <Breadcrumbs items={[{ label: t("list.title") }]} />;
}
