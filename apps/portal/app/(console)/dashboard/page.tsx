import { redirect } from "next/navigation";
import { getSession } from "@/lib/mock/session";
import { DashboardScreen } from "./_components/dashboard-screen";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <DashboardScreen account={session} />;
}
