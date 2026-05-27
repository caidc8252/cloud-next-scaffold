"use client";

import { useState } from "react";
import { Mail, Shield, RefreshCw, X } from "lucide-react";
import { Button } from "@cloud/ui";
import type { User } from "@/app/(portal)/system/_shared/types";
import { relTime, initials } from "@/app/(portal)/system/_shared/helpers";

type UserListItemProps = {
  user: User;
  active: boolean;
  onClick: () => void;
  onResend?: () => void;
  onCancel?: () => void;
};

const STATUS_BADGE_CLASS = {
  ACTIVE: "text-success-strong bg-success-bg border-success/25",
  INACTIVE: "text-error-strong bg-error-bg border-error/25",
  PENDING: "text-warning-strong bg-warning-bg border-warning/30",
  EXPIRED: "text-error-strong bg-error-bg border-error/25",
} as const;

function avatarGradient(status: User["status"], expired: boolean): string {
  if (status === "INACTIVE") return "bg-linear-to-br from-error-500 to-error-700";
  if (status === "PENDING" && expired) return "bg-linear-to-br from-error-500 to-error-700";
  if (status === "PENDING") return "bg-linear-to-br from-warning-500 to-warning-700";
  return "bg-linear-to-br from-primary-500 to-accent-600";
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
      className={`flex items-center gap-3 w-full px-3.5 py-3 text-left transition-colors border-b border-line-subtle last:border-b-0 hover:bg-surface-hover cursor-pointer ${active ? "bg-primary-50" : ""}`}
    >
      <div
        className={`shrink-0 grid place-items-center text-content-inverse font-semibold text-xs tracking-tight size-9 rounded-lg ${avatarGradient(user.status, isExpired)}`}
      >
        {isPending ? <Mail size={14} /> : initials(displayName)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-content-primary">
          {isPending
            ? <span className="text-content-tertiary italic font-medium">{isExpired ? "Invitation expired" : "Invitation sent"}</span>
            : <span className="truncate">{displayName}</span>}
          {disabled && <Shield size={11} className="text-error shrink-0" />}
        </div>
        <div className="font-mono text-xs text-content-tertiary mt-0.5 truncate">
          {isPending ? user.inviteEmail ?? user.email : `@${user.loginName}`}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 text-xs">
          <span
            className={`font-mono font-semibold uppercase border text-xs tracking-wider ${STATUS_BADGE_CLASS[badgeKey]} py-px px-1.5 rounded-sm`}
          >
            {badgeKey}
          </span>
          {!isPending && user.lastLoginAt && <span className="text-content-tertiary">· {relTime(user.lastLoginAt)}</span>}
          {isPending && user.inviteExpiresAt && (
            <span className="text-content-tertiary">
              · {isExpired ? "expired" : "expires"} {relTime(user.inviteExpiresAt)}
            </span>
          )}
        </div>
      </div>
      {isPending && (
        <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {onResend && (
            <Button variant="ghost" size="icon-xs" title="Resend invitation" onClick={onResend}>
              <RefreshCw />
            </Button>
          )}
          {onCancel && (
            <Button variant="ghost-danger" size="icon-xs" title="Cancel invitation" onClick={onCancel}>
              <X />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
