"use client";

import { useTranslations } from "@cloud/i18n/client";
import { ErrorState } from "@/app/_components/error-state";

// Portal 区段错误边界。渲染在 root layout 内，可正常用 i18n。
// 展示统一通用文案 + digest（= 屏幕给用户的错误编号，可在日志里按它定位堆栈）+ 重试。
export default function PortalError({
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
