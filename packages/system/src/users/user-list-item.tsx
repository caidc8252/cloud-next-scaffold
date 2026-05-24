"use client";

import { Mail } from "lucide-react";
import { Badge, cn } from "@cloud/ui";
import type { User } from "../types";
import { relTime, hueFor, initials } from "../helpers";

type UserListItemProps = { user: User; active: boolean; onClick: () => void };

const STATUS_TONE = { ACTIVE: "success", LOCKED: "error", PENDING: "warning" } as const;

export function UserListItem({ user, active, onClick }: UserListItemProps) {
  const isPending = user.status === "PENDING";
  const displayName = isPending ? (user.inviteEmail ?? "Pending") : (user.displayName || user.loginName);
  const hue = hueFor(displayName);

  return (
    <button type="button" onClick={onClick}
      className={cn("flex items-center gap-2.5 w-full px-3 py-2.5 rounded-md text-left transition-colors",
        active ? "bg-surface-2 shadow-1" : "hover:bg-surface-hover")}>
      <div className="size-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
        style={{ background: `oklch(92% 0.03 ${hue})`, color: `oklch(40% 0.12 ${hue})` }}>
        {isPending ? <Mail size={14} /> : initials(displayName)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-content-primary truncate">{displayName}</span>
          <Badge tone={STATUS_TONE[user.status]} className="shrink-0">{user.status}</Badge>
        </div>
        <div className="text-xs text-content-tertiary mt-0.5 truncate">
          {isPending ? `Invite expires ${relTime(user.inviteExpiresAt)}` : (user.lastLoginAt ? `Last login ${relTime(user.lastLoginAt)}` : "Never logged in")}
        </div>
      </div>
    </button>
  );
}
