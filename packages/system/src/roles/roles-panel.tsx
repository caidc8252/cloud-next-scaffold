"use client";

import { useState, useMemo } from "react";
import { Search, Plus } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@cloud/request/error-toast";
import { Button, Input, SplitPanel, SplitPanelSidebar, SplitPanelContent } from "@cloud/ui";
import { request } from "@cloud/request/client";
import type { Role, User } from "../types";
import { RoleListItem } from "./role-list-item";
import { RoleEditor } from "./role-editor";
import { NewRoleModal } from "./new-role-modal";

const API_BASE = "/api/system/roles";

type RolesPanelProps = {
  initialRoles: Role[];
  users?: User[];
};

export function RolesPanel({ initialRoles, users = [] }: RolesPanelProps) {
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [selectedId, setSelectedId] = useState<string | null>(initialRoles[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [showNew, setShowNew] = useState(false);

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

  async function duplicate(r: Role) {
    try {
      const res = await request.post<Role>(API_BASE, {
        name: `${r.name} (copy)`,
        description: r.description,
        permissions: r.permissions,
      });
      setRoles((prev) => [...prev, res.data]);
      setSelectedId(res.data.id);
      toast.success(`Role duplicated as "${r.name} (copy)"`);
    } catch (err) {
      toastError(err);
    }
  }

  return (
    <>
      <SplitPanel>
        <SplitPanelSidebar header={
          <div className="flex gap-2 p-2.5">
            <Input prefix={<Search size={14} />} placeholder="Search roles..." value={query}
              onChange={(e) => setQuery(e.target.value)} inputSize="sm" className="flex-1" />
            <Button variant="primary" size="sm" onClick={() => setShowNew(true)} iconLeft={<Plus size={14} />}>
              New role
            </Button>
          </div>
        }>
          {filtered.map((r) => (
            <RoleListItem key={r.id} role={r} active={r.id === selectedId} onClick={() => setSelectedId(r.id)} />
          ))}
        </SplitPanelSidebar>
        <SplitPanelContent empty="Select a role to edit">
          {selected ? (
            <RoleEditor role={selected} users={users} onSave={update}
              onDuplicate={() => duplicate(selected)} onDelete={() => deleteRole(selected.id)} />
          ) : null}
        </SplitPanelContent>
      </SplitPanel>
      <NewRoleModal open={showNew} onClose={() => setShowNew(false)} onCreate={createRole} allRoles={roles} />
    </>
  );
}
