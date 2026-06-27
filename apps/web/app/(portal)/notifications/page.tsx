import { requirePermissions } from "@cloud/permissions/server";
import { NotificationsPage } from "./_components/notifications-page";

/**
 * Notifications list page. Authenticated only (no specific permission). Data is
 * read client-side from the shared NotificationsProvider, so this stays a thin
 * RSC that only enforces the session and passes the current party name for the
 * ownership badge.
 */
export default async function Page() {
  const session = await requirePermissions({ all: [] });
  return <NotificationsPage currentPartyName={session.partyName} />;
}
