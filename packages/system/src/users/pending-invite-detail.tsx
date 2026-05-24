"use client";

import { useState } from "react";
import { Mail, RefreshCw, X } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@cloud/ui";
import type { Role, User } from "../types";
import { fmtDateTime, relTime } from "../helpers";

type PendingInviteDetailProps = { user: User; roles: Role[]; onResend: () => void; onCancel: () => void };

export function PendingInviteDetail({ user, roles, onResend, onCancel }: PendingInviteDetailProps) {
  const userRoles = roles.filter((r) => user.roleIds.includes(r.id));
  const [now] = useState(Date.now);
  const isExpired = user.inviteExpiresAt ? new Date(user.inviteExpiresAt).getTime() < now : false;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-full bg-warning-bg flex items-center justify-center">
            <Mail size={20} className="text-warning" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-content-primary">Pending Invitation</h2>
              <Badge tone={isExpired ? "error" : "warning"}>{isExpired ? "EXPIRED" : "PENDING"}</Badge>
            </div>
            <div className="text-sm text-content-tertiary mt-0.5">{user.inviteEmail}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" iconLeft={<RefreshCw size={14} />} onClick={onResend}>Resend</Button>
          <Button variant="ghost-danger" size="sm" iconLeft={<X size={14} />} onClick={onCancel}>Revoke</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Invitation Details</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-content-tertiary">Email</dt><dd className="text-content-primary">{user.inviteEmail}</dd></div>
            <div><dt className="text-content-tertiary">Invited by</dt><dd className="text-content-primary">{user.invitedBy}</dd></div>
            <div><dt className="text-content-tertiary">Invited at</dt><dd className="text-content-primary">{user.invitedAt ? fmtDateTime(user.invitedAt) : "—"}</dd></div>
            <div><dt className="text-content-tertiary">Expires</dt>
              <dd className={isExpired ? "text-error font-medium" : "text-content-primary"}>
                {user.inviteExpiresAt ? relTime(user.inviteExpiresAt) : "—"}
              </dd></div>
            <div><dt className="text-content-tertiary">Remark</dt><dd className="text-content-primary">{user.remark || "—"}</dd></div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Pre-assigned Roles</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {userRoles.map((r) => <Badge key={r.id} variant="secondary">{r.name}</Badge>)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
