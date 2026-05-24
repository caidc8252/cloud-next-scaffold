"use client";

import { useState, useMemo } from "react";
import { Search, Plus } from "lucide-react";
import { Button, Input } from "@cloud/ui";
import type { Role, User } from "../types";
import { SEED_ROLES } from "../mock";
import { RoleListItem } from "./role-list-item";
import { RoleEditor } from "./role-editor";
import { NewRoleModal } from "./new-role-modal";

type RolesPanelProps = {
  roles?: Role[];
  setRoles?: (roles: Role[]) => void;
  users?: User[];
};

export function RolesPanel({ roles: propRoles, setRoles: propSetRoles, users = [] }: RolesPanelProps) {
  const [localRoles, setLocalRoles] = useState(SEED_ROLES);
  const roles = propRoles ?? localRoles;
  const setRoles = propSetRoles ?? setLocalRoles;

  const [selectedId, setSelectedId] = useState<string | null>(roles[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [showNew, setShowNew] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return roles;
    const q = query.toLowerCase();
    return roles.filter((r) => r.name.toLowerCase().includes(q));
  }, [roles, query]);

  const selected = roles.find((r) => r.id === selectedId) ?? null;

  function update(next: Role) {
    setRoles(roles.map((r) => (r.id === next.id ? { ...next, updatedAt: new Date().toISOString(), updatedBy: "admin@carbon" } : r)));
  }

  function createRole(draft: { name: string; description: string; baseId: string | null }) {
    const base = draft.baseId ? roles.find((r) => r.id === draft.baseId) : null;
    const newRole: Role = {
      id: `r-${Math.random().toString(36).slice(2, 7)}`,
      name: draft.name,
      description: draft.description,
      builtin: false,
      operatorCount: 0,
      roleType: "global",
      contractDefineCode: "ADMIN",
      permissions: base ? [...base.permissions] : [],
      updatedAt: new Date().toISOString(),
      updatedBy: "admin@carbon",
    };
    setRoles([...roles, newRole]);
    setSelectedId(newRole.id);
    setShowNew(false);
  }

  function deleteRole(id: string) {
    const next = roles.filter((r) => r.id !== id);
    setRoles(next);
    setSelectedId(next[0]?.id ?? null);
  }

  function duplicate(r: Role) {
    const newRole: Role = {
      ...r,
      id: `r-${Math.random().toString(36).slice(2, 7)}`,
      name: `${r.name} (copy)`,
      builtin: false,
      operatorCount: 0,
      updatedAt: new Date().toISOString(),
      updatedBy: "admin@carbon",
    };
    setRoles([...roles, newRole]);
    setSelectedId(newRole.id);
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 18, alignItems: "start" }}>
        <div className="bg-surface-2 border border-line-default rounded-xl shadow-sm overflow-hidden sticky top-4">
          <div className="flex gap-2 p-2.5 border-b border-line-subtle">
            <Input prefix={<Search size={14} />} placeholder="Search roles..." value={query}
              onChange={(e) => setQuery(e.target.value)} inputSize="sm" className="flex-1" />
            <Button variant="primary" size="sm" onClick={() => setShowNew(true)} iconLeft={<Plus size={14} />}>
              New role
            </Button>
          </div>
          <div className="flex flex-col max-h-[calc(100vh-240px)] overflow-auto">
            {filtered.map((r) => (
              <RoleListItem key={r.id} role={r} active={r.id === selectedId} onClick={() => setSelectedId(r.id)} />
            ))}
          </div>
        </div>
        <div className="bg-surface-2 border border-line-default rounded-xl shadow-sm overflow-hidden">
          {selected ? (
            <RoleEditor role={selected} users={users} onSave={update}
              onDuplicate={() => duplicate(selected)} onDelete={() => deleteRole(selected.id)} />
          ) : (
            <div className="flex items-center justify-center h-64 text-content-tertiary text-sm">Select a role to edit</div>
          )}
        </div>
      </div>
      <NewRoleModal open={showNew} onClose={() => setShowNew(false)} onCreate={createRole} allRoles={roles} />
    </>
  );
}
