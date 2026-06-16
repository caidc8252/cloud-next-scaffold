import { requireSession } from "@cloud/permissions/server";
import { getTranslations } from "@cloud/i18n/server";
import { getSessionMenus } from "@/lib/session-menus";
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
 * Hard rule — shared loader for any route with a custom slot
 * ────────────────────────────────────────────────────────────────
 * If a route has its own @breadcrumbs/<route>/page.tsx slot (typically all
 * dynamic-segment detail pages, see Case B/C), the business page's data
 * loader MUST be:
 *   1. extracted to <feature>/_server/loader.ts (NOT inline in page.tsx), and
 *   2. wrapped with React `cache()`.
 *
 * Why: the slot and the business page render in parallel branches. Without a
 * shared, request-cached loader you get either (a) two divergent copies of the
 * same query (one in the slot file, one in the page file), or (b) two DB
 * roundtrips per request for the exact same record. `React.cache()` collapses
 * same-args calls within one request to a single execution; sharing the file
 * keeps the two branches from drifting.
 *
 * List pages whose slot falls through to this default DO NOT need this —
 * the default only reads session.menus, not business data — so keeping loaders
 * inline in page.tsx is fine for Case A. The rule kicks in the moment a route
 * grows a custom slot.
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
 *          business page: apps/admin/app/(portal)/system/roles/[id]/page.tsx
 *          slot page:     apps/admin/app/(portal)/@breadcrumbs/system/roles/[id]/page.tsx
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
 *     4. If the detail slot links back to its list page, add an explicit slot
 *        page for that list route too:
 *
 *          business page: apps/admin/app/(portal)/system/roles/page.tsx
 *          slot page:     apps/admin/app/(portal)/@breadcrumbs/system/roles/page.tsx
 *
 *        This list slot usually renders the same single crumb as the menu
 *        fallback (e.g. <Breadcrumbs items={[{ label: "Roles" }]} />), but it
 *        gives Next a real @breadcrumbs target during client-side navigation.
 *        Do not rely on default.tsx for this transition: parallel-route slots
 *        preserve their active subpage on soft navigation, so going from
 *        /system/roles/[id] back to /system/roles would otherwise keep the
 *        stale detail crumb until a hard reload.
 *
 *        When using @cloud/ui <Breadcrumbs>, keep the UI package framework
 *        neutral and inject Next's <Link> through the item's `render` field:
 *
 *          <Breadcrumbs items={[
 *            {
 *              label: "Roles",
 *              href: "/system/roles",
 *              render: <Link href="/system/roles" />,
 *            },
 *            { label: role?.roleName ?? `#${id}` },
 *          ]} />
 *
 *     5. The business page typically reads the same record. Put the loader in
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
 * - default.tsx is only a hard-load / unmatched-slot fallback. It does not
 *   reset a stale custom slot during client-side navigation; add a matching
 *   slot page for every route that a custom breadcrumb links back to.
 * - Slots are independent render branches. If a slot fetches sensitive data,
 *   run its own permission checks; do not assume the layout already guarded.
 * - When renaming a route, update the business page and the slot page
 *   together — the two trees must stay mirrored.
 * - After a server action that revalidates, the slot re-renders automatically
 *   alongside the main content; no manual sync needed.
 */
export default async function DefaultBreadcrumbs() {
  await requireSession();
  // menuTitle 是 coc 命名空间下的 i18n key，面包屑在此翻译。
  const tc = await getTranslations("coc");
  const menus = (await getSessionMenus()).map((m) => ({
    id: m.menuId,
    label: tc(m.menuTitle),
    path: m.path,
    parentMenuId: m.parentMenuId,
  }));
  return <PortalBreadcrumbs menus={menus} />;
}
