"use client";

import type { ReactNode } from "react";
import { useCan } from "./use-permission.ts";

export function Can({
  all,
  any,
  fallback = null,
  children,
}: {
  all?: string[];
  any?: string[];
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const ok = useCan({ all, any });
  return <>{ok ? children : fallback}</>;
}
