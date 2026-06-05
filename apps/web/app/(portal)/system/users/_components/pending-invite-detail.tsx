"use client";

import { useState } from "react";
import { Mail, User, Clock, Shield, Copy, Pencil, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, Button, Card, CardContent, CardHeader, CardTitle, Checkbox, toast } from "@cloud/ui";
import type { Role, User as UserType } from "@/app/(portal)/system/_shared/types";
import { fmtDateTime, relTime } from "@/app/(portal)/system/_shared/helpers";

type PendingInviteDetailProps = {
  user: UserType;
  roles: Role[];
  onResend: () => void;
  onCancel: () => void;
  onSave: (u: UserType) => void;
};

function buildInviteUrl(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/invite?token=${token}`;
}

function maskUrl(url: string): string {
  // Show scheme + host + mask the token portion
  const idx = url.indexOf("token=");
  if (idx === -1) return url;
  const prefix = url.slice(0, idx + 6);
  const token = url.slice(idx + 6);
  if (token.length <= 8) return `${prefix}****`;
  return `${prefix}${token.slice(0, 4)}****${token.slice(-4)}`;
}

export function PendingInviteDetail({ user, roles, onResend, onCancel, onSave }: PendingInviteDetailProps) {
  const [now] = useState(Date.now);
  const inviteUrl = buildInviteUrl(user.inviteToken ?? user.id);
  const isExpired = !!user.inviteExpiresAt && new Date(user.inviteExpiresAt).getTime() < now;

  const adminRoles = roles.filter((r) => r.contractType === "ADMIN");
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

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Invite URL copied");
    } catch {
      toast.error("Failed to copy URL");
    }
  }

  const headerGradient = isExpired
    ? "bg-linear-to-br from-error-500 to-error-700"
    : "bg-linear-to-br from-warning-500 to-warning-700";

  const badgeClass = isExpired
    ? "text-error-strong bg-error-bg border-error/25"
    : "text-warning-strong bg-warning-bg border-warning/25";

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-4 border-b border-line-subtle py-4 px-5">
        <div className={`shrink-0 grid place-items-center text-content-inverse size-14 rounded-xl ${headerGradient}`}>
          <Mail size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xl font-semibold tracking-tight text-content-primary">
              {isExpired ? "Invitation expired" : "Invitation sent"}
            </span>
            <span
              className={`font-mono font-semibold uppercase shrink-0 border text-xs tracking-wider ${badgeClass} py-px px-1.5 rounded-sm`}>
              {isExpired ? "EXPIRED" : "PENDING"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-content-tertiary mt-1.5">
            <span className="inline-flex items-center gap-1.5"><Mail size={12} /> {user.inviteEmail ?? user.email}</span>
            <span className="inline-flex items-center gap-1.5"><User size={12} /> Invited by {user.invitedBy}</span>
            {user.invitedAt && <span className="inline-flex items-center gap-1.5"><Clock size={12} /> Sent {relTime(user.invitedAt)}</span>}
            {user.inviteExpiresAt && (
              <span className={`inline-flex items-center gap-1.5 ${isExpired ? "text-error-strong" : "text-warning-strong"}`}>
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
      <div className="flex flex-col gap-4 pt-4 px-5 pb-6">
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
            <dl className="grid text-sm grid-cols-[160px_1fr] gap-x-5 gap-y-3.5">
              <dt className="text-content-tertiary font-medium">Email</dt>
              <dd className="text-content-primary">{user.inviteEmail ?? user.email}</dd>
              <dt className="text-content-tertiary font-medium">Invite URL</dt>
              <dd className="text-content-primary flex items-center gap-2">
                <code className="font-mono text-xs px-1.5 py-0.5 bg-surface-3 rounded border border-line-subtle truncate max-w-xs">{maskUrl(inviteUrl)}</code>
                <Button variant="ghost" size="icon-xs" onClick={copyUrl} title="Copy invite URL">
                  <Copy />
                </Button>
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
                      <label key={r.id} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                        on ? "bg-primary-50 border-primary/30" : "bg-surface-3 border-line-subtle"
                      }`}>
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
                    <div className="grid place-items-center shrink-0 bg-surface-3 text-content-secondary size-7 rounded-lg">
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
