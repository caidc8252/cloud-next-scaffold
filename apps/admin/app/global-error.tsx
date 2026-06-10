"use client";

import { ErrorState } from "@/app/_components/error-state";
import "./globals.css";

// 顶层错误边界：只在 root layout 自身渲染失败时触发（极罕见），它会替换整个 root layout，
// 连同 NextIntlClientProvider。因此这里拿不到 i18n context，useTranslations 会报缺 provider，
// 只能用写死的中性文案；且必须自带 <html> / <body>。
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <ErrorState
          title="Something went wrong"
          description="The service is temporarily unavailable. Please try again later."
          referenceLabel="Reference"
          referenceId={error.digest}
          retryLabel="Try again"
          onRetry={unstable_retry}
          homeLabel="Back to workspace"
        />
      </body>
    </html>
  );
}
