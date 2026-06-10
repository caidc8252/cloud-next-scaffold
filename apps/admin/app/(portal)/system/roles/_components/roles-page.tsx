"use client";

import { useState, useMemo } from "react";
import { Search, Plus, Shield } from "lucide-react";
import { toastError } from "@cloud/request/error-toast";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  Input,
  toast,
} from "@cloud/ui";
import { request } from "@cloud/request/client";
import type { Role, User, PermissionGroup } from "@/app/(portal)/system/_shared/types";
import { RoleListItem } from "./role-list-item";
import { RoleEditor } from "./role-editor";
import { NewRoleModal } from "./new-role-modal";
import { DuplicateRoleModal } from "./duplicate-role-modal";

const API_BASE = "/api/system/roles";

type RolesPageProps = {
  initialRoles: Role[];
  users?: User[];
  permissionGroups: PermissionGroup[];
};

export function RolesPage({ initialRoles, users = [], permissionGroups }: RolesPageProps) {
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [selectedId, setSelectedId] = useState<string | null>(initialRoles[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [duplicateSource, setDuplicateSource] = useState<Role | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return roles;
    const q = query.toLowerCase();
    return roles.filter((r) => r.name.toLowerCase().includes(q));
  }, [roles, query]);

  const selected = roles.find((r) => r.id === selectedId) ?? null;

  async function update(next: Role) {
    try {
      const res = await request.put<Role>(`${API_BASE}/${next.id}`, {
        name: next.name,
        description: next.description,
        permissions: next.permissions,
      });
      setRoles((prev) => prev.map((r) => (r.id === next.id ? res.data : r)));
      toast.success("Role saved");
    } catch (err) {
      toastError(err);
    }
  }

  async function createRole(draft: { name: string; description: string; baseId: string | null }) {
    const base = draft.baseId ? roles.find((r) => r.id === draft.baseId) : null;
    try {
      const res = await request.post<Role>(API_BASE, {
        name: draft.name,
        description: draft.description,
        permissions: base ? base.permissions : [],
      });
      setRoles((prev) => [...prev, res.data]);
      setSelectedId(res.data.id);
      setShowNew(false);
      toast.success(`Role "${draft.name}" created`);
    } catch (err) {
      toastError(err);
    }
  }

  async function deleteRole(id: string) {
    try {
      await request.delete(`${API_BASE}/${id}`);
      setRoles((prev) => {
        const next = prev.filter((r) => r.id !== id);
        setSelectedId(next[0]?.id ?? null);
        return next;
      });
      toast.success("Role deleted");
    } catch (err) {
      toastError(err);
    }
  }

  async function duplicate(source: Role, newName: string) {
    try {
      const res = await request.post<Role>(API_BASE, {
        name: newName,
        description: source.description,
        permissions: source.permissions,
      });
      setRoles((prev) => [...prev, res.data]);
      setSelectedId(res.data.id);
      setDuplicateSource(null);
      toast.success(`Role duplicated as "${newName}"`);
    } catch (err) {
      toastError(err);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-content-primary mb-1">Roles</h1>
        <p className="text-sm text-content-secondary">
          Carbon platform roles — assignable only to Carbon staff (see <strong>System &rarr; Users</strong>).
          <span className="text-content-tertiary"> All roles here are bound to the <code className="font-mono text-xs">ADMIN</code> contract.</span>
        </p>
      </div>
      <div className="flex flex-col gap-3.5">
        <Alert variant="info">
          <Shield size={14} />
          <AlertDescription>
            <strong>Internal scope.</strong> These roles are not visible to customer operators.
            They govern access to the Carbon admin platform itself — managing other staff users,
            platform-wide notifications, API keys, and global audit.
          </AlertDescription>
        </Alert>
        <div className="flex items-start gap-4">
          <Card className="sticky top-4 w-[320px] shrink-0">
            <div className="flex gap-2 p-2.5 border-b border-line-subtle">
              <Input prefix={<Search size={14} />} placeholder="Search roles..." value={query}
                onChange={(e) => setQuery(e.target.value)} inputSize="sm" className="flex-1" />
              <Button variant="primary" size="sm" onClick={() => setShowNew(true)} iconLeft={<Plus size={14} />}>
                New role
              </Button>
            </div>
            <div className="flex flex-col overflow-auto max-h-[calc(100vh-240px)]">
              {filtered.map((r) => (
                <RoleListItem key={r.id} role={r} active={r.id === selectedId} onClick={() => setSelectedId(r.id)} />
              ))}
            </div>
          </Card>
          <Card className="flex-1 min-w-0">
            {selected ? (
              <RoleEditor role={selected} users={users} permissionGroups={permissionGroups} onSave={update}
                onDuplicate={() => setDuplicateSource(selected)} onDelete={() => deleteRole(selected.id)} />
            ) : (
              <div className="flex items-center justify-center h-64 text-content-tertiary text-sm">
                Select a role to edit
              </div>
            )}
          </Card>
        </div>
      </div>
      <NewRoleModal open={showNew} onClose={() => setShowNew(false)} onCreate={createRole} allRoles={roles} />
      <DuplicateRoleModal source={duplicateSource} onClose={() => setDuplicateSource(null)}
        onDuplicate={(name) => duplicateSource && duplicate(duplicateSource, name)} />
    </div>
  );
}
