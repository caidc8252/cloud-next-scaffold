import { requirePermissions } from "@cloud/permissions/server";
import { NotificationsBoard } from "./components/notifications-board";

/**
 * Notifications list page. Authenticated only (no specific permission). Data is
 * read client-side from the shared NotificationsProvider, so this stays a thin
 * RSC that only enforces the session and passes the current party name for the
 * ownership badge.
 */
export async function NotificationsPage() {
  const session = await requirePermissions({ all: [] });
  return <NotificationsBoard currentPartyName={session.partyName} />;
}
