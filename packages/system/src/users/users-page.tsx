"use client";

import { useState, useMemo } from "react";
import { Search, Plus } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@cloud/request/error-toast";
import { Button, Input, Modal, SplitPanel, SplitPanelSidebar, SplitPanelContent } from "@cloud/ui";
import { request } from "@cloud/request/client";
import type { Role, User } from "../types";
import { UserListItem } from "./user-list-item";
import { UserDetail } from "./user-detail";
import { PendingInviteDetail } from "./pending-invite-detail";
import { NewUserModal } from "./new-user-modal";

const API = "/api/system/users";

type UsersPageProps = { initialUsers: User[]; initialRoles: Role[] };
type StatusFilter = "all" | "active" | "inactive" | "pending";

export function UsersPage({ initialUsers, initialRoles }: UsersPageProps) {
  const [users, setUsers] = useState(initialUsers);
  const roles = initialRoles;

  const [selectedId, setSelectedId] = useState<string | null>(initialUsers[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showNew, setShowNew] = useState(false);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((u) => u.status === "ACTIVE").length,
    inactive: users.filter((u) => u.status === "INACTIVE").length,
    pending: users.filter((u) => u.status === "PENDING").length,
  }), [users]);

  const filtered = useMemo(() => {
    let list = users;
    if (statusFilter !== "all") {
      list = list.filter((u) => u.status === statusFilter.toUpperCase());
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((u) =>
        u.loginName.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) || (u.inviteEmail ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [users, statusFilter, query]);

  const selected = users.find((u) => u.id === selectedId) ?? null;
  const cancelTarget = confirmCancelId ? users.find((u) => u.id === confirmCancelId) : null;

  async function update(next: User) {
    try {
      const res = await request.put<User>(`${API}/${next.id}`, {
        displayName: next.displayName,
        remark: next.remark,
        roleIds: next.roleIds,
      });
      setUsers((prev) => prev.map((u) => (u.id === next.id ? res.data : u)));
      toast.success("User saved");
    } catch (err) {
      toastError(err);
    }
  }

  async function createUser(draft: { email: string; roleIds: string[]; remark: string }) {
    try {
      const res = await request.post<User>(API, draft);
      setUsers((prev) => [res.data, ...prev]);
      setSelectedId(res.data.id);
      setShowNew(false);
      toast.success("Invitation sent");
    } catch (err) {
      toastError(err);
    }
  }

  async function toggleLock(user: User) {
    try {
      const res = await request.post<User>(`${API}/${user.id}/lock`);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? res.data : u)));
      toast.success(user.status === "INACTIVE" ? "User enabled" : "User disabled");
    } catch (err) {
      toastError(err);
    }
  }

  async function resetPassword(user: User) {
    try {
      const res = await request.post<User>(`${API}/${user.id}/reset-password`);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? res.data : u)));
      toast.success("Password reset link sent");
    } catch (err) {
      toastError(err);
    }
  }

  async function cancelInvite(userId: string) {
    try {
      await request.post(`${API}/${userId}/cancel-invite`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      if (selectedId === userId) setSelectedId(null);
      toast.success("Invitation cancelled");
    } catch (err) {
      toastError(err);
    }
  }

  async function resendInvite(user: User) {
    try {
      const res = await request.post<User>(`${API}/${user.id}/resend-invite`);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? res.data : u)));
      toast.success("Invitation resent");
    } catch (err) {
      toastError(err);
    }
  }

  function requestCancel(userId: string) {
    setConfirmCancelId(userId);
  }

  function confirmCancelInvite() {
    if (confirmCancelId) {
      cancelInvite(confirmCancelId);
      setConfirmCancelId(null);
    }
  }

  const statItems: { label: string; value: number; color: string | undefined; filterKey: StatusFilter }[] = [
    { label: "Total", value: stats.total, color: undefined, filterKey: "all" },
    { label: "Active", value: stats.active, color: "var(--color-success-700)", filterKey: "active" },
    { label: "Pending", value: stats.pending, color: stats.pending ? "var(--color-warning-700)" : undefined, filterKey: "pending" },
    { label: "Disabled", value: stats.inactive, color: stats.inactive ? "var(--color-error-700)" : undefined, filterKey: "inactive" },
  ];

  return (
    <>
      <div>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-content-primary mb-1">Users</h1>
            <p className="text-sm text-content-secondary">
              Carbon platform staff accounts. Roles are picked from <strong>System → Roles</strong>.
            </p>
          </div>
          <Button variant="primary" size="sm" iconLeft={<Plus size={14} />} onClick={() => setShowNew(true)}>
            New user
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-3.5 mb-5">
          {statItems.map((s) => {
            const isActive = statusFilter === s.filterKey;
            return (
              <button key={s.label} type="button"
                className={`text-left bg-surface-2 border rounded-xl shadow-sm px-4 py-4 transition-colors cursor-pointer ${isActive ? "border-primary ring-1 ring-primary/30" : "border-line-default hover:border-line-hover"}`}
                onClick={() => setStatusFilter(isActive ? "all" : s.filterKey)}>
                <div className="text-xs text-content-tertiary">{s.label}</div>
                <div className="text-2xl font-semibold mt-1 tabular-nums" style={s.color ? { color: s.color } : undefined}>
                  {s.value}
                </div>
              </button>
            );
          })}
        </div>

        <SplitPanel sidebarWidth={360}>
          <SplitPanelSidebar header={
            <div className="p-2.5">
              <Input prefix={<Search size={13} />} placeholder="Search by name, login or email…" value={query}
                onChange={(e) => setQuery(e.target.value)} inputSize="sm" />
            </div>
          }>
            {filtered.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-content-tertiary">
                {query ? `No users match "${query}"` : "No users in this filter."}
              </div>
            )}
            {filtered.map((u) => (
              <UserListItem key={u.id} user={u} active={u.id === selectedId}
                onClick={() => setSelectedId(u.id)}
                onResend={() => resendInvite(u)}
                onCancel={() => requestCancel(u.id)} />
            ))}
          </SplitPanelSidebar>
          <SplitPanelContent empty="Select a user.">
            {selected ? (
              selected.status === "PENDING" ? (
                <PendingInviteDetail user={selected} roles={roles}
                  onResend={() => resendInvite(selected)} onCancel={() => requestCancel(selected.id)} onSave={update} />
              ) : (
                <UserDetail user={selected} users={users} roles={roles} onSave={update}
                  onResetPassword={() => resetPassword(selected)} onToggleLock={() => toggleLock(selected)} />
              )
            ) : null}
          </SplitPanelContent>
        </SplitPanel>
      </div>
      <NewUserModal open={showNew} onClose={() => setShowNew(false)} onCreate={createUser} users={users} roles={roles} />

      {/* Cancel invite confirmation */}
      <Modal open={!!confirmCancelId} onClose={() => setConfirmCancelId(null)} title="Cancel invitation?"
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setConfirmCancelId(null)}>Keep invitation</Button>
          <Button variant="destructive" onClick={confirmCancelInvite}>Cancel invitation</Button>
        </div>}>
        <p className="text-sm text-content-secondary">
          This will permanently remove the pending invitation for{" "}
          <strong>{cancelTarget?.inviteEmail ?? cancelTarget?.email}</strong>.
          Pre-assigned roles will be discarded.
        </p>
      </Modal>
    </>
  );
}
