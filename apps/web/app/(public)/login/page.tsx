import { redirect } from "next/navigation";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@cloud/ui";
import { getSession } from "@cloud/permissions/server";
import { LoginForm } from "./_components/login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/");
  }

  return (
    <main className="login-screen">
      <Card className="login-card">
        <CardHeader className="login-card__body">
          <div className="login-grid">
            <Badge>Scaffold Console</Badge>
            <CardTitle>Admin Baseline</CardTitle>
            <p className="login-note">
              This scaffold keeps the login flow, top navigation, sidebar layout, and the base user, role, and menu tables.
            </p>
          </div>
        </CardHeader>
        <CardContent className="login-card__body">
          <LoginForm />
          <p className="login-note">
            Seeded account: <strong>admin</strong> / <strong>ChangeMe!123</strong>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
