"use client";

import { Fragment } from "react";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Shield, Users, Settings } from "lucide-react";
import { AppHeader, Layout, Sidebar, type SidebarSection } from "@cloud/ui/components/layout";
import { BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@cloud/ui";
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

// 面包屑由调用方提供 JSX 片段，AppHeader 只负责外壳。这样未来的详情页可以按段
// 自己决定怎么渲染（例如根据 path 中的 id 异步取实体名）。
function buildBreadcrumbs(pathname: string, menus: PortalShellProps["menus"]): React.ReactNode {
  const current = menus.find((m) => m.path === pathname);
  const label = current?.label ?? "Workspace";
  const items: Array<{ label: string; href?: string }> =
    pathname === "/"
      ? [{ label }]
      : current?.parentMenuId
        ? [
            { label: "Console", href: "/" },
            { label: menus.find((m) => m.id === current.parentMenuId)?.label ?? "" },
            { label },
          ]
        : [{ label: "Console", href: "/" }, { label }];

  return items.map((c, i) => (
    <Fragment key={i}>
      {i > 0 && <BreadcrumbSeparator />}
      <BreadcrumbItem>
        {c.href
          ? <BreadcrumbLink href={c.href}>{c.label}</BreadcrumbLink>
          : <BreadcrumbPage>{c.label}</BreadcrumbPage>}
      </BreadcrumbItem>
    </Fragment>
  ));
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
