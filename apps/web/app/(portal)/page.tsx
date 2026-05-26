import { redirect } from "next/navigation";

// Portal root redirects to the canonical Dashboard page (L2 leaf under "Home" L1).
// Kept so legacy links / brand-click-home / post-login default still land somewhere.
export default function PortalIndex() {
  redirect("/dashboard");
}
