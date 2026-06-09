import { redirect } from "next/navigation";
import { getSession } from "@/lib/mock/session";
import { LoginScreen } from "./_components/login-screen";

export default async function LoginPage() {
  // Already signed in → straight into the console (mock session gate).
  if (await getSession()) redirect("/dashboard");
  return <LoginScreen />;
}
