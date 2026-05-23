import { redirect } from "next/navigation";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@cloud/ui";
import { getSession } from "../../../lib/auth";
import { loginAction } from "./actions";

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "Incorrect account or password.",
  missing: "Enter both account and password.",
};

export default async function LoginPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (session) {
    redirect("/");
  }

  const searchParams = await props.searchParams;
  const errorKey = typeof searchParams.error === "string" ? searchParams.error : "";
  const errorMessage = errorKey ? ERROR_MESSAGES[errorKey] ?? "Sign in failed. Please try again." : null;

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
          {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
          <form action={loginAction} className="form-grid">
            <div className="field-grid">
              <Label htmlFor="account">Account</Label>
              <Input id="account" name="account" autoComplete="username" placeholder="admin" />
            </div>
            <div className="field-grid">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="ChangeMe!123"
              />
            </div>
            <Button type="submit">Sign in</Button>
          </form>
          <p className="login-note">
            Seeded account: <strong>admin</strong> / <strong>ChangeMe!123</strong>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
