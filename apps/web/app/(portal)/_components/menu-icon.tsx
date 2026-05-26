import { LayoutDashboard, Shield, Users, Settings } from "lucide-react";

// Maps the icon-name string stored in sys_menu.icon to a lucide React node.
// To add a new menu icon: pick a name in packages/db/prisma/seed.ts (sys_menu.icon)
// AND add a matching case here. Unrecognised names fall back to LayoutDashboard.
// Used by both the sidebar (apps/web/app/(portal)/layout.tsx) and the command
// palette (apps/web/app/(portal)/_components/portal-header.tsx).
export function getMenuIcon(icon: string, size = 14) {
  switch (icon) {
    case "shield": return <Shield size={size} />;
    case "users": return <Users size={size} />;
    case "settings": return <Settings size={size} />;
    case "layout-dashboard":
    default: return <LayoutDashboard size={size} />;
  }
}
