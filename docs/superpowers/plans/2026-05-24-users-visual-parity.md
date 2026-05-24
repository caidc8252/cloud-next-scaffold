# Users Page Visual Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the Users page components to match the Carbon DEMO prototype (`admin-users.jsx`) pixel-for-pixel, restoring all missing features, layout patterns, and visual details.

**Architecture:** Replace current simplified Users UI (flat modal-based editing, dl-based display, single-panel flex layout) with the prototype's exact structure: grid layout with separate sidebar/detail cards, inline editable header with gradient avatar, 4-column password stat grid, inline role toggle, password history timeline, password policy reference, and password reset record display. Reuse `SplitPanel`/`SplitPanelSidebar`/`SplitPanelContent` from `@cloud/ui`. Use `Alert` for notice banners. All inline `fontSize` values use Tailwind approximations (text-xs/text-sm/text-base/text-xl).

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, `@cloud/ui` components, `lucide-react` icons

---

## File Structure

| File | Responsibility |
|------|---------------|
| Modify: `packages/system/src/mock/seed-users.ts` | Add `passwordResetRequests` to admin user |
| Modify: `packages/system/src/users/users-page.tsx` | Page header + stats bar + SplitPanel layout + "New user" in header |
| Rewrite: `packages/system/src/users/user-list-item.tsx` | 3-row list item: name + loginName + status/meta, gradient avatar, pending actions |
| Rewrite: `packages/system/src/users/user-detail.tsx` | Header with gradient avatar + inline edit + sub-info row, locked banner, password stat grid, profile form-grid, inline role toggles, password history timeline, password policy reference, reset record |
| Rewrite: `packages/system/src/users/pending-invite-detail.tsx` | Header with pending avatar, notice banner, invitation details kvgrid, pre-assigned roles list |
| Rewrite: `packages/system/src/users/new-user-modal.tsx` | Invite-only modal (remove Direct tab) matching prototype |
| Delete: `packages/system/src/users/edit-user-modal.tsx` | No longer needed — editing is inline in UserDetail |
| Delete: `packages/system/src/users/change-role-modal.tsx` | No longer needed — role toggle is inline in UserDetail |
| Modify: `packages/system/src/users/reset-password-modal.tsx` | Update to match prototype's reset confirmation copy |

## Key CSS Reference (from prototype `index.html`)

These are the exact prototype CSS values to match. Tailwind classes are used where possible; inline styles only for values without Tailwind equivalents (gradient backgrounds, specific oklch colors).

```
.pu-grid          → grid, 360px 1fr, gap 18px              → SplitPanel sidebarWidth={360}
.pu-list          → bg-surface-2 border rounded-xl shadow-sm sticky top-4  → SplitPanelSidebar
.pu-row           → gap 12px, padding 12px 14px, border-bottom
.pu-row.is-on     → background primary-50
.pu-row__avatar   → 36×36, rounded-[10px], gradient bg (primary→accent / error / warning)
.pu-row__name     → text-sm font-semibold (13.5px)
.pu-row__login    → font-mono text-xs text-content-tertiary
.pu-row__meta     → text-xs, status badge + relative time
.pu-detail        → bg-surface-2 border rounded-xl shadow-sm     → SplitPanelContent
.pu-detail__head  → padding 18px 22px, border-bottom, gap 16px
.pu-detail__avatar → 56×56, rounded-xl, gradient bg, text-xl
.pu-detail__title → text-xl font-semibold, inline input
.pu-detail__sub   → text-xs, icon + value pairs, gap 6px 14px
.pu-detail__body  → padding 18px 22px 24px, gap 16px
.pu-stat-grid     → grid 4-col, gap 10px
.pu-stat          → bg-surface-3 border rounded-[10px], padding 12px 14px
.pu-stat__lbl     → text-[10.5px] uppercase tracking-wide
.pu-stat__val     → text-lg font-semibold tabular-nums
info-card         → Card component from @cloud/ui
kvgrid            → grid 160px 1fr, gap-y-3.5 gap-x-5, text-sm
```

---

### Task 1: Add passwordResetRequests to mock data

**Files:**
- Modify: `packages/system/src/mock/seed-users.ts`

- [ ] **Step 1: Add passwordResetRequests to the admin user**

In `packages/system/src/mock/seed-users.ts`, add a `passwordResetRequests` array to the `u-admin` user entry, after `passwordHistory`:

```typescript
    passwordResetRequests: [
      {
        id: "prr-001",
        requestedBy: "admin@carbon",
        requestedAt: new Date(now - 3 * day).toISOString(),
        expiresAt: new Date(now - 3 * day + 72 * 3_600_000).toISOString(),
        consumedAt: new Date(now - 3 * day + 2 * 3_600_000).toISOString(),
        status: "consumed" as const,
      },
    ],
```

Also add to `u-marcus` (the locked user):

```typescript
    passwordResetRequests: [
      {
        id: "prr-010",
        requestedBy: "admin@carbon",
        requestedAt: new Date(now - 1 * day).toISOString(),
        expiresAt: new Date(now - 1 * day + 72 * 3_600_000).toISOString(),
        consumedAt: null,
        status: "pending" as const,
      },
    ],
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm exec tsc --noEmit`
Expected: clean

- [ ] **Step 3: Commit**

```bash
git add packages/system/src/mock/seed-users.ts
git commit -m "feat(system): add passwordResetRequests to mock users"
```

---

### Task 2: Rewrite users-page.tsx — stats bar + SplitPanel layout

