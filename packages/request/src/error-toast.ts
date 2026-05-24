"use client";
import "client-only";

import type React from "react";
import { toast } from "sonner";
import { createElement } from "react";
import { RequestError } from "./client.ts";

function copyErrorInfo(info: { message: string; code: string; traceId: string }) {
  navigator.clipboard.writeText(JSON.stringify(info, null, 2));
}

export function toastError(err: unknown, fallbackMessage = "An unexpected error occurred.") {
  if (err instanceof RequestError && err.body?.code) {
    const { message, code, traceId } = err.body;
    toast.error(message, {
      description: createElement(ErrorDescription, { code, traceId, message }),
      duration: 7_000,
      style: { "--toast-duration": "7000ms" } as React.CSSProperties,
    });
  } else {
    toast.error(fallbackMessage, {
      duration: 5_000,
      style: { "--toast-duration": "5000ms" } as React.CSSProperties,
    });
  }
}

function ErrorDescription({ code, traceId, message }: { code: string; traceId: string; message: string }) {
  return createElement("span", { className: "cn-error-toast-desc" },
    `[${code}] ${traceId}`,
    createElement("button", {
      type: "button",
      className: "cn-error-toast-copy",
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        copyErrorInfo({ message, code, traceId });
        const btn = e.currentTarget;
        btn.textContent = "Copied";
        setTimeout(() => { btn.textContent = "Copy"; }, 1500);
      },
    }, "Copy"),
  );
}
