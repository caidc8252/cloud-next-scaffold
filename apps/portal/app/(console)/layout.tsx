import { redirect } from "next/navigation";
import { getSession } from "@/lib/mock/session";

// Console gate: every (console) route requires a session. A real build swaps
// getSession for @cloud/permissions/server's requireSession.
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  if (!(await getSession())) redirect("/login");
  return children;
}
