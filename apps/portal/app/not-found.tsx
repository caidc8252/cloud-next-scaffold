import Link from "next/link";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { Button } from "@cloud/ui";
import { getTranslations } from "@cloud/i18n/server";
import { PepLogo } from "@/app/_components/brand";

export default async function NotFound() {
  const t = await getTranslations("portal.notFound");
  return (
    <main className="pep-fade flex min-h-screen flex-col items-center justify-center bg-surface-1 p-10 text-center">
      <div className="mb-7">
        <PepLogo size={30} sub="Newland" />
      </div>
      <div className="font-mono text-8xl font-medium leading-none tracking-tight text-primary-700">
        {t("code")}
      </div>
      <h1 className="mb-2 mt-4 text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mb-6 max-w-44ch text-content-secondary">{t("sub")}</p>
      <div className="flex flex-wrap justify-center gap-3">
        {/* prefetch disabled: a hard-404 document is not a valid prefetch
            target, and Next's router otherwise retries it in a loop here. */}
        <Button
          render={<Link href="/" prefetch={false} />}
          nativeButton={false}
          iconLeft={<ChevronLeft size={15} />}
        >
          {t("home")}
        </Button>
        <Button
          render={<Link href="/login" prefetch={false} />}
          nativeButton={false}
          variant="secondary"
          iconRight={<ArrowRight size={15} />}
        >
          {t("signIn")}
        </Button>
      </div>
    </main>
  );
}
