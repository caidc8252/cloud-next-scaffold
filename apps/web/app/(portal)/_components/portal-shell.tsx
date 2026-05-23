"use client";

import { usePathname } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
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
    path: string;
    icon: string;
  }>;
  children: React.ReactNode;
};

function getMenuIcon(icon: string) {
  switch (icon) {
    case "layout-dashboard":
    default:
      return <LayoutDashboard size={14} />;
  }
}

function buildBreadcrumbs(pathname: string, menuLabel: string): BreadcrumbItemDef[] {
  if (pathname === "/") {
    return [{ label: menuLabel }];
  }

  return [{ label: "Console", href: "/" }, { label: menuLabel }];
}

export function PortalShell({ appName, account, name, roleName, menus, children }: PortalShellProps) {
  const pathname = usePathname();
  const primaryMenu = menus[0];
  const sections: SidebarSection[] = [
    {
      label: "Workspace",
      items: menus.map((menu) => ({
        href: menu.path,
        icon: getMenuIcon(menu.icon),
        label: menu.label,
      })),
    },
  ];

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
      header={<AppHeader breadcrumbs={buildBreadcrumbs(pathname, primaryMenu?.label ?? "Workspace")} />}
    >
      {children}
    </Layout>
  );
}
