import "server-only";
import { cache } from "react";
import { requirePermissions } from "@cloud/permissions/server";
import { getNoticeByIdScoped } from "./notification.service";

/**
 * Request-cached single-notice loader. Shared by the detail page and the
 * breadcrumb slot so both see the same data without double-reading.
 * Auth is enforced here; callers do not need a separate requirePermissions().
 */
export const loadNotice = cache(async (id: string) => {
  const session = await requirePermissions({ all: [] });
  return getNoticeByIdScoped(session, id);
});

export const loadNotice = cache(async (id: string) => {
  const session = await requirePermissions({ all: [] });
  return getNoticeByIdScoped(session, id);
});