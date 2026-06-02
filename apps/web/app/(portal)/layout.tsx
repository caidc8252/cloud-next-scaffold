import { getEnv } from "@cloud/config";
import { cookies } from "next/headers";
import { Layout, Sidebar, type SidebarSection } from "@cloud/ui/components/layout";
import { SidebarProvider, SIDEBAR_COOKIE } from "@cloud/ui";
import { requireSession } from "@cloud/permissions/server";
import { getSessionMenus } from "@/lib/session-menus";
import { UserMenu } from "./_components/user-menu";
import { getMenuIcon } from "./_components/menu-icon";
import { PortalHeader } from "./_components/portal-header";

type Menu = {
  id: string;
  label: string;
  path: string | null;
  icon: string;
  parentMenuId: string | null;
};

// Three-level model:
//   L1 = top-level group (no path, only used for sidebar section heading + breadcrumb skip)
//   L2 = child of L1 (has path, rendered as a sidebar item; may have L3 children)
//   L3 = child of L2 (has path, rendered as a nested sub-item)
// Seed data adheres to this convention; the fallback below is a defensive net
// for accidental top-level leaves and should not be the documented design.
function buildSidebarSections(menus: Menu[]): SidebarSection[] {
  const topLevel = menus.filter((m) => !m.parentMenuId);
  const childrenOf = (parentId: string) => menus.filter((m) => m.parentMenuId === parentId);

  const sections: SidebarSection[] = [];

  // Safety net: any top-level menu that violates the L1-group convention
  // (has a path AND no children) gets bucketed under "Home" so it stays
  // reachable. Seed data should never trigger this — fix the seed instead.
  const topLeaves = topLevel.filter((m) => m.path && childrenOf(m.id).length === 0);
  if (topLeaves.length > 0) {
    sections.push({
      label: "Home",
      items: topLeaves.map((m) => ({
        href: m.path!,
        icon: getMenuIcon(m.icon),
        label: m.label,
      })),
    });
  }

  // L1 groups: each becomes a section, with its L2 children as items.
  // Each L2 with L3 descendants exposes them via `children` (SidebarSubItem[]).
  const topGroups = topLevel.filter((m) => !m.path || childrenOf(m.id).length > 0);
  for (const group of topGroups) {
    const l2 = childrenOf(group.id);
    if (l2.length === 0) continue;

    sections.push({
      label: group.label,
      items: l2.map((c) => {
        const l3 = childrenOf(c.id);
        if (l3.length === 0) {
          return {
            href: c.path ?? "#",
            icon: getMenuIcon(c.icon),
            label: c.label,
          };
        }
        return {
          icon: getMenuIcon(c.icon),
          label: c.label,
          children: l3.map((g) => ({
            href: g.path ?? "#",
            label: g.label,
          })),
        };
      }),
    });
  }
  return sections;
}

export default async function PortalLayout({
  children,
  breadcrumbs,
}: {
  children: React.ReactNode;
  breadcrumbs: React.ReactNode;
}) {
  const env = getEnv();
  const session = await requireSession();
  const cookieStore = await cookies();
  const defaultCollapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === "1";

  const menus: Menu[] = (await getSessionMenus()).map((m) => ({
    id: m.menuId,
    label: m.menuTitle,
    path: m.path,
    icon: m.icon ?? "layout-dashboard",
    parentMenuId: m.parentMenuId,
  }));

  return (
    <SidebarProvider defaultCollapsed={defaultCollapsed}>
      <Layout
        sidebar={
          <Sidebar
            brand={{
              title: env.NEXT_PUBLIC_APP_NAME,
              subtitle: "Admin Scaffold",
            }}
            sections={buildSidebarSections(menus)}
            footer={
              <UserMenu
                account={session.username}
                name={session.displayName ?? session.username}
                roleName={session.roles.map((r) => r.roleName).join(", ")}
              />
            }
          />
        }
        header={<PortalHeader menus={menus} breadcrumbs={breadcrumbs} />}
      >
        {children}
      </Layout>
    </SidebarProvider>
  );
}
