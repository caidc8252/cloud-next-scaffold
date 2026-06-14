import { NotificationDetail } from "../_components/notification-detail";
import { loadNotice } from "../_server/loader";

/**
 * Notification detail page — RSC. Auth is enforced inside loadNotice (via
 * requirePermissions), so this page stays thin: fetch → render.
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notice = await loadNotice(id);
  return <NotificationDetail notice={notice} />;
}
