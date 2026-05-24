"use client";

import { useState } from "react";
import { Pencil, Lock, Unlock, KeyRound, UserCog, AlertTriangle } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Collapsible, CollapsibleTrigger, CollapsibleContent } from "@cloud/ui";
import type { Role, User } from "../types";
import { relTime, fmtDate, fmtDateTime } from "../helpers";
import { PASSWORD_POLICY } from "../mock/password-policy";
import { EditUserModal } from "./edit-user-modal";
import { ResetPasswordModal } from "./reset-password-modal";
import { ChangeRoleModal } from "./change-role-modal";

type UserDetailProps = {
  user: User; roles: Role[];
  onSave: (u: User) => void; onResetPassword: () => void; onToggleLock: () => void;
};

const STATUS_TONE = { ACTIVE: "success", LOCKED: "error", PENDING: "warning" } as const;

export function UserDetail({ user, roles, onSave, onResetPassword, onToggleLock }: UserDetailProps) {
  const [showEdit, setShowEdit] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [showRole, setShowRole] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [now] = useState(Date.now);
  const pwAgeDays = user.passwordChangedTimestamp ? Math.floor((now - user.passwordChangedTimestamp) / 86_400_000) : null;
  const pwExpired = pwAgeDays !== null && pwAgeDays >= PASSWORD_POLICY.expiryDays;
  const userRoles = roles.filter((r) => user.roleIds.includes(r.id));
  const isLocked = user.status === "LOCKED";

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-content-primary">{user.displayName || user.loginName}</h2>
            <Badge tone={STATUS_TONE[user.status]}>{user.status}</Badge>
          </div>
          <div className="text-sm text-content-tertiary mt-0.5">@{user.loginName}</div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" iconLeft={<Pencil size={14} />} onClick={() => setShowEdit(true)}>Edit</Button>
          <Button variant={isLocked ? "ghost" : "ghost-danger"} size="sm"
            iconLeft={isLocked ? <Unlock size={14} /> : <Lock size={14} />} onClick={onToggleLock}>
            {isLocked ? "Unlock" : "Lock"}
          </Button>
        </div>
      </div>

      {/* Locked banner */}
      {isLocked && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-error-bg text-sm text-error">
          <AlertTriangle size={14} />
          <span>
            Account locked — {user.passwordErrorTimes}/{PASSWORD_POLICY.maxErrorTimes} failed attempts.
            {user.passwordErrorLockExpiredTimestamp && (
              <> Auto-unlock at {fmtDateTime(new Date(user.passwordErrorLockExpiredTimestamp).toISOString())}.</>
            )}
          </span>
        </div>
      )}

      {/* Account info */}
      <Card>
        <CardHeader><CardTitle>Account Information</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-content-tertiary">Login name</dt><dd className="text-content-primary font-medium">{user.loginName}</dd></div>
            <div><dt className="text-content-tertiary">Email</dt><dd className="text-content-primary">{user.email || "—"}</dd></div>
            <div><dt className="text-content-tertiary">Country</dt><dd className="text-content-primary">{user.country || "—"}</dd></div>
            <div><dt className="text-content-tertiary">Auth type</dt><dd className="text-content-primary">{user.authorizingType}</dd></div>
            <div><dt className="text-content-tertiary">Created</dt><dd className="text-content-primary">{fmtDate(user.createdAt)}</dd></div>
            <div><dt className="text-content-tertiary">Remark</dt><dd className="text-content-primary">{user.remark || "—"}</dd></div>
          </dl>
        </CardContent>
      </Card>

      {/* Password & security */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle>Password & Security</CardTitle>
            <Button variant="ghost" size="sm" iconLeft={<KeyRound size={14} />} onClick={() => setShowReset(true)}>Reset password</Button>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-content-tertiary">Password age</dt>
              <dd className={pwExpired ? "text-error font-medium" : "text-content-primary"}>
                {pwAgeDays !== null ? `${pwAgeDays} days` : "—"}{pwExpired && " (EXPIRED)"}
              </dd></div>
            <div><dt className="text-content-tertiary">Last changed</dt>
              <dd className="text-content-primary">{user.passwordUpdatedAt ? relTime(user.passwordUpdatedAt) : "—"}</dd></div>
            <div><dt className="text-content-tertiary">Failed attempts</dt>
              <dd className={user.passwordErrorTimes > 0 ? "text-warning font-medium" : "text-content-primary"}>
                {user.passwordErrorTimes} / {PASSWORD_POLICY.maxErrorTimes}
              </dd></div>
            <div><dt className="text-content-tertiary">Password changes</dt>
              <dd className="text-content-primary">{user.passwordChangeTimes}</dd></div>
          </dl>
        </CardContent>
      </Card>

      {/* Roles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle>Roles</CardTitle>
            <Button variant="ghost" size="sm" iconLeft={<UserCog size={14} />} onClick={() => setShowRole(true)}>Change role</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {userRoles.map((r) => <Badge key={r.id} variant="secondary">{r.name}</Badge>)}
            {userRoles.length === 0 && <span className="text-sm text-content-tertiary">No roles assigned</span>}
          </div>
        </CardContent>
      </Card>

      {/* Password history */}
      {user.passwordHistory.length > 0 && (
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <Card>
            <CardHeader>
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <CardTitle>Password History ({user.passwordHistory.length})</CardTitle>
                <span className="text-xs text-content-tertiary">{historyOpen ? "Hide" : "Show"}</span>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-1.5">
                  {user.passwordHistory.map((h) => (
                    <div key={h.hashId} className="flex items-center justify-between text-sm">
                      <code className="text-xs font-mono text-content-tertiary">{h.hashId}</code>
                      <span className="text-content-tertiary">{relTime(h.changedAt)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Modals */}
      <EditUserModal open={showEdit} onClose={() => setShowEdit(false)} user={user} onSave={onSave} />
      <ResetPasswordModal open={showReset} onClose={() => setShowReset(false)} user={user} onConfirm={onResetPassword} />
      <ChangeRoleModal open={showRole} onClose={() => setShowRole(false)} user={user} roles={roles} onSave={onSave} />
    </div>
  );
}
