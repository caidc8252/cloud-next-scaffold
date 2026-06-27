"use client";

import { useState, useMemo } from "react";
import { Mail, Info } from "lucide-react";
import { Alert, AlertDescription, Button, Checkbox, Field, Input, Modal } from "@cloud/ui";
import type { Role, User } from "@/app/(dashboard)/system/_shared/types";

type NewUserModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (draft: { email: string; roleIds: string[] }) => Promise<boolean>;
  users: User[];
  roles: Role[];
};

export function NewUserModal({ open, onClose, onCreate, users, roles }: NewUserModalProps) {
  const [email, setEmail] = useState("");
  const [roleIds, setRoleIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);

  const adminRoles = roles; // 可分配角色已由 listAssignableRoles 算好（平台区间预置 + party PRIVATE）

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailOk = emailRegex.test(email.trim());
  const emailTaken = useMemo(
    () => {
      const target = email.trim().toLowerCase();
      if (!target) return false; // 空邮箱不参与占用判定，避免空串回退("")误命中无 inviteEmail 的用户
      return users.some((u) => u.email.toLowerCase() === target || (u.inviteEmail ?? "").toLowerCase() === target);
    },
    [users, email],
  );
  const valid = emailOk && !emailTaken && roleIds.size > 0;

  function reset() { setEmail(""); setRoleIds(new Set()); setSubmitting(false); }

  // 每次打开回到初始态：清掉上一次的输入与可能残留的 in-flight 标志（弹窗常驻挂载，不靠卸载重置）
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) reset();
  }

  async function handleCreate() {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      await onCreate({ email: email.trim(), roleIds: [...roleIds] }); // 成功后父层关闭弹窗；失败保留输入、弹窗不关
    } finally {
      setSubmitting(false);
    }
  }

  function toggleRole(id: string) {
    if (submitting) return;
    const next = new Set(roleIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setRoleIds(next);
  }

  return (
    <Modal open={open} closeOnOverlay={!submitting} onClose={onClose} title="Invite a new user"
      footer={<div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" loading={submitting} disabled={!valid} iconLeft={<Mail size={14} />} onClick={handleCreate}>
          {submitting ? "Sending…" : "Send invitation"}
        </Button>
      </div>}>
      <div className="flex flex-col gap-4">
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
            placeholder="name@company.com" prefix={<Mail size={14} />} disabled={submitting}
            invalid={!!email && (!emailOk || emailTaken)} />
        </Field>

        <Field label={`Pre-assigned roles (${roleIds.size})`} required
          hint="Roles the invitee will hold once they accept. They'll see these on the authorization step.">
          <div className="flex flex-col gap-2">
            {adminRoles.map((r) => {
              const on = roleIds.has(r.id);
              return (
                <label key={r.id} className={`flex items-center gap-3 px-3 py-3 rounded-lg border transition-colors ${
                  submitting ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                } ${on ? "bg-primary-50 border-primary/30" : "bg-surface-3 border-line-subtle"}`}>
                  <Checkbox checked={on} disabled={submitting} onCheckedChange={() => toggleRole(r.id)} />
                  <div className="flex-1 min-w-0">
                    <div className="text-md font-semibold">{r.name}</div>
                    <div className="text-xs text-content-tertiary">{r.description} · {r.permissions.length} perms</div>
                  </div>
                </label>
              );
            })}
          </div>
        </Field>
      </div>
    </Modal>
  );
}