**Files:**
- Modify: `packages/system/src/users/users-page.tsx`

The current file is a single-panel flex layout with "New user" buried inside the sidebar. The prototype has:
1. Page header with title + "New user" button on the right
2. Stats bar (4 cards: Total / Active / Pending / Locked)
3. `pu-grid` — two separate cards (sidebar + detail)

- [ ] **Step 1: Rewrite users-page.tsx**

Replace the entire file content of `packages/system/src/users/users-page.tsx`:

```tsx
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
    const token = `rst_${Math.random().toString(36).slice(2, 10)}`;
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
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm exec tsc --noEmit`
Expected: errors for changed UserListItem/UserDetail/NewUserModal props (will be fixed in later tasks)

- [ ] **Step 3: Commit**

```bash
git add packages/system/src/users/users-page.tsx
git commit -m "refactor(system): rewrite users-page with stats bar and SplitPanel layout"
```

---

### Task 3: Rewrite user-list-item.tsx — gradient avatar, 3-row layout, pending actions

**Files:**
- Rewrite: `packages/system/src/users/user-list-item.tsx`

Prototype differences from current:
- Avatar: 36×36, rounded-[10px], gradient background (primary→accent for active, error for locked, warning for pending), white text
- Name row: displayName (or "Invitation sent" italic for pending), locked icon
- Login row: monospace `@loginName` (or email for pending)
- Meta row: status badge (custom inline style) + relative time
- Pending users have 3 icon buttons (link, resend, cancel) on right

- [ ] **Step 1: Rewrite user-list-item.tsx**

Replace the entire file content of `packages/system/src/users/user-list-item.tsx`:

```tsx
"use client";

import { Mail, Shield, RefreshCw, X } from "lucide-react";
import type { User } from "../types";
import { relTime, initials } from "../helpers";

type UserListItemProps = {
  user: User;
  active: boolean;
  onClick: () => void;
  onResend?: () => void;
  onCancel?: () => void;
};

const STATUS_STYLE = {
  ACTIVE: { color: "var(--color-success-700)", background: "var(--color-success-50)", borderColor: "oklch(58% 0.14 152 / 0.25)" },
  LOCKED: { color: "var(--color-error-700)", background: "var(--color-error-50)", borderColor: "oklch(70% 0.16 25 / 0.25)" },
  PENDING: { color: "var(--color-warning-700)", background: "var(--color-warning-50)", borderColor: "oklch(75% 0.13 80 / 0.3)" },
} as const;

function avatarGradient(status: User["status"]): string {
  if (status === "LOCKED") return "linear-gradient(135deg, oklch(70% 0.13 25), oklch(58% 0.16 25))";
  if (status === "PENDING") return "linear-gradient(135deg, oklch(78% 0.1 80), oklch(64% 0.14 80))";
  return "linear-gradient(135deg, var(--color-primary-500), var(--color-accent-600))";
}

export function UserListItem({ user, active, onClick, onResend, onCancel }: UserListItemProps) {
  const isPending = user.status === "PENDING";
  const locked = user.status === "LOCKED";
  const displayName = user.displayName || user.loginName || "?";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      className="flex items-center gap-3 w-full px-3.5 py-3 text-left transition-colors border-b border-line-subtle last:border-b-0 hover:bg-surface-hover cursor-pointer"
      style={active ? { background: "var(--color-primary-50)" } : undefined}
    >
      <div
        className="shrink-0 grid place-items-center text-white font-semibold text-xs"
        style={{ width: 36, height: 36, borderRadius: 10, background: avatarGradient(user.status), letterSpacing: "-0.01em" }}
      >
        {isPending ? <Mail size={14} /> : initials(displayName)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-content-primary">
          {isPending
            ? <span className="text-content-tertiary italic font-medium">Invitation sent</span>
            : <span className="truncate">{displayName}</span>}
          {locked && <Shield size={11} className="text-error shrink-0" />}
        </div>
        <div className="font-mono text-xs text-content-tertiary mt-0.5 truncate">
          {isPending ? user.inviteEmail ?? user.email : `@${user.loginName}`}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 text-xs">
          <span
            className="font-mono font-semibold uppercase"
            style={{ fontSize: 9.5, letterSpacing: "0.06em", padding: "1px 5px", borderRadius: 3, border: "1px solid", ...STATUS_STYLE[user.status] }}
          >
            {user.status}
          </span>
          {!isPending && user.lastLoginAt && <span className="text-content-tertiary">· {relTime(user.lastLoginAt)}</span>}
          {isPending && user.inviteExpiresAt && <span className="text-content-tertiary">· expires {relTime(user.inviteExpiresAt)}</span>}
        </div>
      </div>
      {isPending && (
        <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {onResend && (
            <button type="button" className="p-1.5 rounded-md hover:bg-surface-hover text-content-tertiary hover:text-content-primary transition-colors" title="Resend invitation" onClick={onResend}>
              <RefreshCw size={13} />
            </button>
          )}
          {onCancel && (
            <button type="button" className="p-1.5 rounded-md hover:bg-surface-hover text-content-tertiary hover:text-error transition-colors" title="Cancel invitation" onClick={onCancel}>
              <X size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm exec tsc --noEmit`
Expected: clean (or errors from not-yet-updated consumers — proceed)

- [ ] **Step 3: Commit**

```bash
git add packages/system/src/users/user-list-item.tsx
git commit -m "refactor(system): rewrite user-list-item with gradient avatar and pending actions"
```

