import { Button, Card, CardContent, CardHeader, CardTitle } from "@cloud/ui";

export default function ForbiddenPage() {
  return (
    <main className="login-screen">
      <Card className="login-card max-w-120">
        <CardHeader className="login-card__body">
          <div className="login-grid">
            <CardTitle>Access denied</CardTitle>
            <p className="login-note">
              Your account is signed in, but it does not have permission to open this page.
            </p>
          </div>
        </CardHeader>
        <CardContent className="login-card__body">
          <form action="/" method="GET">
            <Button type="submit" block>
              Back to workspace
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
