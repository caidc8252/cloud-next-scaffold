"use client";

import { useState, useMemo } from "react";
import { Search, Plus } from "lucide-react";
import { Button, Input } from "@cloud/ui";
import type { Role, User } from "../types";
import { SEED_USERS } from "../mock/seed-users";
import { SEED_ROLES } from "../mock/seed-roles";
import { UserListItem } from "./user-list-item";
import { UserDetail } from "./user-detail";
import { PendingInviteDetail } from "./pending-invite-detail";
import { NewUserModal } from "./new-user-modal";

type UsersPageProps = { users?: User[]; setUsers?: (users: User[]) => void; roles?: Role[] };
type StatusFilter = "all" | "active" | "locked" | "pending";

export function UsersPage({ users: propUsers, setUsers: propSetUsers, roles: propRoles }: UsersPageProps) {
  const [localUsers, setLocalUsers] = useState(SEED_USERS);
  const users = propUsers ?? localUsers;
  const setUsers = propSetUsers ?? setLocalUsers;
  const roles = propRoles ?? SEED_ROLES;

  const [selectedId, setSelectedId] = useState<string | null>(users[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showNew, setShowNew] = useState(false);

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((u) => u.status === "ACTIVE").length,
    locked: users.filter((u) => u.status === "LOCKED").length,
    pending: users.filter((u) => u.status === "PENDING").length,
  }), [users]);

  const filtered = useMemo(() => {
    let list = users;
    if (statusFilter !== "all") list = list.filter((u) => u.status === statusFilter.toUpperCase());
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((u) =>
        u.loginName.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) || (u.inviteEmail ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [users, statusFilter, query]);

  const selected = users.find((u) => u.id === selectedId) ?? null;

  function update(next: User) {
    setUsers(users.map((u) => (u.id === next.id ? { ...next, updatedAt: new Date().toISOString() } : u)));
  }

  function createUser(draft: { email: string; roleIds: string[]; remark: string; mode: "direct" | "invite"; loginName?: string; displayName?: string; tempPassword?: string }) {
    if (draft.mode === "direct") {
      const newUser: User = {
        id: `u-${Math.random().toString(36).slice(2, 7)}`, loginName: draft.loginName ?? "", displayName: draft.displayName ?? "",
        email: draft.email, country: "", status: "ACTIVE", lastLoginAt: null, passwordChangedTimestamp: Date.now(),
        passwordErrorTimes: 0, passwordChangeTimes: 0, passwordErrorLockExpiredTimestamp: null,
        passwordUpdatedAt: new Date().toISOString(), remark: draft.remark, createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(), authorizingType: "NORMAL", roleIds: draft.roleIds, passwordHistory: [],
      };
      setUsers([...users, newUser]);
      setSelectedId(newUser.id);
    } else {
      const newUser: User = {
        id: `u-inv-${Math.random().toString(36).slice(2, 7)}`, loginName: "", displayName: "", email: "", country: "",
        status: "PENDING", lastLoginAt: null, passwordChangedTimestamp: 0, passwordErrorTimes: 0, passwordChangeTimes: 0,
        passwordErrorLockExpiredTimestamp: null, passwordUpdatedAt: null, remark: draft.remark,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), authorizingType: "NORMAL",
        roleIds: draft.roleIds, passwordHistory: [], invitedAt: new Date().toISOString(), invitedBy: "admin",
        inviteExpiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
        inviteToken: `inv-${Math.random().toString(36).slice(2, 10)}`, inviteEmail: draft.email,
      };
      setUsers([...users, newUser]);
      setSelectedId(newUser.id);
    }
    setShowNew(false);
  }

  function toggleLock(user: User) {
    const next: User = user.status === "LOCKED"
      ? { ...user, status: "ACTIVE", passwordErrorTimes: 0, passwordErrorLockExpiredTimestamp: null }
      : { ...user, status: "LOCKED", passwordErrorLockExpiredTimestamp: Date.now() + 30 * 60_000 };
    update(next);
  }

  function resetPassword(user: User) {
    update({ ...user, passwordChangedTimestamp: Date.now(), passwordChangeTimes: user.passwordChangeTimes + 1,
      passwordUpdatedAt: new Date().toISOString(), passwordErrorTimes: 0,
      passwordHistory: [{ hashId: `ph-${Math.random().toString(36).slice(2, 6)}`, changedAt: new Date().toISOString() }, ...user.passwordHistory] });
  }

  function cancelInvite(userId: string) {
    setUsers(users.filter((u) => u.id !== userId));
    if (selectedId === userId) setSelectedId(null);
  }

  function resendInvite(user: User) {
    update({ ...user, invitedAt: new Date().toISOString(), inviteExpiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString() });
  }

  return (
    <>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-content-primary">Users</h1>
          <p className="text-sm text-content-secondary mt-1">Manage platform staff accounts and their role assignments.</p>
        </div>

        <div className="flex gap-0 border border-line-default rounded-lg overflow-hidden" style={{ height: "calc(100vh - 180px)" }}>
          <div className="w-[320px] shrink-0 border-r border-line-default flex flex-col bg-surface-1">
            <div className="p-3 space-y-2 border-b border-line-subtle">
              <Input prefix={<Search size={14} />} placeholder="Search users…" value={query}
                onChange={(e) => setQuery(e.target.value)} inputSize="sm" />
              <div className="flex gap-1">
                {([["all", `All (${stats.total})`], ["active", `Active (${stats.active})`],
                  ["locked", `Locked (${stats.locked})`], ["pending", `Pending (${stats.pending})`]] as const).map(([key, label]) => (
                  <Button key={key} variant={statusFilter === key ? "secondary" : "ghost"} size="xs"
                    onClick={() => setStatusFilter(key)}>{label}</Button>
                ))}
              </div>
              <Button variant="primary" size="sm" block onClick={() => setShowNew(true)} iconLeft={<Plus size={14} />}>New user</Button>
            </div>
            <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
              {filtered.map((u) => (
                <UserListItem key={u.id} user={u} active={u.id === selectedId} onClick={() => setSelectedId(u.id)} />
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto bg-surface-1">
            {selected ? (
              selected.status === "PENDING" ? (
                <PendingInviteDetail user={selected} roles={roles} onResend={() => resendInvite(selected)} onCancel={() => cancelInvite(selected.id)} />
              ) : (
                <UserDetail user={selected} roles={roles} onSave={update}
                  onResetPassword={() => resetPassword(selected)} onToggleLock={() => toggleLock(selected)} />
              )
            ) : (
              <div className="flex items-center justify-center h-full text-content-tertiary text-sm">Select a user to view details</div>
            )}
          </div>
        </div>
      </div>
      <NewUserModal open={showNew} onClose={() => setShowNew(false)} onCreate={createUser} users={users} roles={roles} />
    </>
  );
}
