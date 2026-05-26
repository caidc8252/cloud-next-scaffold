import { requireSession } from "../../../lib/auth";
import { PortalBreadcrumbs } from "../_components/portal-breadcrumbs";

/**
 * Fallback entry for the portal breadcrumb parallel-route slot (@breadcrumbs).
 *
 * Default behavior: matches pathname against session.menus exactly, walks up
 * the parentMenuId chain, drops the L1 group (pure grouping, not navigable),
 * and renders the rest (L2 onwards) as PLAIN labels (no hrefs). Menu-tree
 * pages show their location, they do not offer click-to-navigate-back —
 * users switch among siblings via the sidebar.
 *
 * Menu hierarchy convention (max depth 3):
 *   L1 = group only, NO path  (e.g. "System", "Workspace")
 *   L2 = page,        has path (e.g. "Roles" → /system/roles)
 *   L3 = sub-page,    has path (e.g. "Sample Order" → /workspace/device/sample-order)
 *
 * Examples:
 *   /system/roles                       → [Roles]
 *   /workspace/device/sample-order      → [Device, Sample Order]   (no links)
 *   /system/roles/[id]                  → custom slot, see Case B (Roles linked)
 *
 * Every route under (portal) that does not have its own slot file falls
 * through to this component.
 *
 * ────────────────────────────────────────────────────────────────
 * Decision table for adding new pages
 * ────────────────────────────────────────────────────────────────
 *
 * Case A — Static menu page (pathname equals an entry in sys_menu.path,
 *          e.g. /system/roles or /workspace/device/sample-order)
 *   Nothing to do. Default walks the ancestor chain, drops the L1 group,
 *   and renders all segments as plain labels — none are clickable. To
 *   navigate among menu pages, users use the sidebar.
 *   Prerequisite: the menu row exists in packages/db/prisma/seed.ts (with
 *   correct parentMenuId chain) and has been applied via `pnpm db:seed`.
 *
 * Case B — Detail page (pathname contains a dynamic segment,
 *          e.g. /system/roles/[id])
 *   A dedicated slot file is REQUIRED, otherwise the default falls back to a
 *   single "Workspace" crumb. Steps:
 *
 *     1. Mirror the business route inside @breadcrumbs/:
 *          business page: apps/web/app/(portal)/system/roles/[id]/page.tsx
 *          slot page:     apps/web/app/(portal)/@breadcrumbs/system/roles/[id]/page.tsx
 *
 *     2. The slot page is a server component. `await params`, fetch the dynamic
 *        segment label (usually from DB), then render <Breadcrumbs items={...}>
 *        (from @cloud/ui/components/layout):
 *
 *          export default async function ({ params }: { params: Promise<{ id: string }> }) {
 *            const { id } = await params;
 *            const role = await getRoleById(Number(id));
 *            return (
 *              <Breadcrumbs items={[
 *                { label: "Roles", href: "/system/roles" },
 *                { label: role?.roleName ?? `#${id}` },
 *              ]} />
 *            );
 *          }
 *
 *     3. Skip the L1 group label — breadcrumbs start at L2 (mirrors the
 *        default behavior in Case A). Intermediate segments carry `href` so
 *        users can click back up the tree; the last (current page) has none.
 *
 *     4. The business page typically reads the same record. Put the loader in
 *        e.g. system/<feature>/loader.ts and wrap it in React `cache()` so the
 *        slot and the page share a single DB roundtrip per request:
 *
 *          import { cache } from "react";
 *          export const getRoleById = cache(async (id: number) => { ... });
 *
 * Case C — Detail under detail (multiple dynamic segments,
 *          e.g. /system/roles/[id]/permissions/[permissionId])
 *   Same as B; mirror the full business route into @breadcrumbs/. Inside the
 *   slot page, fan out with Promise.all to load every label concurrently:
 *
 *     const [role, permission] = await Promise.all([
 *       getRoleById(Number(id)),
 *       getPermissionByCode(permissionId),
 *     ]);
 *
 *   Render with the same L1-skip rule:
 *     <Breadcrumbs items={[
 *       { label: "Roles", href: "/system/roles" },
 *       { label: role.roleName, href: `/system/roles/${id}` },
 *       { label: "Permissions" },
 *       { label: permission.label },
 *     ]} />
 *   Every parent dynamic crumb (e.g. role name → /system/roles/[id]) must
 *   carry href so users can navigate back up.
 *
 * Case D — Slow data, must not block the main content
 *   Add loading.tsx in the same slot directory; return a skeleton
 *   <Breadcrumbs />. The slot and `children` stream independently — neither
 *   blocks the other.
 *
 * Case E — Slot itself can throw
 *   Add error.tsx (with "use client") in the same slot directory. Errors stay
 *   scoped to the slot and do not bubble into the main page region.
 *
 * ────────────────────────────────────────────────────────────────
 * Caveats
 * ────────────────────────────────────────────────────────────────
 * - DO NOT delete default.tsx. Without it, any route that lacks a dedicated
 *   slot file will fail the whole layout.
 * - Slots are independent render branches. If a slot fetches sensitive data,
 *   run its own permission checks; do not assume the layout already guarded.
 * - When renaming a route, update the business page and the slot page
 *   together — the two trees must stay mirrored.
 * - After a server action that revalidates, the slot re-renders automatically
 *   alongside the main content; no manual sync needed.
 */
export default async function DefaultBreadcrumbs() {
  const session = await requireSession();
  const menus = session.menus.map((m) => ({
    id: String(m.menuId),
    label: m.menuTitle,
    path: m.path,
    parentMenuId: m.parentMenuId ? String(m.parentMenuId) : null,
  }));
  return <PortalBreadcrumbs menus={menus} />;
}
