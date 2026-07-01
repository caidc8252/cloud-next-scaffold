import { Database, LayoutDashboard, LayoutGrid, Shield, Settings, ShoppingBag, ShoppingCart, Tags, Upload, UploadCloud, Users } from "lucide-react";

// Maps the icon-name string stored in sys_menu.icon to a lucide React node.
// To add a new menu icon: pick a name in packages/db/prisma/seed.ts (sys_menu.icon)
// AND add a matching case here. Unrecognised names fall back to LayoutDashboard.
// Used by both the sidebar (apps/admin/app/(dashboard)/layout.tsx) and the command
// palette (apps/admin/app/(dashboard)/_components/portal-header.tsx).
export function getMenuIcon(icon: string, size = 14) {
  switch (icon) {
    case "database": return <Database size={size} />;
    case "shield": return <Shield size={size} />;
    case "settings": return <Settings size={size} />;
    case "upload-cloud": return <UploadCloud size={size} />;
    case "upload": return <Upload size={size} />;
    case "layout-grid": return <LayoutGrid size={size} />;
    case "shopping-bag": return <ShoppingBag size={size} />;
    case "shopping-cart": return <ShoppingCart size={size} />;
    case "tags": return <Tags size={size} />;
    case "users": return <Users size={size} />;
    case "layout-dashboard":
    default: return <LayoutDashboard size={size} />;
  }
}
