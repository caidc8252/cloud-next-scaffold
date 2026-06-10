import type { ReactNode } from "react";
import { Card, CardContent } from "@cloud/ui/components/ui";
import { cn } from "@cloud/ui";

// Shared page chrome for the account surface, composed from @cloud/ui + semantic
// tokens to match the prototype's up-header / up-card / up-row layout.

export function UPHeader({
  icon,
  title,
  sub,
  actions,
}: {
  icon: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start gap-4">
      <div className="flex size-11 flex-none items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-semibold tracking-tight text-content-primary">{title}</h1>
        {sub && <p className="mt-1 text-sm leading-normal text-content-secondary">{sub}</p>}
      </div>
      {actions && <div className="flex flex-none items-center gap-2">{actions}</div>}
    </div>
  );
}

export function UPCard({
  title,
  sub,
  action,
  danger,
  children,
  className,
}: {
  title?: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
  danger?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card
      size="md"
      elevation={1}
      className={cn("overflow-hidden", danger && "border-error/40", className)}
    >
      {(title || action) && (
        <div
          className={cn(
            "flex items-start justify-between gap-3 border-b px-5 py-3.5",
            danger ? "border-error/25 bg-error-bg" : "border-line-subtle",
          )}
        >
          <div className="min-w-0">
            {title && <h3 className="text-sm font-semibold tracking-tight text-content-primary">{title}</h3>}
            {sub && <p className="mt-1 text-xs leading-snug text-content-tertiary">{sub}</p>}
          </div>
          {action && <div className="flex-none">{action}</div>}
        </div>
      )}
      <CardContent flush className="py-1">
        {children}
      </CardContent>
    </Card>
  );
}

// A bordered row: main (title + sub) on the left, a control on the right.
// Rows stacked as direct siblings get an inter-row divider via last:border-b-0.
export function UPRow({
  title,
  sub,
  trailing,
  className,
}: {
  title: ReactNode;
  sub?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3.5 border-b border-line-subtle px-5 py-3.5 last:border-b-0",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-content-primary">
          {title}
        </div>
        {sub && <div className="mt-0.5 text-xs text-content-tertiary">{sub}</div>}
      </div>
      {trailing && <div className="flex-none">{trailing}</div>}
    </div>
  );
}
