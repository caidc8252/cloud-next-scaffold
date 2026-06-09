import { redirect } from "next/navigation";
import { getSession } from "@/lib/mock/session";
import { ForgotScreen } from "./_components/forgot-screen";

export default async function ForgotPasswordPage() {
  if (await getSession()) redirect("/dashboard");
  return <ForgotScreen />;
}
