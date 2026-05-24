"use client";

import { useState, useMemo } from "react";
import { Button, Field, Input, Textarea, Modal, Checkbox, Tabs, TabsList, TabsTrigger, TabsContent } from "@cloud/ui";
import { toast } from "sonner";
import type { Role, User } from "../types";

type CreateDraft = {
  email: string; roleIds: string[]; remark: string; mode: "direct" | "invite";
  loginName?: string; displayName?: string; tempPassword?: string;
};

type NewUserModalProps = { open: boolean; onClose: () => void; onCreate: (draft: CreateDraft) => void; users: User[]; roles: Role[] };

export function NewUserModal({ open, onClose, onCreate, users, roles }: NewUserModalProps) {
  const [tab, setTab] = useState<"direct" | "invite">("direct");
  const [loginName, setLoginName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [directEmail, setDirectEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [directRoleIds, setDirectRoleIds] = useState<Set<string>>(new Set());
  const [directRemark, setDirectRemark] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleIds, setInviteRoleIds] = useState<Set<string>>(new Set());
  const [inviteRemark, setInviteRemark] = useState("");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const directValid = loginName.trim().length >= 2 && tempPassword.length >= 8 && directRoleIds.size > 0;
  const inviteEmailOk = emailRegex.test(inviteEmail);
  const inviteEmailTaken = useMemo(
    () => users.some((u) => u.email.toLowerCase() === inviteEmail.toLowerCase() || (u.inviteEmail ?? "").toLowerCase() === inviteEmail.toLowerCase()),
    [users, inviteEmail],
  );
  const inviteValid = inviteEmailOk && !inviteEmailTaken && inviteRoleIds.size > 0;

  function reset() {
    setLoginName(""); setDisplayName(""); setDirectEmail(""); setTempPassword("");
    setDirectRoleIds(new Set()); setDirectRemark("");
    setInviteEmail(""); setInviteRoleIds(new Set()); setInviteRemark("");
  }

  function handleCreate() {
    if (tab === "direct") {
      onCreate({ mode: "direct", loginName: loginName.trim(), displayName: displayName.trim(),
        email: directEmail.trim(), tempPassword, roleIds: [...directRoleIds], remark: directRemark.trim() });
    } else {
      toast.info("Email service not configured — invitation created locally.");
      onCreate({ mode: "invite", email: inviteEmail.trim(), roleIds: [...inviteRoleIds], remark: inviteRemark.trim() });
    }
    reset();
  }

  function toggleRole(set: Set<string>, setFn: (s: Set<string>) => void, id: string) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setFn(next);
  }

  const isValid = tab === "direct" ? directValid : inviteValid;

  return (
    <Modal open={open} onClose={() => { onClose(); reset(); }} title="New user"
      footer={<div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={() => { onClose(); reset(); }}>Cancel</Button>
        <Button variant="primary" disabled={!isValid} onClick={handleCreate}>
          {tab === "direct" ? "Create" : "Send Invite"}
        </Button>
      </div>}>
      <Tabs value={tab} onValueChange={(v) => setTab(v as "direct" | "invite")}>
        <TabsList variant="line">
          <TabsTrigger value="direct">Direct</TabsTrigger>
          <TabsTrigger value="invite">Email Invite</TabsTrigger>
        </TabsList>

        <TabsContent value="direct" className="space-y-4 pt-4">
          <Field label="Username" required>
            <Input value={loginName} onChange={(e) => setLoginName(e.target.value)} placeholder="e.g. john.d" autoFocus />
          </Field>
          <Field label="Display name">
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. John Doe" />
          </Field>
          <Field label="Email">
            <Input type="email" value={directEmail} onChange={(e) => setDirectEmail(e.target.value)} />
          </Field>
          <Field label="Temporary password" required hint="Min 8 characters. User must change on first login.">
            <Input type="password" value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} />
          </Field>
          <Field label="Roles" required>
            <div className="space-y-1.5">
              {roles.map((r) => (
                <label key={r.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={directRoleIds.has(r.id)} onCheckedChange={() => toggleRole(directRoleIds, setDirectRoleIds, r.id)} />
                  <span className="text-sm">{r.name}</span>
                </label>
              ))}
            </div>
          </Field>
          <Field label="Remark">
            <Textarea value={directRemark} onChange={(e) => setDirectRemark(e.target.value)} rows={2} />
          </Field>
        </TabsContent>

        <TabsContent value="invite" className="space-y-4 pt-4">
          <Field label="Email" required
            error={inviteEmail && !inviteEmailOk ? "Invalid email format" : inviteEmailTaken ? "This email is already in use" : undefined}>
            <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="user@company.com" invalid={!!inviteEmail && (!inviteEmailOk || inviteEmailTaken)} autoFocus />
          </Field>
          <Field label="Roles" required>
            <div className="space-y-1.5">
              {roles.map((r) => (
                <label key={r.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={inviteRoleIds.has(r.id)} onCheckedChange={() => toggleRole(inviteRoleIds, setInviteRoleIds, r.id)} />
                  <span className="text-sm">{r.name}</span>
                </label>
              ))}
            </div>
          </Field>
          <Field label="Remark">
            <Textarea value={inviteRemark} onChange={(e) => setInviteRemark(e.target.value)} rows={2} />
          </Field>
        </TabsContent>
      </Tabs>
    </Modal>
  );
}
