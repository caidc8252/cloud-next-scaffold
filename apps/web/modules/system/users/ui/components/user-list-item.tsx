"use client";

import { useState } from "react";
import { Mail, Shield, RefreshCw, X } from "lucide-react";
import { Badge, Button, cn, type BadgeTone } from "@cloud/ui";
import type { User } from "@/modules/system/users/server/users.public";
import { relTime, initials } from "@/lib/ui-format";

type UserListItemProps = {
  user: User;
  active: boolean;
  onClick: () => void;
  onResend?: () => void;
  onCancel?: () => void;
};

const STATUS_TONE: Record<string, BadgeTone> = {
  ACTIVE: "success",
  INACTIVE: "error",
  PENDING: "warning",
  EXPIRED: "error",
};

// Solid status tint for the avatar tile (no gradients on management pages, §0.4).
function avatarTone(status: User["status"], expired: boolean): string {
  if (status === "INACTIVE") return "bg-error-bg text-error-strong";
  if (status === "PENDING") return expired ? "bg-error-bg text-error-strong" : "bg-warning-bg text-warning-strong";
  return "bg-primary-50 text-primary-700";
}

export function UserListItem({ user, active, onClick, onResend, onCancel }: UserListItemProps) {
  const [now] = useState(Date.now);
  const isPending = user.status === "PENDING";
  const isExpired = isPending && !!user.inviteExpiresAt && new Date(user.inviteExpiresAt).getTime() < now;
  const disabled = user.status === "INACTIVE";
  const displayName = user.displayName || user.loginName || "?";
  const badgeKey = isExpired ? "EXPIRED" : user.status;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      className={cn(
        "flex w-full items-center gap-3 border-b border-line-subtle px-4 py-3 text-left transition-colors last:border-b-0 cursor-pointer",
        active ? "bg-primary-50" : "hover:bg-surface-hover",
      )}
    >
      <div
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-lg text-xs font-semibold tracking-tight",
          avatarTone(user.status, isExpired),
        )}
      >
        {isPending ? <Mail size={14} /> : initials(displayName)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-md font-semibold text-content-primary">
          {isPending
            ? <span className="font-medium italic text-content-tertiary">{isExpired ? "Invitation expired" : "Invitation sent"}</span>
            : <span className="truncate">{displayName}</span>}
          {disabled && <Shield size={11} className="shrink-0 text-error" />}
        </div>
        <div className="mt-0.5 truncate font-mono text-xs text-content-tertiary">
          {isPending ? user.inviteEmail ?? user.email : `@${user.loginName}`}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs">
          <Badge tone={STATUS_TONE[badgeKey]} dot>{badgeKey}</Badge>
          {!isPending && user.lastLoginAt && <span className="text-content-tertiary">· {relTime(user.lastLoginAt)}</span>}
          {isPending && user.inviteExpiresAt && (
            <span className="text-content-tertiary">
              · {isExpired ? "expired" : "expires"} {relTime(user.inviteExpiresAt)}
            </span>
          )}
        </div>
      </div>
      {isPending && (
        <div className="flex shrink-0 gap-1">
          {onResend && !isExpired && (
            <Button variant="ghost" size="icon-xs" aria-label="Resend invitation" title="Resend invitation"
              className="hover:bg-surface-active" onClick={(e) => { e.stopPropagation(); onResend(); }}>
              <RefreshCw />
            </Button>
          )}
          {onCancel && (
            <Button variant="ghost-danger" size="icon-xs" aria-label="Cancel invitation" title="Cancel invitation"
              onClick={(e) => { e.stopPropagation(); onCancel(); }}>
              <X />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
