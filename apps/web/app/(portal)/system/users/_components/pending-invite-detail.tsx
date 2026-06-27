"use client";

import { useState } from "react";
import { Mail, User, Clock, Shield, Copy, Pencil, AlertTriangle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, Badge, Button, Card, CardContent, CardHeader, CardTitle, Checkbox, toast } from "@cloud/ui";
import type { Role, User as UserType } from "@/app/(portal)/system/_shared/types";
import { fmtDateTime, relTime } from "@/app/(portal)/system/_shared/helpers";

type PendingInviteDetailProps = {
  user: UserType;
  roles: Role[];
  // 门户站点 origin（服务端注入）：邀请链接消费端在门户，不能用 admin 自身 origin。
  portalBaseUrl: string;
  onResend: () => Promise<boolean>;
  onRegenerate: () => Promise<boolean>;
  onReinvite: () => Promise<boolean>;
  onCancel: () => void;
  onSave: (u: UserType) => Promise<boolean>;
};

// 与邮件里的 getPortalOnboardingUrl 同构（门户 origin + /onboarding + 编码 token），保证「复制」=「邮件」。
function buildInviteUrl(portalBaseUrl: string, token: string): string {
  return `${portalBaseUrl}/onboarding?token=${encodeURIComponent(token)}`;
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

export function PendingInviteDetail({ user, roles, portalBaseUrl, onResend, onRegenerate, onReinvite, onCancel, onSave }: PendingInviteDetailProps) {
  const [now] = useState(Date.now);
  const inviteUrl = user.inviteToken ? buildInviteUrl(portalBaseUrl, user.inviteToken) : "";
  const isExpired = !!user.inviteExpiresAt && new Date(user.inviteExpiresAt).getTime() < now;

  const adminRoles = roles; // 可分配角色已由 listAssignableRoles 算好（平台区间预置 + party PRIVATE）
  const invitedRoles = (user.roleIds ?? []).map((id) => roles.find((r) => r.id === id)).filter(Boolean) as Role[];

  const [editingRoles, setEditingRoles] = useState(false);
  const [draftRoleIds, setDraftRoleIds] = useState<Set<string>>(new Set(user.roleIds));
  const [savingRoles, setSavingRoles] = useState(false);

  // 邀请操作（重发/换链接/过期重邀）异步态：点击者转圈，期间全部禁用，防重复/防并发误点。
  const [pending, setPending] = useState<null | "resend" | "regenerate" | "reinvite">(null);
  async function runAction(kind: "resend" | "regenerate" | "reinvite", fn: () => Promise<boolean>) {
    setPending(kind);
    try {
      await fn();
    } finally {
      setPending(null);
    }
  }

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

  async function saveRoles() {
    setSavingRoles(true);
    try {
      const ok = await onSave({ ...user, roleIds: [...draftRoleIds] });
      if (ok) setEditingRoles(false);
    } finally {
      setSavingRoles(false);
    }
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

  const headerTone = isExpired ? "bg-error-bg text-error-strong" : "bg-warning-bg text-warning-strong";

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-4 border-b border-line-subtle py-4 px-5">
        <div className={`grid size-14 shrink-0 place-items-center rounded-xl ${headerTone}`}>
          <Mail size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xl font-semibold tracking-tight text-content-primary">
              {isExpired ? "Invitation expired" : "Invitation sent"}
            </span>
            <Badge tone={isExpired ? "error" : "warning"} dot>{isExpired ? "EXPIRED" : "PENDING"}</Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-content-secondary">
            <span className="inline-flex items-center gap-1"><Mail className="size-3.5" /> {user.inviteEmail ?? user.email}</span>
            <span className="inline-flex items-center gap-1"><User className="size-3.5" /> Invited by {user.invitedBy}</span>
            {user.invitedAt && <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> Sent {relTime(user.invitedAt)}</span>}
            {user.inviteExpiresAt && (
              <span className={`inline-flex items-center gap-1 ${isExpired ? "text-error-strong" : "text-warning-strong"}`}>
                <Clock className="size-3.5" /> {isExpired ? "Expired" : "Expires"} {relTime(user.inviteExpiresAt)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isExpired ? (
            <Button variant="ghost" size="sm" loading={pending === "reinvite"} disabled={pending !== null}
              iconLeft={pending === "reinvite" ? undefined : <Mail size={14} />}
              onClick={() => runAction("reinvite", onReinvite)}>Re-send (replace)</Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" loading={pending === "resend"} disabled={pending !== null}
                iconLeft={pending === "resend" ? undefined : <Mail size={14} />}
                onClick={() => runAction("resend", onResend)}>Resend</Button>
              <Button variant="ghost" size="sm" loading={pending === "regenerate"} disabled={pending !== null}
                iconLeft={pending === "regenerate" ? undefined : <RefreshCw size={14} />}
                onClick={() => runAction("regenerate", onRegenerate)}>Regenerate link</Button>
            </>
          )}
          <Button variant="ghost-danger" size="sm" disabled={pending !== null} iconLeft={<Shield size={14} />} onClick={onCancel}>Cancel invite</Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-5 pt-4 px-5 pb-6">
        {isExpired ? (
          <Alert variant="error">
            <AlertTriangle size={14} />
            <AlertDescription>
              <strong>This invitation has expired.</strong> Re-send a fresh invitation to replace it, or cancel it.
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
            <dl className="flex flex-col gap-3.5 text-md">
              <div className="flex gap-5">
                <dt className="w-40 shrink-0 font-medium text-content-tertiary">Email</dt>
                <dd className="min-w-0 flex-1 text-content-primary">{user.inviteEmail ?? user.email}</dd>
              </div>
              <div className="flex gap-5">
                <dt className="w-40 shrink-0 font-medium text-content-tertiary">Invite URL</dt>
                <dd className="flex min-w-0 flex-1 items-center gap-2 text-content-primary">
                  <code className="truncate rounded border border-line-subtle bg-surface-3 px-1.5 py-0.5 font-mono text-xs">{maskUrl(inviteUrl)}</code>
                  <Button variant="ghost" size="icon-xs" aria-label="Copy invite URL" title="Copy invite URL" onClick={copyUrl}>
                    <Copy />
                  </Button>
                </dd>
              </div>
              <div className="flex gap-5">
                <dt className="w-40 shrink-0 font-medium text-content-tertiary">Invited by</dt>
                <dd className="min-w-0 flex-1 text-content-primary">{user.invitedBy}</dd>
              </div>
              <div className="flex gap-5">
                <dt className="w-40 shrink-0 font-medium text-content-tertiary">Sent</dt>
                <dd className="min-w-0 flex-1 text-content-primary">{user.invitedAt ? fmtDateTime(user.invitedAt) : "—"}</dd>
              </div>
              <div className="flex gap-5">
                <dt className="w-40 shrink-0 font-medium text-content-tertiary">Resent</dt>
                <dd className="min-w-0 flex-1 text-content-primary">{user.resendCount ? `${user.resendCount} time${user.resendCount > 1 ? "s" : ""}` : "Never"}</dd>
              </div>
              <div className="flex gap-5">
                <dt className="w-40 shrink-0 font-medium text-content-tertiary">Expires</dt>
                <dd className="min-w-0 flex-1 text-content-primary">{user.inviteExpiresAt ? fmtDateTime(user.inviteExpiresAt) : "—"}</dd>
              </div>
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
              {!editingRoles && !isExpired && (
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
                <div className="flex flex-col gap-2 px-5 py-3">
                  {adminRoles.map((r) => {
                    const on = draftRoleIds.has(r.id);
                    return (
                      <label key={r.id} className={`flex items-center gap-3 px-3 py-3 rounded-lg border cursor-pointer transition-colors ${
                        on ? "bg-primary-50 border-primary/30" : "bg-surface-3 border-line-subtle"
                      }`}>
                        <Checkbox checked={on} onCheckedChange={() => toggleRole(r.id)} />
                        <div className="flex-1 min-w-0">
                          <div className="text-md font-semibold">{r.name}</div>
                          <div className="text-xs text-content-tertiary">{r.description} · {r.permissions.length} perms</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <div className="flex gap-2 justify-end px-5 py-3 border-t border-line-subtle">
                  <Button variant="ghost" size="sm" onClick={cancelEditRoles}>Cancel</Button>
                  <Button variant="primary" size="sm" loading={savingRoles}
                    disabled={draftRoleIds.size === 0 || savingRoles} onClick={saveRoles}>
                    {savingRoles ? "Saving…" : "Save"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                {invitedRoles.length === 0 && (
                  <div className="px-4 py-8 text-center text-md text-content-tertiary">No roles pre-assigned.</div>
                )}
                {invitedRoles.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 px-5 py-3 border-b border-line-subtle last:border-b-0">
                    <div className="grid place-items-center shrink-0 bg-surface-3 text-content-secondary size-7 rounded-lg">
                      <Shield size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-md font-semibold text-content-primary">{r.name}</div>
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
