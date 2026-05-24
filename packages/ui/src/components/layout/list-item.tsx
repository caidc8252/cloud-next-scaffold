"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

export interface ListItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  icon?: React.ReactNode;
}

export function ListItem({
  active,
  icon,
  className,
  children,
  ...props
}: ListItemProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex items-center gap-3 w-full px-3.5 py-3 text-left transition-colors border-b border-line-subtle last:border-b-0 hover:bg-surface-hover",
        className,
      )}
      style={active ? { background: "var(--color-primary-50)" } : undefined}
      {...props}
    >
      {icon && (
        <div
          className="rounded-lg shrink-0 flex items-center justify-center"
          style={{
            width: 30,
            height: 30,
            background: active
              ? "var(--color-primary-700)"
              : "var(--color-surface-3)",
          }}
        >
          <span style={{ color: active ? "#fff" : "var(--color-content-secondary)" }}>
            {icon}
          </span>
        </div>
      )}
      <div className="flex-1 min-w-0">{children}</div>
    </button>
  );
}
