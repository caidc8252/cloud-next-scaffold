"use client";

import { useState } from "react";
import { Button, Modal, Checkbox } from "@cloud/ui";
import type { Role, User } from "../types";

type ChangeRoleModalProps = { open: boolean; onClose: () => void; user: User; roles: Role[]; onSave: (u: User) => void };

export function ChangeRoleModal({ open, onClose, user, roles, onSave }: ChangeRoleModalProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(user.roleIds));

  const [prevId, setPrevId] = useState(user.id);
  if (user.id !== prevId) {
    setPrevId(user.id);
    setSelected(new Set(user.roleIds));
  }

  function toggle(roleId: string) {
    const next = new Set(selected);
    next.has(roleId) ? next.delete(roleId) : next.add(roleId);
    setSelected(next);
  }

  function handleSave() {
    onSave({ ...user, roleIds: [...selected] });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Change role"
      footer={<div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={selected.size === 0} onClick={handleSave}>Save</Button>
      </div>}>
      <div className="space-y-2">
        <p className="text-sm text-content-secondary mb-3">Select roles for <strong>{user.displayName || user.loginName}</strong>:</p>
        {roles.map((r) => (
          <label key={r.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-surface-hover cursor-pointer">
            <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} />
            <div>
              <div className="text-sm font-medium text-content-primary">{r.name}</div>
              <div className="text-xs text-content-tertiary">{r.permissions.length} permissions</div>
            </div>
          </label>
        ))}
      </div>
    </Modal>
  );
}
