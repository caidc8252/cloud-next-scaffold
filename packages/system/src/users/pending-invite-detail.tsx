"use client";

import { Mail, User, Clock, Shield } from "lucide-react";
import { Alert, AlertDescription, Button, Card, CardContent, CardHeader, CardTitle } from "@cloud/ui";
import type { Role, User as UserType } from "../types";
import { fmtDateTime, relTime } from "../helpers";

type PendingInviteDetailProps = { user: UserType; roles: Role[]; onResend: () => void; onCancel: () => void };

export function PendingInviteDetail({ user, roles, onResend, onCancel }: PendingInviteDetailProps) {
  const invitedRoles = (user.roleIds ?? []).map((id) => roles.find((r) => r.id === id)).filter(Boolean) as Role[];

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-4 border-b border-line-subtle" style={{ padding: "18px 22px" }}>
        <div className="shrink-0 grid place-items-center text-white"
          style={{ width: 56, height: 56, borderRadius: 12, background: "linear-gradient(135deg, oklch(78% 0.1 80), oklch(64% 0.14 80))" }}>
          <Mail size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xl font-semibold tracking-tight text-content-primary">Invitation sent</span>
            <span className="font-mono font-semibold uppercase shrink-0"
              style={{ fontSize: 9.5, letterSpacing: "0.06em", padding: "1px 5px", borderRadius: 3, border: "1px solid",
                color: "var(--color-warning-700)", background: "var(--color-warning-50)", borderColor: "oklch(75% 0.13 80 / 0.3)" }}>
              PENDING
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-content-tertiary mt-1.5">
            <span className="inline-flex items-center gap-1.5"><Mail size={12} /> {user.inviteEmail ?? user.email}</span>
            <span className="inline-flex items-center gap-1.5"><User size={12} /> Invited by {user.invitedBy}</span>
            {user.invitedAt && <span className="inline-flex items-center gap-1.5"><Clock size={12} /> Sent {relTime(user.invitedAt)}</span>}
            {user.inviteExpiresAt && (
              <span className="inline-flex items-center gap-1.5" style={{ color: "var(--color-warning-700)" }}>
                <Clock size={12} /> Expires {relTime(user.inviteExpiresAt)}
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
        <Alert variant="info">
          <Shield size={14} />
          <AlertDescription>
            <strong>Waiting on the invitee.</strong> Once they click the link in their email and complete
            onboarding, this row turns into a full user with login name, display name, and password set by them.
            Pre-assigned roles below take effect at that moment.
          </AlertDescription>
        </Alert>

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
              <dd className="text-content-primary"><code className="font-mono text-xs px-1.5 py-0.5 bg-surface-3 rounded border border-line-subtle">{user.inviteToken ?? user.id}</code></dd>
              <dt className="text-content-tertiary font-medium">Invited by</dt>
              <dd className="text-content-primary">{user.invitedBy}</dd>
              <dt className="text-content-tertiary font-medium">Sent</dt>
              <dd className="text-content-primary">{user.invitedAt ? fmtDateTime(user.invitedAt) : "—"}</dd>
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
            <div>
              <CardTitle>Pre-assigned roles ({invitedRoles.length})</CardTitle>
              <p className="text-xs text-content-tertiary mt-0.5">The invitee will see these on the authorization step and gain them once they accept.</p>
            </div>
          </CardHeader>
          <div>
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
          </div>
        </Card>
      </div>
    </div>
  );
}
