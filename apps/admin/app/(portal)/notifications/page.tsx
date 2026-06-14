import { requirePermissions } from "@cloud/permissions/server";
import { NotificationsPage } from "./_components/notifications-page";

/**
 * Notifications list page. Authenticated only (no specific permission). Data is
 * read client-side from the shared NotificationsProvider, so this stays a thin
 * RSC that only enforces the session.
 */
export default async function Page() {
  await requirePermissions({ all: [] });
  return <NotificationsPage />;
}
