import type { Metadata } from "next";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@cloud/ui";
import { getTranslations } from "@cloud/i18n/server";
import { LoginForm } from "./_components/login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("site.login.metadata");

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function LoginPage() {
  const t = await getTranslations("site.login");

  return (
    <main className="login-screen">
      <Card className="login-card">
        <CardHeader className="login-card__body">
          <div className="login-grid">
            <Badge>{t("eyebrow")}</Badge>
            <CardTitle>{t("title")}</CardTitle>
            <p className="login-note">{t("description")}</p>
          </div>
        </CardHeader>
        <CardContent className="login-card__body">
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
