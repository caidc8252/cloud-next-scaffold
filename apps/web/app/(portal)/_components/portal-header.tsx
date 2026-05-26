"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@cloud/ui/components/layout";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@cloud/ui";
import { getMenuIcon } from "./menu-icon";
import { NotificationBell } from "./notification-bell";

type Menu = {
  id: string;
  label: string;
  path: string | null;
  icon: string;
  parentMenuId: string | null;
};

type Group = { label: string; items: Menu[] };

function buildGroups(menus: Menu[]): Group[] {
  const byId = new Map(menus.map((m) => [m.id, m]));
  const groups = new Map<string, Group>();
  const ROOT_KEY = "__root__";
  const ROOT_LABEL = "Home";

  for (const m of menus) {
    if (!m.path) continue;
    const parent = m.parentMenuId ? byId.get(m.parentMenuId) : undefined;
    const key = parent?.id ?? ROOT_KEY;
    const label = parent?.label ?? ROOT_LABEL;
    if (!groups.has(key)) groups.set(key, { label, items: [] });
    groups.get(key)!.items.push(m);
  }
  return [...groups.values()];
}

/**
 * Portal top bar + command palette wrapper (client component).
 *
 * Combines AppHeader (top bar) with a CommandDialog quick-search palette wired
 * to ⌘K / Ctrl+K. Owns the open-state and the single keydown listener.
 *
 * Current scope: navigates among the menus the user has access to. Items come
 * from session.menus (same source the sidebar uses), grouped by parent menu,
 * filtered by cmdk's built-in fuzzy match.
 *
 * ────────────────────────────────────────────────────────────────
 * How to extend
 * ────────────────────────────────────────────────────────────────
 *
 * Case A — Add a new static group (e.g. "Actions": Logout, Switch entity)
 *   Render an extra <CommandGroup heading="Actions"> inside <CommandList>.
 *   Each <CommandItem> performs the action in onSelect and calls setOpen(false).
 *   No data fetching needed.
 *
 *     <CommandGroup heading="Actions">
 *       <CommandItem
 *         value="actions logout sign out"
 *         onSelect={() => { router.push("/api/auth/logout"); setOpen(false); }}
 *       >
 *         <LogOut /> <span>Logout</span>
 *       </CommandItem>
 *     </CommandGroup>
 *
 *   Tip: set `value` explicitly so cmdk filters against more than the visible
 *   label (include group name, synonyms, ids — anything that should match).
 *
 * Case B — Add server-side resource search (e.g. users by name)
 *   1. Track the current query: useState("") + <CommandInput onValueChange={setQuery} />.
 *   2. Debounce + fetch from a route handler in apps/web/app/api/... when the
 *      query is non-empty. Cancel in-flight requests with AbortController.
 *   3. Render results as <CommandGroup heading="Users"> mapping to <CommandItem>.
 *   4. Permission-check on the server side — never assume the palette is gated.
 *   5. Use cmdk's <CommandLoading> inside the group while pending.
 *
 * Case C — Add a "Recent" group
 *   Persist recent route paths in localStorage. Read them on open (useEffect
 *   keyed on `open === true`). Render as a top group, capped at N items.
 *
 * Case D — Change the keyboard shortcut
 *   Update the onKeyDown matcher in useEffect. Keep both metaKey and ctrlKey
 *   matched so it works on macOS and Windows/Linux. Avoid binding common
 *   browser shortcuts (Ctrl+F, Ctrl+T, etc.).
 *
 * Case E — Open the palette programmatically from elsewhere
 *   Local state lives here. To open from another component, lift the state
 *   into a Context (CommandPaletteProvider). Keep the keydown listener in one
 *   place to avoid duplicate handlers.
 *
 * ────────────────────────────────────────────────────────────────
 * Caveats
 * ────────────────────────────────────────────────────────────────
 * - Mount once. This component lives in (portal)/layout, rendered for every
 *   portal page. Do NOT mount it inside individual pages — the keydown
 *   listener would register multiple times.
 * - CommandInput requires a Command/CommandPrimitive root in its tree.
 *   CommandDialog provides this internally. Do NOT wrap children in another
 *   <Command /> unless building a non-dialog inline palette.
 * - Server data (Case B) belongs in route handlers; never query Prisma
 *   directly from this client component.
 * - Scope is portal-only. A palette outside (portal) needs its own wrapper.
 */
export function PortalHeader({
  menus,
  breadcrumbs,
}: {
  menus: Menu[];
  breadcrumbs: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const groups = buildGroups(menus);

  return (
    <>
      <AppHeader
        breadcrumbs={breadcrumbs}
        onSearchClick={() => setOpen(true)}
        notification={<NotificationBell />}
      />
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search menus…" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          {groups.map((group) => (
            <CommandGroup key={group.label} heading={group.label}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${group.label} ${item.label}`}
                  onSelect={() => {
                    if (!item.path) return;
                    router.push(item.path);
                    setOpen(false);
                  }}
                >
                  {getMenuIcon(item.icon)}
                  <span>{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
