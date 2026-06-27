import Link from "next/link";
import { getTranslations } from "@cloud/i18n/server";
import { Breadcrumbs } from "@cloud/ui/components/layout";
import { loadNotice } from "@/modules/system/notification/server/loader";

/**
 * Breadcrumb slot for the notification detail. Renders
 *   Notifications › <notice title>
 * with the parent linked back to the list. Title comes from the shared
 * request-cached loader so it matches the page without a second DB read.
 */
export default async function NotificationDetailBreadcrumb({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [t, notice] = await Promise.all([
    getTranslations("notifications"),
    loadNotice(id),
  ]);
  return (
    <Breadcrumbs
      items={[
        { label: t("list.title"), href: "/notifications", render: <Link href="/notifications" /> },
        { label: notice?.title ?? id },
      ]}
    />
  );
}
