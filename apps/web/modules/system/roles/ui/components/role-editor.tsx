"use client";

import { useState, useMemo } from "react";
import { Check, Copy, Trash2 } from "lucide-react";
import { Badge, Button, Input, Textarea, Card, CardContent, CardHeader, CardTitle } from "@cloud/ui";
import type { Role } from "@/modules/system/roles/server/roles.public";
import type { User } from "@/modules/system/users/server/users.public";
import type { PermissionGroup } from "@/lib/permission-catalog";
import { relTime } from "@/lib/ui-format";
import { ConfirmModal } from "@/lib/confirm-modal";
import { PermissionsCard } from "./permissions-card";

type RoleEditorProps = {
  role: Role;
  users: User[];
  permissionGroups: PermissionGroup[];
  onSave: (r: Role) => Promise<boolean>;
  onDuplicate: () => void;
  onDelete: () => Promise<boolean>;
};

export function RoleEditor({ role, users, permissionGroups, onSave, onDuplicate, onDelete }: RoleEditorProps) {
  const [draft, setDraft] = useState(role);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset draft when selected role changes
  const roleKey = role.id;
  const [prevKey, setPrevKey] = useState(roleKey);
  if (roleKey !== prevKey) {
    setPrevKey(roleKey);
    setDraft(role);
  }

  // 只比可编辑字段（name/description/permissions，权限顺序无关）；忽略服务端元数据
  // （updatedAt/updatedBy 保存后会变），否则保存成功也会一直判定为"脏"、按钮卡在 Save changes。
  const dirty = useMemo(() => {
    if (draft.name !== role.name || draft.description !== role.description) return true;
    const a = [...draft.permissions].sort();
    const b = [...role.permissions].sort();
    return a.length !== b.length || a.some((code, i) => code !== b[i]);
  }, [draft, role]);
  const assignedUsers = users.filter((u) => u.roleIds.includes(role.id));
  const locked = role.builtin || saving; // builtin 不可编辑；保存期间锁住属性

  async function save() {
    setSaving(true);
    try {
      await onSave(draft); // 成功后父层刷新 role → dirty 变 false → 按钮显示 Saved；失败 role 不变 → 仍 Save changes
    } finally {
      setSaving(false);
    }
  }

  // 单项切换：勾选加码、取消去码（无 require 链式联动）。
  function togglePerm(code: string) {
    const has = draft.permissions.includes(code);
    setDraft({
      ...draft,
      permissions: has ? draft.permissions.filter((c) => c !== code) : [...draft.permissions, code],
    });
  }

  // 整组授予/撤销：对该组全部码做并集/差集。
  function toggleGroup(menuCode: string, grant: boolean) {
    const group = permissionGroups.find((g) => g.menuCode === menuCode);
    if (!group) return;
    const set = new Set(draft.permissions);
    for (const it of group.items) {
      if (grant) set.add(it.code);
      else set.delete(it.code);
    }
    setDraft({ ...draft, permissions: [...set] });
  }

  return (
    <div>
      <div className="border-b border-line-subtle py-4 px-5">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="max-w-sm" aria-label="Role name" disabled={locked} />
            <div className="flex items-center flex-wrap gap-2 mt-2 text-xs text-content-tertiary">
              <span>{role.operatorCount} operators assigned</span>
              <span className="opacity-50">·</span>
              {role.builtin && <Badge tone="neutral">SYSTEM</Badge>}
            </div>
            <div className="text-xs text-content-tertiary mt-0.5">
              Updated {relTime(role.updatedAt)} by {role.updatedBy}
            </div>
          </div>
          <div className="flex items-center shrink-0 gap-1.5">
            <Button variant="ghost" size="sm" iconLeft={<Copy size={14} />} onClick={onDuplicate} disabled={saving}>Duplicate</Button>
            <Button variant="ghost-danger" size="sm" iconLeft={<Trash2 size={14} />}
              onClick={() => setConfirmDelete(true)} disabled={role.builtin || saving}>Delete</Button>
            <Button variant="primary" size="sm" loading={saving} disabled={!dirty || saving} onClick={save}
              iconLeft={dirty || saving ? undefined : <Check size={14} />}>
              {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
            </Button>
          </div>
        </div>
      </div>
      <div className="flex flex-col pt-4 px-5 pb-6 gap-5">
        <PermissionsCard key={role.id} groups={permissionGroups} permissions={draft.permissions}
          onTogglePerm={togglePerm} onToggleGroup={toggleGroup} disabled={locked} />

        <Card>
          <CardHeader><CardTitle>Description</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              rows={3} disabled={locked} />
            <p className="text-xs text-content-tertiary mt-2">Shown when assigning this role to an operator.</p>
          </CardContent>
        </Card>

        {assignedUsers.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Assigned Users ({assignedUsers.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {assignedUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-2 text-md">
                    <span className="text-content-primary font-medium">{u.displayName || u.loginName}</span>
                    <span className="text-content-tertiary">{u.email}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <ConfirmModal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete role"
        onConfirm={onDelete} confirmLabel="Delete" loadingLabel="Deleting…" confirmVariant="danger">
        <p className="text-md text-content-secondary">
          Are you sure you want to delete <strong>{role.name}</strong>? This action cannot be undone.
        </p>
      </ConfirmModal>
    </div>
  );
}
