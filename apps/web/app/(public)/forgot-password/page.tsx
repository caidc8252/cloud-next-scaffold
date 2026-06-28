import { redirect } from "next/navigation";
import { getPartialSession } from "@cloud/permissions/server";
import { ForgotScreen } from "./_components/forgot-screen";

export default async function ForgotPasswordPage() {
  if (await getPartialSession()) redirect("/select-partner");
  return <ForgotScreen />;
}