---

### Task 4: Rewrite user-detail.tsx — full prototype parity

**Files:**
- Rewrite: `packages/system/src/users/user-detail.tsx`

This is the largest task. The prototype's UserDetail has:
1. **Header**: 56×56 gradient avatar + inline editable displayName + status badge + sub-info row (@loginName, email, country, last login) + actions (Reset password, Lock/Unlock, Save)
2. **Locked banner**: Alert with title + detail text
3. **Password state card**: 4-column stat grid (age, failed attempts, changed count, history size) with color-coded values
4. **Profile card**: form-grid 2-col with readonly fields + editable remark
5. **Roles card**: inline Toggle per role + user count badge
6. **Password history**: collapsible timeline with dots
7. **Password policy**: collapsible reference card
8. **Reset record**: latest password reset request display
9. **Modals**: confirm reset, confirm lock

- [ ] **Step 1: Rewrite user-detail.tsx**

Replace the entire file content of `packages/system/src/users/user-detail.tsx`:

```tsx
"use client";

import { useState, useMemo } from "react";
import { User, Mail, Globe, Clock, Check, ChevronDown, Shield, KeyRound, Copy, Lock, Unlock, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, Badge, Button, Card, CardContent, CardHeader, CardTitle, Field, Input, Switch, Textarea } from "@cloud/ui";
import type { Role, User as UserType, PasswordResetRequest } from "../types";
import { relTime, fmtDate, fmtDateTime, initials } from "../helpers";
import { PASSWORD_POLICY } from "../mock/password-policy";
import { SEED_ROLES } from "../mock/seed-roles";

type UserDetailProps = {
  user: UserType;
  users: UserType[];
  roles: Role[];
  onSave: (u: UserType) => void;
  onResetPassword: () => void;
  onToggleLock: () => void;
};

function avatarGradient(locked: boolean): string {
  if (locked) return "linear-gradient(135deg, oklch(70% 0.13 25), oklch(58% 0.16 25))";
  return "linear-gradient(135deg, var(--color-primary-500), var(--color-accent-600))";
}

export function UserDetail({ user, users, roles, onSave, onResetPassword, onToggleLock }: UserDetailProps) {
  const [draft, setDraft] = useState(user);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmLock, setConfirmLock] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);

  const [prevId, setPrevId] = useState(user.id);
  if (user.id !== prevId) {
    setPrevId(user.id);
    setDraft(user);
  }

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(user), [draft, user]);
  const locked = user.status === "LOCKED";
  const lockedUntil = user.passwordErrorLockExpiredTimestamp;
  const displayInitials = initials(user.displayName || user.loginName);

  const [now] = useState(Date.now);
  const pwAgeDays = draft.passwordChangedTimestamp ? Math.floor((now - draft.passwordChangedTimestamp) / 86_400_000) : null;
  const pwExpired = pwAgeDays !== null && pwAgeDays >= PASSWORD_POLICY.expiryDays;

  const adminRoles = SEED_ROLES.filter((r) => r.contractDefineCode === "ADMIN" && r.roleType === "global");
  const assignedRoles = adminRoles.filter((r) => (draft.roleIds ?? []).includes(r.id));

  function toggleRole(roleId: string) {
    const ids = draft.roleIds.includes(roleId) ? draft.roleIds.filter((id) => id !== roleId) : [...draft.roleIds, roleId];
    setDraft({ ...draft, roleIds: ids });
  }

  function save() { onSave(draft); }

  const reqs = user.passwordResetRequests ?? [];
  const latestReq = reqs[0] ?? null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-4 border-b border-line-subtle" style={{ padding: "18px 22px" }}>
        <div className="shrink-0 grid place-items-center text-white font-semibold text-xl"
          style={{ width: 56, height: 56, borderRadius: 12, background: avatarGradient(locked), letterSpacing: "-0.02em" }}>
          {displayInitials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <input value={draft.displayName} onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
              className="text-xl font-semibold tracking-tight text-content-primary bg-transparent outline-none"
              style={{ border: "1px solid transparent", padding: "4px 8px", marginLeft: -8, borderRadius: 6, maxWidth: 400 }} />
            <span className="font-mono font-semibold uppercase shrink-0"
              style={{ fontSize: 9.5, letterSpacing: "0.06em", padding: "1px 5px", borderRadius: 3, border: "1px solid",
                ...(locked
                  ? { color: "var(--color-error-700)", background: "var(--color-error-50)", borderColor: "oklch(70% 0.16 25 / 0.25)" }
                  : { color: "var(--color-success-700)", background: "var(--color-success-50)", borderColor: "oklch(58% 0.14 152 / 0.25)" }),
              }}>
              {user.status}
            </span>
            {draft.authorizingType === "ADMIN" && <Badge variant="outline" title="Implicit admin — bypasses role checks">ADMIN</Badge>}
          </div>
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-content-tertiary mt-1.5">
            <span className="inline-flex items-center gap-1.5"><User size={12} /> @{user.loginName}</span>
            <span className="inline-flex items-center gap-1.5"><Mail size={12} /> {user.email}</span>
            <span className="inline-flex items-center gap-1.5"><Globe size={12} /> {user.country}</span>
            {user.lastLoginAt && <span className="inline-flex items-center gap-1.5"><Clock size={12} /> Last login {relTime(user.lastLoginAt)}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="ghost" size="sm" iconLeft={<KeyRound size={14} />} onClick={() => setConfirmReset(true)}>Reset password</Button>
          <Button variant={locked ? "primary" : "ghost"} size="sm" iconLeft={<Shield size={14} />}
            onClick={() => setConfirmLock(true)}>{locked ? "Unlock" : "Lock"}</Button>
          <Button variant="primary" size="sm" disabled={!dirty} onClick={save}
            iconLeft={dirty ? undefined : <Check size={14} />}>{dirty ? "Save changes" : "Saved"}</Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-4" style={{ padding: "18px 22px 24px" }}>
        {/* Locked banner */}
        {locked && lockedUntil && (
          <Alert variant="error">
            <AlertTriangle size={14} />
            <AlertDescription>
              <strong>Account locked</strong> — {user.passwordErrorTimes >= PASSWORD_POLICY.maxErrorTimes
                ? `${user.passwordErrorTimes} consecutive failed login attempts triggered an auto-lock.`
                : "Account locked by administrator."}
              {" "}Auto-unlocks at <strong>{fmtDateTime(lockedUntil)}</strong> ({relTime(new Date(lockedUntil).toISOString())}).
            </AlertDescription>
          </Alert>
        )}

        {/* Password state */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Password state</CardTitle>
              <p className="text-xs text-content-tertiary mt-0.5">Enforcement is governed by the platform-wide password policy (below).</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2.5">
              <StatCell label="Password age" value={pwAgeDays !== null ? `${pwAgeDays}d` : "—"}
                sub={pwExpired ? `Expired ${pwAgeDays! - PASSWORD_POLICY.expiryDays}d ago` : `expires in ${PASSWORD_POLICY.expiryDays - (pwAgeDays ?? 0)}d`}
                tone={pwExpired ? "danger" : pwAgeDays !== null && pwAgeDays >= PASSWORD_POLICY.expiryDays - 14 ? "warn" : "ok"} />
              <StatCell label="Failed attempts"
                value={<>{user.passwordErrorTimes}<span className="text-xs text-content-tertiary font-medium"> / {PASSWORD_POLICY.maxErrorTimes}</span></>}
                sub={`auto-lock at ${PASSWORD_POLICY.maxErrorTimes}`}
                tone={user.passwordErrorTimes >= 3 ? "danger" : user.passwordErrorTimes > 0 ? "warn" : "ok"} />
              <StatCell label="Changed" value={String(user.passwordChangeTimes)} sub="total resets" />
              <StatCell label="History size"
                value={<>{(user.passwordHistory ?? []).length}<span className="text-xs text-content-tertiary font-medium"> / {PASSWORD_POLICY.historySize}</span></>}
                sub="last hashes kept" />
            </div>
          </CardContent>
        </Card>

        {/* Profile */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Profile</CardTitle>
              <p className="text-xs text-content-tertiary mt-0.5">Only the remark is editable here.</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Login name" hint="Set at registration. Cannot be changed.">
                <Input value={draft.loginName} disabled readOnly />
              </Field>
              <Field label="Email" hint="Verified during onboarding. Cannot be changed.">
                <Input value={draft.email} disabled readOnly />
              </Field>
              <Field label="Country" hint="Set at registration. Cannot be changed.">
                <Input value={draft.country} disabled readOnly />
              </Field>
              <Field label="Authorizing type" hint="Fixed at account creation.">
                <Input value={draft.authorizingType === "ADMIN" ? "ADMIN — full access" : "NORMAL — permissions via role"} disabled readOnly />
              </Field>
              <div className="col-span-2">
                <Field label="Remark" hint="Internal note. Visible only to platform admins.">
                  <Textarea rows={3} value={draft.remark} onChange={(e) => setDraft({ ...draft, remark: e.target.value })}
                    placeholder="Optional notes about this user." />
                </Field>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Roles */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Roles</CardTitle>
              <p className="text-xs text-content-tertiary mt-0.5">
                {assignedRoles.length} of {adminRoles.length} assigned
                {draft.authorizingType === "ADMIN" && <span className="text-warning"> · ADMIN type bypasses role checks anyway.</span>}
              </p>
            </div>
          </CardHeader>
          <div>
            {adminRoles.map((r) => {
              const on = draft.roleIds.includes(r.id);
              const usersWithRole = users.filter((u) => (u.roleIds ?? []).includes(r.id));
              return (
                <div key={r.id} className="flex items-center gap-2.5 px-5 py-3 border-b border-line-subtle last:border-b-0">
                  <Switch checked={on} onCheckedChange={() => toggleRole(r.id)} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-content-primary flex items-center gap-2">
                      {r.name}
                      {r.builtin && <Badge variant="outline">SYSTEM</Badge>}
                    </div>
                    <div className="text-xs text-content-tertiary mt-0.5">{r.description} · {r.permissions.length} perms</div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-surface-3 border border-line-subtle text-content-secondary text-xs font-semibold shrink-0">
                    <User size={11} /> {usersWithRole.length}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Password history */}
        <Card>
          <button type="button" className="flex items-center justify-between w-full px-5 py-3.5 text-left hover:bg-surface-3 transition-colors"
            onClick={() => setHistoryOpen(!historyOpen)}>
            <div>
              <div className="text-sm font-semibold">Password history</div>
              <p className="text-xs text-content-tertiary mt-0.5">
                Last {PASSWORD_POLICY.historySize} password hashes — none of these may be re-used.
              </p>
            </div>
            <ChevronDown size={14} className={`text-content-tertiary transition-transform ${historyOpen ? "rotate-180" : ""}`} />
          </button>
          {historyOpen && (
            <div className="text-xs">
              {(user.passwordHistory ?? []).length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-content-tertiary">No history yet.</div>
              )}
              {(user.passwordHistory ?? []).map((h, i) => (
                <div key={h.hashId} className="grid items-center border-b border-line-subtle last:border-b-0"
                  style={{ gridTemplateColumns: "24px 1fr auto", gap: 10, padding: "10px 14px" }}>
                  <div className="mx-auto rounded-full"
                    style={{ width: 8, height: 8, background: i === 0 ? "var(--color-success-700)" : "var(--color-content-tertiary)" }} />
                  <div>
                    <div className="font-mono font-medium text-xs text-content-primary">{fmtDate(h.changedAt)}</div>
                    <div className="text-xs text-content-tertiary tabular-nums">{i === 0 ? "current" : relTime(h.changedAt)}</div>
                  </div>
                  <code className="text-xs text-content-tertiary">#{h.hashId}</code>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Password policy */}
        <Card>
          <button type="button" className="flex items-center justify-between w-full px-5 py-3.5 text-left hover:bg-surface-3 transition-colors"
            onClick={() => setPolicyOpen(!policyOpen)}>
            <div>
              <div className="text-sm font-semibold">Password policy</div>
              <p className="text-xs text-content-tertiary mt-0.5">Platform-wide. Edit in System → Settings → Security.</p>
            </div>
            <ChevronDown size={14} className={`text-content-tertiary transition-transform ${policyOpen ? "rotate-180" : ""}`} />
          </button>
          {policyOpen && (
            <div className="flex flex-col">
              <PolicyRow icon={<Check size={13} />} name="Length" desc={`Minimum ${PASSWORD_POLICY.minLength} characters`} val={`≥ ${PASSWORD_POLICY.minLength}`} />
              <PolicyRow icon={<Shield size={13} />} name="Character set" desc="Must contain upper, lower, digit and symbol" val="ABC · abc · 0-9 · @#" />
              <PolicyRow icon={<AlertTriangle size={13} />} name="Lockout" desc={`After ${PASSWORD_POLICY.maxErrorTimes} consecutive failed attempts, lock for ${PASSWORD_POLICY.lockDurationMinutes}m`} val={`${PASSWORD_POLICY.maxErrorTimes} · ${PASSWORD_POLICY.lockDurationMinutes}m`} />
              <PolicyRow icon={<Clock size={13} />} name="Expiry" desc={`Force password change every ${PASSWORD_POLICY.expiryDays} days`} val={`${PASSWORD_POLICY.expiryDays}d`} />
              <PolicyRow icon={<Copy size={13} />} name="History" desc={`Last ${PASSWORD_POLICY.historySize} passwords cannot be reused`} val={`${PASSWORD_POLICY.historySize}`} />
            </div>
          )}
        </Card>

        {/* Most recent password reset */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Most recent password reset</CardTitle>
              <p className="text-xs text-content-tertiary mt-0.5">Reset links are sent to the user's email and are valid for 72 hours.</p>
            </div>
          </CardHeader>
          {latestReq ? <ResetRecord req={latestReq} email={user.email} /> : (
            <div className="px-4 py-6 text-center text-sm text-content-tertiary">No reset requests on record for this account.</div>
          )}
        </Card>
      </div>

      {/* Confirm reset modal */}
      {confirmReset && (
        <ConfirmModal open={confirmReset} onClose={() => setConfirmReset(false)} title="Send password reset link?"
          onConfirm={() => { setConfirmReset(false); onResetPassword(); }} confirmLabel="Send reset link" confirmVariant="primary">
          <p className="text-sm text-content-secondary">
            A password-reset link will be emailed to <strong>{user.email}</strong>.
          </p>
          <ul className="mt-3 pl-4 text-sm text-content-secondary list-disc space-y-1">
            <li>Valid for <strong>72 hours</strong></li>
            <li>Single use — link expires once {user.displayName} sets the new password</li>
            <li>They'll be asked to enter the new password twice for confirmation</li>
            <li>Any earlier pending reset link for this account will be invalidated</li>
          </ul>
        </ConfirmModal>
      )}

      {/* Confirm lock modal */}
      {confirmLock && (
        <ConfirmModal open={confirmLock} onClose={() => setConfirmLock(false)}
          title={locked ? "Unlock account?" : "Lock account?"}
          onConfirm={() => { setConfirmLock(false); onToggleLock(); }}
          confirmLabel={locked ? "Unlock" : "Lock account"}
          confirmVariant={locked ? "primary" : "destructive"}>
          <p className="text-sm text-content-secondary">
            {locked
              ? <>Unlock <strong>{user.displayName}</strong> — they will be able to log in immediately. Failed-attempt counter resets.</>
              : <>Locks <strong>{user.displayName}</strong> for {PASSWORD_POLICY.lockDurationMinutes} minutes. Active sessions are revoked.</>}
          </p>
        </ConfirmModal>
      )}
    </div>
  );
}

// ── Sub-components (file-private) ──

function StatCell({ label, value, sub, tone }: {
  label: string; value: React.ReactNode; sub: string; tone?: "ok" | "warn" | "danger";
}) {
  const valColor = tone === "danger" ? "var(--color-error-700)" : tone === "warn" ? "var(--color-warning-700)" : tone === "ok" ? "var(--color-success-700)" : undefined;
  return (
    <div className="bg-surface-3 border border-line-subtle rounded-lg px-3.5 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-content-tertiary" style={{ fontSize: 10.5 }}>{label}</div>
      <div className="text-lg font-semibold mt-1 tabular-nums" style={valColor ? { color: valColor } : undefined}>{value}</div>
      <div className="text-xs text-content-tertiary mt-0.5">{sub}</div>
    </div>
  );
}

function PolicyRow({ icon, name, desc, val }: { icon: React.ReactNode; name: string; desc: string; val: string }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-line-subtle last:border-b-0">
      <div className="grid place-items-center shrink-0 bg-surface-3 text-content-secondary" style={{ width: 28, height: 28, borderRadius: 8 }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-content-primary">{name}</div>
        <div className="text-xs text-content-tertiary mt-0.5">{desc}</div>
      </div>
      <span className="text-xs font-semibold font-mono shrink-0 px-2.5 py-1 rounded-md"
        style={{ color: "var(--color-primary-700)", background: "var(--color-primary-50)", border: "1px solid oklch(60% 0.14 262 / 0.2)" }}>
        {val}
      </span>
    </div>
  );
}

function ResetRecord({ req, email }: { req: PasswordResetRequest; email: string }) {
  const effectiveStatus = req.status === "pending" && new Date(req.expiresAt).getTime() < Date.now() ? "expired" : req.status;
  const statusStyle = {
    pending: { color: "var(--color-warning-700)", background: "var(--color-warning-50)", borderColor: "oklch(75% 0.14 75 / 0.3)" },
    consumed: { color: "var(--color-success-700)", background: "var(--color-success-50)", borderColor: "oklch(58% 0.14 152 / 0.25)" },
    expired: { color: "var(--color-content-tertiary)", background: "var(--color-surface-3)", borderColor: "var(--color-line-subtle)" },
    superseded: { color: "var(--color-content-tertiary)", background: "var(--color-surface-3)", borderColor: "var(--color-line-subtle)" },
  }[effectiveStatus];
  const statusLabel = { pending: "Pending", consumed: "Consumed", expired: "Expired", superseded: "Superseded" }[effectiveStatus];

  return (
    <div className="flex gap-3.5 px-5 py-4">
      <div className="grid place-items-center shrink-0"
        style={{ width: 36, height: 36, borderRadius: 10, background: "var(--color-info-50)", color: "var(--color-info-700)", border: "1px solid oklch(60% 0.14 230 / 0.25)" }}>
        <Mail size={16} />
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="flex items-center gap-2.5">
          <span className="text-sm text-content-primary flex-1">Reset link sent to <strong>{email}</strong></span>
          <span className="font-mono font-semibold uppercase shrink-0"
            style={{ fontSize: 10, letterSpacing: "0.06em", padding: "3px 8px", borderRadius: 999, border: "1px solid", ...statusStyle }}>
            {statusLabel}
          </span>
        </div>
        <div className="text-xs text-content-secondary flex items-center gap-1.5 flex-wrap">
          <span>Requested by <strong className="text-content-primary">{req.requestedBy}</strong></span>
          <span className="text-content-tertiary">·</span>
          <span>{relTime(req.requestedAt)} ({fmtDateTime(req.requestedAt)})</span>
        </div>
        <div className="text-xs text-content-secondary">
          {effectiveStatus === "pending" && <>Expires <strong>{relTime(req.expiresAt)}</strong> · Valid for 72h, single-use</>}
          {effectiveStatus === "consumed" && "User has set a new password."}
          {effectiveStatus === "expired" && "Link expired without use — admin may issue a new one."}
          {effectiveStatus === "superseded" && "This link was invalidated when a newer reset was triggered."}
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ open, onClose, title, onConfirm, confirmLabel, confirmVariant, children }: {
  open: boolean; onClose: () => void; title: string; onConfirm: () => void;
  confirmLabel: string; confirmVariant: "primary" | "destructive"; children: React.ReactNode;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={<div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant={confirmVariant} onClick={onConfirm}>{confirmLabel}</Button>
      </div>}>
      {children}
    </Modal>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm exec tsc --noEmit`
