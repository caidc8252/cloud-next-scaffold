"use client";
import "client-only";

import { toast } from "sonner";
import { RequestError } from "./client.ts";

function copyErrorInfo(info: { message: string; code: string; traceId: string }) {
  navigator.clipboard.writeText(JSON.stringify(info, null, 2));
}

export function toastError(err: unknown, fallbackMessage = "An unexpected error occurred.") {
  if (err instanceof RequestError && err.body?.code) {
    const { message, code, traceId } = err.body;
    toast.error(message, {
      description: `[${code}] ${traceId}`,
      duration: 10_000,
      action: {
        label: "Copy",
        onClick: () => copyErrorInfo({ message, code, traceId }),
      },
    });
  } else {
    toast.error(fallbackMessage, { duration: 5_000 });
  }
}
