import { LayoutDashboard, Shield, Users, Settings } from "lucide-react";
import { getEnv } from "@cloud/config";
import { AppHeader, Layout, Sidebar, type SidebarSection } from "@cloud/ui/components/layout";
import { requireSession } from "../../lib/auth";
import { UserMenu } from "./_components/user-menu";
import { PortalBreadcrumbs } from "./_components/portal-breadcrumbs";

type Menu = {
  id: string;
  label: string;
  path: string | null;
  icon: string;
  parentMenuId: string | null;
};

function getMenuIcon(icon: string) {
  switch (icon) {
    case "shield": return <Shield size={14} />;
    case "users": return <Users size={14} />;
    case "settings": return <Settings size={14} />;
    case "layout-dashboard":
    default: return <LayoutDashboard size={14} />;
  }
}

function buildSidebarSections(menus: Menu[]): SidebarSection[] {
  const topLevel = menus.filter((m) => !m.parentMenuId);
  const childrenOf = (parentId: string) => menus.filter((m) => m.parentMenuId === parentId);

  const sections: SidebarSection[] = [];

  // 顶级叶子菜单（无子菜单且自带 path）归到 Workspace 区
  const topLeaves = topLevel.filter((m) => m.path && childrenOf(m.id).length === 0);
  if (topLeaves.length > 0) {
    sections.push({
      label: "Workspace",
      items: topLeaves.map((m) => ({
        href: m.path!,
        icon: getMenuIcon(m.icon),
        label: m.label,
      })),
    });
  }

  // 其余顶级分组各自成一段
  const topGroups = topLevel.filter((m) => !m.path || childrenOf(m.id).length > 0);
  for (const group of topGroups) {
    const children = childrenOf(group.id);
    if (children.length > 0) {
      sections.push({
        label: group.label,
        items: children.map((c) => ({
          href: c.path ?? "#",
          icon: getMenuIcon(c.icon),
          label: c.label,
        })),
      });
    }
  }
  return sections;
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const env = getEnv();
  const session = await requireSession();

  const menus: Menu[] = session.menus.map((m) => ({
    id: String(m.menuId),
    label: m.menuTitle,
    path: m.path,
    icon: m.icon ?? "layout-dashboard",
    parentMenuId: m.parentMenuId ? String(m.parentMenuId) : null,
  }));

  return (
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
      header={<AppHeader breadcrumbs={<PortalBreadcrumbs menus={menus} />} />}
    >
      {children}
    </Layout>
  );
}
