"use client";

import { useState, useMemo } from "react";
import { User, Mail, Globe, Clock, Check, Shield, KeyRound, Copy, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, Badge, Button, Card, CardContent, CardHeader, CardTitle, Collapsible, CollapsibleContent, CollapsibleTrigger, Field, Input, Modal, Switch, Textarea } from "@cloud/ui";
import type { Role, User as UserType } from "@/app/(portal)/system/_shared/types";
import { relTime, initials } from "@/app/(portal)/system/_shared/helpers";
import { PASSWORD_POLICY } from "@cloud/config/password-policy";

type UserDetailProps = {
  user: UserType;
  users: UserType[];
  roles: Role[];
  currentUserId: string;
  onSave: (u: UserType) => void;
  onResetPassword: () => void;
  onToggleLock: () => void;
};

function avatarGradient(locked: boolean): string {
  if (locked) return "bg-linear-to-br from-error-500 to-error-700";
  return "bg-linear-to-br from-primary-500 to-accent-600";
}

export function UserDetail({ user, users, roles, currentUserId, onSave, onResetPassword, onToggleLock }: UserDetailProps) {
  const [draft, setDraft] = useState(user);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmLock, setConfirmLock] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);

  const [prevId, setPrevId] = useState(user.id);
  if (user.id !== prevId) {
    setPrevId(user.id);
    setDraft(user);
  }

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(user), [draft, user]);
  const disabled = user.status === "INACTIVE";
  const isProtected = user.id === currentUserId || user.authorizingType === "ADMIN";
  const displayInitials = initials(user.displayName || user.loginName);

  const [now] = useState(Date.now);
  const pwAgeDays = draft.passwordChangedTimestamp ? Math.floor((now - draft.passwordChangedTimestamp) / 86_400_000) : null;
  const pwExpired = pwAgeDays !== null && pwAgeDays >= PASSWORD_POLICY.expiryDays;

  const adminRoles = roles.filter((r) => r.contractType === "ADMIN");
  const assignedRoles = adminRoles.filter((r) => (draft.roleIds ?? []).includes(r.id));

  function toggleRole(roleId: string) {
    const ids = draft.roleIds.includes(roleId) ? draft.roleIds.filter((id) => id !== roleId) : [...draft.roleIds, roleId];
    setDraft({ ...draft, roleIds: ids });
  }

  function save() { onSave(draft); }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-4 border-b border-line-subtle py-4 px-5">
        <div className={`shrink-0 grid place-items-center text-content-inverse font-semibold text-xl tracking-tight size-14 rounded-xl ${avatarGradient(disabled)}`}>
          {displayInitials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <input value={draft.displayName} onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
              disabled={isProtected} readOnly={isProtected}
              className="text-xl font-semibold tracking-tight text-content-primary bg-transparent outline-none disabled:cursor-default border border-transparent py-1 px-2 -ml-2 rounded-md max-w-sm" />
            <span
              className={`font-mono font-semibold uppercase shrink-0 border text-xs tracking-wider ${
                disabled
                  ? "text-error-strong bg-error-bg border-error/25"
                  : "text-success-strong bg-success-bg border-success/25"
              } py-px px-1.5 rounded-sm`}>
              {user.status}
            </span>
            {draft.authorizingType === "ADMIN" && <Badge variant="outline" title="Implicit admin — bypasses role checks">ADMIN</Badge>}
          </div>
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-content-tertiary mt-1.5">
            <span className="inline-flex items-center gap-1.5"><User size={12} /> @{user.loginName}</span>
            <span className="inline-flex items-center gap-1.5"><Mail size={12} /> {user.email}</span>
            <span className="inline-flex items-center gap-1.5"><Globe size={12} /> {user.country}</span>
            {user.lastLoginAt && <span className="inline-flex items-center gap-1.5"><Clock size={12} /> Last login {relTime(user.lastLoginAt)}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="ghost" size="sm" iconLeft={<KeyRound size={14} />} onClick={() => setConfirmReset(true)} disabled={isProtected}>Reset password</Button>
          <Button variant={disabled ? "primary" : "ghost"} size="sm" iconLeft={<Shield size={14} />}
            onClick={() => setConfirmLock(true)} disabled={isProtected}>{disabled ? "Enable" : "Disable"}</Button>
          <Button variant="primary" size="sm" disabled={!dirty} onClick={save}
            iconLeft={dirty ? undefined : <Check size={14} />}>{dirty ? "Save changes" : "Saved"}</Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-4 pt-4 px-5 pb-6">
        {/* Disabled banner */}
        {disabled && (
          <Alert variant="error">
            <AlertTriangle size={14} />
            <AlertDescription>
              <strong>Account disabled</strong> — this user&apos;s access to the current organization has been disabled by an administrator.
            </AlertDescription>
          </Alert>
        )}

        {/* Password state */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Password state</CardTitle>
              <p className="text-xs text-content-tertiary mt-0.5">Enforcement is governed by the platform-wide password policy (below).</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2.5">
              <StatCell label="Password age" value={pwAgeDays !== null ? `${pwAgeDays}d` : "—"}
                sub={pwExpired ? `Expired ${pwAgeDays! - PASSWORD_POLICY.expiryDays}d ago` : `expires in ${PASSWORD_POLICY.expiryDays - (pwAgeDays ?? 0)}d`}
                tone={pwExpired ? "danger" : pwAgeDays !== null && pwAgeDays >= PASSWORD_POLICY.expiryDays - 14 ? "warn" : "ok"} />
              <StatCell label="Failed attempts"
                value={<>{user.passwordErrorTimes}<span className="text-xs text-content-tertiary font-medium"> / {PASSWORD_POLICY.maxErrorTimes}</span></>}
                sub={`auto-lock at ${PASSWORD_POLICY.maxErrorTimes}`}
                tone={user.passwordErrorTimes >= 3 ? "danger" : user.passwordErrorTimes > 0 ? "warn" : "ok"} />
            </div>
          </CardContent>
        </Card>

        {/* Profile */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Profile</CardTitle>
              <p className="text-xs text-content-tertiary mt-0.5">Only the remark is editable here.</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Login name" hint="Set at registration. Cannot be changed.">
                <Input value={draft.loginName} disabled readOnly />
              </Field>
              <Field label="Email" hint="Verified during onboarding. Cannot be changed.">
                <Input value={draft.email} disabled readOnly />
              </Field>
              <Field label="Country" hint="Set at registration. Cannot be changed.">
                <Input value={draft.country} disabled readOnly />
              </Field>
              <Field label="Authorizing type" hint="Fixed at account creation.">
                <Input value={draft.authorizingType === "ADMIN" ? "ADMIN — full access" : "NORMAL — permissions via role"} disabled readOnly />
              </Field>
              <div className="col-span-2">
                <Field label="Remark" hint="Internal note. Visible only to platform admins.">
                  <Textarea rows={3} value={draft.remark} onChange={(e) => setDraft({ ...draft, remark: e.target.value })}
                    placeholder="Optional notes about this user." />
                </Field>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Roles */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Roles</CardTitle>
              <p className="text-xs text-content-tertiary mt-0.5">
                {assignedRoles.length} of {adminRoles.length} assigned
                {draft.authorizingType === "ADMIN" && <span className="text-warning"> · ADMIN type bypasses role checks anyway.</span>}
              </p>
            </div>
          </CardHeader>
          <div>
            {adminRoles.map((r) => {
              const on = draft.roleIds.includes(r.id);
              const usersWithRole = users.filter((u) => (u.roleIds ?? []).includes(r.id));
              return (
                <div key={r.id} className="flex items-center gap-2.5 px-5 py-3 border-b border-line-subtle last:border-b-0">
                  <Switch checked={on} onCheckedChange={() => toggleRole(r.id)} size="sm" disabled={isProtected} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-content-primary flex items-center gap-2">
                      {r.name}
                      {r.builtin && <Badge variant="outline">SYSTEM</Badge>}
                    </div>
                    <div className="text-xs text-content-tertiary mt-0.5">{r.description} · {r.permissions.length} perms</div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-surface-3 border border-line-subtle text-content-secondary text-xs font-semibold shrink-0">
                    <User size={11} /> {usersWithRole.length}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Password policy */}
        <Card>
          <Collapsible open={policyOpen} onOpenChange={setPolicyOpen} className="border-0 rounded-none bg-transparent">
            <CollapsibleTrigger className="px-5 py-3.5 hover:bg-surface-3">
              <div className="text-left">
                <div className="text-sm font-semibold">Password policy</div>
                <p className="text-xs text-content-tertiary mt-0.5 font-normal">Platform-wide. Edit in System → Settings → Security.</p>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="flex flex-col p-0 text-content-primary">
              <PolicyRow icon={<Check size={13} />} name="Length" desc={`Minimum ${PASSWORD_POLICY.minLength} characters`} val={`≥ ${PASSWORD_POLICY.minLength}`} />
              <PolicyRow icon={<Shield size={13} />} name="Character set" desc="Must contain upper, lower, digit and symbol" val="ABC · abc · 0-9 · @#" />
              <PolicyRow icon={<AlertTriangle size={13} />} name="Lockout" desc={`After ${PASSWORD_POLICY.maxErrorTimes} consecutive failed attempts, lock for ${PASSWORD_POLICY.lockDurationMinutes}m`} val={`${PASSWORD_POLICY.maxErrorTimes} · ${PASSWORD_POLICY.lockDurationMinutes}m`} />
              <PolicyRow icon={<Clock size={13} />} name="Expiry" desc={`Force password change every ${PASSWORD_POLICY.expiryDays} days`} val={`${PASSWORD_POLICY.expiryDays}d`} />
              <PolicyRow icon={<Copy size={13} />} name="History" desc={`Last ${PASSWORD_POLICY.historySize} passwords cannot be reused`} val={`${PASSWORD_POLICY.historySize}`} />
            </CollapsibleContent>
          </Collapsible>
        </Card>

      </div>

      {/* Confirm reset modal */}
      {confirmReset && (
        <ConfirmModal open={confirmReset} onClose={() => setConfirmReset(false)} title="Send password reset link?"
          onConfirm={() => { setConfirmReset(false); onResetPassword(); }} confirmLabel="Send reset link" confirmVariant="primary">
          <p className="text-sm text-content-secondary">
            A password-reset link will be emailed to <strong>{user.email}</strong>.
          </p>
          <ul className="mt-3 pl-4 text-sm text-content-secondary list-disc space-y-1">
            <li>Valid for <strong>72 hours</strong></li>
            <li>Single use — link expires once {user.displayName} sets the new password</li>
            <li>They&apos;ll be asked to enter the new password twice for confirmation</li>
            <li>Any earlier pending reset link for this account will be invalidated</li>
          </ul>
        </ConfirmModal>
      )}

      {/* Confirm lock modal */}
      {confirmLock && (
        <ConfirmModal open={confirmLock} onClose={() => setConfirmLock(false)}
          title={disabled ? "Enable account?" : "Disable account?"}
          onConfirm={() => { setConfirmLock(false); onToggleLock(); }}
          confirmLabel={disabled ? "Enable" : "Disable account"}
          confirmVariant={disabled ? "primary" : "destructive"}>
          <p className="text-sm text-content-secondary">
            {disabled
              ? <>Enable <strong>{user.displayName}</strong> — they will be able to access this organization immediately.</>
              : <>Disable <strong>{user.displayName}</strong>&apos;s access to this organization. Their roles and permissions will not be loaded.</>}
          </p>
        </ConfirmModal>
      )}
    </div>
  );
}

// ── Sub-components (file-private) ──

function StatCell({ label, value, sub, tone }: {
  label: string; value: React.ReactNode; sub: string; tone?: "ok" | "warn" | "danger";
}) {
  const toneClass = tone === "danger" ? "text-error-strong" : tone === "warn" ? "text-warning-strong" : tone === "ok" ? "text-success-strong" : "";
  return (
    <div className="bg-surface-3 border border-line-subtle rounded-lg px-3.5 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-content-tertiary">{label}</div>
      <div className={`text-lg font-semibold mt-1 tabular-nums ${toneClass}`}>{value}</div>
      <div className="text-xs text-content-tertiary mt-0.5">{sub}</div>
    </div>
  );
}

function PolicyRow({ icon, name, desc, val }: { icon: React.ReactNode; name: string; desc: string; val: string }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-line-subtle last:border-b-0">
      <div className="grid place-items-center shrink-0 bg-surface-3 text-content-secondary size-7 rounded-lg">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-content-primary">{name}</div>
        <div className="text-xs text-content-tertiary mt-0.5">{desc}</div>
      </div>
      <span className="text-xs font-semibold font-mono shrink-0 px-2.5 py-1 rounded-md border border-primary/20 text-primary-700 bg-primary-50">
        {val}
      </span>
    </div>
  );
}

function ConfirmModal({ open, onClose, title, onConfirm, confirmLabel, confirmVariant, children }: {
  open: boolean; onClose: () => void; title: string; onConfirm: () => void;
  confirmLabel: string; confirmVariant: "primary" | "destructive"; children: React.ReactNode;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={<div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant={confirmVariant} onClick={onConfirm}>{confirmLabel}</Button>
      </div>}>
      {children}
    </Modal>
  );
}
