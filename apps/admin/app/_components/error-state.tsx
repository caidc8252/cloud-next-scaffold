"use client";

import { AlertTriangle } from "lucide-react";
import { Button, Card, CardContent } from "@cloud/ui";

// 通用错误态展示组件（行业通用 UX：友好文案大字 + 恢复动作 + 弱化的错误编号）。
// 刻意做成「纯展示」：所有文案由调用方按 props 传入字符串——这样它既能被 error.tsx 用
// useTranslations 喂本地化文案，也能被 global-error.tsx（拿不到 i18n provider）喂写死文案。
export type ErrorStateProps = {
  title: string;
  description: string;
  referenceLabel?: string;
  referenceId?: string;
  // 重试：仅 error 边界传（unstable_retry）；not-found 等不传则不渲染按钮。
  retryLabel?: string;
  onRetry?: () => void;
  // 返回入口：用原生表单 GET 跳转，无需 JS、不依赖 Link/asChild。
  homeLabel?: string;
  homeHref?: string;
};

export function ErrorState({
  title,
  description,
  referenceLabel,
  referenceId,
  retryLabel,
  onRetry,
  homeLabel,
  homeHref = "/",
}: ErrorStateProps) {
  return (
    <div className="flex min-h-60vh items-center justify-center p-6">
      <Card className="w-full max-w-120">
        <CardContent className="grid gap-4 py-8 text-center">
          <div className="flex justify-center text-content-tertiary">
            <AlertTriangle size={40} strokeWidth={1.5} />
          </div>
          <div className="grid gap-2">
            <h2 className="text-lg font-semibold text-content-primary">{title}</h2>
            <p className="text-md text-content-secondary">{description}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {onRetry && retryLabel ? (
              <Button type="button" variant="primary" onClick={() => onRetry()}>
                {retryLabel}
              </Button>
            ) : null}
            {homeLabel ? (
              <form action={homeHref} method="GET">
                <Button type="submit" variant="secondary">
                  {homeLabel}
                </Button>
              </form>
            ) : null}
          </div>
          {referenceId ? (
            <p className="font-mono text-xs text-content-tertiary">
              {referenceLabel ? `${referenceLabel} ` : ""}
              {referenceId}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
