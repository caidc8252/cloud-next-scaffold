"use client";

import type { ReactNode } from "react";
import { ChevronLeft, TriangleAlert } from "lucide-react";
import { Button, cn } from "@cloud/ui";

// Shared building blocks for the borderless auth content cards (split layout
// shows the form panel directly on surface-1, no card chrome).

export function BackLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <Button
      variant="link"
      onClick={onClick}
      iconLeft={<ChevronLeft size={14} />}
      className="mb-4 justify-start gap-1.5 text-sm font-medium text-content-secondary hover:text-content-primary hover:no-underline"
    >
      {children}
    </Button>
  );
}

const BADGE_TONES = {
  primary: "border-primary-100 bg-primary-50 text-primary-700",
  success: "border-success-500/20 bg-success-bg text-success-strong",
  error: "border-error-500/20 bg-error-bg text-error-strong",
  warning: "border-warning-500/20 bg-warning-bg text-warning-strong",
} as const;

export function IconBadge({
  tone = "primary",
  size = 44,
  children,
}: {
  tone?: keyof typeof BADGE_TONES;
  size?: 44 | 52;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-xl border",
        size === 52 ? "size-13" : "size-11",
        BADGE_TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

export function AuthLead({
  crest,
  eyebrow,
  title,
  sub,
  centered = false,
}: {
  crest?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  centered?: boolean;
}) {
  return (
    <div className={cn("mb-6", centered && "flex flex-col items-center text-center")}>
      {crest ? <div className="mb-4">{crest}</div> : null}
      {eyebrow ? (
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary-600">
          {eyebrow}
        </div>
      ) : null}
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {sub ? (
        <p className="mt-1.5 text-sm leading-relaxed text-content-secondary text-pretty">{sub}</p>
      ) : null}
    </div>
  );
}

export function Divider({ children }: { children: ReactNode }) {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-content-tertiary">
      <span className="h-px flex-1 bg-line-subtle" aria-hidden />
      <span>{children}</span>
      <span className="h-px flex-1 bg-line-subtle" aria-hidden />
    </div>
  );
}

export function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-error-500/20 bg-error-bg px-3 py-2 text-xs text-error-strong">
      <TriangleAlert size={14} className="shrink-0" />
      <span>{children}</span>
    </div>
  );
}
