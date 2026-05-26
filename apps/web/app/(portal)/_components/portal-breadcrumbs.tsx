"use client";

import { usePathname } from "next/navigation";
import { Breadcrumbs, type BreadcrumbsItem } from "@cloud/ui/components/layout";

type Menu = {
  id: string;
  label: string;
  path: string | null;
  parentMenuId: string | null;
};

export function PortalBreadcrumbs({ menus }: { menus: Menu[] }) {
  const pathname = usePathname();
  const current = menus.find((m) => m.path === pathname);
  const label = current?.label ?? "Workspace";

  const items: BreadcrumbsItem[] =
    pathname === "/"
      ? [{ label }]
      : current?.parentMenuId
        ? [
            { label: menus.find((m) => m.id === current.parentMenuId)?.label ?? "" },
            { label },
          ]
        : [{ label }];

  return <Breadcrumbs items={items} />;
}
