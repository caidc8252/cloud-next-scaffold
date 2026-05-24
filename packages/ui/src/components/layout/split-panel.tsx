"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

export interface SplitPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  sidebarWidth?: number;
  gap?: number;
}

export function SplitPanel({
  sidebarWidth = 320,
  gap = 18,
  className,
  style,
  children,
  ...props
}: SplitPanelProps) {
  return (
    <div
      className={cn(className)}
      style={{
        display: "grid",
        gridTemplateColumns: `${sidebarWidth}px 1fr`,
        gap,
        alignItems: "start",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export interface SplitPanelSidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  maxHeight?: string;
}

export function SplitPanelSidebar({
  maxHeight = "calc(100vh - 240px)",
  className,
  children,
  ...props
}: SplitPanelSidebarProps) {
  const childArray = React.Children.toArray(children);
  const header = childArray[0];
  const list = childArray.slice(1);

  return (
    <div
      className={cn(
        "bg-surface-2 border border-line-default rounded-xl shadow-sm overflow-hidden sticky top-4",
        className,
      )}
      {...props}
    >
      {header && (
        <div className="border-b border-line-subtle">{header}</div>
      )}
      <div
        className="flex flex-col overflow-auto"
        style={{ maxHeight }}
      >
        {list}
      </div>
    </div>
  );
}

export interface SplitPanelContentProps extends React.HTMLAttributes<HTMLDivElement> {
  empty?: React.ReactNode;
}

export function SplitPanelContent({
  empty,
  className,
  children,
  ...props
}: SplitPanelContentProps) {
  return (
    <div
      className={cn(
        "bg-surface-2 border border-line-default rounded-xl shadow-sm overflow-hidden",
        className,
      )}
      {...props}
    >
      {children ?? (
        <div className="flex items-center justify-center h-64 text-content-tertiary text-sm">
          {empty ?? "Select an item to view details"}
        </div>
      )}
    </div>
  );
}
