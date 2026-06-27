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
  PageBody,
  PageHeader,
  toast,
} from "@cloud/ui";
import { createRole as createRoleApi, deleteRole as deleteRoleApi, updateRole } from "@/service/roles/api";
import type { Role, User, PermissionGroup } from "@/app/(dashboard)/system/_shared/types";
import { RoleListItem } from "./role-list-item";
import { RoleEditor } from "./role-editor";
import { NewRoleModal } from "./new-role-modal";
import { DuplicateRoleModal } from "./duplicate-role-modal";

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

  async function update(next: Role): Promise<boolean> {
    try {
      const res = await updateRole(next.id, {
        name: next.name,
        description: next.description,
        permissions: next.permissions,
      });
      setRoles((prev) => prev.map((r) => (r.id === next.id ? res.data : r)));
      toast.success("Role saved");
      return true;
    } catch (err) {
      toastError(err);
      return false;
    }
  }

  async function createRole(draft: { name: string; description: string; baseId: string | null }): Promise<boolean> {
    const base = draft.baseId ? roles.find((r) => r.id === draft.baseId) : null;
    try {
      const res = await createRoleApi({
        name: draft.name,
        description: draft.description,
        permissions: base ? base.permissions : [],
      });
      setRoles((prev) => [...prev, res.data]);
      setSelectedId(res.data.id);
      setShowNew(false);
      toast.success(`Role "${draft.name}" created`);
      return true;
    } catch (err) {
      toastError(err);
      return false;
    }
  }

  async function deleteRole(id: string): Promise<boolean> {
    try {
      await deleteRoleApi(id);
      setRoles((prev) => {
        const next = prev.filter((r) => r.id !== id);
        setSelectedId(next[0]?.id ?? null);
        return next;
      });
      toast.success("Role deleted");
      return true;
    } catch (err) {
      toastError(err);
      return false;
    }
  }

  async function duplicate(source: Role, newName: string): Promise<boolean> {
    try {
      const res = await createRoleApi({
        name: newName,
        description: source.description,
        permissions: source.permissions,
      });
      setRoles((prev) => [...prev, res.data]);
      setSelectedId(res.data.id);
      setDuplicateSource(null);
      toast.success(`Role duplicated as "${newName}"`);
      return true;
    } catch (err) {
      toastError(err);
      return false;
    }
  }

  return (
    <>
      <PageHeader
        title="Roles"
        description="Carbon platform roles — assignable only to Carbon staff. All roles here are bound to the ADMIN contract."
        actions={
          <Button variant="primary" iconLeft={<Plus className="size-4" />} onClick={() => setShowNew(true)}>
            New role
          </Button>
        }
      />
      <PageBody>
        <Alert variant="info">
          <Shield size={14} />
          <AlertDescription>
            <strong>Internal scope.</strong> These roles are not visible to customer operators.
            They govern access to the Carbon admin platform itself — managing other staff users,
            platform-wide notifications, API keys, and global audit.
          </AlertDescription>
        </Alert>
        <div className="flex items-start gap-4">
          <Card className="sticky top-6 self-start w-80 shrink-0">
            <div className="border-b border-line-subtle p-3">
              <Input prefix={<Search className="size-4" />} placeholder="Search roles..." value={query}
                onChange={(e) => setQuery(e.target.value)} inputSize="md" />
            </div>
            <div className="flex max-h-dvh-9rem flex-col overflow-auto">
              {filtered.map((r) => (
                <RoleListItem key={r.id} role={r} active={r.id === selectedId} onClick={() => setSelectedId(r.id)} />
              ))}
            </div>
          </Card>
          <Card className="min-w-0 flex-1">
            {selected ? (
              <RoleEditor role={selected} users={users} permissionGroups={permissionGroups} onSave={update}
                onDuplicate={() => setDuplicateSource(selected)} onDelete={() => deleteRole(selected.id)} />
            ) : (
              <div className="py-12 text-center text-md text-content-tertiary">
                Select a role to edit
              </div>
            )}
          </Card>
        </div>
      </PageBody>
      <NewRoleModal open={showNew} onClose={() => setShowNew(false)} onCreate={createRole} allRoles={roles} />
      <DuplicateRoleModal source={duplicateSource} onClose={() => setDuplicateSource(null)}
        onDuplicate={(name) => (duplicateSource ? duplicate(duplicateSource, name) : Promise.resolve(false))} />
    </>
  );
}
