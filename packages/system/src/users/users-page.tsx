"use client";

import { useState, useMemo } from "react";
import { Search, Plus } from "lucide-react";
import { Button, Input, SplitPanel, SplitPanelSidebar, SplitPanelContent } from "@cloud/ui";
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

  function update(next: User) {
    setUsers(users.map((u) => (u.id === next.id ? { ...next, updatedAt: new Date().toISOString() } : u)));
  }

  function createUser(draft: { email: string; roleIds: string[]; remark: string }) {
    const id = `u-inv-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    const newUser: User = {
      id, loginName: "", displayName: "", email: draft.email, country: "",
      status: "PENDING", lastLoginAt: null, passwordChangedTimestamp: 0,
      passwordErrorTimes: 0, passwordChangeTimes: 0, passwordErrorLockExpiredTimestamp: null,
      passwordUpdatedAt: null, remark: draft.remark, createdAt: now, updatedAt: now,
      authorizingType: "NORMAL", roleIds: draft.roleIds, passwordHistory: [],
      invitedAt: now, invitedBy: "admin@carbon",
      inviteExpiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      inviteToken: id, inviteEmail: draft.email,
    };
    setUsers([newUser, ...users]);
    setSelectedId(newUser.id);
    setShowNew(false);
  }

  function toggleLock(user: User) {
    const next: User = user.status === "LOCKED"
      ? { ...user, status: "ACTIVE", passwordErrorTimes: 0, passwordErrorLockExpiredTimestamp: null }
      : { ...user, status: "LOCKED", passwordErrorLockExpiredTimestamp: Date.now() + 30 * 60_000 };
    update(next);
  }

  function resetPassword(user: User) {
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 72 * 3_600_000).toISOString();
    const prior = (user.passwordResetRequests ?? []).map((r) =>
      r.status === "pending" ? { ...r, status: "superseded" as const } : r,
    );
    update({
      ...user,
      passwordResetRequests: [
        { id: `prr-${Math.random().toString(36).slice(2, 7)}`, requestedAt: now, requestedBy: "admin@carbon", expiresAt, consumedAt: null, status: "pending" as const },
        ...prior,
      ].slice(0, 10),
    });
  }

  function cancelInvite(userId: string) {
    setUsers(users.filter((u) => u.id !== userId));
    if (selectedId === userId) setSelectedId(null);
  }

  function resendInvite(user: User) {
    update({ ...user, invitedAt: new Date().toISOString(), inviteExpiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString() });
  }

  const statItems = [
    { label: "Total", value: stats.total, color: undefined },
    { label: "Active", value: stats.active, color: "var(--color-success-700)" },
    { label: "Pending", value: stats.pending, color: stats.pending ? "var(--color-warning-700)" : undefined },
    { label: "Locked", value: stats.locked, color: stats.locked ? "var(--color-error-700)" : undefined },
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
          {statItems.map((s) => (
            <div key={s.label} className="bg-surface-2 border border-line-default rounded-xl shadow-sm px-4 py-4">
              <div className="text-xs text-content-tertiary">{s.label}</div>
              <div className="text-2xl font-semibold mt-1 tabular-nums" style={s.color ? { color: s.color } : undefined}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        <SplitPanel sidebarWidth={360}>
          <SplitPanelSidebar header={
            <div className="flex flex-col gap-2 p-2.5">
              <Input prefix={<Search size={13} />} placeholder="Search by name, login or email…" value={query}
                onChange={(e) => setQuery(e.target.value)} inputSize="sm" />
              <div className="flex gap-1 flex-wrap">
                {([
                  { key: "all" as const, label: "All", count: stats.total },
                  { key: "active" as const, label: "Active", count: stats.active },
                  { key: "pending" as const, label: "Pending", count: stats.pending },
                  { key: "locked" as const, label: "Locked", count: stats.locked },
                ] as const).map((f) => (
                  <button key={f.key} type="button"
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${statusFilter === f.key ? "bg-surface-3 text-content-primary" : "text-content-tertiary hover:text-content-secondary"}`}
                    onClick={() => setStatusFilter(f.key)}>
                    {f.label}<span className="text-content-tertiary">{f.count}</span>
                  </button>
                ))}
              </div>
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
                onCancel={() => cancelInvite(u.id)} />
            ))}
          </SplitPanelSidebar>
          <SplitPanelContent empty="Select a user.">
            {selected ? (
              selected.status === "PENDING" ? (
                <PendingInviteDetail user={selected} roles={roles}
                  onResend={() => resendInvite(selected)} onCancel={() => cancelInvite(selected.id)} />
              ) : (
                <UserDetail user={selected} users={users} roles={roles} onSave={update}
                  onResetPassword={() => resetPassword(selected)} onToggleLock={() => toggleLock(selected)} />
              )
            ) : null}
          </SplitPanelContent>
        </SplitPanel>
      </div>
      <NewUserModal open={showNew} onClose={() => setShowNew(false)} onCreate={createUser} users={users} roles={roles} />
    </>
  );
}
