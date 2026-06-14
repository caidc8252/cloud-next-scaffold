import "server-only";
import { cache } from "react";
import { getById } from "@/service/notification/mock-store";

/**
 * Request-cached single-notice loader. Shared by the detail breadcrumb slot
 * (for the title crumb) and any server consumer, so the slot and page don't
 * diverge or double-read. Mock phase reads the in-memory store.
 */
export const getNoticeById = cache(async (id: string) => getById(id));
