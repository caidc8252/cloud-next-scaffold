import type { ReactNode } from "react";
import { cn } from "@cloud/ui";

// Standard padded content container for portal pages. The shell Layout's
// scroll area is unpadded (full-bleed page-header bands need the edges), so
// every page wraps its content — either in this (the previous Layout default,
// px-8 pt-7 pb-16) or in its own design-specified padding.
export function PageBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("px-8 pt-7 pb-16", className)}>{children}</div>;
}
