import { requirePermissions } from "@cloud/permissions/server";
import { NotificationDetail } from "../_components/notification-detail";

/**
 * Notification detail page. Authenticated only. The notice is read client-side
 * from the shared NotificationsProvider (same store as the bell/list), so this
 * stays a thin RSC that enforces the session and forwards the id.
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requirePermissions({ all: [] });
  const { id } = await params;
  return <NotificationDetail id={id} />;
}
