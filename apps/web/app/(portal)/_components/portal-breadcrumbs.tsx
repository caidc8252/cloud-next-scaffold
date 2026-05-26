"use client";

import { usePathname } from "next/navigation";
import { Breadcrumbs, type BreadcrumbsItem } from "@cloud/ui/components/layout";

type Menu = {
  id: string;
  label: string;
  path: string | null;
  parentMenuId: string | null;
};

// Walk from current menu up through parentMenuId chain, top-down ordering.
function ancestorChain(menus: Menu[], leaf: Menu): Menu[] {
  const byId = new Map(menus.map((m) => [m.id, m]));
  const chain: Menu[] = [leaf];
  let cursor = leaf;
  while (cursor.parentMenuId) {
    const parent = byId.get(cursor.parentMenuId);
    if (!parent) break;
    chain.unshift(parent);
    cursor = parent;
  }
  return chain;
}

export function PortalBreadcrumbs({ menus }: { menus: Menu[] }) {
  const pathname = usePathname();
  const current = menus.find((m) => m.path === pathname);

  // Unknown path (detail page or 404): fall back to a single placeholder.
  // Detail pages should provide their own @breadcrumbs/<route>/page.tsx slot.
  if (!current) {
    return <Breadcrumbs items={[{ label: "Workspace" }]} />;
  }

  // Top-down chain: [L1, L2, L3, ...] up to the current leaf.
  // Drop the L1 group head — it is a pure grouping node, not navigable.
  // If the chain is a single top-level leaf (no L1 group above it, e.g. dashboard "/"),
  // keep it as-is.
  const chain = ancestorChain(menus, current);
  const trimmed = chain.length > 1 ? chain.slice(1) : chain;

  const items: BreadcrumbsItem[] = trimmed.map((m, i) => {
    const isLast = i === trimmed.length - 1;
    return {
      label: m.label,
      // Non-last segments link back to their page; the last is the current page.
      href: !isLast && m.path ? m.path : undefined,
    };
  });

  return <Breadcrumbs items={items} />;
}
