"use client";

import { useState, useMemo } from "react";
import { Mail, Info } from "lucide-react";
import { Alert, AlertDescription, Button, Checkbox, Field, Input, Modal, Textarea } from "@cloud/ui";
import type { Role, User } from "@/app/(portal)/system/_shared/types";

type NewUserModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (draft: { email: string; roleIds: string[]; remark: string }) => void;
  users: User[];
  roles: Role[];
};

export function NewUserModal({ open, onClose, onCreate, users, roles }: NewUserModalProps) {
  const [email, setEmail] = useState("");
  const [roleIds, setRoleIds] = useState<Set<string>>(new Set());
  const [remark, setRemark] = useState("");

  const adminRoles = roles.filter((r) => r.contractDefineCode === "ADMIN" && r.roleType === "global");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailOk = emailRegex.test(email.trim());
  const emailTaken = useMemo(
    () => users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase() || (u.inviteEmail ?? "").toLowerCase() === email.trim().toLowerCase()),
    [users, email],
  );
  const valid = emailOk && !emailTaken && roleIds.size > 0;

  function reset() { setEmail(""); setRoleIds(new Set()); setRemark(""); }

  function handleCreate() {
    onCreate({ email: email.trim(), roleIds: [...roleIds], remark: remark.trim() });
    reset();
  }

  function toggleRole(id: string) {
    const next = new Set(roleIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setRoleIds(next);
  }

  return (
    <Modal open={open} onClose={() => { onClose(); reset(); }} title="Invite a new user"
      footer={<div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={() => { onClose(); reset(); }}>Cancel</Button>
        <Button variant="primary" disabled={!valid} iconLeft={<Mail size={14} />} onClick={handleCreate}>Send invitation</Button>
      </div>}>
      <div className="flex flex-col gap-3.5">
        <Alert variant="info">
          <Info size={13} />
          <AlertDescription>
            <strong>How invitations work.</strong> You only provide an email and pre-assign roles.
            We send the invitee an onboarding link. They choose to use an existing account or register
            a new one — login name, display name, country and password are captured at that point.
          </AlertDescription>
        </Alert>

        <Field label="Email address" required
          error={email && !emailOk ? "Not a valid email." : emailTaken ? "An invitation or user already exists with this email." : undefined}
          hint={!email || (emailOk && !emailTaken) ? "The onboarding link will be sent here. Link expires in 7 days." : undefined}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com" prefix={<Mail size={14} />}
            invalid={!!email && (!emailOk || emailTaken)} />
        </Field>

        <Field label={`Pre-assigned roles (${roleIds.size})`} required
          hint="Roles the invitee will hold once they accept. They'll see these on the authorization step.">
          <div className="flex flex-col gap-1.5">
            {adminRoles.map((r) => {
              const on = roleIds.has(r.id);
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
        </Field>

        <Field label="Remark (internal)" hint="Optional. Visible only to platform admins.">
          <Textarea rows={2} value={remark} onChange={(e) => setRemark(e.target.value)}
            placeholder="e.g. EMEA ops, joining 1 June." />
        </Field>
      </div>
    </Modal>
  );
}
