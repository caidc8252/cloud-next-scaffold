"use client";
import "client-only";

import type React from "react";
import { toast } from "sonner";
import { createElement, useState } from "react";
import { buttonVariants } from "@cloud/ui";
import { Check, Copy } from "lucide-react";
import { RequestError } from "./client.ts";

function copyErrorInfo(info: { message: string; code: string; traceId: string }) {
  navigator.clipboard.writeText(JSON.stringify(info, null, 2));
}

export function toastError(err: unknown, fallbackMessage = "An unexpected error occurred.") {
  if (err instanceof RequestError && err.body?.code) {
    const { message, code, traceId } = err.body;
    toast.error(message, {
      description: createElement(ErrorDescription, { code, traceId, message }),
      duration: 5_000,
      style: { "--toast-duration": "5000ms" } as React.CSSProperties,
    });
  } else {
    toast.error(fallbackMessage, {
      duration: 4_000,
      style: { "--toast-duration": "4000ms" } as React.CSSProperties,
    });
  }
}

function ErrorDescription({ code, traceId, message }: { code: string; traceId: string; message: string }) {
  return createElement("span", { className: "cn-error-toast-desc" },
    `[${code}] ${traceId}`,
    createElement(CopyButton, { code, traceId, message }),
  );
}

// Icon-only 复制按钮（替代原先的文字按钮，文字会盖在标题上重叠）。复制后短暂切对勾反馈；
// 无可见文字，故用 aria-label / title 提供可访问名。
function CopyButton({ code, traceId, message }: { code: string; traceId: string; message: string }) {
  const [copied, setCopied] = useState(false);
  return createElement("button", {
    type: "button",
    // 复用 @cloud/ui 标准 icon 按钮样式（ghost / icon-xs），不自造；cn-error-toast-copy 仅负责定位与悬停显隐。
    className: `cn-error-toast-copy ${buttonVariants({ variant: "ghost", size: "icon-xs" })}`,
    "aria-label": copied ? "Copied" : "Copy error details",
    title: copied ? "Copied" : "Copy error details",
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      copyErrorInfo({ message, code, traceId });
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    },
    // 尺寸由按钮 icon-xs 槽（[&_svg]:size-3）控制，不传 size，跟其它 @cloud/ui 图标按钮一致
  }, createElement(copied ? Check : Copy, { "aria-hidden": true }));
}
