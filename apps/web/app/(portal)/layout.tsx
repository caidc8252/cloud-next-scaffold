import { getEnv } from "@cloud/config";
import { requireSession } from "@cloud/permissions/server";
import { PortalShell } from "./_components/portal-shell";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const env = getEnv();
  const session = await requireSession();

  return (
    <PortalShell
      appName={env.NEXT_PUBLIC_APP_NAME}
      account={session.username}
      name={session.displayName ?? session.username}
      roleName={session.roles.map((r) => r.roleName).join(", ")}
      menus={session.menus.map((m) => ({
        id: String(m.menuId),
        key: String(m.menuId),
        label: m.menuTitle,
        path: m.path,
        icon: m.icon ?? "layout-dashboard",
        parentMenuId: m.parentMenuId ? String(m.parentMenuId) : null,
      }))}
    >
      {children}
    </PortalShell>
  );
}
