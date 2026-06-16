"use client";

import type { ReactNode } from "react";
import { Avatar, AvatarFallback, cn } from "@cloud/ui";
import { initials } from "@/lib/format";

// Onboarding cards keep their chrome (border / surface / shadow) — unlike the
// borderless split-login content.
export function ObCard({
  width = "narrow",
  centered = false,
  children,
}: {
  width?: "narrow" | "wide";
  centered?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "pep-fade w-full rounded-2xl border border-line-default bg-surface-2 p-8 shadow-3",
        width === "wide" ? "max-w-240" : "max-w-110",
        centered && "text-center",
      )}
    >
      {children}
    </div>
  );
}

// Partner / context row (logo tile + name + sub + optional trailing chip).
export function EntRow({
  initials: tile,
  name,
  sub,
  trailing,
}: {
  initials: string;
  name: ReactNode;
  sub?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-lg border border-line-default bg-surface-3 p-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-700 font-mono text-sm font-semibold text-white">
        {tile}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{name}</div>
        {sub ? <div className="mt-0.5 text-xs text-content-tertiary">{sub}</div> : null}
      </div>
      {trailing}
    </div>
  );
}

// "You're joining as" / "signed in as" account block.
export function AccountRow({
  name,
  email,
  chip,
}: {
  name: string;
  email: string;
  chip?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-lg border border-line-default bg-surface-2 p-4">
      <Avatar size="lg">
        <AvatarFallback className="bg-primary-700 font-semibold text-white">
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{name}</div>
        <div className="text-xs text-content-tertiary">{email}</div>
      </div>
      {chip}
    </div>
  );
}
