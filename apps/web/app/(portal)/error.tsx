"use client";

import { useTranslations } from "@cloud/i18n/client";
import { ErrorState } from "@/app/_components/error-state";

// Public（登录等公开页）区段错误边界。渲染在 root layout 内，可正常用 i18n。
export default function PublicError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const t = useTranslations("errorPage");
  return (
    <ErrorState
      title={t("title")}
      description={t("description")}
      referenceLabel={t("referenceLabel")}
      referenceId={error.digest}
      retryLabel={t("retry")}
      onRetry={unstable_retry}
      homeLabel={t("home")}
    />
  );
}
