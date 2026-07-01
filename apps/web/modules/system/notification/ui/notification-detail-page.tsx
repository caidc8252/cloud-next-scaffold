import { requirePermissions } from "@cloud/permissions/server";
import { NotificationDetail } from "./components/notification-detail";
import { loadNotice } from "../server/loader";

/**
 * Notification detail page — RSC. Auth is enforced inside loadNotice (via
 * requirePermissions). requirePermissions is called again here only to obtain
 * partyName for the ownership badge — getSession is request-level cached so
 * there is no double round-trip.
 */
export async function NotificationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [notice, session] = await Promise.all([loadNotice(id), requirePermissions({ all: [] })]);
  return <NotificationDetail notice={notice} currentPartyName={session.partyName} />;
}
