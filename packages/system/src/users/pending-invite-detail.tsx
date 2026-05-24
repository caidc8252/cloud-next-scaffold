"use client";

import { useState } from "react";
import { Mail, User, Clock, Shield, Copy, Pencil, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, Button, Card, CardContent, CardHeader, CardTitle, Checkbox } from "@cloud/ui";
import type { Role, User as UserType } from "../types";
import { fmtDateTime, relTime } from "../helpers";

type PendingInviteDetailProps = {
  user: UserType;
  roles: Role[];
  onResend: () => void;
  onCancel: () => void;
  onSave: (u: UserType) => void;
};

function maskToken(token: string): string {
  if (token.length <= 8) return "****";
  return `${token.slice(0, 4)}****${token.slice(-4)}`;
}

export function PendingInviteDetail({ user, roles, onResend, onCancel, onSave }: PendingInviteDetailProps) {
  const [now] = useState(Date.now);
  const inviteToken = user.inviteToken ?? user.id;
  const isExpired = !!user.inviteExpiresAt && new Date(user.inviteExpiresAt).getTime() < now;

  const adminRoles = roles.filter((r) => r.contractDefineCode === "ADMIN" && r.roleType === "global");
  const invitedRoles = (user.roleIds ?? []).map((id) => roles.find((r) => r.id === id)).filter(Boolean) as Role[];

  const [editingRoles, setEditingRoles] = useState(false);
  const [draftRoleIds, setDraftRoleIds] = useState<Set<string>>(new Set(user.roleIds));

  // Reset draft when user changes
  const [prevId, setPrevId] = useState(user.id);
  if (user.id !== prevId) {
    setPrevId(user.id);
    setEditingRoles(false);
    setDraftRoleIds(new Set(user.roleIds));
  }

  function toggleRole(id: string) {
    const next = new Set(draftRoleIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setDraftRoleIds(next);
  }

  function saveRoles() {
    onSave({ ...user, roleIds: [...draftRoleIds] });
    setEditingRoles(false);
  }

  function cancelEditRoles() {
    setDraftRoleIds(new Set(user.roleIds));
    setEditingRoles(false);
  }

  async function copyToken() {
    try {
      await navigator.clipboard.writeText(inviteToken);
      toast.success("Token copied");
    } catch {
      toast.error("Failed to copy token");
    }
  }

  const headerGradient = isExpired
    ? "linear-gradient(135deg, oklch(70% 0.13 25), oklch(58% 0.16 25))"
    : "linear-gradient(135deg, oklch(78% 0.1 80), oklch(64% 0.14 80))";

  const badgeStyle = isExpired
    ? { color: "var(--color-error-700)", background: "var(--color-error-50)", borderColor: "oklch(70% 0.16 25 / 0.25)" }
    : { color: "var(--color-warning-700)", background: "var(--color-warning-50)", borderColor: "oklch(75% 0.13 80 / 0.3)" };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-4 border-b border-line-subtle" style={{ padding: "18px 22px" }}>
        <div className="shrink-0 grid place-items-center text-white"
          style={{ width: 56, height: 56, borderRadius: 12, background: headerGradient }}>
          <Mail size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xl font-semibold tracking-tight text-content-primary">
              {isExpired ? "Invitation expired" : "Invitation sent"}
            </span>
            <span className="font-mono font-semibold uppercase shrink-0"
              style={{ fontSize: 9.5, letterSpacing: "0.06em", padding: "1px 5px", borderRadius: 3, border: "1px solid", ...badgeStyle }}>
              {isExpired ? "EXPIRED" : "PENDING"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-content-tertiary mt-1.5">
            <span className="inline-flex items-center gap-1.5"><Mail size={12} /> {user.inviteEmail ?? user.email}</span>
            <span className="inline-flex items-center gap-1.5"><User size={12} /> Invited by {user.invitedBy}</span>
            {user.invitedAt && <span className="inline-flex items-center gap-1.5"><Clock size={12} /> Sent {relTime(user.invitedAt)}</span>}
            {user.inviteExpiresAt && (
              <span className="inline-flex items-center gap-1.5" style={{ color: isExpired ? "var(--color-error-700)" : "var(--color-warning-700)" }}>
                <Clock size={12} /> {isExpired ? "Expired" : "Expires"} {relTime(user.inviteExpiresAt)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="ghost" size="sm" iconLeft={<Mail size={14} />} onClick={onResend}>Resend</Button>
          <Button variant="ghost-danger" size="sm" iconLeft={<Shield size={14} />} onClick={onCancel}>Cancel invite</Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-4" style={{ padding: "18px 22px 24px" }}>
        {isExpired ? (
          <Alert variant="error">
            <AlertTriangle size={14} />
            <AlertDescription>
              <strong>This invitation has expired.</strong> Resend to generate a new 7-day window, or cancel it.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="info">
            <Shield size={14} />
            <AlertDescription>
              <strong>Waiting on the invitee.</strong> Once they click the link in their email and complete
              onboarding, this row turns into a full user with login name, display name, and password set by them.
              Pre-assigned roles below take effect at that moment.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Invitation details</CardTitle>
              <p className="text-xs text-content-tertiary mt-0.5">These are the only fields the admin sets. Everything else is captured during onboarding.</p>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid text-sm" style={{ gridTemplateColumns: "160px 1fr", rowGap: 14, columnGap: 20 }}>
              <dt className="text-content-tertiary font-medium">Email</dt>
              <dd className="text-content-primary">{user.inviteEmail ?? user.email}</dd>
              <dt className="text-content-tertiary font-medium">Invite token</dt>
              <dd className="text-content-primary flex items-center gap-2">
                <code className="font-mono text-xs px-1.5 py-0.5 bg-surface-3 rounded border border-line-subtle">{maskToken(inviteToken)}</code>
                <button type="button" onClick={copyToken}
                  className="p-1 rounded hover:bg-surface-3 text-content-tertiary hover:text-content-primary transition-colors" title="Copy full token">
                  <Copy size={13} />
                </button>
              </dd>
              <dt className="text-content-tertiary font-medium">Invited by</dt>
              <dd className="text-content-primary">{user.invitedBy}</dd>
              <dt className="text-content-tertiary font-medium">Sent</dt>
              <dd className="text-content-primary">{user.invitedAt ? fmtDateTime(user.invitedAt) : "—"}</dd>
              <dt className="text-content-tertiary font-medium">Resent</dt>
              <dd className="text-content-primary">{user.resendCount ? `${user.resendCount} time${user.resendCount > 1 ? "s" : ""}` : "Never"}</dd>
              <dt className="text-content-tertiary font-medium">Expires</dt>
              <dd className="text-content-primary">{user.inviteExpiresAt ? fmtDateTime(user.inviteExpiresAt) : "—"}</dd>
              {user.remark && <>
                <dt className="text-content-tertiary font-medium">Remark</dt>
                <dd className="text-content-primary">{user.remark}</dd>
              </>}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div>
                <CardTitle>Pre-assigned roles ({editingRoles ? draftRoleIds.size : invitedRoles.length})</CardTitle>
                <p className="text-xs text-content-tertiary mt-0.5">The invitee will see these on the authorization step and gain them once they accept.</p>
              </div>
              {!editingRoles && (
                <Button variant="ghost" size="sm" iconLeft={<Pencil size={13} />}
                  onClick={() => { setDraftRoleIds(new Set(user.roleIds)); setEditingRoles(true); }}>
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <div>
            {editingRoles ? (
              <>
                <div className="flex flex-col gap-1.5 px-5 py-3">
                  {adminRoles.map((r) => {
                    const on = draftRoleIds.has(r.id);
                    return (
                      <label key={r.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors"
                        style={{
                          background: on ? "var(--color-primary-50)" : "var(--color-surface-3)",
                          borderColor: on ? "oklch(60% 0.14 262 / 0.3)" : "var(--color-line-subtle)",
                        }}>
                        <Checkbox checked={on} onCheckedChange={() => toggleRole(r.id)} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold">{r.name}</div>
                          <div className="text-xs text-content-tertiary">{r.description} · {r.permissions.length} perms</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <div className="flex gap-2 justify-end px-5 py-3 border-t border-line-subtle">
                  <Button variant="ghost" size="sm" onClick={cancelEditRoles}>Cancel</Button>
                  <Button variant="primary" size="sm" disabled={draftRoleIds.size === 0} onClick={saveRoles}>Save</Button>
                </div>
              </>
            ) : (
              <>
                {invitedRoles.length === 0 && (
                  <div className="px-4 py-6 text-center text-sm text-content-tertiary">No roles pre-assigned.</div>
                )}
                {invitedRoles.map((r) => (
                  <div key={r.id} className="flex items-center gap-2.5 px-5 py-3 border-b border-line-subtle last:border-b-0">
                    <div className="grid place-items-center shrink-0 bg-surface-3 text-content-secondary" style={{ width: 28, height: 28, borderRadius: 8 }}>
                      <Shield size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-content-primary">{r.name}</div>
                      <div className="text-xs text-content-tertiary mt-0.5">{r.description} · {r.permissions.length} perms</div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