Expected: clean

- [ ] **Step 3: Commit**

```bash
git add packages/system/src/users/user-detail.tsx
git commit -m "refactor(system): rewrite user-detail with full prototype parity"
```

---

### Task 5: Rewrite pending-invite-detail.tsx

**Files:**
- Rewrite: `packages/system/src/users/pending-invite-detail.tsx`

Prototype differences: gradient avatar (pending=warning), header with sub-info row (email, invited by, sent time, expires), notice banner (info Alert), invitation details as kvgrid, pre-assigned roles as list with shield icon.

- [ ] **Step 1: Rewrite pending-invite-detail.tsx**

Replace the entire file content of `packages/system/src/users/pending-invite-detail.tsx`:

```tsx
"use client";

import { Mail, User, Clock, Shield } from "lucide-react";
import { Alert, AlertDescription, Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@cloud/ui";
import type { Role, User as UserType } from "../types";
import { fmtDateTime, relTime } from "../helpers";

type PendingInviteDetailProps = { user: UserType; roles: Role[]; onResend: () => void; onCancel: () => void };

export function PendingInviteDetail({ user, roles, onResend, onCancel }: PendingInviteDetailProps) {
  const invitedRoles = (user.roleIds ?? []).map((id) => roles.find((r) => r.id === id)).filter(Boolean) as Role[];

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-4 border-b border-line-subtle" style={{ padding: "18px 22px" }}>
        <div className="shrink-0 grid place-items-center text-white"
          style={{ width: 56, height: 56, borderRadius: 12, background: "linear-gradient(135deg, oklch(78% 0.1 80), oklch(64% 0.14 80))" }}>
          <Mail size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xl font-semibold tracking-tight text-content-primary">Invitation sent</span>
            <span className="font-mono font-semibold uppercase shrink-0"
              style={{ fontSize: 9.5, letterSpacing: "0.06em", padding: "1px 5px", borderRadius: 3, border: "1px solid",
                color: "var(--color-warning-700)", background: "var(--color-warning-50)", borderColor: "oklch(75% 0.13 80 / 0.3)" }}>
              PENDING
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-content-tertiary mt-1.5">
            <span className="inline-flex items-center gap-1.5"><Mail size={12} /> {user.inviteEmail ?? user.email}</span>
            <span className="inline-flex items-center gap-1.5"><User size={12} /> Invited by {user.invitedBy}</span>
            {user.invitedAt && <span className="inline-flex items-center gap-1.5"><Clock size={12} /> Sent {relTime(user.invitedAt)}</span>}
            {user.inviteExpiresAt && (
              <span className="inline-flex items-center gap-1.5" style={{ color: "var(--color-warning-700)" }}>
                <Clock size={12} /> Expires {relTime(user.inviteExpiresAt)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="ghost" size="sm" iconLeft={<Mail size={14} />} onClick={onResend}>Resend</Button>
          <Button variant="ghost-danger" size="sm" iconLeft={<Shield size={14} />} onClick={onCancel}>Cancel invite</Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-4" style={{ padding: "18px 22px 24px" }}>
        <Alert variant="info">
          <Shield size={14} />
          <AlertDescription>
            <strong>Waiting on the invitee.</strong> Once they click the link in their email and complete
            onboarding, this row turns into a full user with login name, display name, and password set by them.
            Pre-assigned roles below take effect at that moment.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Invitation details</CardTitle>
              <p className="text-xs text-content-tertiary mt-0.5">These are the only fields the admin sets. Everything else is captured during onboarding.</p>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid text-sm" style={{ gridTemplateColumns: "160px 1fr", rowGap: 14, columnGap: 20 }}>
              <dt className="text-content-tertiary font-medium">Email</dt>
              <dd className="text-content-primary">{user.inviteEmail ?? user.email}</dd>
              <dt className="text-content-tertiary font-medium">Invite token</dt>
              <dd className="text-content-primary"><code className="font-mono text-xs px-1.5 py-0.5 bg-surface-3 rounded border border-line-subtle">{user.inviteToken ?? user.id}</code></dd>
              <dt className="text-content-tertiary font-medium">Invited by</dt>
              <dd className="text-content-primary">{user.invitedBy}</dd>
              <dt className="text-content-tertiary font-medium">Sent</dt>
              <dd className="text-content-primary">{user.invitedAt ? fmtDateTime(user.invitedAt) : "—"}</dd>
              <dt className="text-content-tertiary font-medium">Expires</dt>
              <dd className="text-content-primary">{user.inviteExpiresAt ? fmtDateTime(user.inviteExpiresAt) : "—"}</dd>
              {user.remark && <>
                <dt className="text-content-tertiary font-medium">Remark</dt>
                <dd className="text-content-primary">{user.remark}</dd>
              </>}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Pre-assigned roles ({invitedRoles.length})</CardTitle>
              <p className="text-xs text-content-tertiary mt-0.5">The invitee will see these on the authorization step and gain them once they accept.</p>
            </div>
          </CardHeader>
          <div>
            {invitedRoles.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-content-tertiary">No roles pre-assigned.</div>
            )}
            {invitedRoles.map((r) => (
              <div key={r.id} className="flex items-center gap-2.5 px-5 py-3 border-b border-line-subtle last:border-b-0">
                <div className="grid place-items-center shrink-0 bg-surface-3 text-content-secondary" style={{ width: 28, height: 28, borderRadius: 8 }}>
                  <Shield size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-content-primary">{r.name}</div>
                  <div className="text-xs text-content-tertiary mt-0.5">{r.description} · {r.permissions.length} perms</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm exec tsc --noEmit`
