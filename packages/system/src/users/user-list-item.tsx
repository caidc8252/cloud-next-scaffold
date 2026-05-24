"use client";

import { useState } from "react";
import { Mail, Shield, RefreshCw, X } from "lucide-react";
import type { User } from "../types";
import { relTime, initials } from "../helpers";

type UserListItemProps = {
  user: User;
  active: boolean;
  onClick: () => void;
  onResend?: () => void;
  onCancel?: () => void;
};

const STATUS_STYLE = {
  ACTIVE: { color: "var(--color-success-700)", background: "var(--color-success-50)", borderColor: "oklch(58% 0.14 152 / 0.25)" },
  INACTIVE: { color: "var(--color-error-700)", background: "var(--color-error-50)", borderColor: "oklch(70% 0.16 25 / 0.25)" },
  PENDING: { color: "var(--color-warning-700)", background: "var(--color-warning-50)", borderColor: "oklch(75% 0.13 80 / 0.3)" },
  EXPIRED: { color: "var(--color-error-700)", background: "var(--color-error-50)", borderColor: "oklch(70% 0.16 25 / 0.25)" },
} as const;

function avatarGradient(status: User["status"], expired: boolean): string {
  if (status === "INACTIVE") return "linear-gradient(135deg, oklch(70% 0.13 25), oklch(58% 0.16 25))";
  if (status === "PENDING" && expired) return "linear-gradient(135deg, oklch(70% 0.13 25), oklch(58% 0.16 25))";
  if (status === "PENDING") return "linear-gradient(135deg, oklch(78% 0.1 80), oklch(64% 0.14 80))";
  return "linear-gradient(135deg, var(--color-primary-500), var(--color-accent-600))";
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
      className="flex items-center gap-3 w-full px-3.5 py-3 text-left transition-colors border-b border-line-subtle last:border-b-0 hover:bg-surface-hover cursor-pointer"
      style={active ? { background: "var(--color-primary-50)" } : undefined}
    >
      <div
        className="shrink-0 grid place-items-center text-white font-semibold text-xs"
        style={{ width: 36, height: 36, borderRadius: 10, background: avatarGradient(user.status, isExpired), letterSpacing: "-0.01em" }}
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
            className="font-mono font-semibold uppercase"
            style={{ fontSize: 9.5, letterSpacing: "0.06em", padding: "1px 5px", borderRadius: 3, border: "1px solid", ...STATUS_STYLE[badgeKey] }}
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
            <button type="button" className="p-1.5 rounded-md hover:bg-surface-hover text-content-tertiary hover:text-content-primary transition-colors" title="Resend invitation" onClick={onResend}>
              <RefreshCw size={13} />
            </button>
          )}
          {onCancel && (
            <button type="button" className="p-1.5 rounded-md hover:bg-surface-hover text-content-tertiary hover:text-error transition-colors" title="Cancel invitation" onClick={onCancel}>
              <X size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
