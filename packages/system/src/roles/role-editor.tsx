"use client";

import { useState, useMemo } from "react";
import { Check, Copy, Trash2 } from "lucide-react";
import { Badge, Button, Textarea, Modal, Card, CardContent, CardHeader, CardTitle } from "@cloud/ui";
import type { Role, User } from "../types";
import { relTime } from "../helpers";
import { PERMISSION_CATALOG } from "../mock";
import { PermissionsCard } from "./permissions-card";

type RoleEditorProps = {
  role: Role;
  users: User[];
  onSave: (r: Role) => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

export function RoleEditor({ role, users, onSave, onDuplicate, onDelete }: RoleEditorProps) {
  const [draft, setDraft] = useState(role);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reset draft when selected role changes
  const roleKey = role.id;
  const [prevKey, setPrevKey] = useState(roleKey);
  if (roleKey !== prevKey) {
    setPrevKey(roleKey);
    setDraft(role);
  }

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(role), [draft, role]);
  const assignedUsers = users.filter((u) => u.roleIds.includes(role.id));

  function togglePerm(code: string) {
    const perms = draft.permissions.includes(code)
      ? draft.permissions.filter((p) => p !== code)
      : [...draft.permissions, code];
    setDraft({ ...draft, permissions: perms });
  }

  function toggleGroup(menuId: string, grant: boolean) {
    const groupCodes = PERMISSION_CATALOG.filter((p) => p.menuId === menuId).map((p) => p.code);
    let perms: string[];
    if (grant) {
      perms = [...new Set([...draft.permissions, ...groupCodes])];
    } else {
      const removeSet = new Set(groupCodes);
      perms = draft.permissions.filter((p) => !removeSet.has(p));
    }
    setDraft({ ...draft, permissions: perms });
  }

  return (
    <div>
      <div className="border-b border-line-subtle" style={{ padding: "18px 22px" }}>
        <div className="flex items-start" style={{ gap: 16 }}>
          <div className="flex-1 min-w-0">
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="font-semibold tracking-tight text-content-primary bg-transparent outline-none w-full"
              style={{ fontSize: 20, border: "1px solid transparent", padding: "4px 8px", marginLeft: -8, borderRadius: 6, maxWidth: 400 }}
              disabled={role.builtin} />
            <div className="flex items-center flex-wrap text-content-tertiary" style={{ gap: 6, fontSize: 12, marginTop: 6 }}>
              <span>{role.operatorCount} operators assigned</span>
              <span style={{ opacity: 0.5 }}>·</span>
              {role.builtin && <Badge variant="outline">SYSTEM</Badge>}
            </div>
            <div className="text-content-tertiary" style={{ fontSize: 12, marginTop: 2 }}>
              Updated {relTime(role.updatedAt)} by {role.updatedBy}
            </div>
          </div>
          <div className="flex items-center shrink-0" style={{ gap: 6 }}>
            <Button variant="ghost" size="sm" iconLeft={<Copy size={14} />} onClick={onDuplicate}>Duplicate</Button>
            <Button variant="ghost-danger" size="sm" iconLeft={<Trash2 size={14} />}
              onClick={() => setConfirmDelete(true)} disabled={role.builtin}>Delete</Button>
            <Button variant="primary" size="sm" disabled={!dirty} onClick={() => onSave(draft)}
              iconLeft={dirty ? undefined : <Check size={14} />}>
              {dirty ? "Save changes" : "Saved"}
            </Button>
          </div>
        </div>
      </div>
      <div className="flex flex-col" style={{ padding: "18px 22px 24px", gap: 16 }}>
        <Card>
          <CardHeader><CardTitle>Description</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              rows={3} disabled={role.builtin} />
            <p className="text-xs text-content-tertiary mt-2">Shown when assigning this role to an operator.</p>
          </CardContent>
        </Card>

        <PermissionsCard contractDefineCode={draft.contractDefineCode} permissions={draft.permissions}
          onTogglePerm={togglePerm} onToggleGroup={toggleGroup} disabled={role.builtin} />

        {assignedUsers.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Assigned Users ({assignedUsers.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {assignedUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-2 text-sm">
                    <span className="text-content-primary font-medium">{u.displayName || u.loginName}</span>
                    <span className="text-content-tertiary">{u.email}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete role"
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button variant="destructive" onClick={() => { setConfirmDelete(false); onDelete(); }}>Delete</Button>
        </div>}>
        <p className="text-sm text-content-secondary">
          Are you sure you want to delete <strong>{role.name}</strong>? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