Expected: clean

- [ ] **Step 3: Commit**

```bash
git add packages/system/src/users/pending-invite-detail.tsx
git commit -m "refactor(system): rewrite pending-invite-detail with prototype parity"
```

---

### Task 6: Rewrite new-user-modal.tsx — invite-only

**Files:**
- Rewrite: `packages/system/src/users/new-user-modal.tsx`

The prototype's NewUserModal is **invite-only** (no "Direct" tab). It has: notice banner explaining how invitations work, email field with prefix icon, role select with highlight cards, remark field.

- [ ] **Step 1: Rewrite new-user-modal.tsx**

Replace the entire file content of `packages/system/src/users/new-user-modal.tsx`:

```tsx
"use client";

import { useState, useMemo } from "react";
import { Mail, Info } from "lucide-react";
import { Alert, AlertDescription, Button, Checkbox, Field, Input, Modal, Textarea } from "@cloud/ui";
import type { Role, User } from "../types";
import { SEED_ROLES } from "../mock/seed-roles";

type NewUserModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (draft: { email: string; roleIds: string[]; remark: string }) => void;
  users: User[];
  roles: Role[];
};

export function NewUserModal({ open, onClose, onCreate, users, roles }: NewUserModalProps) {
  const [email, setEmail] = useState("");
  const [roleIds, setRoleIds] = useState<Set<string>>(new Set());
  const [remark, setRemark] = useState("");

  const adminRoles = roles.length > 0 ? roles : SEED_ROLES.filter((r) => r.contractDefineCode === "ADMIN" && r.roleType === "global");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailOk = emailRegex.test(email.trim());
  const emailTaken = useMemo(
    () => users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase() || (u.inviteEmail ?? "").toLowerCase() === email.trim().toLowerCase()),
    [users, email],
  );
  const valid = emailOk && !emailTaken && roleIds.size > 0;

  function reset() { setEmail(""); setRoleIds(new Set()); setRemark(""); }

  function handleCreate() {
    onCreate({ email: email.trim(), roleIds: [...roleIds], remark: remark.trim() });
    reset();
  }

  function toggleRole(id: string) {
    const next = new Set(roleIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setRoleIds(next);
  }

  return (
    <Modal open={open} onClose={() => { onClose(); reset(); }} title="Invite a new user"
      footer={<div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={() => { onClose(); reset(); }}>Cancel</Button>
        <Button variant="primary" disabled={!valid} iconLeft={<Mail size={14} />} onClick={handleCreate}>Send invitation</Button>
      </div>}>
      <div className="flex flex-col gap-3.5">
        <Alert variant="info">
          <Info size={13} />
          <AlertDescription>
            <strong>How invitations work.</strong> You only provide an email and pre-assign roles.
            We send the invitee an onboarding link. They choose to use an existing account or register
            a new one — login name, display name, country and password are captured at that point.
          </AlertDescription>
        </Alert>

        <Field label="Email address" required
          error={email && !emailOk ? "Not a valid email." : emailTaken ? "An invitation or user already exists with this email." : undefined}
          hint={!email || (emailOk && !emailTaken) ? "The onboarding link will be sent here. Link expires in 7 days." : undefined}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com" prefix={<Mail size={14} />}
            invalid={!!email && (!emailOk || emailTaken)} />
        </Field>

        <Field label={`Pre-assigned roles (${roleIds.size})`} required
          hint="Roles the invitee will hold once they accept. They'll see these on the authorization step.">
          <div className="flex flex-col gap-1.5">
            {adminRoles.map((r) => {
              const on = roleIds.has(r.id);
              return (
                <label key={r.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors"
                  style={{
                    background: on ? "var(--color-primary-50)" : "var(--color-surface-3)",
                    borderColor: on ? "oklch(60% 0.14 262 / 0.3)" : "var(--color-line-subtle)",
                  }}>
                  <Checkbox checked={on} onCheckedChange={() => toggleRole(r.id)} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{r.name}</div>
                    <div className="text-xs text-content-tertiary">{r.description} · {r.permissions.length} perms</div>
                  </div>
                </label>
              );
            })}
          </div>
        </Field>

        <Field label="Remark (internal)" hint="Optional. Visible only to platform admins.">
          <Textarea rows={2} value={remark} onChange={(e) => setRemark(e.target.value)}
            placeholder="e.g. EMEA ops, joining 1 June." />
        </Field>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm exec tsc --noEmit`
