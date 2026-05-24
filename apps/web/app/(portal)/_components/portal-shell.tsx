"use client";

import { usePathname } from "next/navigation";
import { LayoutDashboard, Shield, Users, Settings } from "lucide-react";
import { AppHeader, Layout, Sidebar, type BreadcrumbItemDef, type SidebarSection } from "@cloud/ui/components/layout";
import { UserMenu } from "./user-menu";

type PortalShellProps = {
  appName: string;
  account: string;
  name: string;
  roleName: string;
  menus: Array<{
    id: string;
    key: string;
    label: string;
    path: string | null;
    icon: string;
    parentMenuId: string | null;
  }>;
  children: React.ReactNode;
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

function buildBreadcrumbs(pathname: string, menus: PortalShellProps["menus"]): BreadcrumbItemDef[] {
  const current = menus.find((m) => m.path === pathname);
  const label = current?.label ?? "Workspace";
  if (pathname === "/") return [{ label }];
  const parent = current?.parentMenuId ? menus.find((m) => m.id === current.parentMenuId) : null;
  if (parent) return [{ label: "Console", href: "/" }, { label: parent.label }, { label }];
  return [{ label: "Console", href: "/" }, { label }];
}

export function PortalShell({ appName, account, name, roleName, menus, children }: PortalShellProps) {
  const pathname = usePathname();

  // Build sidebar sections from menu tree
  const topLevel = menus.filter((m) => !m.parentMenuId);
  const childrenOf = (parentId: string) => menus.filter((m) => m.parentMenuId === parentId);

  const sections: SidebarSection[] = [];

  // First section: top-level leaf menus (like Workspace)
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

  // Remaining sections: top-level group menus (parent menus with children)
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

  return (
    <Layout
      sidebar={
        <Sidebar
          brand={{
            title: appName,
            subtitle: "Admin Scaffold",
          }}
          sections={sections}
          footer={<UserMenu account={account} name={name} roleName={roleName} />}
        />
      }
      header={<AppHeader breadcrumbs={buildBreadcrumbs(pathname, menus)} />}
    >
      {children}
    </Layout>
  );
}
