"use client";

import { useState, useMemo } from "react";
import { Search, Plus } from "lucide-react";
import { toastError } from "@cloud/request/error-toast";
import { Button, Card, Input, Modal, PageBody, PageHeader, Toggle, ToggleGroup, toast } from "@cloud/ui";
import {
  cancelUserInvite,
  createUser as createUserApi,
  listUser,
  lockUser,
  regenerateUserInvite,
  resendUserInvite,
  resetUserPassword,
  setUserInviteRoles,
  updateUser,
} from "@/service/users/api";
import type { Role, User } from "@/app/(portal)/system/_shared/types";
import { UserListItem } from "./user-list-item";
import { UserDetail } from "./user-detail";
import { PendingInviteDetail } from "./pending-invite-detail";
import { NewUserModal } from "./new-user-modal";

type UsersPageProps = { initialUsers: User[]; initialRoles: Role[]; currentUserId: string; portalBaseUrl: string };
type StatusFilter = "all" | "active" | "inactive" | "pending";

export function UsersPage({ initialUsers, initialRoles, currentUserId, portalBaseUrl }: UsersPageProps) {
  const [users, setUsers] = useState(initialUsers);
  const roles = initialRoles;

  const [selectedId, setSelectedId] = useState<string | null>(initialUsers[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showNew, setShowNew] = useState(false);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

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

  async function refreshUsers() {
    const res = await listUser();
    setUsers(res.data);
    setSelectedId((current) =>
      current && res.data.some((u) => u.id === current) ? current : (res.data[0]?.id ?? null),
    );
  }

  async function update(next: User): Promise<boolean> {
    try {
      const res = await updateUser(next.id, {
        remark: next.remark,
        roleIds: next.roleIds,
      });
      setUsers((prev) => prev.map((u) => (u.id === next.id ? res.data : u)));
      toast.success("User saved");
      return true;
    } catch (err) {
      toastError(err);
      return false;
    }
  }

  async function updateInviteRoles(next: User): Promise<boolean> {
    try {
      const res = await setUserInviteRoles(next.id, { roleIds: next.roleIds });
      setUsers((prev) => prev.map((u) => (u.id === next.id ? res.data : u)));
      toast.success("Invitation updated");
      return true;
    } catch (err) {
      toastError(err);
      return false;
    }
  }

  async function createUser(draft: { email: string; roleIds: string[] }): Promise<boolean> {
    try {
      const res = await createUserApi(draft);
      setUsers((prev) => [res.data, ...prev]);
      setSelectedId(res.data.id);
      setShowNew(false);
      toast.success("Invitation sent");
      return true;
    } catch (err) {
      toastError(err);
      // createInvite may have persisted before mail enqueue failed; refresh exposes the pending invite.
      void refreshUsers().catch(() => undefined);
      return false;
    }
  }

  async function toggleLock(user: User): Promise<boolean> {
    try {
      const res = await lockUser(user.id);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? res.data : u)));
      toast.success(user.status === "INACTIVE" ? "User enabled" : "User disabled");
      return true;
    } catch (err) {
      toastError(err);
      return false;
    }
  }

  async function resetPassword(user: User): Promise<boolean> {
    try {
      const res = await resetUserPassword(user.id);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? res.data : u)));
      toast.success("Password reset link sent");
      return true;
    } catch (err) {
      toastError(err);
      return false;
    }
  }

  async function cancelInvite(userId: string): Promise<boolean> {
    try {
      await cancelUserInvite(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      if (selectedId === userId) setSelectedId(null);
      toast.success("Invitation cancelled");
      return true;
    } catch (err) {
      toastError(err);
      return false;
    }
  }

  async function resendInvite(user: User): Promise<boolean> {
    try {
      const res = await resendUserInvite(user.id);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? res.data : u)));
      toast.success("Invitation resent");
      return true;
    } catch (err) {
      toastError(err);
      return false;
    }
  }

  async function regenerateInvite(user: User): Promise<boolean> {
    try {
      const res = await regenerateUserInvite(user.id);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? res.data : u)));
      toast.success("Invitation regenerated");
      return true;
    } catch (err) {
      toastError(err);
      return false;
    }
  }

  // Expired invite → re-send by re-creating (backend overwrites the expired row for the same email).
  async function reinviteExpired(user: User): Promise<boolean> {
    try {
      const res = await createUserApi({ email: user.inviteEmail ?? user.email, roleIds: user.roleIds });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? res.data : u)));
      setSelectedId(res.data.id);
      toast.success("Invitation re-sent");
      return true;
    } catch (err) {
      toastError(err);
      void refreshUsers().catch(() => undefined);
      return false;
    }
  }

  function requestCancel(userId: string) {
    setConfirmCancelId(userId);
  }

  async function confirmCancelInvite() {
    if (!confirmCancelId) return;
    setCancelling(true);
    const ok = await cancelInvite(confirmCancelId);
    setCancelling(false);
    if (ok) setConfirmCancelId(null);
  }

  const statItems: { label: string; value: number; colorClass: string; filterKey: StatusFilter }[] = [
    { label: "Total", value: stats.total, colorClass: "", filterKey: "all" },
    { label: "Active", value: stats.active, colorClass: "text-success-strong", filterKey: "active" },
    { label: "Pending", value: stats.pending, colorClass: stats.pending ? "text-warning-strong" : "", filterKey: "pending" },
    { label: "Disabled", value: stats.inactive, colorClass: stats.inactive ? "text-error-strong" : "", filterKey: "inactive" },
  ];

  return (
    <>
      <PageHeader
        title="Users"
        description="Carbon platform staff accounts. Roles are picked from System → Roles."
        actions={
          <Button variant="primary" iconLeft={<Plus className="size-4" />} onClick={() => setShowNew(true)}>
            New user
          </Button>
        }
      />
      <PageBody>
        {/* Status quick-filter tiles: selectable surfaces (§3.4) — ToggleGroup
            owns the single-select, each tile lights primary when pressed. */}
        <ToggleGroup
          type="single"
          variant="plain"
          value={statusFilter}
          onValueChange={(v) => setStatusFilter((v ?? "all") as StatusFilter)}
          className="grid grid-cols-4 gap-3"
        >
          {statItems.map((s) => (
            <Toggle
              key={s.filterKey}
              value={s.filterKey}
              size="auto"
              className="flex flex-col items-start gap-0 rounded-xl border border-line-default bg-surface-2 px-4 py-4 text-left shadow-1 data-pressed:border-primary-500 data-pressed:bg-primary-50 data-pressed:ring-2 data-pressed:ring-primary-500/10 data-pressed:hover:bg-primary-50"
            >
              <span className="text-xs text-content-tertiary">{s.label}</span>
              <span className={`mt-1 text-2xl font-semibold tabular-nums ${s.colorClass}`}>{s.value}</span>
            </Toggle>
          ))}
        </ToggleGroup>

        <div className="flex items-start gap-4">
          <Card className="sticky top-6 self-start w-90 shrink-0">
            <div className="border-b border-line-subtle p-3">
              <Input prefix={<Search className="size-4" />} placeholder="Search by name, login or email…" value={query}
                onChange={(e) => setQuery(e.target.value)} inputSize="md" />
            </div>
            <div className="flex max-h-dvh-9rem flex-col overflow-auto">
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
            </div>
          </Card>
          <Card className="min-w-0 flex-1">
            {selected ? (
              selected.status === "PENDING" ? (
                <PendingInviteDetail user={selected} roles={roles} portalBaseUrl={portalBaseUrl}
                  onResend={() => resendInvite(selected)}
                  onRegenerate={() => regenerateInvite(selected)}
                  onReinvite={() => reinviteExpired(selected)}
                  onCancel={() => requestCancel(selected.id)} onSave={updateInviteRoles} />
              ) : (
                <UserDetail user={selected} users={users} roles={roles} currentUserId={currentUserId} onSave={update}
                  onResetPassword={() => resetPassword(selected)} onToggleLock={() => toggleLock(selected)} />
              )
            ) : (
              <div className="py-12 text-center text-sm text-content-tertiary">
                Select a user.
              </div>
            )}
          </Card>
        </div>
      </PageBody>
      <NewUserModal open={showNew} onClose={() => setShowNew(false)} onCreate={createUser} users={users} roles={roles} />

      {/* Cancel invite confirmation */}
      <Modal open={!!confirmCancelId} onClose={() => { if (!cancelling) setConfirmCancelId(null); }} title="Cancel invitation?"
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" disabled={cancelling} onClick={() => setConfirmCancelId(null)}>Keep invitation</Button>
          <Button variant="danger" loading={cancelling} onClick={confirmCancelInvite}>Cancel invitation</Button>
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
