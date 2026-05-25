"use client";

import { Fragment } from "react";
import { usePathname } from "next/navigation";
import { BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@cloud/ui";

type Menu = {
  id: string;
  label: string;
  path: string | null;
  parentMenuId: string | null;
};

// 面包屑由调用方提供 JSX 片段，AppHeader 只负责外壳。这样未来的详情页可以按段
// 自己决定怎么渲染（例如根据 path 中的 id 异步取实体名）。
export function PortalBreadcrumbs({ menus }: { menus: Menu[] }) {
  const pathname = usePathname();
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
