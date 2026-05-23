import { getEnv } from "@cloud/config";
import { requireSession } from "../../lib/auth";
import { PortalShell } from "./_components/portal-shell";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const env = getEnv();
  const session = await requireSession();

  return (
    <PortalShell
      appName={env.NEXT_PUBLIC_APP_NAME}
      account={session.account}
      name={session.name}
      roleName={session.role.name}
      menus={session.role.menus}
    >
      {children}
    </PortalShell>
  );
}