Expected: clean

- [ ] **Step 3: Commit**

```bash
git add packages/system/src/users/new-user-modal.tsx
git commit -m "refactor(system): rewrite new-user-modal as invite-only matching prototype"
```

---

### Task 7: Delete unused files + update reset-password-modal

**Files:**
- Delete: `packages/system/src/users/edit-user-modal.tsx`
- Delete: `packages/system/src/users/change-role-modal.tsx`
- Modify: `packages/system/src/users/reset-password-modal.tsx`

The edit and change-role modals are no longer needed — editing is inline in UserDetail. The reset-password-modal is also no longer needed since UserDetail now has its own `ConfirmModal` for reset confirmation.

- [ ] **Step 1: Delete edit-user-modal.tsx and change-role-modal.tsx**

```bash
rm packages/system/src/users/edit-user-modal.tsx
rm packages/system/src/users/change-role-modal.tsx
rm packages/system/src/users/reset-password-modal.tsx
```

- [ ] **Step 2: Verify no remaining imports**

Run: `pnpm exec tsc --noEmit`

If there are import errors referencing these deleted files, they were already handled in the user-detail.tsx rewrite (Task 4). If any other file imports them, remove those imports.

- [ ] **Step 3: Run lint**

Run: `pnpm lint`
Expected: clean

- [ ] **Step 4: Commit**

```bash
git add -A packages/system/src/users/
git commit -m "refactor(system): remove edit-user-modal, change-role-modal, reset-password-modal (now inline)"
```

---

### Task 8: Final verification

- [ ] **Step 1: Type check**

Run: `pnpm exec tsc --noEmit`
Expected: clean

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: clean

- [ ] **Step 3: Tests**

Run: `pnpm test`
Expected: all tests pass

- [ ] **Step 4: Visual check**

Start dev server: `pnpm dev`
Navigate to `/system/users` and verify:
1. Stats bar shows 4 cards with correct counts and colors
2. Sidebar has search + filter buttons + scrollable user list
3. User list items show gradient avatars, 3-row layout, pending actions
4. Active user detail shows: gradient avatar header, inline editable name, password stat grid, profile form, inline role toggles, password history timeline, password policy reference, reset record
5. Pending invite detail shows: gradient avatar, notice banner, kvgrid details, pre-assigned roles
6. "New user" opens invite-only modal with notice banner and role cards
7. No hydration errors in browser console
